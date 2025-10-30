"""Admin pour l'app security."""

from django.contrib import admin

from .models import BlockedIP, PasswordHistory, PasswordPolicy, SecurityAlert, SecurityEvent
from .oauth_models import OAuthConnection


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    """Admin pour les événements de sécurité."""

    list_display = [
        "event_type",
        "severity",
        "status",
        "user_email",
        "ip_address",
        "created_at",
    ]
    list_filter = ["event_type", "severity", "status", "created_at"]
    search_fields = ["user_email", "ip_address", "description"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "created_at"

    fieldsets = (
        (
            "Événement",
            {
                "fields": (
                    "event_type",
                    "severity",
                    "status",
                )
            },
        ),
        (
            "Utilisateur",
            {
                "fields": (
                    "user",
                    "user_email",
                    "ip_address",
                    "user_agent",
                    "location",
                )
            },
        ),
        (
            "Détails",
            {
                "fields": (
                    "description",
                    "metadata",
                )
            },
        ),
        (
            "Résolution",
            {
                "fields": (
                    "resolved_by",
                    "resolved_at",
                    "resolution_notes",
                )
            },
        ),
        (
            "Métadonnées",
            {
                "fields": ("created_at", "updated_at"),
            },
        ),
    )


@admin.register(BlockedIP)
class BlockedIPAdmin(admin.ModelAdmin):
    """Admin pour les IPs bloquées."""

    list_display = [
        "ip_address",
        "reason",
        "is_active",
        "expires_at",
        "created_at",
    ]
    list_filter = ["reason", "is_active", "created_at"]
    search_fields = ["ip_address", "description"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(PasswordPolicy)
class PasswordPolicyAdmin(admin.ModelAdmin):
    """Admin pour les politiques de mot de passe."""

    list_display = [
        "tenant",
        "min_length",
        "require_uppercase",
        "require_digit",
        "max_failed_attempts",
    ]
    list_filter = ["require_2fa_for_admins"]
    search_fields = ["tenant__name"]


@admin.register(SecurityAlert)
class SecurityAlertAdmin(admin.ModelAdmin):
    """Admin pour les alertes de sécurité."""

    list_display = [
        "title",
        "alert_type",
        "severity",
        "is_acknowledged",
        "created_at",
    ]
    list_filter = ["alert_type", "severity", "is_acknowledged", "created_at"]
    search_fields = ["title", "description"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(PasswordHistory)
class PasswordHistoryAdmin(admin.ModelAdmin):
    """Admin pour l'historique des mots de passe."""

    list_display = ["user", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__email"]
    readonly_fields = ["created_at", "updated_at", "password_hash"]


@admin.register(OAuthConnection)
class OAuthConnectionAdmin(admin.ModelAdmin):
    """Admin pour les connexions OAuth."""

    list_display = ["user", "provider", "email", "is_active", "last_used_at", "created_at"]
    list_filter = ["provider", "is_active", "created_at"]
    search_fields = ["user__email", "email", "provider_user_id"]
    readonly_fields = ["created_at", "updated_at", "last_used_at"]

    fieldsets = (
        (
            "Utilisateur",
            {
                "fields": ("user",)
            },
        ),
        (
            "Provider OAuth",
            {
                "fields": ("provider", "provider_user_id", "email", "avatar_url")
            },
        ),
        (
            "Tokens (chiffrés)",
            {
                "fields": ("access_token", "refresh_token", "token_expires_at"),
                "classes": ("collapse",),
            },
        ),
        (
            "Statut",
            {
                "fields": ("is_active", "last_used_at", "metadata")
            },
        ),
        (
            "Métadonnées",
            {
                "fields": ("created_at", "updated_at"),
            },
        ),
    )
