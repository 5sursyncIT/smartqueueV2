from __future__ import annotations

from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    verbose_name = "Core"

    def ready(self) -> None:  # pragma: no cover
        # Point d'entrée pour enregistrer des signaux ou initialiser des services.
        return super().ready()
