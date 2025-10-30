"""Système de permissions basé sur des scopes et rôles."""

from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.tenants.models import TenantMembership


# Définition des scopes disponibles
class Scopes:
    # Queues
    READ_QUEUE = "read:queue"
    WRITE_QUEUE = "write:queue"
    MANAGE_QUEUE = "manage:queue"

    # Tickets
    READ_TICKET = "read:ticket"
    WRITE_TICKET = "write:ticket"
    MANAGE_TICKET = "manage:ticket"

    # Agents
    READ_AGENT = "read:agent"
    MANAGE_AGENT = "manage:agent"

    # Customers
    READ_CUSTOMER = "read:customer"
    WRITE_CUSTOMER = "write:customer"

    # Reports
    READ_REPORTS = "read:reports"

    # Settings
    MANAGE_SETTINGS = "manage:settings"

    # Notifications
    SEND_NOTIFICATION = "send:notification"

    # Feedback
    READ_FEEDBACK = "read:feedback"

    ALL = [
        READ_QUEUE,
        WRITE_QUEUE,
        MANAGE_QUEUE,
        READ_TICKET,
        WRITE_TICKET,
        MANAGE_TICKET,
        READ_AGENT,
        MANAGE_AGENT,
        READ_CUSTOMER,
        WRITE_CUSTOMER,
        READ_REPORTS,
        MANAGE_SETTINGS,
        SEND_NOTIFICATION,
        READ_FEEDBACK,
    ]


# Mapping des rôles vers les scopes
ROLE_SCOPES = {
    TenantMembership.ROLE_ADMIN: Scopes.ALL,
    TenantMembership.ROLE_MANAGER: [
        Scopes.READ_QUEUE,
        Scopes.WRITE_QUEUE,
        Scopes.MANAGE_QUEUE,
        Scopes.READ_TICKET,
        Scopes.WRITE_TICKET,
        Scopes.MANAGE_TICKET,
        Scopes.READ_AGENT,
        Scopes.MANAGE_AGENT,
        Scopes.READ_CUSTOMER,
        Scopes.WRITE_CUSTOMER,
        Scopes.READ_REPORTS,
        Scopes.SEND_NOTIFICATION,
        Scopes.READ_FEEDBACK,
    ],
    TenantMembership.ROLE_AGENT: [
        Scopes.READ_QUEUE,
        Scopes.READ_TICKET,
        Scopes.WRITE_TICKET,
        Scopes.READ_CUSTOMER,
        Scopes.WRITE_CUSTOMER,
    ],
}


class IsTenantMember(BasePermission):
    """Vérifie que l'utilisateur appartient au tenant."""

    message = "Vous n'êtes pas membre de ce tenant."

    def has_permission(self, request, view):  # type: ignore[override]
        tenant = getattr(request, "tenant", None)
        if not request.user.is_authenticated or tenant is None:
            return False

        return TenantMembership.objects.filter(
            tenant=tenant,
            user=request.user,
            is_active=True,
        ).exists()


class _HasScopeBase(BasePermission):
    """Classe de base pour la vérification de scope."""

    required_scope: str | None = None

    def has_permission(self, request, view):  # type: ignore[override]
        if not request.user.is_authenticated:
            return False

        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return False

        # Récupérer le membership de l'utilisateur
        try:
            membership = TenantMembership.objects.get(
                tenant=tenant,
                user=request.user,
                is_active=True,
            )
        except TenantMembership.DoesNotExist:
            return False

        # Récupérer les scopes du rôle
        user_scopes = ROLE_SCOPES.get(membership.role, [])

        # Vérifier le scope requis
        if self.required_scope:
            return self.required_scope in user_scopes

        # Si pas de scope spécifique, juste vérifier que c'est un membre
        return True


def HasScope(scope: str) -> type[_HasScopeBase]:
    """Factory function pour créer une permission class avec un scope spécifique."""
    return type(
        f"HasScope_{scope.replace(':', '_')}",
        (_HasScopeBase,),
        {"required_scope": scope},
    )


