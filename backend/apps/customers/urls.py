"""URLs pour les clients."""

from __future__ import annotations

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CustomerViewSet

router = DefaultRouter()
router.register(r"customers", CustomerViewSet, basename="customer")

urlpatterns = router.urls
