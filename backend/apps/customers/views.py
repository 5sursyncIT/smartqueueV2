"""Views pour les clients."""

from __future__ import annotations

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import HasScope, IsTenantMember, Scopes

from .models import Customer
from .serializers import CustomerCreateSerializer, CustomerSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    """ViewSet pour les clients."""

    queryset = Customer.objects.none()  # Pour drf_spectacular
    permission_classes = [IsAuthenticated, IsTenantMember, HasScope(Scopes.READ_CUSTOMER)]
    filterset_fields = ("phone", "email", "is_active")
    search_fields = ("first_name", "last_name", "phone", "email")
    ordering_fields = ("created_at", "last_name", "first_name")

    def get_queryset(self):  # type: ignore[override]
        # Vérifier si c'est pour la génération du schéma
        if getattr(self, "swagger_fake_view", False):
            return Customer.objects.none()
        return Customer.objects.filter(tenant=self.request.tenant)

    def get_serializer_class(self):  # type: ignore[override]
        if self.action == "create":
            return CustomerCreateSerializer
        return CustomerSerializer

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(tenant=self.request.tenant)
