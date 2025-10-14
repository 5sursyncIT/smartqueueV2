from __future__ import annotations

import uuid

from django.db import models

from apps.core.models import TenantAwareModel


class NotificationTemplate(TenantAwareModel):
    """Template de notification personnalisable."""

    EVENT_TICKET_CREATED = "ticket_created"
    EVENT_TICKET_CALLED = "ticket_called"
    EVENT_TICKET_READY = "ticket_ready"
    EVENT_APPOINTMENT_REMINDER = "appointment_reminder"
    EVENT_APPOINTMENT_CONFIRMED = "appointment_confirmed"

    EVENT_CHOICES = [
        (EVENT_TICKET_CREATED, "Ticket créé"),
        (EVENT_TICKET_CALLED, "Ticket appelé"),
        (EVENT_TICKET_READY, "Votre tour approche"),
        (EVENT_APPOINTMENT_REMINDER, "Rappel RDV"),
        (EVENT_APPOINTMENT_CONFIRMED, "RDV confirmé"),
    ]

    CHANNEL_SMS = "sms"
    CHANNEL_EMAIL = "email"
    CHANNEL_WHATSAPP = "whatsapp"
    CHANNEL_PUSH = "push"

    CHANNEL_CHOICES = [
        (CHANNEL_SMS, "SMS"),
        (CHANNEL_EMAIL, "Email"),
        (CHANNEL_WHATSAPP, "WhatsApp"),
        (CHANNEL_PUSH, "Push"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    event = models.CharField(max_length=50, choices=EVENT_CHOICES)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    subject = models.CharField(max_length=255, blank=True, help_text="Pour email uniquement")
    body = models.TextField(help_text="Template avec variables: {{ticket_number}}, {{queue_name}}, etc.")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "notification_templates"
        unique_together = ("tenant", "event", "channel")
        ordering = ("name",)

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.name} ({self.get_channel_display()})"


class Notification(TenantAwareModel):
    """Notification envoyée à un client."""

    STATUS_PENDING = "pending"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_DELIVERED = "delivered"

    STATUS_CHOICES = [
        (STATUS_PENDING, "En attente"),
        (STATUS_SENT, "Envoyé"),
        (STATUS_FAILED, "Échec"),
        (STATUS_DELIVERED, "Délivré"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        NotificationTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    channel = models.CharField(max_length=20, choices=NotificationTemplate.CHANNEL_CHOICES)
    recipient = models.CharField(max_length=255, help_text="Email ou téléphone")
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    # Relations optionnelles
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    appointment = models.ForeignKey(
        "tickets.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    # Métadonnées fournisseur
    provider_id = models.CharField(max_length=255, blank=True, help_text="ID du message chez le provider")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["tenant", "channel"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.get_channel_display()} → {self.recipient}"
