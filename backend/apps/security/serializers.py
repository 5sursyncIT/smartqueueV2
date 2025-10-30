"""Serializers pour l'API de sécurité."""

from rest_framework import serializers

from .models import BlockedIP, PasswordPolicy, SecurityAlert, SecurityEvent


class SecurityEventSerializer(serializers.ModelSerializer):
    """Serializer pour les événements de sécurité."""

    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    user_display = serializers.SerializerMethodField()

    class Meta:
        model = SecurityEvent
        fields = [
            "id",
            "event_type",
            "event_type_display",
            "severity",
            "severity_display",
            "status",
            "status_display",
            "user",
            "user_display",
            "user_email",
            "ip_address",
            "user_agent",
            "location",
            "description",
            "metadata",
            "resolved_by",
            "resolved_at",
            "resolution_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_user_display(self, obj):
        """Retourne le nom d'affichage de l'utilisateur."""
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
        return obj.user_email or "-"


class SecurityEventStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques d'événements de sécurité."""

    total_events = serializers.IntegerField()
    events_by_severity = serializers.DictField()
    events_by_type = serializers.DictField()
    recent_events = SecurityEventSerializer(many=True)


class BlockedIPSerializer(serializers.ModelSerializer):
    """Serializer pour les IPs bloquées."""

    reason_display = serializers.CharField(source="get_reason_display", read_only=True)
    blocked_by_display = serializers.SerializerMethodField()

    class Meta:
        model = BlockedIP
        fields = [
            "id",
            "ip_address",
            "reason",
            "reason_display",
            "description",
            "blocked_by",
            "blocked_by_display",
            "expires_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_blocked_by_display(self, obj):
        """Retourne le nom de l'utilisateur qui a bloqué."""
        if obj.blocked_by:
            return obj.blocked_by.email
        return "System"


class PasswordPolicySerializer(serializers.ModelSerializer):
    """Serializer pour les politiques de mot de passe."""

    tenant_name = serializers.CharField(source="tenant.name", read_only=True)

    class Meta:
        model = PasswordPolicy
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "min_length",
            "require_uppercase",
            "require_lowercase",
            "require_digit",
            "require_special_char",
            "password_expires_days",
            "prevent_reuse_count",
            "max_failed_attempts",
            "lockout_duration_minutes",
            "require_2fa_for_admins",
            "session_timeout_minutes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SecurityAlertSerializer(serializers.ModelSerializer):
    """Serializer pour les alertes de sécurité."""

    alert_type_display = serializers.CharField(source="get_alert_type_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    acknowledged_by_display = serializers.SerializerMethodField()

    class Meta:
        model = SecurityAlert
        fields = [
            "id",
            "alert_type",
            "alert_type_display",
            "severity",
            "severity_display",
            "title",
            "description",
            "metadata",
            "is_acknowledged",
            "acknowledged_by",
            "acknowledged_by_display",
            "acknowledged_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_acknowledged_by_display(self, obj):
        """Retourne le nom de l'utilisateur qui a accusé réception."""
        if obj.acknowledged_by:
            return obj.acknowledged_by.email
        return None


class TwoFactorSetupSerializer(serializers.Serializer):
    """Serializer pour la configuration 2FA."""

    method = serializers.ChoiceField(choices=["totp", "sms"])
    phone_number = serializers.CharField(required=False, allow_blank=True)


class TwoFactorVerifySerializer(serializers.Serializer):
    """Serializer pour la vérification 2FA."""

    code = serializers.CharField(max_length=6, min_length=6)


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer pour le changement de mot de passe."""

    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        """Valide que les mots de passe correspondent."""
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Les mots de passe ne correspondent pas"}
            )
        return data
