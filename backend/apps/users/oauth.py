"""OAuth 2.0 authentication avec Google et Microsoft."""

from __future__ import annotations

import hashlib
import secrets
from typing import TYPE_CHECKING, Any
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core.cache import cache

if TYPE_CHECKING:
    from apps.users.models import User


class OAuthProvider:
    """Classe de base pour les providers OAuth."""

    def __init__(self):
        self.client_id = None
        self.client_secret = None
        self.redirect_uri = None
        self.scope = []
        self.authorization_url = ""
        self.token_url = ""
        self.user_info_url = ""

    def generate_state(self) -> str:
        """Génère un state token pour CSRF protection.

        Returns:
            str: Token aléatoire
        """
        state = secrets.token_urlsafe(32)
        # Stocker en cache pour validation (15 minutes)
        cache.set(f"oauth_state:{state}", True, timeout=900)
        return state

    def verify_state(self, state: str) -> bool:
        """Vérifie le state token.

        Args:
            state: Token à vérifier

        Returns:
            bool: True si valide
        """
        cache_key = f"oauth_state:{state}"
        is_valid = cache.get(cache_key) is not None

        if is_valid:
            # Supprimer après usage (usage unique)
            cache.delete(cache_key)

        return is_valid

    def get_authorization_url(self, redirect_uri: str | None = None) -> dict[str, str]:
        """Génère l'URL d'autorisation OAuth.

        Args:
            redirect_uri: URL de redirection (optionnel)

        Returns:
            dict: URL et state
        """
        state = self.generate_state()

        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri or self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.scope),
            "state": state,
            "access_type": "offline",  # Pour avoir un refresh token
        }

        url = f"{self.authorization_url}?{urlencode(params)}"

        return {"url": url, "state": state}

    def exchange_code_for_token(self, code: str, redirect_uri: str | None = None) -> dict[str, Any]:
        """Échange le code d'autorisation contre un access token.

        Args:
            code: Code d'autorisation
            redirect_uri: URL de redirection

        Returns:
            dict: Tokens (access_token, refresh_token, etc.)
        """
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": redirect_uri or self.redirect_uri,
            "grant_type": "authorization_code",
        }

        response = requests.post(self.token_url, data=data, timeout=10)
        response.raise_for_status()

        return response.json()

    def get_user_info(self, access_token: str) -> dict[str, Any]:
        """Récupère les informations de l'utilisateur.

        Args:
            access_token: Token d'accès

        Returns:
            dict: Informations utilisateur
        """
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(self.user_info_url, headers=headers, timeout=10)
        response.raise_for_status()

        return response.json()

    def normalize_user_data(self, user_info: dict[str, Any]) -> dict[str, Any]:
        """Normalise les données utilisateur selon le provider.

        Args:
            user_info: Données brutes du provider

        Returns:
            dict: Données normalisées
        """
        raise NotImplementedError("Doit être implémenté par les sous-classes")


class GoogleOAuthProvider(OAuthProvider):
    """Provider OAuth pour Google."""

    def __init__(self):
        super().__init__()
        self.client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
        self.client_secret = getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "")
        self.redirect_uri = getattr(
            settings, "GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:3000/auth/google/callback"
        )
        self.scope = [
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ]
        self.authorization_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"

    def normalize_user_data(self, user_info: dict[str, Any]) -> dict[str, Any]:
        """Normalise les données Google.

        Format Google:
        {
            "id": "123456789",
            "email": "user@gmail.com",
            "verified_email": true,
            "name": "John Doe",
            "given_name": "John",
            "family_name": "Doe",
            "picture": "https://..."
        }
        """
        return {
            "provider": "google",
            "provider_id": user_info.get("id"),
            "email": user_info.get("email"),
            "email_verified": user_info.get("verified_email", False),
            "first_name": user_info.get("given_name", ""),
            "last_name": user_info.get("family_name", ""),
            "full_name": user_info.get("name", ""),
            "avatar_url": user_info.get("picture", ""),
        }


class MicrosoftOAuthProvider(OAuthProvider):
    """Provider OAuth pour Microsoft (Azure AD)."""

    def __init__(self):
        super().__init__()
        self.client_id = getattr(settings, "MICROSOFT_OAUTH_CLIENT_ID", "")
        self.client_secret = getattr(settings, "MICROSOFT_OAUTH_CLIENT_SECRET", "")
        self.redirect_uri = getattr(
            settings,
            "MICROSOFT_OAUTH_REDIRECT_URI",
            "http://localhost:3000/auth/microsoft/callback",
        )
        self.tenant_id = getattr(settings, "MICROSOFT_OAUTH_TENANT_ID", "common")
        self.scope = [
            "openid",
            "profile",
            "email",
            "User.Read",
        ]
        self.authorization_url = (
            f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/authorize"
        )
        self.token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        self.user_info_url = "https://graph.microsoft.com/v1.0/me"

    def normalize_user_data(self, user_info: dict[str, Any]) -> dict[str, Any]:
        """Normalise les données Microsoft.

        Format Microsoft Graph:
        {
            "id": "abc-def-123",
            "userPrincipalName": "user@company.com",
            "mail": "user@company.com",
            "displayName": "John Doe",
            "givenName": "John",
            "surname": "Doe"
        }
        """
        return {
            "provider": "microsoft",
            "provider_id": user_info.get("id"),
            "email": user_info.get("mail") or user_info.get("userPrincipalName"),
            "email_verified": True,  # Microsoft vérifie toujours l'email
            "first_name": user_info.get("givenName", ""),
            "last_name": user_info.get("surname", ""),
            "full_name": user_info.get("displayName", ""),
            "avatar_url": "",  # Nécessite un appel séparé à /me/photo
        }


