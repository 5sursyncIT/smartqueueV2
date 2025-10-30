"""Modèles pour la configuration système."""

from __future__ import annotations

import uuid
from typing import Any

from django.core.exceptions import ValidationError
from django.db import models

from .models import TimeStampedModel


class SystemConfig(TimeStampedModel):
    """Configuration système globale (SMTP, etc.)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Il ne devrait y avoir qu'une seule configuration
    # On utilise un champ unique pour forcer cela
    singleton_guard = models.BooleanField(default=True, unique=True)

    # Configuration SMTP
    smtp_host = models.CharField(max_length=255, default="localhost", help_text="Serveur SMTP")
    smtp_port = models.IntegerField(default=1025, help_text="Port SMTP")
    smtp_use_tls = models.BooleanField(default=False, help_text="Utiliser TLS")
    smtp_use_ssl = models.BooleanField(default=False, help_text="Utiliser SSL")
    smtp_username = models.CharField(max_length=255, blank=True, help_text="Nom d'utilisateur SMTP")
    smtp_password = models.CharField(max_length=255, blank=True, help_text="Mot de passe SMTP")
    smtp_from_email = models.EmailField(default="noreply@smartqueue.app", help_text="Email d'expéditeur")

    # Configuration générale
    platform_name = models.CharField(max_length=255, default="SmartQueue", help_text="Nom de la plateforme")
    default_language = models.CharField(max_length=10, default="fr", help_text="Langue par défaut")
    default_timezone = models.CharField(max_length=50, default="Africa/Dakar", help_text="Fuseau horaire")
    default_currency = models.CharField(max_length=3, default="XOF", help_text="Devise par défaut")

    # Limites
    max_upload_size_mb = models.IntegerField(default=10, help_text="Taille max upload (MB)")
    session_timeout_minutes = models.IntegerField(default=60, help_text="Timeout session (minutes)")

    # Modes et restrictions
    maintenance_mode = models.BooleanField(default=False, help_text="Mode maintenance")
    registration_enabled = models.BooleanField(default=True, help_text="Inscription activée")
    email_verification_required = models.BooleanField(default=True, help_text="Vérification email obligatoire")

    class Meta:
        db_table = "system_config"
        verbose_name = "Configuration Système"
        verbose_name_plural = "Configurations Système"

    def __str__(self) -> str:  # pragma: no cover
        return f"Configuration Système - {self.platform_name}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Assurer qu'il n'y a qu'une seule configuration."""
        self.singleton_guard = True
        super().save(*args, **kwargs)

    def clean(self) -> None:
        """Validation personnalisée."""
        super().clean()

        # Vérifier que TLS et SSL ne sont pas activés en même temps
        if self.smtp_use_tls and self.smtp_use_ssl:
            raise ValidationError("TLS et SSL ne peuvent pas être activés simultanément")

        # Vérifier le port
        if not (1 <= self.smtp_port <= 65535):
            raise ValidationError("Le port SMTP doit être entre 1 et 65535")

    @classmethod
    def get_config(cls) -> SystemConfig:
        """Récupérer ou créer la configuration système."""
        config, created = cls.objects.get_or_create(singleton_guard=True)
        return config

    def to_dict(self) -> dict:
        """Convertir en dictionnaire (sans le mot de passe)."""
        return {
            "id": str(self.id),
            "platform_name": self.platform_name,
            "default_language": self.default_language,
            "default_timezone": self.default_timezone,
            "default_currency": self.default_currency,
            "max_upload_size_mb": self.max_upload_size_mb,
            "session_timeout_minutes": self.session_timeout_minutes,
            "maintenance_mode": self.maintenance_mode,
            "registration_enabled": self.registration_enabled,
            "email_verification_required": self.email_verification_required,
            "smtp_host": self.smtp_host,
            "smtp_port": self.smtp_port,
            "smtp_use_tls": self.smtp_use_tls,
            "smtp_use_ssl": self.smtp_use_ssl,
            "smtp_username": self.smtp_username,
            "smtp_from_email": self.smtp_from_email,
            # On ne retourne PAS le mot de passe
            "smtp_password_set": bool(self.smtp_password),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
