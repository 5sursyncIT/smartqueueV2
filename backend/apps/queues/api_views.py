"""ViewSets pour l'API REST des queues, sites et services."""

from __future__ import annotations

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import HasScope, IsTenantMember

from .models import Queue, Service, Site
from .serializers import QueueSerializer, ServiceSerializer, SiteSerializer


class SiteViewSet(viewsets.ModelViewSet):
    """ViewSet pour les Sites (agences/boutiques)."""

    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, HasScope("manage:settings")]

    def get_queryset(self):
        """Retourne les sites du tenant courant."""
        return Site.objects.filter(tenant=self.request.tenant).order_by("-created_at")

    def perform_create(self, serializer):
        """Associe automatiquement le tenant lors de la création."""
        serializer.save(tenant=self.request.tenant)


class ServiceViewSet(viewsets.ModelViewSet):
    """ViewSet pour les Services."""

    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, HasScope("manage:settings")]

    def get_queryset(self):
        """Retourne les services du tenant courant."""
        return Service.objects.filter(tenant=self.request.tenant).select_related("site").order_by("-created_at")

    def perform_create(self, serializer):
        """Associe automatiquement le tenant lors de la création."""
        serializer.save(tenant=self.request.tenant)


class QueueViewSet(viewsets.ModelViewSet):
    """ViewSet pour les Queues (files d'attente)."""

    serializer_class = QueueSerializer
    permission_classes = [IsAuthenticated, IsTenantMember, HasScope("read:queue")]

    def get_queryset(self):
        """Retourne les queues du tenant courant."""
        return Queue.objects.filter(tenant=self.request.tenant).select_related("site", "service").order_by("-created_at")

    def perform_create(self, serializer):
        """Associe automatiquement le tenant lors de la création."""
        serializer.save(tenant=self.request.tenant)

    def get_permissions(self):
        """Permissions différentes selon l'action."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTenantMember(), HasScope("manage:queue")()]
        return [IsAuthenticated(), IsTenantMember(), HasScope("read:queue")()]
