from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import HasScope, IsAgent, IsTenantMember, Scopes
from apps.queues.models import Queue
from apps.queues.services import QueueService
from apps.tenants.models import TenantMembership

from .models import AgentProfile, User
from .serializers import AgentProfileSerializer, LoginSerializer, UserSerializer


@extend_schema_view(
    create=extend_schema(request=LoginSerializer, responses={200: UserSerializer}),
)
class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer  # Pour drf_spectacular

    def create(self, request):  # type: ignore[override]
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
            }
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def logout(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    list=extend_schema(responses={200: AgentProfileSerializer}),
    partial_update=extend_schema(
        request=AgentProfileSerializer,
        responses={200: AgentProfileSerializer}
    ),
)
class AgentStatusViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsTenantMember]
    serializer_class = AgentProfileSerializer  # Pour drf_spectacular

    def list(self, request):  # type: ignore[override]
        profile, _ = AgentProfile.objects.get_or_create(user=request.user)
        return Response(AgentProfileSerializer(profile).data)

    def partial_update(self, request, pk=None):  # type: ignore[override]
        profile, _ = AgentProfile.objects.get_or_create(user=request.user)
        serializer = AgentProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self._broadcast_status(profile)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def call_next(self, request, tenant_slug=None):
        """Agent appelle le prochain ticket d'une file."""
        print(f"[DEBUG call_next] User: {request.user.email}, Authenticated: {request.user.is_authenticated}")
        print(f"[DEBUG call_next] Tenant: {getattr(request, 'tenant', None)}")
        queue_id = request.data.get("queue_id")

        # Si aucun queue_id n'est fourni, utiliser la première file active
        if not queue_id:
            from apps.queues.models import Queue
            queue = Queue.objects.filter(tenant=request.tenant, status='active').first()
            if not queue:
                return Response(
                    {"error": "Aucune file active disponible"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            queue = get_object_or_404(Queue, id=queue_id, tenant=request.tenant)

        profile, _ = AgentProfile.objects.get_or_create(user=request.user)

        try:
            ticket = QueueService.call_next(profile, queue)
            if not ticket:
                return Response(
                    {"message": "Aucun ticket en attente dans cette file"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            from apps.tickets.serializers import TicketSerializer

            return Response(TicketSerializer(ticket).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated, IsAgent])
    def set_status(self, request, tenant_slug=None):
        """Change le statut de l'agent."""
        new_status = request.data.get("status")
        if not new_status:
            return Response(
                {"error": "status est requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = AgentProfile.objects.get(user=request.user)

        try:
            profile.set_status(new_status)
            self._broadcast_status(profile)
            return Response(AgentProfileSerializer(profile).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def _broadcast_status(self, profile: AgentProfile) -> None:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        membership = profile.user.tenant_memberships.filter(is_active=True).first()
        tenant_slug = membership.tenant.slug if membership else "global"
        async_to_sync(channel_layer.group_send)(
            f"agent:{tenant_slug}:{profile.user_id}",
            {
                "type": "status_updated",
                "payload": {
                    "agent_id": str(profile.user_id),
                    "status": profile.current_status,
                    "updated_at": profile.status_updated_at.isoformat(),
                },
            },
        )


@extend_schema_view(
    list=extend_schema(responses={200: UserSerializer(many=True)}),
    retrieve=extend_schema(responses={200: UserSerializer}),
    create=extend_schema(request=UserSerializer, responses={201: UserSerializer}),
    partial_update=extend_schema(request=UserSerializer, responses={200: UserSerializer}),
    destroy=extend_schema(responses={204: None}),
)
class UserViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion CRUD des utilisateurs (super-admin uniquement)."""

    queryset = User.objects.all().prefetch_related('tenant_memberships__tenant')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Retourne tous les utilisateurs avec leurs memberships."""
        queryset = super().get_queryset()

        # Annoter avec les informations de tenants
        return queryset

    def list(self, request, *args, **kwargs):
        """Liste tous les utilisateurs avec leurs tenants."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Enrichir avec les données de tenants
        data = []
        for user_data, user_obj in zip(serializer.data, queryset):
            memberships = TenantMembership.objects.filter(
                user=user_obj,
                is_active=True
            ).select_related('tenant')

            user_data['tenants'] = [
                {
                    'tenant_id': str(m.tenant.id),
                    'tenant_name': m.tenant.name,
                    'tenant_slug': m.tenant.slug,
                    'role': m.role,
                }
                for m in memberships
            ]
            data.append(user_data)

        return Response(data)

    def retrieve(self, request, *args, **kwargs):
        """Récupère un utilisateur avec ses tenants."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        # Enrichir avec les données de tenants
        data = serializer.data
        memberships = TenantMembership.objects.filter(
            user=instance,
            is_active=True
        ).select_related('tenant')

        data['tenants'] = [
            {
                'tenant_id': str(m.tenant.id),
                'tenant_name': m.tenant.name,
                'tenant_slug': m.tenant.slug,
                'role': m.role,
            }
            for m in memberships
        ]

        return Response(data)

    def create(self, request, *args, **kwargs):
        """Crée un nouvel utilisateur."""
        # Extraire le mot de passe
        password = request.data.get('password')
        if not password:
            return Response(
                {'password': ['Ce champ est requis.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Créer l'utilisateur
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Créer avec le mot de passe hashé
        user = User.objects.create(
            email=serializer.validated_data['email'],
            first_name=serializer.validated_data['first_name'],
            last_name=serializer.validated_data['last_name'],
            phone_number=serializer.validated_data.get('phone_number', ''),
            is_active=True,
        )
        user.set_password(password)

        # Définir is_superuser et is_staff si fournis
        if 'is_superuser' in request.data:
            user.is_superuser = request.data['is_superuser']
        if 'is_staff' in request.data:
            user.is_staff = request.data['is_staff']

        user.save()

        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )

    def partial_update(self, request, *args, **kwargs):
        """Met à jour un utilisateur."""
        instance = self.get_object()

        # Si un mot de passe est fourni, le mettre à jour
        password = request.data.get('password')
        if password:
            instance.set_password(password)
            # Ne pas inclure le password dans la serialization
            data = {k: v for k, v in request.data.items() if k != 'password'}
        else:
            data = request.data

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Supprime un utilisateur."""
        instance = self.get_object()

        # Empêcher la suppression de soi-même
        if instance.id == request.user.id:
            return Response(
                {'error': 'Vous ne pouvez pas supprimer votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def assign_tenant(self, request, pk=None):
        """Assigne un utilisateur à une organisation avec un rôle."""
        user = self.get_object()
        tenant_id = request.data.get('tenant_id')
        role = request.data.get('role')

        if not tenant_id or not role:
            return Response(
                {'error': 'tenant_id and role are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate role
        valid_roles = ['admin', 'manager', 'agent']
        if role not in valid_roles:
            return Response(
                {'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate tenant exists
        from apps.tenants.models import Tenant
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create or update membership
        membership, created = TenantMembership.objects.update_or_create(
            user=user,
            tenant=tenant,
            defaults={'role': role, 'is_active': True}
        )

        return Response({
            'message': 'User assigned to tenant successfully',
            'membership': {
                'tenant_id': str(tenant.id),
                'tenant_name': tenant.name,
                'tenant_slug': tenant.slug,
                'role': membership.role,
                'created': created,
            }
        })
