from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TenantMembershipViewSet, TenantViewSet, CouponViewSet, CouponUsageViewSet

router = DefaultRouter()
router.register("", TenantViewSet, basename="tenant")
router.register(r"memberships", TenantMembershipViewSet, basename="tenant-membership")
router.register(r"coupons", CouponViewSet, basename="coupon")
router.register(r"coupon-usages", CouponUsageViewSet, basename="coupon-usage")

urlpatterns = [
    path("", include(router.urls)),
]
