"""URLs pour la gestion des agents (tenant-scoped)."""
from __future__ import annotations

from django.urls import path
from rest_framework.routers import DefaultRouter

from .agent_views import AgentViewSet
from .views import AgentStatusViewSet

router = DefaultRouter()
router.register(r"agents", AgentViewSet, basename="agent")
router.register(r"agent-status", AgentStatusViewSet, basename="agent-status")

urlpatterns = router.urls