class _HasAnyScopeBase(BasePermission):
    """Classe de base pour la vérification de multiple scopes."""

    scopes: list[str] = []

    def has_permission(self, request, view):  # type: ignore[override]
        if not request.user.is_authenticated:
            return False

        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return False

        try:
            membership = TenantMembership.objects.get(
                tenant=tenant,
                user=request.user,
                is_active=True,
            )
        except TenantMembership.DoesNotExist:
            return False

        user_scopes = ROLE_SCOPES.get(membership.role, [])
        return any(scope in user_scopes for scope in self.scopes)


def HasAnyScope(scopes: list[str]) -> type[_HasAnyScopeBase]:
    """Factory function pour créer une permission class avec plusieurs scopes."""
    scope_names = "_".join(s.replace(":", "_") for s in scopes)
    return type(
        f"HasAnyScope_{scope_names[:50]}",  # Limiter la longueur du nom
        (_HasAnyScopeBase,),
        {"scopes": scopes},
    )


class IsAgent(BasePermission):
    """Vérifie que l'utilisateur est un agent du tenant."""

    def has_permission(self, request, view):  # type: ignore[override]
        if not request.user.is_authenticated:
            return False

        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return False

        return TenantMembership.objects.filter(
            tenant=tenant,
            user=request.user,
            role=TenantMembership.ROLE_AGENT,
            is_active=True,
        ).exists()


class IsManager(BasePermission):
    """Vérifie que l'utilisateur est au moins manager."""

    def has_permission(self, request, view):  # type: ignore[override]
        if not request.user.is_authenticated:
            return False

        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return False

        return TenantMembership.objects.filter(
            tenant=tenant,
            user=request.user,
            role__in=[TenantMembership.ROLE_MANAGER, TenantMembership.ROLE_ADMIN],
            is_active=True,
        ).exists()


class IsSuperAdmin(BasePermission):
    """Vérifie que l'utilisateur est un super-administrateur."""

    message = "Seuls les super-administrateurs peuvent accéder à cette ressource."

    def has_permission(self, request, view):  # type: ignore[override]
        return request.user.is_authenticated and request.user.is_superuser


class HasQuotaForResource(BasePermission):
    """
    Vérifie que le tenant n'a pas atteint sa limite pour la ressource.

    Cette permission s'applique uniquement à la création (POST).
    Le ViewSet doit définir l'attribut `subscription_resource_type` avec une valeur parmi:
    - 'queue'
    - 'site'
    - 'agent'
    - 'ticket'

    Exemple d'utilisation:
        class QueueViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, HasQuotaForResource]
            subscription_resource_type = 'queue'
    """

    def has_permission(self, request, view):  # type: ignore[override]
        # Ne s'applique qu'à POST (création de ressources)
        if request.method != "POST":
            return True

        # Vérifier que le tenant existe
        tenant = getattr(request, "tenant", None)
        if not tenant:
            # Pas de tenant = pas de restriction (endpoints publics par exemple)
            return True

        # Déterminer le type de ressource depuis le ViewSet
        resource_type = getattr(view, "subscription_resource_type", None)
        if not resource_type:
            # Si pas configuré, on autorise (opt-in)
            return True

        # Importer ici pour éviter les imports circulaires
        from apps.core.subscription_enforcement import SubscriptionEnforcement

        # Vérifier le quota selon le type de ressource
        can_create = False

        if resource_type == "queue":
            can_create = SubscriptionEnforcement.can_create_queue(tenant)
        elif resource_type == "site":
            can_create = SubscriptionEnforcement.can_create_site(tenant)
        elif resource_type == "agent":
            can_create = SubscriptionEnforcement.can_create_agent(tenant)
        elif resource_type == "ticket":
            can_create = SubscriptionEnforcement.can_create_ticket(tenant)
        else:
            # Type inconnu, on autorise par défaut
            return True

        # Si la limite est atteinte, définir un message d'erreur personnalisé
        if not can_create:
            self.message = SubscriptionEnforcement.get_quota_error_message(
                resource_type, tenant
            )

        return can_create
