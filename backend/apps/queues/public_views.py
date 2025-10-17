"""Endpoints publics pour l'inscription aux files d'attente."""

from __future__ import annotations

from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.customers.models import Customer
from apps.queues.models import Queue
from apps.tenants.models import Tenant
from apps.tickets.models import Ticket
from apps.tickets.tasks import calculate_eta

from .analytics import QueueAnalytics


def _split_full_name(full_name: str) -> tuple[str, str]:
    """Sépare un nom complet en prénom/nom."""

    parts = [part for part in full_name.strip().split(" ") if part]
    if not parts:
        return ("Client", "SmartQueue")
    if len(parts) == 1:
        return (parts[0], "")
    return (parts[0], " ".join(parts[1:]))


class QueueSignupSerializer(serializers.Serializer):
    """Validation des données d'inscription à la file."""

    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=32)


class PublicQueueListView(APIView):
    """Retourne la liste des files actives accessibles publiquement."""

    permission_classes = [AllowAny]

    def get(self, request, tenant_slug: str) -> Response:  # noqa: D401 - DRF override
        # Résoudre le tenant à partir du slug dans l'URL
        tenant = get_object_or_404(Tenant, slug=tenant_slug, is_active=True)

        queues = (
            Queue.objects.filter(tenant=tenant, status=Queue.STATUS_ACTIVE)
            .select_related("service", "site")
            .order_by("name")
        )

        data = []
        for queue in queues:
            waiting_count = queue.tickets.filter(status=Ticket.STATUS_WAITING).count()
            avg_service_time = QueueAnalytics._get_average_service_time(queue) or queue.service.sla_seconds  # noqa: SLF001 - usage interne assumé

            data.append(
                {
                    "id": str(queue.id),
                    "name": queue.name,
                    "service": queue.service.name if queue.service else None,
                    "site": queue.site.name if queue.site else None,
                    "algorithm": queue.algorithm,
                    "waiting_count": waiting_count,
                    "estimated_service_seconds": int(avg_service_time),
                    "max_capacity": queue.max_capacity,
                    "status": queue.status,
                }
            )

        return Response({
            "tenant_name": tenant.name,
            "tenant_slug": tenant.slug,
            "queues": data
        })


class QueueSignupView(APIView):
    """Crée un ticket pour un client public."""

    permission_classes = [AllowAny]

    def post(self, request, tenant_slug: str, queue_id: str) -> Response:  # noqa: D401 - DRF override
        # Résoudre le tenant à partir du slug dans l'URL
        tenant = get_object_or_404(Tenant, slug=tenant_slug, is_active=True)

        queue = get_object_or_404(
            Queue.objects.select_related("service", "tenant"),
            id=queue_id,
            tenant=tenant,
            status=Queue.STATUS_ACTIVE,
        )

        serializer = QueueSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if queue.max_capacity:
            live_count = queue.tickets.filter(
                status__in=[Ticket.STATUS_WAITING, Ticket.STATUS_CALLED, Ticket.STATUS_IN_SERVICE]
            ).count()
            if live_count >= queue.max_capacity:
                return Response(
                    {"detail": "Cette file ne peut momentanément plus accepter de nouveaux tickets."},
                    status=status.HTTP_409_CONFLICT,
                )

        with transaction.atomic():
            customer = self._get_or_create_customer(tenant, data)
            ticket = self._create_ticket(queue=queue, customer=customer, signup_data=data)

        position = self._compute_position(ticket)
        eta_seconds = QueueAnalytics.calculate_eta(ticket)

        calculate_eta.delay(str(ticket.id))

        response_payload = {
            "ticket_id": str(ticket.id),
            "ticket_number": ticket.number,
            "queue_id": str(queue.id),
            "queue_name": queue.name,
            "service_name": queue.service.name if queue.service else None,
            "status": ticket.status,
            "position": position,
            "eta_seconds": eta_seconds,
            "created_at": ticket.created_at.isoformat(),
        }

        return Response(response_payload, status=status.HTTP_201_CREATED)

    def _get_or_create_customer(self, tenant, data: dict) -> Customer:
        """Retrouve ou crée un client basé sur l'email/phone."""

        email = data["email"].lower()
        phone = data.get("phone", "").strip()
        first_name, last_name = _split_full_name(data["full_name"])

        customer = None

        if phone:
            customer = Customer.objects.filter(tenant=tenant, phone=phone).first()

        if not customer:
            customer = Customer.objects.filter(tenant=tenant, email=email).first()

        if customer:
            needs_update = False
            if not customer.first_name:
                customer.first_name = first_name
                needs_update = True
            if not customer.last_name and last_name:
                customer.last_name = last_name
                needs_update = True
            if phone and customer.phone != phone:
                customer.phone = phone
                needs_update = True
            if needs_update:
                customer.save(update_fields=["first_name", "last_name", "phone", "updated_at"])
            return customer

        return Customer.objects.create(
            tenant=tenant,
            first_name=first_name,
            last_name=last_name or first_name,
            email=email,
            phone=phone or "",
        )

    def _create_ticket(self, queue: Queue, customer: Customer, signup_data: dict) -> Ticket:
        """Crée un ticket en statut attente."""

        number = self._generate_ticket_number(queue)

        ticket = Ticket.objects.create(
            tenant=queue.tenant,
            queue=queue,
            customer=customer,
            customer_name=f"{customer.first_name} {customer.last_name}".strip(),
            customer_phone=customer.phone,
            number=number,
            channel=Ticket.CHANNEL_WEB,
            status=Ticket.STATUS_WAITING,
            priority=0,
        )

        return ticket

    def _generate_ticket_number(self, queue: Queue) -> str:
        """Génère un identifiant humain pour le ticket."""

        prefix = str(queue.id).split("-")[0].upper()
        count = Ticket.objects.filter(queue=queue).select_for_update().count() + 1
        return f"{prefix}-{count:04d}"

    def _compute_position(self, ticket: Ticket) -> int:
        """Calcule la position du ticket dans la file."""

        if ticket.status != Ticket.STATUS_WAITING:
            return 0

        ahead = ticket.queue.tickets.filter(
            status=Ticket.STATUS_WAITING,
            created_at__lt=ticket.created_at,
        ).count()
        return ahead + 1


