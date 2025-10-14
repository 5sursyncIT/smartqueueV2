from __future__ import annotations

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AppointmentViewSet, TicketViewSet

router = DefaultRouter()
router.register("", TicketViewSet, basename="ticket")
router.register("appointments", AppointmentViewSet, basename="appointment")

urlpatterns = [
    path("", include(router.urls)),
]
