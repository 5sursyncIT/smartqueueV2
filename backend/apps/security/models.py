"""Modèles pour la sécurité et les événements de sécurité."""

from __future__ import annotations

import uuid

from django.db import models

from apps.core.models import TenantAwareModel, TimeStampedModel

# Import OAuth models
from .oauth_models import OAuthConnection  # noqa: F401


class SecurityEvent(TimeStampedModel):
    """Événement de sécurité (tentative de connexion, activité suspecte, etc.)."""

    # Types d'événements
    EVENT_LOGIN_SUCCESS = "login_success"
    EVENT_LOGIN_FAILED = "login_failed"
    EVENT_LOGOUT = "logout"
    EVENT_PASSWORD_CHANGE = "password_change"
    EVENT_PASSWORD_RESET = "password_reset"
    EVENT_2FA_ENABLED = "2fa_enabled"
    EVENT_2FA_DISABLED = "2fa_disabled"
    EVENT_2FA_FAILED = "2fa_failed"
    EVENT_ACCOUNT_LOCKED = "account_locked"
    EVENT_ACCOUNT_UNLOCKED = "account_unlocked"
    EVENT_PERMISSION_DENIED = "permission_denied"
    EVENT_SUSPICIOUS_ACTIVITY = "suspicious_activity"
    EVENT_DATA_EXPORT = "data_export"
    EVENT_BULK_DELETE = "bulk_delete"
    EVENT_API_RATE_LIMIT = "api_rate_limit"
    EVENT_SQL_INJECTION_ATTEMPT = "sql_injection_attempt"
    EVENT_XSS_ATTEMPT = "xss_attempt"
    EVENT_CSRF_FAILURE = "csrf_failure"

    EVENT_CHOICES = [
        (EVENT_LOGIN_SUCCESS, "Connexion réussie"),
        (EVENT_LOGIN_FAILED, "Échec de connexion"),
        (EVENT_LOGOUT, "Déconnexion"),
        (EVENT_PASSWORD_CHANGE, "Changement de mot de passe"),
        (EVENT_PASSWORD_RESET, "Réinitialisation mot de passe"),
        (EVENT_2FA_ENABLED, "2FA activé"),
        (EVENT_2FA_DISABLED, "2FA désactivé"),
        (EVENT_2FA_FAILED, "Échec 2FA"),
        (EVENT_ACCOUNT_LOCKED, "Compte verrouillé"),
        (EVENT_ACCOUNT_UNLOCKED, "Compte déverrouillé"),
        (EVENT_PERMISSION_DENIED, "Permission refusée"),
        (EVENT_SUSPICIOUS_ACTIVITY, "Activité suspecte"),
        (EVENT_DATA_EXPORT, "Export de données"),
        (EVENT_BULK_DELETE, "Suppression en masse"),
        (EVENT_API_RATE_LIMIT, "Rate limit dépassé"),
        (EVENT_SQL_INJECTION_ATTEMPT, "Tentative d'injection SQL"),
        (EVENT_XSS_ATTEMPT, "Tentative XSS"),
        (EVENT_CSRF_FAILURE, "Échec CSRF"),
    ]

    # Niveaux de sévérité
    SEVERITY_LOW = "low"
    SEVERITY_MEDIUM = "medium"
    SEVERITY_HIGH = "high"
    SEVERITY_CRITICAL = "critical"

    SEVERITY_CHOICES = [
        (SEVERITY_LOW, "Faible"),
        (SEVERITY_MEDIUM, "Moyen"),
        (SEVERITY_HIGH, "Élevé"),
        (SEVERITY_CRITICAL, "Critique"),
    ]

    # Statuts
    STATUS_OPEN = "open"
    STATUS_INVESTIGATING = "investigating"
    STATUS_RESOLVED = "resolved"
    STATUS_FALSE_POSITIVE = "false_positive"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Ouvert"),
        (STATUS_INVESTIGATING, "En investigation"),
        (STATUS_RESOLVED, "Résolu"),
        (STATUS_FALSE_POSITIVE, "Faux positif"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Informations de l'événement
    event_type = models.CharField(max_length=50, choices=EVENT_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default=SEVERITY_LOW)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)

    # Utilisateur concerné
    user = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="security_events",
    )
    user_email = models.EmailField(null=True, blank=True)

    # Informations réseau
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True, help_text="Localisation géographique")

    # Détails
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    # Réponse
    resolved_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_security_events",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    class Meta:
        db_table = "security_events"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["severity", "status"]),
            models.Index(fields=["ip_address", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.get_event_type_display()} - {self.ip_address}"


class BlockedIP(TimeStampedModel):
    """IP bloquée pour des raisons de sécurité."""

    REASON_BRUTE_FORCE = "brute_force"
    REASON_SUSPICIOUS = "suspicious"
    REASON_SPAM = "spam"
    REASON_MANUAL = "manual"

    REASON_CHOICES = [
        (REASON_BRUTE_FORCE, "Force brute"),
        (REASON_SUSPICIOUS, "Activité suspecte"),
        (REASON_SPAM, "Spam"),
        (REASON_MANUAL, "Blocage manuel"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ip_address = models.GenericIPAddressField(unique=True)
    reason = models.CharField(max_length=50, choices=REASON_CHOICES)
    description = models.TextField(blank=True)
    blocked_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Date d'expiration du blocage")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "blocked_ips"
        ordering = ("-created_at",)
        verbose_name = "IP bloquée"
        verbose_name_plural = "IPs bloquées"

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.ip_address} ({self.get_reason_display()})"


class PasswordPolicy(TenantAwareModel):
    """Politique de mot de passe pour un tenant."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Règles de complexité
    min_length = models.IntegerField(default=8, help_text="Longueur minimale")
    require_uppercase = models.BooleanField(default=True, help_text="Exiger une majuscule")
    require_lowercase = models.BooleanField(default=True, help_text="Exiger une minuscule")
    require_digit = models.BooleanField(default=True, help_text="Exiger un chiffre")
    require_special_char = models.BooleanField(default=True, help_text="Exiger un caractère spécial")

    # Règles d'expiration
    password_expires_days = models.IntegerField(
        default=90, help_text="Nombre de jours avant expiration du mot de passe (0 = jamais)"
    )
    prevent_reuse_count = models.IntegerField(
        default=5, help_text="Nombre de mots de passe précédents à ne pas réutiliser"
    )

    # Règles de sécurité
    max_failed_attempts = models.IntegerField(default=5, help_text="Tentatives max avant verrouillage")
    lockout_duration_minutes = models.IntegerField(default=30, help_text="Durée du verrouillage en minutes")
    require_2fa_for_admins = models.BooleanField(default=True, help_text="2FA obligatoire pour les admins")
    session_timeout_minutes = models.IntegerField(default=60, help_text="Timeout de session en minutes")

    class Meta:
        db_table = "password_policies"
        verbose_name = "Politique de mot de passe"
        verbose_name_plural = "Politiques de mot de passe"

    def __str__(self) -> str:  # pragma: no cover
        return f"Politique - {self.tenant.name}"


class PasswordHistory(TimeStampedModel):
    """Historique des mots de passe pour empêcher la réutilisation."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="password_history")
    password_hash = models.CharField(max_length=128, help_text="Hash du mot de passe")

    class Meta:
        db_table = "password_history"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Password history for {self.user.email}"


class SecurityAlert(TimeStampedModel):
    """Alerte de sécurité pour notifier les administrateurs."""

    ALERT_TYPE_MULTIPLE_FAILURES = "multiple_failures"
    ALERT_TYPE_SUSPICIOUS_IP = "suspicious_ip"
    ALERT_TYPE_BULK_OPERATIONS = "bulk_operations"
    ALERT_TYPE_PERMISSION_ESCALATION = "permission_escalation"
    ALERT_TYPE_UNUSUAL_ACTIVITY = "unusual_activity"

    ALERT_TYPE_CHOICES = [
        (ALERT_TYPE_MULTIPLE_FAILURES, "Échecs multiples"),
        (ALERT_TYPE_SUSPICIOUS_IP, "IP suspecte"),
        (ALERT_TYPE_BULK_OPERATIONS, "Opérations en masse"),
        (ALERT_TYPE_PERMISSION_ESCALATION, "Escalade de privilèges"),
        (ALERT_TYPE_UNUSUAL_ACTIVITY, "Activité inhabituelle"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alert_type = models.CharField(max_length=50, choices=ALERT_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SecurityEvent.SEVERITY_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    # Statut
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_alerts",
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "security_alerts"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["severity", "is_acknowledged"]),
            models.Index(fields=["alert_type", "created_at"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.title} ({self.get_severity_display()})"
