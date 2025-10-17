"""
Serializers pour les modèles core (SystemConfig, FeatureFlag).
"""
from rest_framework import serializers
from apps.core.models import SystemConfig, FeatureFlag


class SystemConfigSerializer(serializers.ModelSerializer):
    """Serializer pour la configuration système."""

    class Meta:
        model = SystemConfig
        fields = [
            "platform_name",
            "default_language",
            "default_timezone",
            "default_currency",
            "maintenance_mode",
            "registration_enabled",
            "email_notifications",
            "sms_notifications",
            "push_notifications",
            "max_upload_size_mb",
            "session_timeout_minutes",
            "password_min_length",
            "require_email_verification",
            "require_2fa",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class FeatureFlagSerializer(serializers.ModelSerializer):
    """Serializer pour les feature flags."""

    class Meta:
        model = FeatureFlag
        fields = [
            "id",
            "name",
            "key",
            "description",
            "enabled",
            "category",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
