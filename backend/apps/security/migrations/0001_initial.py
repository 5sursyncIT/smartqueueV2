"""Initial migration for security app."""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("tenants", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SecurityEvent",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("login_success", "Connexion réussie"),
                            ("login_failed", "Échec de connexion"),
                            ("logout", "Déconnexion"),
                            ("password_change", "Changement de mot de passe"),
                            ("password_reset", "Réinitialisation mot de passe"),
                            ("2fa_enabled", "2FA activé"),
                            ("2fa_disabled", "2FA désactivé"),
                            ("2fa_failed", "Échec 2FA"),
                            ("account_locked", "Compte verrouillé"),
                            ("account_unlocked", "Compte déverrouillé"),
                            ("permission_denied", "Permission refusée"),
                            ("suspicious_activity", "Activité suspecte"),
                            ("data_export", "Export de données"),
                            ("bulk_delete", "Suppression en masse"),
                            ("api_rate_limit", "Rate limit dépassé"),
                            ("sql_injection_attempt", "Tentative d'injection SQL"),
                            ("xss_attempt", "Tentative XSS"),
                            ("csrf_failure", "Échec CSRF"),
                        ],
                        max_length=50,
                    ),
                ),
                (
                    "severity",
                    models.CharField(
                        choices=[
                            ("low", "Faible"),
                            ("medium", "Moyen"),
                            ("high", "Élevé"),
                            ("critical", "Critique"),
                        ],
                        default="low",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Ouvert"),
                            ("investigating", "En investigation"),
                            ("resolved", "Résolu"),
                            ("false_positive", "Faux positif"),
                        ],
                        default="open",
                        max_length=20,
                    ),
                ),
                ("user_email", models.EmailField(blank=True, max_length=254, null=True)),
                ("ip_address", models.GenericIPAddressField()),
                ("user_agent", models.TextField(blank=True)),
                (
                    "location",
                    models.CharField(
                        blank=True, help_text="Localisation géographique", max_length=255
                    ),
                ),
                ("description", models.TextField()),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("resolution_notes", models.TextField(blank=True)),
                (
                    "resolved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="resolved_security_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="security_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "security_events",
                "ordering": ("-created_at",),
            },
        ),
        migrations.CreateModel(
            name="BlockedIP",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ip_address", models.GenericIPAddressField(unique=True)),
                (
                    "reason",
                    models.CharField(
                        choices=[
                            ("brute_force", "Force brute"),
                            ("suspicious", "Activité suspecte"),
                            ("spam", "Spam"),
                            ("manual", "Blocage manuel"),
                        ],
                        max_length=50,
                    ),
                ),
                ("description", models.TextField(blank=True)),
                (
                    "expires_at",
                    models.DateTimeField(
                        blank=True, help_text="Date d'expiration du blocage", null=True
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                (
                    "blocked_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "IP bloquée",
                "verbose_name_plural": "IPs bloquées",
                "db_table": "blocked_ips",
                "ordering": ("-created_at",),
            },
        ),
        migrations.CreateModel(
            name="PasswordPolicy",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "min_length",
                    models.IntegerField(default=8, help_text="Longueur minimale"),
                ),
                (
                    "require_uppercase",
                    models.BooleanField(default=True, help_text="Exiger une majuscule"),
                ),
                (
                    "require_lowercase",
                    models.BooleanField(default=True, help_text="Exiger une minuscule"),
                ),
                (
                    "require_digit",
                    models.BooleanField(default=True, help_text="Exiger un chiffre"),
                ),
                (
                    "require_special_char",
                    models.BooleanField(default=True, help_text="Exiger un caractère spécial"),
                ),
                (
                    "password_expires_days",
                    models.IntegerField(
                        default=90,
                        help_text="Nombre de jours avant expiration du mot de passe (0 = jamais)",
                    ),
                ),
                (
                    "prevent_reuse_count",
                    models.IntegerField(
                        default=5,
                        help_text="Nombre de mots de passe précédents à ne pas réutiliser",
                    ),
                ),
                (
                    "max_failed_attempts",
                    models.IntegerField(
                        default=5, help_text="Tentatives max avant verrouillage"
                    ),
                ),
                (
                    "lockout_duration_minutes",
                    models.IntegerField(default=30, help_text="Durée du verrouillage en minutes"),
                ),
                (
                    "require_2fa_for_admins",
                    models.BooleanField(
                        default=True, help_text="2FA obligatoire pour les admins"
                    ),
                ),
                (
                    "session_timeout_minutes",
                    models.IntegerField(default=60, help_text="Timeout de session en minutes"),
                ),
                (
                    "tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="tenants.tenant"
                    ),
                ),
            ],
            options={
                "verbose_name": "Politique de mot de passe",
                "verbose_name_plural": "Politiques de mot de passe",
                "db_table": "password_policies",
            },
        ),
        migrations.CreateModel(
            name="PasswordHistory",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "password_hash",
                    models.CharField(help_text="Hash du mot de passe", max_length=128),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="password_history",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "password_history",
                "ordering": ("-created_at",),
            },
        ),
        migrations.CreateModel(
            name="SecurityAlert",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "alert_type",
                    models.CharField(
                        choices=[
                            ("multiple_failures", "Échecs multiples"),
                            ("suspicious_ip", "IP suspecte"),
                            ("bulk_operations", "Opérations en masse"),
                            ("permission_escalation", "Escalade de privilèges"),
                            ("unusual_activity", "Activité inhabituelle"),
                        ],
                        max_length=50,
                    ),
                ),
                (
                    "severity",
                    models.CharField(
                        choices=[
                            ("low", "Faible"),
                            ("medium", "Moyen"),
                            ("high", "Élevé"),
                            ("critical", "Critique"),
                        ],
                        max_length=20,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField()),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("is_acknowledged", models.BooleanField(default=False)),
                ("acknowledged_at", models.DateTimeField(blank=True, null=True)),
                (
                    "acknowledged_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="acknowledged_alerts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "security_alerts",
                "ordering": ("-created_at",),
            },
        ),
        # Indexes
        migrations.AddIndex(
            model_name="securityevent",
            index=models.Index(fields=["event_type", "created_at"], name="security_ev_event_t_idx"),
        ),
        migrations.AddIndex(
            model_name="securityevent",
            index=models.Index(fields=["severity", "status"], name="security_ev_severit_idx"),
        ),
        migrations.AddIndex(
            model_name="securityevent",
            index=models.Index(fields=["ip_address", "created_at"], name="security_ev_ip_addr_idx"),
        ),
        migrations.AddIndex(
            model_name="securityevent",
            index=models.Index(fields=["user", "created_at"], name="security_ev_user_id_idx"),
        ),
        migrations.AddIndex(
            model_name="passwordhistory",
            index=models.Index(fields=["user", "created_at"], name="password_h_user_id_idx"),
        ),
        migrations.AddIndex(
            model_name="securityalert",
            index=models.Index(
                fields=["severity", "is_acknowledged"], name="security_al_severit_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="securityalert",
            index=models.Index(fields=["alert_type", "created_at"], name="security_al_alert_t_idx"),
        ),
    ]
