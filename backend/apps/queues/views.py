from __future__ import annotations

from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.tenants.permissions import IsTenantAdmin
from apps.tickets.models import Ticket

from .filters import QueueFilter
from .models import Queue, QueueAssignment, Service, Site
from .serializers import (
    QueueAssignmentSerializer,
    QueueSerializer,
    ServiceSerializer,
    SiteSerializer,
)


class SiteViewSet(viewsets.ModelViewSet):
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def get_queryset(self):  # type: ignore[override]
        return Site.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(tenant=self.request.tenant)


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def get_queryset(self):  # type: ignore[override]
        return Service.objects.filter(tenant=self.request.tenant).select_related("site")

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(tenant=self.request.tenant)


class QueueViewSet(viewsets.ModelViewSet):
    serializer_class = QueueSerializer
    filterset_class = QueueFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        qs = Queue.objects.filter(tenant=self.request.tenant).select_related("service", "site")
        return qs.annotate(
            waiting_count=Count("tickets", filter=Q(tickets__status=Ticket.STATUS_WAITING))
        )

    def get_permissions(self):  # type: ignore[override]
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsTenantAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(tenant=self.request.tenant)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def stats(self, request, pk=None):  # type: ignore[override]
        queue = self.get_object()
        data = {
            "id": queue.id,
            "name": queue.name,
            "status": queue.status,
            "waiting_count": queue.tickets.filter(status=Ticket.STATUS_WAITING).count(),
            "in_service_count": queue.tickets.filter(status=Ticket.STATUS_IN_SERVICE).count(),
        }
        return Response(data)


class QueueAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = QueueAssignmentSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def get_queryset(self):  # type: ignore[override]
        return QueueAssignment.objects.filter(tenant=self.request.tenant).select_related("queue", "agent")

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(tenant=self.request.tenant)
