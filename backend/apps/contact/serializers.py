"""Sérialiseurs pour les messages de contact et demandes d'essai."""

from __future__ import annotations

from rest_framework import serializers

from .models import ContactMessage, TrialRequest


class ContactMessageSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les messages de contact."""
    
    class Meta:
        model = ContactMessage
        fields = [
            "id", "first_name", "last_name", "email", 
            "subject", "message", "created_at"
        ]
        read_only_fields = ["id", "created_at"]
    
    def validate_email(self, value):
        """Validation de l'email."""
        if not value:
            raise serializers.ValidationError("L'adresse email est requise.")
        return value
    
    def validate_message(self, value):
        """Validation du message."""
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError("Le message doit contenir au moins 10 caractères.")
        return value.strip()


class TrialRequestSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les demandes d'essai gratuit."""

    class Meta:
        model = TrialRequest
        fields = [
            "id", "company_name", "industry", "company_size",
            "first_name", "last_name", "email", "phone",
            "message", "status", "created_at"
        ]
        read_only_fields = ["id", "status", "created_at"]

    def validate_company_name(self, value):
        """Validation du nom de l'entreprise."""
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError("Le nom de l'entreprise doit contenir au moins 2 caractères.")
        return value.strip()

    def validate_email(self, value):
        """Validation de l'email."""
        if not value:
            raise serializers.ValidationError("L'email est requis.")
        return value

    def validate_phone(self, value):
        """Validation du téléphone."""
        if not value or len(value.strip()) < 8:
            raise serializers.ValidationError("Le numéro de téléphone doit contenir au moins 8 caractères.")
        return value.strip()

    def validate_message(self, value):
        """Validation du message optionnel."""
        if value and len(value.strip()) > 500:
            raise serializers.ValidationError("Le message ne peut pas dépasser 500 caractères.")
        return value.strip() if value else None

    def create(self, validated_data):
        """Créer une demande d'essai avec métadonnées."""
        request = self.context.get('request')
        if request:
            # Ajouter l'adresse IP et user agent
            validated_data['ip_address'] = request.META.get('REMOTE_ADDR')
            validated_data['user_agent'] = request.META.get('HTTP_USER_AGENT')

        return super().create(validated_data)