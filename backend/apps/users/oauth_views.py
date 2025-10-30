"""Vues API pour l'authentification OAuth."""

from __future__ import annotations

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.security.models import SecurityEvent
from apps.security.services import SecurityEventService

from .oauth import OAuthService


@api_view(["POST"])
@permission_classes([AllowAny])
def oauth_get_url(request):
    """Génère l'URL d'autorisation OAuth.

    Body params:
        - provider: google ou microsoft
        - redirect_uri: URL de redirection (optionnel)

    Returns:
        {
            "url": "https://accounts.google.com/...",
            "state": "random_token"
        }
    """
    provider = request.data.get("provider")
    redirect_uri = request.data.get("redirect_uri")

    if not provider:
        return Response(
            {"error": "Le paramètre 'provider' est requis"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        result = OAuthService.get_authorization_url(provider, redirect_uri)
        return Response(result)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def oauth_callback(request):
    """Callback OAuth après autorisation.

    Body params:
        - provider: google ou microsoft
        - code: Code d'autorisation
        - state: State token
        - redirect_uri: URL de redirection (optionnel)

    Returns:
        {
            "access": "jwt_access_token",
            "refresh": "jwt_refresh_token",
            "user": {...},
            "created": true/false
        }
    """
    provider = request.data.get("provider")
    code = request.data.get("code")
    state = request.data.get("state")
    redirect_uri = request.data.get("redirect_uri")

    if not all([provider, code, state]):
        return Response(
            {"error": "Les paramètres 'provider', 'code' et 'state' sont requis"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Authentifier via OAuth
        oauth_data = OAuthService.authenticate(provider, code, state, redirect_uri)

        # Récupérer ou créer l'utilisateur
        user, created = OAuthService.get_or_create_user(oauth_data)

        # Générer des tokens JWT
        refresh = RefreshToken.for_user(user)

        # Log l'événement
        ip_address = SecurityEventService.get_client_ip(request)
        SecurityEventService.log_event(
            event_type=SecurityEvent.EVENT_LOGIN_SUCCESS,
            ip_address=ip_address,
            description=f"Connexion via {provider.upper()} OAuth",
            severity=SecurityEvent.SEVERITY_LOW,
            user=user,
            request=request,
            metadata={
                "provider": provider,
                "email": oauth_data.get("email"),
                "new_user": created,
            },
        )

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "created": created,
                "message": "Compte créé avec succès" if created else "Connexion réussie",
            }
        )

    except ValueError as e:
        # State invalide ou autre erreur
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        # Erreur serveur
        return Response(
            {"error": "Erreur lors de l'authentification OAuth", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def oauth_connections(request):
    """Liste les connexions OAuth de l'utilisateur.

    Returns:
        [
            {
                "provider": "google",
                "email": "user@gmail.com",
                "connected_at": "2025-01-15T10:00:00Z",
                "last_used_at": "2025-01-20T14:30:00Z"
            }
        ]
    """
    from apps.security.oauth_models import OAuthConnection

    connections = OAuthConnection.objects.filter(user=request.user, is_active=True)

    data = [
        {
            "id": str(conn.id),
            "provider": conn.provider,
            "email": conn.email,
            "avatar_url": conn.avatar_url,
            "connected_at": conn.created_at.isoformat(),
            "last_used_at": conn.last_used_at.isoformat(),
        }
        for conn in connections
    ]

    return Response(data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def oauth_disconnect(request, provider):
    """Déconnecte un compte OAuth.

    Args:
        provider: Nom du provider (google, microsoft)

    Returns:
        {"message": "Connexion supprimée"}
    """
    from apps.security.oauth_models import OAuthConnection

    try:
        connection = OAuthConnection.objects.get(
            user=request.user, provider=provider, is_active=True
        )

        # Désactiver la connexion
        connection.is_active = False
        connection.save()

        # Log l'événement
        ip_address = SecurityEventService.get_client_ip(request)
        SecurityEventService.log_event(
            event_type="oauth_disconnected",
            ip_address=ip_address,
            description=f"Déconnexion du compte {provider.upper()}",
            severity=SecurityEvent.SEVERITY_LOW,
            user=request.user,
            request=request,
        )

        return Response({"message": f"Connexion {provider} supprimée avec succès"})

    except OAuthConnection.DoesNotExist:
        return Response(
            {"error": f"Aucune connexion {provider} active trouvée"},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def oauth_link_account(request):
    """Lie un compte OAuth existant à l'utilisateur actuel.

    Body params:
        - provider: google ou microsoft
        - code: Code d'autorisation
        - state: State token
        - redirect_uri: URL de redirection (optionnel)

    Returns:
        {"message": "Compte lié avec succès"}
    """
    provider = request.data.get("provider")
    code = request.data.get("code")
    state = request.data.get("state")
    redirect_uri = request.data.get("redirect_uri")

    if not all([provider, code, state]):
        return Response(
            {"error": "Les paramètres 'provider', 'code' et 'state' sont requis"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Authentifier via OAuth
        oauth_data = OAuthService.authenticate(provider, code, state, redirect_uri)

        # Sauvegarder la connexion pour l'utilisateur actuel
        OAuthService._save_oauth_metadata(request.user, oauth_data)

        # Log l'événement
        ip_address = SecurityEventService.get_client_ip(request)
        SecurityEventService.log_event(
            event_type="oauth_account_linked",
            ip_address=ip_address,
            description=f"Compte {provider.upper()} lié",
            severity=SecurityEvent.SEVERITY_LOW,
            user=request.user,
            request=request,
            metadata={
                "provider": provider,
                "oauth_email": oauth_data.get("email"),
            },
        )

        return Response({"message": f"Compte {provider} lié avec succès"})

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response(
            {"error": "Erreur lors de la liaison du compte", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
