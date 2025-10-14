from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import QueueAssignmentViewSet, QueueViewSet, ServiceViewSet, SiteViewSet

router = DefaultRouter()
router.register("sites", SiteViewSet, basename="site")
router.register("services", ServiceViewSet, basename="service")
router.register("assignments", QueueAssignmentViewSet, basename="queue-assignment")
router.register("", QueueViewSet, basename="queue")

urlpatterns = [
    path("", include(router.urls)),
]
