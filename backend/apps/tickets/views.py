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
        ticket = self.get_object()
        ticket.status = Ticket.STATUS_CALLED
        ticket.called_at = timezone.now()
        ticket.save(update_fields=["status", "called_at"])
        self._broadcast_ticket_event(ticket, event_type="ticket.called")
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"])
    def start_service(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Démarre le service pour un ticket appelé."""
        from apps.queues.services import QueueService

        ticket = self.get_object()
        try:
            ticket = QueueService.start_service(ticket)
            self._broadcast_ticket_event(ticket, event_type="ticket.started")
            return Response(self.get_serializer(ticket).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Ferme un ticket terminé."""
        from apps.queues.services import QueueService

        ticket = self.get_object()
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
