from __future__ import annotations

import uuid

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class TimeStampedModel(models.Model):
    """Modèle de base avec métadonnées temporelles."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ("-created_at",)


class TenantAwareModel(TimeStampedModel):
    """Modèle abstrait imposant la présence d'un tenant."""

    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="%(class)ss",
    )

    class Meta(TimeStampedModel.Meta):
        abstract = True

    def save(self, *args, **kwargs):
        if self.tenant_id is None:
            raise ValueError("Le tenant doit être défini avant la sauvegarde")
        return super().save(*args, **kwargs)


class AuditLog(TenantAwareModel):
    """Journal d'audit pour toutes les actions critiques."""

    # Actions
    ACTION_CREATE = "create"
    ACTION_UPDATE = "update"
    ACTION_DELETE = "delete"
    ACTION_LOGIN = "login"
    ACTION_LOGOUT = "logout"
    ACTION_CALL_TICKET = "call_ticket"
    ACTION_TRANSFER_TICKET = "transfer_ticket"
    ACTION_CLOSE_TICKET = "close_ticket"
    ACTION_MARK_NO_SHOW = "mark_no_show"
    ACTION_CHANGE_STATUS = "change_status"
    ACTION_EXPORT_DATA = "export_data"
    ACTION_SETTINGS_CHANGE = "settings_change"

    ACTION_CHOICES = [
        (ACTION_CREATE, "Création"),
        (ACTION_UPDATE, "Modification"),
        (ACTION_DELETE, "Suppression"),
        (ACTION_LOGIN, "Connexion"),
        (ACTION_LOGOUT, "Déconnexion"),
        (ACTION_CALL_TICKET, "Appel ticket"),
        (ACTION_TRANSFER_TICKET, "Transfert ticket"),
        (ACTION_CLOSE_TICKET, "Clôture ticket"),
        (ACTION_MARK_NO_SHOW, "Marquage no-show"),
        (ACTION_CHANGE_STATUS, "Changement statut"),
        (ACTION_EXPORT_DATA, "Export de données"),
        (ACTION_SETTINGS_CHANGE, "Modification paramètres"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Qui a fait l'action
    user = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
    )
    user_email = models.EmailField(help_text="Email de l'utilisateur au moment de l'action")
    user_ip = models.GenericIPAddressField(null=True, blank=True)

    # Quelle action
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=100, help_text="Type de ressource (Ticket, Queue, etc.)")
    resource_id = models.CharField(max_length=255, help_text="ID de la ressource")

    # Relation générique vers l'objet (optionnel)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    object_id = models.UUIDField(null=True, blank=True)
    content_object = GenericForeignKey("content_type", "object_id")

    # Détails de l'action
    description = models.TextField(blank=True)
    changes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Changements effectués (before/after)",
    )
    metadata = models.JSONField(default=dict, blank=True)

    # Contexte
    endpoint = models.CharField(max_length=255, blank=True, help_text="URL de l'API appelée")
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["resource_type", "resource_id"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user_email} - {self.get_action_display()} - {self.resource_type}"
