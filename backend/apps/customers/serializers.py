"""Serializers pour les clients."""

from __future__ import annotations

from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer pour Customer."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Customer
        fields = (
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "date_of_birth",
            "language",
            "notify_sms",
            "notify_email",
            "notify_whatsapp",
            "metadata",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "full_name")


class CustomerCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de clients."""

    class Meta:
        model = Customer
        fields = (
            "first_name",
            "last_name",
            "email",
            "phone",
            "date_of_birth",
            "language",
            "notify_sms",
            "notify_email",
            "notify_whatsapp",
            "metadata",
        )
