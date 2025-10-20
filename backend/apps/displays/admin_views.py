"""Admin ViewSet for Display management (tenant-scoped)."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from apps.core.permissions import IsTenantMember, HasScope, Scopes
from apps.displays.models import Display
from apps.displays.serializers import DisplaySerializer, DisplayListSerializer


class DisplayAdminViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Display management (admin/manager access).

    This is for tenant-scoped CRUD operations on displays.
    For public read-only access, use DisplayViewSet.
    """

    permission_classes = [IsTenantMember, HasScope(Scopes.MANAGE_SETTINGS)]
    serializer_class = DisplaySerializer

    def get_queryset(self):
        """Filter displays by current tenant."""
        tenant = self.request.tenant
        return Display.objects.filter(
            tenant=tenant
        ).select_related(
            'site', 'tenant'
        ).prefetch_related('queues')

    def get_serializer_class(self):
        """Use lightweight serializer for list view."""
        if self.action == 'list':
            return DisplayListSerializer
        return DisplaySerializer

    def perform_create(self, serializer):
        """Set tenant on creation."""
        serializer.save(tenant=self.request.tenant)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a display."""
        display = self.get_object()
        display.is_active = True
        display.save(update_fields=['is_active'])
        return Response({'status': 'activated'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a display."""
        display = self.get_object()
        display.is_active = False
        display.save(update_fields=['is_active'])
        return Response({'status': 'deactivated'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active displays."""
        displays = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(displays, many=True)
        return Response(serializer.data)