class PublicTicketStatusView(APIView):
    """Retourne les informations publiques d'un ticket."""

    permission_classes = [AllowAny]

    def get(self, request, tenant_slug: str, ticket_id: str) -> Response:  # noqa: D401 - DRF override
        # Résoudre le tenant à partir du slug dans l'URL
        tenant = get_object_or_404(Tenant, slug=tenant_slug, is_active=True)

        ticket = get_object_or_404(
            Ticket.objects.select_related("queue", "queue__service"),
            id=ticket_id,
            tenant=tenant,
        )

        position = 0
        if ticket.status == Ticket.STATUS_WAITING:
            position = ticket.queue.tickets.filter(
                status=Ticket.STATUS_WAITING,
                created_at__lt=ticket.created_at,
            ).count() + 1

        payload = {
            "ticket_id": str(ticket.id),
            "ticket_number": ticket.number,
            "queue_id": str(ticket.queue_id),
            "queue_name": ticket.queue.name,
            "service_name": ticket.queue.service.name if ticket.queue.service else None,
            "status": ticket.status,
            "position": position,
            "eta_seconds": ticket.eta_seconds,
            "called_at": ticket.called_at.isoformat() if ticket.called_at else None,
            "started_at": ticket.started_at.isoformat() if ticket.started_at else None,
            "ended_at": ticket.ended_at.isoformat() if ticket.ended_at else None,
            "updated_at": ticket.updated_at.isoformat(),
        }

        return Response(payload)


class PublicTenantListView(APIView):
    """Retourne la liste des tenants publics disponibles."""

    permission_classes = [AllowAny]

    def get(self, request) -> Response:
        """Liste tous les tenants actifs avec leurs statistiques."""
        tenants = (
            Tenant.objects.filter(is_active=True)
            .annotate(
                active_queues_count=Count(
                    'queues',
                    filter=Q(queues__status=Queue.STATUS_ACTIVE),
                    distinct=True
                ),
                total_waiting=Count(
                    'tickets',
                    filter=Q(tickets__status=Ticket.STATUS_WAITING),
                    distinct=True
                )
            )
            .order_by('name')
        )

        data = []
        for tenant in tenants:
            # Ne montrer que les tenants qui ont au moins une file active
            if tenant.active_queues_count > 0:
                data.append({
                    'slug': tenant.slug,
                    'name': tenant.name,
                    'active_queues_count': tenant.active_queues_count,
                    'total_waiting': tenant.total_waiting,
                    'city': 'Dakar',  # TODO: Ajouter le champ city au modèle Tenant
                })

        return Response({'tenants': data})
