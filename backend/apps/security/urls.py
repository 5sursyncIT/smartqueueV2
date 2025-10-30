"""URLs pour l'API de sécurité."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BlockedIPViewSet,
    PasswordPolicyViewSet,
    PasswordSecurityViewSet,
    SecurityAlertViewSet,
    SecurityEventViewSet,
    TwoFactorViewSet,
)

router = DefaultRouter()
router.register("events", SecurityEventViewSet, basename="security-events")
router.register("blocked-ips", BlockedIPViewSet, basename="blocked-ips")
router.register("password-policies", PasswordPolicyViewSet, basename="password-policies")
router.register("alerts", SecurityAlertViewSet, basename="security-alerts")
router.register("2fa", TwoFactorViewSet, basename="two-factor")
router.register("password", PasswordSecurityViewSet, basename="password-security")

urlpatterns = [
    path("", include(router.urls)),
]
