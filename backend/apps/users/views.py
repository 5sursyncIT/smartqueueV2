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

from .models import AgentProfile
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

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated, IsAgent])
    def call_next(self, request):
        """Agent appelle le prochain ticket d'une file."""
        queue_id = request.data.get("queue_id")
        if not queue_id:
            return Response(
                {"error": "queue_id est requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queue = get_object_or_404(Queue, id=queue_id, tenant=request.tenant)
        profile = AgentProfile.objects.get(user=request.user)

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
    def set_status(self, request):
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
