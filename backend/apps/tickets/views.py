from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Appointment, Ticket
from .serializers import AppointmentSerializer, TicketSerializer
from .tasks import calculate_eta


class TicketFilter(filters.FilterSet):
    """Custom filter for Ticket model with status__in support."""
    status = filters.CharFilter(method='filter_status')
    agent = filters.CharFilter(method='filter_agent')

    def filter_status(self, queryset, name, value):
        """Allow comma-separated status values."""
        if ',' in value:
            statuses = [s.strip() for s in value.split(',')]
            return queryset.filter(status__in=statuses)
        return queryset.filter(status=value)

    def filter_agent(self, queryset, name, value):
        """Filter by agent - accepts both AgentProfile ID and User ID."""
        from apps.users.models import AgentProfile

        # Check if value is a User ID or AgentProfile ID
        # Try to find AgentProfile by user ID first
        agent_profile = AgentProfile.objects.filter(user_id=value).first()
        if agent_profile:
            return queryset.filter(agent_id=agent_profile.id)

        # Otherwise, assume it's an AgentProfile ID
        return queryset.filter(agent_id=value)

    class Meta:
        model = Ticket
        fields = ("queue", "status", "channel", "agent")


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = TicketFilter
    ordering_fields = ("created_at", "priority", "called_at")
    search_fields = ("number", "customer_name", "customer_phone")

    def get_queryset(self):  # type: ignore[override]
        return Ticket.objects.filter(tenant=self.request.tenant).select_related(
            "queue",
            "queue__service",
            "queue__site",
            "customer",
            "agent",
        )

    def perform_create(self, serializer):  # type: ignore[override]
        ticket = serializer.save(tenant=self.request.tenant)
        calculate_eta.delay(str(ticket.id))
        self._broadcast_ticket_event(ticket, event_type="ticket.created")

    def perform_update(self, serializer):  # type: ignore[override]
        ticket = serializer.save()
        self._broadcast_ticket_event(ticket, event_type="ticket.updated")

    @action(detail=True, methods=["post"])
    def call(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Appelle un ticket et l'assigne automatiquement à l'agent."""
        from apps.users.models import AgentProfile

        ticket = self.get_object()

        # Assigner l'agent qui appelle le ticket
        try:
            agent_profile = AgentProfile.objects.get(user=request.user)
            ticket.agent = agent_profile
        except AgentProfile.DoesNotExist:
            return Response(
                {"error": "Vous devez avoir un profil agent pour appeler des tickets"},
                status=400
            )

        ticket.status = Ticket.STATUS_CALLED
        ticket.called_at = timezone.now()
        ticket.save(update_fields=["status", "called_at", "agent"])
        self._broadcast_ticket_event(ticket, event_type="ticket.called")
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"])
    def start_service(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Démarre le service pour un ticket appelé. Seul l'agent assigné ou un admin peut démarrer."""
        from apps.queues.services import QueueService
        from apps.users.models import AgentProfile
        from apps.tenants.models import TenantMembership

        ticket = self.get_object()

        # Vérifier les permissions : seul l'agent assigné ou un admin peut démarrer le service
        try:
            agent_profile = AgentProfile.objects.get(user=request.user)
        except AgentProfile.DoesNotExist:
            # Si l'utilisateur n'est pas un agent, vérifier s'il est admin
            membership = TenantMembership.objects.filter(
                user=request.user,
                tenant=request.tenant,
                is_active=True
            ).first()

            if not membership or membership.role not in [TenantMembership.ROLE_ADMIN, TenantMembership.ROLE_MANAGER]:
                return Response(
                    {"error": "Vous devez être un agent ou un administrateur pour démarrer le service"},
                    status=403
                )
        else:
            # Si c'est un agent, vérifier que c'est bien l'agent assigné au ticket
            membership = TenantMembership.objects.filter(
                user=request.user,
                tenant=request.tenant,
                is_active=True
            ).first()

            # Autoriser si l'agent est assigné au ticket OU si c'est un admin/manager
            is_assigned_agent = ticket.agent and ticket.agent.id == agent_profile.id
            is_admin_or_manager = membership and membership.role in [TenantMembership.ROLE_ADMIN, TenantMembership.ROLE_MANAGER]

            if not (is_assigned_agent or is_admin_or_manager):
                return Response(
                    {"error": "Vous ne pouvez démarrer le service que pour les tickets qui vous sont assignés"},
                    status=403
                )

        try:
            ticket = QueueService.start_service(ticket)
            self._broadcast_ticket_event(ticket, event_type="ticket.started")
            return Response(self.get_serializer(ticket).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Ferme un ticket terminé. Seul l'agent assigné ou un admin peut clôturer."""
        from apps.queues.services import QueueService
        from apps.users.models import AgentProfile
        from apps.tenants.models import TenantMembership

        ticket = self.get_object()

        # Vérifier les permissions : seul l'agent assigné ou un admin peut clôturer
        try:
            agent_profile = AgentProfile.objects.get(user=request.user)
        except AgentProfile.DoesNotExist:
            # Si l'utilisateur n'est pas un agent, vérifier s'il est admin
            membership = TenantMembership.objects.filter(
                user=request.user,
                tenant=request.tenant,
                is_active=True
            ).first()

            if not membership or membership.role not in [TenantMembership.ROLE_ADMIN, TenantMembership.ROLE_MANAGER]:
                return Response(
                    {"error": "Vous devez être un agent ou un administrateur pour clôturer des tickets"},
                    status=403
                )
        else:
            # Si c'est un agent, vérifier que c'est bien l'agent assigné au ticket
            membership = TenantMembership.objects.filter(
                user=request.user,
                tenant=request.tenant,
                is_active=True
            ).first()

            # Autoriser si l'agent est assigné au ticket OU si c'est un admin/manager
            is_assigned_agent = ticket.agent and ticket.agent.id == agent_profile.id
            is_admin_or_manager = membership and membership.role in [TenantMembership.ROLE_ADMIN, TenantMembership.ROLE_MANAGER]

            if not (is_assigned_agent or is_admin_or_manager):
                return Response(
                    {"error": "Vous ne pouvez clôturer que les tickets qui vous sont assignés"},
                    status=403
                )

        try:
            ticket = QueueService.close_ticket(ticket)
            self._broadcast_ticket_event(ticket, event_type="ticket.closed")
            return Response(self.get_serializer(ticket).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    def _broadcast_ticket_event(self, ticket: Ticket, event_type: str) -> None:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        payload = {
            "event": event_type,
            "ticket_id": str(ticket.id),
            "queue_id": str(ticket.queue_id),
            "status": ticket.status,
            "number": ticket.number,
        }

        # Sanitize group names: ensure valid characters and length < 100
        # Valid characters: ASCII alphanumerics, hyphens, underscores, periods only
        # Remove colons and other special characters, use periods or hyphens as separators
        tenant_slug = ticket.tenant.slug.replace(" ", "-")
        queue_id = str(ticket.queue_id)  # UUIDs are fine with hyphens
        ticket_id = str(ticket.id)

        queue_group = f"queue.{tenant_slug}.{queue_id}"
        ticket_group = f"ticket.{tenant_slug}.{ticket_id}"

        async_to_sync(channel_layer.group_send)(
            queue_group,
            {
                "type": "queue_updated",
                "payload": payload,
            },
        )
        async_to_sync(channel_layer.group_send)(
            ticket_group,
            {
                "type": "ticket_updated",
                "payload": payload,
            },
        )

        # If ticket is called, broadcast to all displays showing this queue
        if event_type == "ticket.called":
            from apps.displays.models import Display
            displays = Display.objects.filter(
                tenant=ticket.tenant,
                queues=ticket.queue,
                is_active=True
            )

            # Build ticket data for display
            ticket_data = {
                "id": str(ticket.id),
                "number": ticket.number,
                "queue_name": ticket.queue.name,
                "queue_id": str(ticket.queue_id),
                "status": ticket.status,
                "called_at": ticket.called_at.isoformat() if ticket.called_at else None,
                "agent_name": f"{ticket.agent.user.first_name} {ticket.agent.user.last_name}" if ticket.agent else None,
                "counter": ticket.agent.counter_number if ticket.agent and ticket.agent.counter_number else None,
            }

            # Send to each display
            for display in displays:
                display_group = f"display_{tenant_slug}_{str(display.id)}"
                async_to_sync(channel_layer.group_send)(
                    display_group,
                    {
                        "type": "ticket_called",
                        "ticket": ticket_data,
                    },
                )


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ("service", "status")
    ordering_fields = ("starts_at", "created_at")

    def get_queryset(self):  # type: ignore[override]
        return Appointment.objects.filter(tenant=self.request.tenant).select_related(
            "service",
            "queue",
            "customer",
        )

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(tenant=self.request.tenant)
