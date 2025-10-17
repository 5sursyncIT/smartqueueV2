"""
Modèle pour la configuration système globale.
"""
from django.db import models
from apps.core.models.base import TimeStampedModel


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

    class Meta:
        verbose_name = "Configuration Système"
        verbose_name_plural = "Configuration Système"

    def save(self, *args, **kwargs):
        """
        Assure qu'une seule instance existe (singleton pattern).
        """
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """
        Empêche la suppression de la configuration.
        """
        pass

    @classmethod
    def load(cls):
        """
        Charge ou crée la configuration système.
        """
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"Configuration Système - {self.platform_name}"


class FeatureFlag(TimeStampedModel):
    """
    Feature flags pour activer/désactiver des fonctionnalités.
    """

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
