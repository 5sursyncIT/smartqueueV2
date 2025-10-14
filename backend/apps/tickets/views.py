from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Appointment, Ticket
from .serializers import AppointmentSerializer, TicketSerializer
from .tasks import calculate_eta


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ("queue", "status", "channel")
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
    def call(self, request, pk=None):  # type: ignore[override]
        ticket = self.get_object()
        ticket.status = Ticket.STATUS_CALLED
        ticket.called_at = timezone.now()
        ticket.save(update_fields=["status", "called_at"])
        self._broadcast_ticket_event(ticket, event_type="ticket.called")
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):  # type: ignore[override]
        ticket = self.get_object()
        ticket.status = Ticket.STATUS_CLOSED
        ticket.ended_at = timezone.now()
        ticket.save(update_fields=["status", "ended_at"])
        self._broadcast_ticket_event(ticket, event_type="ticket.closed")
        return Response(self.get_serializer(ticket).data)

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
        queue_group = f"queue:{ticket.tenant.slug}:{ticket.queue_id}"
        ticket_group = f"ticket:{ticket.tenant.slug}:{ticket.id}"

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