class OAuthService:
    """Service pour gérer l'authentification OAuth."""

    PROVIDERS = {
        "google": GoogleOAuthProvider,
        "microsoft": MicrosoftOAuthProvider,
    }

    @staticmethod
    def get_provider(provider_name: str) -> OAuthProvider:
        """Récupère une instance de provider.

        Args:
            provider_name: Nom du provider (google, microsoft)

        Returns:
            OAuthProvider: Instance du provider

        Raises:
            ValueError: Si le provider n'existe pas
        """
        provider_class = OAuthService.PROVIDERS.get(provider_name.lower())
        if not provider_class:
            raise ValueError(f"Provider OAuth inconnu: {provider_name}")

        return provider_class()

    @staticmethod
    def get_authorization_url(provider_name: str, redirect_uri: str | None = None) -> dict[str, str]:
        """Génère l'URL d'autorisation pour un provider.

        Args:
            provider_name: Nom du provider
            redirect_uri: URL de redirection

        Returns:
            dict: URL et state
        """
        provider = OAuthService.get_provider(provider_name)
        return provider.get_authorization_url(redirect_uri)

    @staticmethod
    def authenticate(provider_name: str, code: str, state: str, redirect_uri: str | None = None) -> dict[str, Any]:
        """Authentifie un utilisateur via OAuth.

        Args:
            provider_name: Nom du provider
            code: Code d'autorisation
            state: State token pour CSRF protection
            redirect_uri: URL de redirection

        Returns:
            dict: Données utilisateur normalisées + tokens

        Raises:
            ValueError: Si le state est invalide
        """
        provider = OAuthService.get_provider(provider_name)

        # Vérifier le state (CSRF protection)
        if not provider.verify_state(state):
            raise ValueError("State token invalide ou expiré")

        # Échanger le code contre un token
        token_data = provider.exchange_code_for_token(code, redirect_uri)

        # Récupérer les infos utilisateur
        access_token = token_data.get("access_token")
        user_info = provider.get_user_info(access_token)

        # Normaliser les données
        normalized_data = provider.normalize_user_data(user_info)

        # Ajouter les tokens
        normalized_data["access_token"] = access_token
        normalized_data["refresh_token"] = token_data.get("refresh_token")
        normalized_data["expires_in"] = token_data.get("expires_in")

        return normalized_data

    @staticmethod
    def get_or_create_user(oauth_data: dict[str, Any]) -> tuple[User, bool]:
        """Récupère ou crée un utilisateur à partir des données OAuth.

        Args:
            oauth_data: Données OAuth normalisées

        Returns:
            tuple: (User, created)
        """
        from apps.users.models import User

        email = oauth_data.get("email")
        if not email:
            raise ValueError("Email manquant dans les données OAuth")

        # Chercher l'utilisateur par email
        try:
            user = User.objects.get(email=email)
            created = False

            # Mettre à jour les infos si nécessaire
            if not user.first_name and oauth_data.get("first_name"):
                user.first_name = oauth_data["first_name"]
            if not user.last_name and oauth_data.get("last_name"):
                user.last_name = oauth_data["last_name"]
            user.save()

        except User.DoesNotExist:
            # Créer un nouvel utilisateur
            user = User.objects.create(
                email=email,
                first_name=oauth_data.get("first_name", ""),
                last_name=oauth_data.get("last_name", ""),
                is_active=True,
            )

            # Pas de mot de passe (authentification OAuth uniquement)
            user.set_unusable_password()
            user.save()

            created = True

        # Sauvegarder les métadonnées OAuth
        OAuthService._save_oauth_metadata(user, oauth_data)

        return user, created

    @staticmethod
    def _save_oauth_metadata(user: User, oauth_data: dict[str, Any]) -> None:
        """Sauvegarde les métadonnées OAuth.

        Args:
            user: L'utilisateur
            oauth_data: Données OAuth
        """
        from apps.security.models import OAuthConnection

        provider = oauth_data.get("provider")
        provider_id = oauth_data.get("provider_id")

        if not provider or not provider_id:
            return

        # Créer ou mettre à jour la connexion OAuth
        OAuthConnection.objects.update_or_create(
            user=user,
            provider=provider,
            defaults={
                "provider_user_id": provider_id,
                "access_token": oauth_data.get("access_token", ""),
                "refresh_token": oauth_data.get("refresh_token", ""),
                "email": oauth_data.get("email", ""),
                "avatar_url": oauth_data.get("avatar_url", ""),
                "metadata": {
                    "email_verified": oauth_data.get("email_verified", False),
                    "full_name": oauth_data.get("full_name", ""),
                },
            },
        )


class PKCEHelper:
    """Helper pour PKCE (Proof Key for Code Exchange) - sécurité renforcée OAuth."""

    @staticmethod
    def generate_code_verifier() -> str:
        """Génère un code verifier aléatoire.

        Returns:
            str: Code verifier (43-128 caractères)
        """
        return secrets.token_urlsafe(64)[:128]

    @staticmethod
    def generate_code_challenge(code_verifier: str) -> str:
        """Génère un code challenge à partir du verifier.

        Args:
            code_verifier: Le code verifier

        Returns:
            str: Code challenge (SHA256 base64url)
        """
        import base64

        digest = hashlib.sha256(code_verifier.encode()).digest()
        challenge = base64.urlsafe_b64encode(digest).decode().rstrip("=")
        return challenge
