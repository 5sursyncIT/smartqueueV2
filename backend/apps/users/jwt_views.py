"""Views pour l'authentification JWT."""

from __future__ import annotations

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from .serializers import CustomTokenObtainPairSerializer, UserSerializer, ChangePasswordSerializer


@extend_schema_view(
    post=extend_schema(
        request=CustomTokenObtainPairSerializer,
        responses={200: dict},
        summary="Obtenir un JWT token",
        description="Authentification par email/password. Retourne access + refresh tokens avec scopes et tenants.",
    )
)
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Endpoint pour obtenir un JWT token avec scopes et tenant information.

    Le payload du token contient:
    - user_id, email, first_name, last_name
    - tenants: liste des tenants avec rôles et scopes
    - current_tenant, current_role, scopes (premier tenant par défaut)
    """

    serializer_class = CustomTokenObtainPairSerializer


@extend_schema(
    request={"refresh": str},
    responses={200: dict},
    summary="Rafraîchir le JWT token",
    description="Obtenir un nouveau access token avec un refresh token valide.",
)
class CustomTokenRefreshView(TokenRefreshView):
    """Endpoint pour rafraîchir un JWT token."""

    pass


@extend_schema(
    request={"token": str},
    responses={200: dict},
    summary="Vérifier la validité d'un JWT token",
)
class CustomTokenVerifyView(TokenVerifyView):
    """Endpoint pour vérifier la validité d'un token JWT."""

    pass


@extend_schema(
    request={"refresh": str},
    responses={205: None},
    summary="Révoquer (blacklist) un refresh token",
    description="Invalide un refresh token en l'ajoutant à la blacklist.",
)
class TokenBlacklistView(APIView):
    """Endpoint pour révoquer un refresh token (logout)."""

    permission_classes = [AllowAny]

    def post(self, request):
        """Ajoute le refresh token à la blacklist."""
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response(
                    {"error": "Refresh token requis"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(
                {"message": "Token révoqué avec succès"},
                status=status.HTTP_205_RESET_CONTENT,
            )
        except (InvalidToken, TokenError) as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema_view(
    get=extend_schema(
        responses={200: UserSerializer},
        summary="Informations utilisateur courant (JWT)",
        description="Retourne les informations de l'utilisateur authentifié via JWT.",
    ),
    patch=extend_schema(
        request=UserSerializer,
        responses={200: UserSerializer},
        summary="Mettre à jour le profil utilisateur",
        description="Met à jour les informations de l'utilisateur authentifié (first_name, last_name, email).",
    ),
)
class JWTMeView(APIView):
    """Endpoint pour récupérer et mettre à jour les informations de l'utilisateur courant (JWT)."""

    def get(self, request):
        """Retourne l'utilisateur courant."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Met à jour l'utilisateur courant."""
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=ChangePasswordSerializer,
    responses={200: {"message": str}},
    summary="Changer le mot de passe",
    description="Change le mot de passe de l'utilisateur authentifié.",
)
class ChangePasswordView(APIView):
    """Endpoint pour changer le mot de passe de l'utilisateur courant."""

    def post(self, request):
        """Change le mot de passe."""
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            # Vérifier l'ancien mot de passe
            user = request.user
            if not user.check_password(serializer.validated_data["old_password"]):
                return Response(
                    {"old_password": ["Mot de passe incorrect"]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Définir le nouveau mot de passe
            user.set_password(serializer.validated_data["new_password"])
            user.save()

            return Response(
                {"message": "Mot de passe changé avec succès"},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
