from __future__ import annotations

from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.core.permissions import ROLE_SCOPES
from apps.tenants.models import TenantMembership

from .models import AgentProfile, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_active", "created_at", "updated_at")


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer pour le changement de mot de passe."""

    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)


class AgentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AgentProfile
        fields = ("id", "user", "current_status", "status_updated_at")
        read_only_fields = ("id", "user", "status_updated_at")


class AgentSerializer(serializers.ModelSerializer):
    """Serializer pour les agents avec leurs queues assignées."""
    user = UserSerializer(read_only=True)
    user_email = serializers.EmailField(write_only=True, required=False)
    site = serializers.SerializerMethodField()
    queues = serializers.SerializerMethodField()
    status = serializers.CharField(source='current_status', read_only=True)
    is_active = serializers.BooleanField(default=True, read_only=True)
    max_concurrent_tickets = serializers.IntegerField(default=1, read_only=True)
    site_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    queue_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        allow_empty=True
    )

    class Meta:
        model = AgentProfile
        fields = (
            "id",
            "user",
            "user_email",
            "status",
            "is_active",
            "site",
            "site_id",
            "queues",
            "queue_ids",
            "max_concurrent_tickets",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_site(self, obj):
        """Retourne le site principal basé sur les queues assignées."""
        from apps.queues.models import QueueAssignment
        assignment = QueueAssignment.objects.filter(
            agent=obj,
            is_active=True
        ).select_related('queue__site').first()

        if assignment and assignment.queue.site:
            return {
                'id': str(assignment.queue.site.id),
                'name': assignment.queue.site.name,
            }
        return None

    def get_queues(self, obj):
        """Retourne les queues assignées à cet agent."""
        from apps.queues.models import QueueAssignment
        assignments = QueueAssignment.objects.filter(
            agent=obj,
            is_active=True
        ).select_related('queue')

        return [
            {
                'id': str(assignment.queue.id),
                'name': assignment.queue.name,
            }
            for assignment in assignments
        ]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):  # type: ignore[override]
        email = attrs.get("email")
        password = attrs.get("password")
        user = authenticate(
            request=self.context.get("request"),
            email=email,
            password=password,
        )
        if not user:
            raise serializers.ValidationError("Identifiants invalides")
        attrs["user"] = user
        return attrs


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Serializer JWT personnalisé avec scopes et tenants dans le payload."""

    username_field = 'email'

    def validate(self, attrs):  # type: ignore[override]
        """Valide les credentials et génère le token."""
        # Use default validation from parent class
        data = super().validate(attrs)
        return data

    @classmethod
    def get_token(cls, user):
        """Ajoute les claims personnalisés au token."""
        token = super().get_token(user)

        # Informations utilisateur de base
        token["email"] = user.email
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name
        token["is_superuser"] = user.is_superuser
        token["is_staff"] = user.is_staff

        # Récupérer tous les tenants de l'utilisateur avec leurs rôles
        memberships = TenantMembership.objects.filter(
            user=user,
            is_active=True,
        ).select_related("tenant")

        tenants_data = []
        for membership in memberships:
            # Récupérer les scopes basés sur le rôle
            scopes = ROLE_SCOPES.get(membership.role, [])

            tenants_data.append({
                "tenant_id": str(membership.tenant.id),
                "tenant_slug": membership.tenant.slug,
                "tenant_name": membership.tenant.name,
                "role": membership.role,
                "scopes": scopes,
            })

        token["tenants"] = tenants_data

        # Pour compatibilité : ajouter le premier tenant comme "current"
        if tenants_data:
            token["current_tenant"] = tenants_data[0]["tenant_slug"]
            token["current_role"] = tenants_data[0]["role"]
            token["scopes"] = tenants_data[0]["scopes"]
        else:
            # Pour les superusers sans tenant membership
            token["current_tenant"] = None
            token["current_role"] = None
            token["scopes"] = []

        return token
