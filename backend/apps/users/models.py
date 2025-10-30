from __future__ import annotations

import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra_fields):
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str | None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superuser doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superuser doit avoir is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    last_login = models.DateTimeField(null=True, blank=True)

    # Email verification fields
    email_verified = models.BooleanField(default=False, help_text="Email vérifié")
    email_verification_token = models.CharField(max_length=255, null=True, blank=True, help_text="Token de vérification email")
    email_verification_sent_at = models.DateTimeField(null=True, blank=True, help_text="Date envoi email vérification")
    email_verified_at = models.DateTimeField(null=True, blank=True, help_text="Date vérification email")

    # 2FA fields
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_method = models.CharField(max_length=10, choices=[('totp', 'TOTP'), ('sms', 'SMS')], null=True, blank=True)
    totp_secret = models.CharField(max_length=255, null=True, blank=True)
    backup_codes = models.JSONField(default=list, blank=True)
    two_factor_phone = models.CharField(max_length=32, null=True, blank=True)

    # Security fields
    failed_login_attempts = models.IntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    require_password_change = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        db_table = "users"
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self) -> str:  # pragma: no cover
        return self.email


class AgentProfile(TimeStampedModel):
    STATUS_AVAILABLE = "available"
    STATUS_BUSY = "busy"
    STATUS_PAUSED = "paused"

    STATUS_CHOICES = [
        (STATUS_AVAILABLE, "Disponible"),
        (STATUS_BUSY, "Occupé"),
        (STATUS_PAUSED, "En pause"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="agent_profile")
    current_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    status_updated_at = models.DateTimeField(default=timezone.now)
    counter_number = models.IntegerField(null=True, blank=True, help_text="Numéro du guichet de l'agent")

    class Meta:
        db_table = "agent_profiles"

    def __str__(self) -> str:  # pragma: no cover
        return f"Agent {self.user.email}"

    def set_status(self, status: str) -> None:
        if status not in dict(self.STATUS_CHOICES):
            raise ValueError("Statut agent invalide")
        self.current_status = status
        self.status_updated_at = timezone.now()
        self.save(update_fields=["current_status", "status_updated_at"])
