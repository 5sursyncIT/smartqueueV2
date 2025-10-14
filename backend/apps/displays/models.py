from __future__ import annotations

import uuid

from django.db import models

from apps.core.models import TenantAwareModel


class Display(TenantAwareModel):
    """Écran d'affichage dans un site."""

    TYPE_MAIN = "main"
    TYPE_COUNTER = "counter"
    TYPE_WAITING = "waiting"

    TYPE_CHOICES = [
        (TYPE_MAIN, "Écran principal"),
        (TYPE_COUNTER, "Écran guichet"),
        (TYPE_WAITING, "Salle d'attente"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    site = models.ForeignKey("queues.Site", on_delete=models.CASCADE, related_name="displays")
    display_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    device_id = models.CharField(max_length=255, unique=True, help_text="ID unique du device")

    # Configuration affichage
    queues = models.ManyToManyField(
        "queues.Queue",
        related_name="displays",
        blank=True,
        help_text="Files affichées sur cet écran",
    )
    layout = models.CharField(max_length=50, default="grid", help_text="grid, list, etc.")
    theme = models.JSONField(default=dict, blank=True, help_text="Personnalisation couleurs/logo")
    auto_refresh_seconds = models.IntegerField(default=10)

    # État
    is_active = models.BooleanField(default=True)
    last_ping = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "displays"
        ordering = ("name",)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.site.name})"


class Kiosk(TenantAwareModel):
    """Borne interactive d'enregistrement."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    site = models.ForeignKey("queues.Site", on_delete=models.CASCADE, related_name="kiosks")
    device_id = models.CharField(max_length=255, unique=True)

    # Configuration
    available_queues = models.ManyToManyField(
        "queues.Queue",
        related_name="kiosks",
        help_text="Files disponibles sur cette borne",
    )
    language_options = models.JSONField(
        default=list,
        blank=True,
        help_text='["fr", "en", "wo"]',
    )
    require_phone = models.BooleanField(default=True)
    require_name = models.BooleanField(default=False)
    enable_appointment_checkin = models.BooleanField(default=True)

    # Imprimante
    has_printer = models.BooleanField(default=True)
    printer_config = models.JSONField(default=dict, blank=True)

    # État
    is_active = models.BooleanField(default=True)
    is_online = models.BooleanField(default=False)
    last_ping = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "kiosks"
        ordering = ("name",)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.site.name})"
