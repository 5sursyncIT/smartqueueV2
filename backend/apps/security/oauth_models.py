"""Modèles pour gérer les connexions OAuth."""

from __future__ import annotations

import uuid

from django.db import models

from apps.core.models import TimeStampedModel


class OAuthConnection(TimeStampedModel):
    """Connexion OAuth d'un utilisateur à un provider externe."""

    PROVIDER_GOOGLE = "google"
    PROVIDER_MICROSOFT = "microsoft"
    PROVIDER_GITHUB = "github"

    PROVIDER_CHOICES = [
        (PROVIDER_GOOGLE, "Google"),
        (PROVIDER_MICROSOFT, "Microsoft"),
        (PROVIDER_GITHUB, "GitHub"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Utilisateur local
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="oauth_connections",
    )

    # Provider OAuth
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    provider_user_id = models.CharField(
        max_length=255, help_text="ID de l'utilisateur chez le provider"
    )

    # Tokens OAuth
    access_token = models.TextField(help_text="Token d'accès (chiffré)")
    refresh_token = models.TextField(blank=True, help_text="Token de rafraîchissement (chiffré)")
    token_expires_at = models.DateTimeField(null=True, blank=True)

    # Informations du compte externe
    email = models.EmailField(help_text="Email du compte externe")
    avatar_url = models.URLField(blank=True, max_length=500)
    metadata = models.JSONField(default=dict, blank=True)

    # Statut
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "oauth_connections"
        unique_together = ("user", "provider")
        indexes = [
            models.Index(fields=["provider", "provider_user_id"]),
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.user.email} - {self.get_provider_display()}"

    def save(self, *args, **kwargs):
        """Chiffre les tokens avant sauvegarde."""
        from apps.security.encryption import EncryptionService

        # Chiffrer les tokens si non vides et non déjà chiffrés
        if self.access_token and not self.access_token.startswith("gAAAAA"):
            self.access_token = EncryptionService.encrypt(self.access_token)

        if self.refresh_token and not self.refresh_token.startswith("gAAAAA"):
            self.refresh_token = EncryptionService.encrypt(self.refresh_token)

        super().save(*args, **kwargs)

    def get_decrypted_access_token(self) -> str:
        """Retourne le token d'accès déchiffré."""
        from apps.security.encryption import EncryptionService

        if not self.access_token:
            return ""

        try:
            return EncryptionService.decrypt(self.access_token)
        except Exception:
            return ""

    def get_decrypted_refresh_token(self) -> str:
        """Retourne le token de rafraîchissement déchiffré."""
        from apps.security.encryption import EncryptionService

        if not self.refresh_token:
            return ""

        try:
            return EncryptionService.decrypt(self.refresh_token)
        except Exception:
            return ""
