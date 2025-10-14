"""URLs pour le super-admin (gestion plateforme)."""

from __future__ import annotations

from rest_framework.routers import DefaultRouter

from .admin_views import (
    InvoiceAdminViewSet,
    SubscriptionAdminViewSet,
    SubscriptionPlanViewSet,
    TenantAdminViewSet,
    TenantMembershipAdminViewSet,
    TransactionViewSet,
)

router = DefaultRouter()
router.register(r"organizations", TenantAdminViewSet, basename="admin-organization")
router.register(r"subscription-plans", SubscriptionPlanViewSet, basename="admin-subscription-plan")
router.register(r"subscriptions", SubscriptionAdminViewSet, basename="admin-subscription")
router.register(r"invoices", InvoiceAdminViewSet, basename="admin-invoice")
router.register(r"transactions", TransactionViewSet, basename="admin-transaction")
router.register(r"memberships", TenantMembershipAdminViewSet, basename="admin-membership")

urlpatterns = router.urls
