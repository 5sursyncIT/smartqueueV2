from __future__ import annotations

from rest_framework.permissions import BasePermission

from .models import TenantMembership


class IsTenantAdmin(BasePermission):
    message = "Accès limité aux administrateurs du tenant."

    def has_permission(self, request, view):  # type: ignore[override]
        tenant = getattr(request, "tenant", None)
        if not request.user.is_authenticated or tenant is None:
            return False
        return TenantMembership.objects.filter(
            tenant=tenant,
            user=request.user,
            role=TenantMembership.ROLE_ADMIN,
            is_active=True,
        ).exists()
