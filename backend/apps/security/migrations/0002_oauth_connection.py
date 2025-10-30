"""Migration pour ajouter le modèle OAuthConnection."""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("security", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="OAuthConnection",
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
                    "provider",
                    models.CharField(
                        choices=[
                            ("google", "Google"),
                            ("microsoft", "Microsoft"),
                            ("github", "GitHub"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "provider_user_id",
                    models.CharField(
                        help_text="ID de l'utilisateur chez le provider", max_length=255
                    ),
                ),
                ("access_token", models.TextField(help_text="Token d'accès (chiffré)")),
                (
                    "refresh_token",
                    models.TextField(blank=True, help_text="Token de rafraîchissement (chiffré)"),
                ),
                ("token_expires_at", models.DateTimeField(blank=True, null=True)),
                ("email", models.EmailField(help_text="Email du compte externe", max_length=254)),
                ("avatar_url", models.URLField(blank=True, max_length=500)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("is_active", models.BooleanField(default=True)),
                ("last_used_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="oauth_connections",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "oauth_connections",
            },
        ),
        migrations.AddConstraint(
            model_name="oauthconnection",
            constraint=models.UniqueConstraint(fields=("user", "provider"), name="unique_user_provider"),
        ),
        migrations.AddIndex(
            model_name="oauthconnection",
            index=models.Index(fields=["provider", "provider_user_id"], name="oauth_conn_provide_idx"),
        ),
        migrations.AddIndex(
            model_name="oauthconnection",
            index=models.Index(fields=["user", "is_active"], name="oauth_conn_user_id_idx"),
        ),
    ]
