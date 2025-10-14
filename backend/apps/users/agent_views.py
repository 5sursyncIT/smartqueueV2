"""ViewSet pour la gestion des agents (tenant-aware)."""
from __future__ import annotations

from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import HasScope, IsTenantMember, Scopes
from apps.queues.models import Queue, QueueAssignment
from apps.tenants.models import TenantMembership

from .models import AgentProfile, User
from .serializers import AgentSerializer, InviteAgentSerializer


@extend_schema_view(
    list=extend_schema(
        summary="Liste des agents",
        description="Récupère tous les agents du tenant avec leurs queues assignées",
    ),
    retrieve=extend_schema(
        summary="Détails d'un agent",
        description="Récupère les détails d'un agent spécifique",
    ),
    create=extend_schema(
        summary="Créer un agent",
        description="Crée un nouveau profil agent et l'assigne à des queues",
    ),
    update=extend_schema(
        summary="Mettre à jour un agent",
        description="Met à jour un agent et ses assignations",
    ),
    partial_update=extend_schema(
        summary="Mettre à jour partiellement un agent",
        description="Met à jour partiellement un agent",
    ),
    destroy=extend_schema(
        summary="Supprimer un agent",
        description="Supprime un agent et ses assignations",
    ),
)
class AgentViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des agents (tenant-aware)."""

    serializer_class = AgentSerializer
    permission_classes = [IsTenantMember, HasScope(Scopes.MANAGE_AGENT)]

    def get_queryset(self):
        """Retourne tous les agents membres du tenant (avec ou sans queues assignées)."""
        tenant = self.request.tenant

        # Récupérer tous les utilisateurs qui sont agents de ce tenant
        agent_user_ids = TenantMembership.objects.filter(
            tenant=tenant,
            role=TenantMembership.ROLE_AGENT,
            is_active=True,
        ).values_list("user_id", flat=True)

        # Retourner les profils agents correspondants
        return AgentProfile.objects.filter(
            user_id__in=agent_user_ids
        ).select_related("user").order_by("user__email")

    def create(self, request, *args, **kwargs):
        """Crée un agent et ses assignations de queues."""
        tenant = request.tenant
        user_email = request.data.get("user_email")
        queue_ids = request.data.get("queue_ids", [])

        if not user_email:
            return Response(
                {"user_email": ["Ce champ est requis"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier si l'utilisateur existe
        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            return Response(
                {"user_email": ["Utilisateur introuvable avec cet email"]},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Vérifier que l'utilisateur est membre du tenant
        if not TenantMembership.objects.filter(
            user=user, tenant=tenant, is_active=True
        ).exists():
            return Response(
                {"user_email": ["L'utilisateur n'est pas membre de ce tenant"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Créer ou récupérer le profil agent
        agent_profile, created = AgentProfile.objects.get_or_create(user=user)

        # Assigner aux queues
        if queue_ids:
            # Vérifier que toutes les queues appartiennent au tenant
            queues = Queue.objects.filter(id__in=queue_ids, tenant=tenant)
            if queues.count() != len(queue_ids):
                return Response(
                    {"queue_ids": ["Certaines queues n'existent pas ou n'appartiennent pas à ce tenant"]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Créer les assignations
            for queue in queues:
                QueueAssignment.objects.get_or_create(
                    queue=queue,
                    agent=agent_profile,
                    defaults={"is_active": True, "tenant": tenant},
                )

        serializer = self.get_serializer(agent_profile)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Met à jour un agent et ses assignations."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        tenant = request.tenant

        queue_ids = request.data.get("queue_ids")

        if queue_ids is not None:
            # Désactiver les anciennes assignations pour ce tenant
            QueueAssignment.objects.filter(
                agent=instance,
                queue__tenant=tenant,
            ).update(is_active=False)

            # Créer les nouvelles assignations
            if queue_ids:
                queues = Queue.objects.filter(id__in=queue_ids, tenant=tenant)
                if queues.count() != len(queue_ids):
                    return Response(
                        {"queue_ids": ["Certaines queues n'existent pas ou n'appartiennent pas à ce tenant"]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                for queue in queues:
                    QueueAssignment.objects.update_or_create(
                        queue=queue,
                        agent=instance,
                        defaults={"is_active": True, "tenant": tenant},
                    )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Supprime un agent (désactive ses assignations pour ce tenant)."""
        instance = self.get_object()
        tenant = request.tenant

        # Désactiver les assignations pour ce tenant
        QueueAssignment.objects.filter(
            agent=instance,
            queue__tenant=tenant,
        ).update(is_active=False)

        # Note: On ne supprime pas le profil agent car il peut être utilisé par d'autres tenants
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        request=InviteAgentSerializer,
        responses={201: AgentSerializer},
        summary="Inviter un nouvel agent",
        description=(
            "Crée un nouvel utilisateur, l'ajoute comme agent au tenant, "
            "crée son profil agent et l'assigne optionnellement à des queues. "
            "Tout est fait en une seule transaction atomique."
        ),
    )
    @action(detail=False, methods=["post"], url_path="invite")
    def invite_agent(self, request, tenant_slug=None):
        """Invite un nouvel agent (crée User + TenantMembership + AgentProfile + Assignments)."""
        tenant = request.tenant
        serializer = InviteAgentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        email = data["email"]
        password = data["password"]
        first_name = data["first_name"]
        last_name = data["last_name"]
        phone_number = data.get("phone_number", "")
        queue_ids = data.get("queue_ids", [])

        try:
            with transaction.atomic():
                # 1. Créer l'utilisateur
                user = User.objects.create(
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    phone_number=phone_number,
                    is_active=True,
                )
                user.set_password(password)
                user.save()

                # 2. Créer le membership au tenant avec rôle agent
                TenantMembership.objects.create(
                    tenant=tenant,
                    user=user,
                    role=TenantMembership.ROLE_AGENT,
                    is_active=True,
                )

                # 3. Créer le profil agent
                agent_profile = AgentProfile.objects.create(
                    user=user,
                    current_status=AgentProfile.STATUS_AVAILABLE,
                )

                # 4. Assigner aux queues si spécifiées
                if queue_ids:
                    queues = Queue.objects.filter(id__in=queue_ids, tenant=tenant)
                    if queues.count() != len(queue_ids):
                        raise ValueError(
                            "Certaines queues n'existent pas ou n'appartiennent pas à ce tenant"
                        )

                    for queue in queues:
                        QueueAssignment.objects.create(
                            queue=queue,
                            agent=agent_profile,
                            tenant=tenant,
                            is_active=True,
                        )

                # 5. Retourner le profil agent créé
                response_serializer = self.get_serializer(agent_profile)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": f"Erreur lors de la création de l'agent: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
