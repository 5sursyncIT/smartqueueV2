from __future__ import annotations

import uuid

from django.db import models

from apps.core.models import TenantAwareModel


class Ticket(TenantAwareModel):
    """Ticket attribué à un client dans une file."""

    STATUS_WAITING = "en_attente"
    STATUS_CALLED = "appele"
    STATUS_IN_SERVICE = "en_service"
    STATUS_PAUSED = "pause"
    STATUS_TRANSFERRED = "transfere"
    STATUS_CLOSED = "clos"
    STATUS_NO_SHOW = "no_show"

    STATUS_CHOICES = [
        (STATUS_WAITING, "En attente"),
        (STATUS_CALLED, "Appelé"),
        (STATUS_IN_SERVICE, "En service"),
        (STATUS_PAUSED, "En pause"),
        (STATUS_TRANSFERRED, "Transféré"),
        (STATUS_CLOSED, "Clôturé"),
        (STATUS_NO_SHOW, "No show"),
    ]

    CHANNEL_WEB = "web"
    CHANNEL_APP = "app"
    CHANNEL_QR = "qr"
    CHANNEL_WHATSAPP = "whatsapp"
    CHANNEL_KIOSK = "kiosk"
    CHANNEL_CHOICES = [
        (CHANNEL_WEB, "Web"),
        (CHANNEL_APP, "App"),
        (CHANNEL_QR, "QR"),
        (CHANNEL_WHATSAPP, "WhatsApp"),
        (CHANNEL_KIOSK, "Borne"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    queue = models.ForeignKey(
        "queues.Queue",
        on_delete=models.CASCADE,
        related_name="tickets",
    )
    number = models.CharField(max_length=20)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    priority = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_WAITING)
    eta_seconds = models.IntegerField(null=True, blank=True)
    agent = models.ForeignKey(
        "users.AgentProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
    )
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
    )
    # Champs legacy pour tickets sans customer lié
    customer_name = models.CharField(max_length=255, blank=True)
    customer_phone = models.CharField(max_length=32, blank=True)

    called_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "tickets"
        ordering = ("created_at",)

    def __str__(self) -> str:  # pragma: no cover - affichage admin
        return f"Ticket {self.number}"


class Appointment(TenantAwareModel):
    """Rendez-vous planifié."""

    STATUS_SCHEDULED = "scheduled"
    STATUS_CHECKED_IN = "checked_in"
    STATUS_CANCELLED = "cancelled"
    STATUS_COMPLETED = "completed"

    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Planifié"),
        (STATUS_CHECKED_IN, "Présent"),
        (STATUS_CANCELLED, "Annulé"),
        (STATUS_COMPLETED, "Terminé"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey("queues.Service", on_delete=models.CASCADE, related_name="appointments")
    queue = models.ForeignKey("queues.Queue", on_delete=models.SET_NULL, null=True, blank=True, related_name="appointments")
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments",
    )
    agent = models.ForeignKey(
        "users.AgentProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments",
    )
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    # Champs legacy
    customer_name = models.CharField(max_length=255, blank=True)
    customer_email = models.EmailField(blank=True)
    customer_phone = models.CharField(max_length=32, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "appointments"
        ordering = ("starts_at",)

    def __str__(self) -> str:  # pragma: no cover
        return f"RDV {self.customer_name} ({self.starts_at:%Y-%m-%d %H:%M})"
