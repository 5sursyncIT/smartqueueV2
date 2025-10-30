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


class SystemConfig(TimeStampedModel):
    """
    Configuration système globale (singleton).
    Une seule instance existe dans la base de données.
    """

    # Informations de base
    platform_name = models.CharField(
        max_length=100,
        default="SmartQueue",
        help_text="Nom de la plateforme"
    )
    default_language = models.CharField(
        max_length=10,
        default="fr",
        choices=[("fr", "Français"), ("en", "English")],
        help_text="Langue par défaut"
    )
    default_timezone = models.CharField(
        max_length=50,
        default="Africa/Dakar",
        help_text="Fuseau horaire par défaut"
    )
    default_currency = models.CharField(
        max_length=10,
        default="XOF",
        help_text="Devise par défaut"
    )

    # Modes et activation
    maintenance_mode = models.BooleanField(
        default=False,
        help_text="Mode maintenance activé"
    )
    registration_enabled = models.BooleanField(
        default=True,
        help_text="Autoriser les nouvelles inscriptions"
    )

    # Notifications
    email_notifications = models.BooleanField(
        default=True,
        help_text="Activer les notifications par email"
    )
    sms_notifications = models.BooleanField(
        default=True,
        help_text="Activer les notifications par SMS"
    )
    push_notifications = models.BooleanField(
        default=True,
        help_text="Activer les notifications push"
    )

    # Limites système
    max_upload_size_mb = models.IntegerField(
        default=10,
        help_text="Taille maximale de téléchargement en MB"
    )
    session_timeout_minutes = models.IntegerField(
        default=60,
        help_text="Délai d'expiration de session en minutes"
    )

    # Sécurité
    password_min_length = models.IntegerField(
        default=8,
        help_text="Longueur minimale du mot de passe"
    )
    require_email_verification = models.BooleanField(
        default=True,
        help_text="Exiger la vérification de l'email"
    )
    require_2fa = models.BooleanField(
        default=False,
        help_text="Exiger l'authentification à deux facteurs"
    )

    # Configuration SMTP
    smtp_host = models.CharField(
        max_length=255,
        default="localhost",
        help_text="Serveur SMTP"
    )
    smtp_port = models.IntegerField(
        default=1025,
        help_text="Port SMTP"
    )
    smtp_use_tls = models.BooleanField(
        default=False,
        help_text="Utiliser TLS"
    )
    smtp_use_ssl = models.BooleanField(
        default=False,
        help_text="Utiliser SSL"
    )
    smtp_username = models.CharField(
        max_length=255,
        blank=True,
        help_text="Nom d'utilisateur SMTP"
    )
    smtp_password = models.CharField(
        max_length=255,
        blank=True,
        help_text="Mot de passe SMTP"
    )
    smtp_from_email = models.EmailField(
        default="noreply@smartqueue.app",
        help_text="Email d'expéditeur"
    )

    class Meta:
        verbose_name = "Configuration Système"
        verbose_name_plural = "Configuration Système"

    def save(self, *args, **kwargs):
        """Assure qu'une seule instance existe (singleton pattern)."""
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Empêche la suppression de la configuration."""
        pass

    @classmethod
    def load(cls):
        """Charge ou crée la configuration système."""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"Configuration Système - {self.platform_name}"


class FeatureFlag(TimeStampedModel):
    """Feature flags pour activer/désactiver des fonctionnalités."""

    CATEGORY_CHOICES = [
        ("core", "Core"),
        ("experimental", "Experimental"),
        ("beta", "Beta"),
    ]

    name = models.CharField(max_length=100, help_text="Nom de la fonctionnalité")
    key = models.CharField(max_length=50, unique=True, help_text="Clé unique")
    description = models.TextField(help_text="Description de la fonctionnalité")
    enabled = models.BooleanField(default=False, help_text="Fonctionnalité activée")
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default="core"
    )

    class Meta:
        verbose_name = "Feature Flag"
        verbose_name_plural = "Feature Flags"
        ordering = ["category", "name"]

    def __str__(self):
        status = "✓" if self.enabled else "✗"
        return f"{status} {self.name} ({self.key})"
