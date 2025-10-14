from __future__ import annotations

import uuid

from django.db import models

from apps.core.models import TenantAwareModel


class Customer(TenantAwareModel):
    """Client d'un tenant."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32)
    date_of_birth = models.DateField(null=True, blank=True)
    language = models.CharField(max_length=10, default="fr")

    # Préférences notifications
    notify_sms = models.BooleanField(default=True)
    notify_email = models.BooleanField(default=False)
    notify_whatsapp = models.BooleanField(default=False)

    # Métadonnées
    metadata = models.JSONField(default=dict, blank=True, help_text="Champs personnalisés par tenant")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "customers"
        unique_together = ("tenant", "phone")
        ordering = ("last_name", "first_name")

    def __str__(self) -> str:  # pragma: no cover - affichage admin
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
