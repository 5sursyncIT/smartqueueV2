"""ViewSet pour la gestion des agents (tenant-aware)."""
from __future__ import annotations

from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.core.permissions import HasScope, IsTenantMember, Scopes
from apps.queues.models import Queue, QueueAssignment
from apps.tenants.models import TenantMembership

from .models import AgentProfile, User
from .serializers import AgentSerializer


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
        """Retourne les agents qui ont des queues dans ce tenant."""
        tenant = self.request.tenant

        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"AgentViewSet.get_queryset - Tenant: {tenant}, ID: {tenant.id if tenant else 'None'}")

        # Récupérer les agents qui ont au moins une queue assignment dans ce tenant
        agent_ids = QueueAssignment.objects.filter(
            queue__tenant=tenant,
            is_active=True,
        ).values_list("agent_id", flat=True).distinct()

        logger.info(f"AgentViewSet.get_queryset - Agent IDs: {list(agent_ids)}")

        return AgentProfile.objects.filter(
            id__in=agent_ids
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
                    defaults={"is_active": True},
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
                        defaults={"is_active": True},
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
