from __future__ import annotations

from rest_framework.routers import DefaultRouter

from .views import TenantMembershipViewSet

router = DefaultRouter()
router.register(r"members", TenantMembershipViewSet, basename="member")

urlpatterns = router.urls
