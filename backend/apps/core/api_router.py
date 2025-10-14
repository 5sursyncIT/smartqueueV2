"""Routeur DRF centralisé pour l'API v1."""

from __future__ import annotations

from rest_framework.routers import DefaultRouter

router = DefaultRouter()


def register_router(prefix: str, viewset, basename: str | None = None) -> None:
    """Expose une fonction pour enregistrer dynamiquement des viewsets."""

    router.register(prefix, viewset, basename=basename)
