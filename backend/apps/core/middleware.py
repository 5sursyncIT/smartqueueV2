"""Middleware de résolution du tenant courant."""

from __future__ import annotations

from contextvars import ContextVar

from django.conf import settings
from django.http import Http404, HttpRequest, HttpResponse

from apps.tenants.models import Tenant

_current_tenant: ContextVar[Tenant | None] = ContextVar("current_tenant", default=None)


def get_current_tenant() -> Tenant | None:
    """Expose le tenant courant hors contexte requête (ex : tasks)."""

    return _current_tenant.get()


class TenantMiddleware:
    """Attache le tenant à la requête et le met en contexte."""

    header_name = getattr(settings, "TENANT_HEADER", "HTTP_X_TENANT")
    exempt_path_prefixes: tuple[str, ...] = tuple(
        getattr(
            settings,
            "TENANT_EXEMPT_PATH_PREFIXES",
            (
                "/api/v1/health",
                "/api/v1/auth",
                "/api/v1/admin",  # Super-admin endpoints
                "/api/v1/public/tenants/",  # Liste publique des tenants (pas un tenant spécifique)
                "/api/schema",
                "/api/docs",
                "/admin/",  # Django admin global
            ),
        )
    )

    def __init__(self, get_response):  # type: ignore[no-untyped-def]
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if self._is_exempt_path(request.path):
            request.tenant = None  # type: ignore[attr-defined]
            return self.get_response(request)

        tenant = self._resolve_tenant(request)
        token = _current_tenant.set(tenant)
        request.tenant = tenant  # type: ignore[attr-defined]
        try:
            response = self.get_response(request)
        finally:
            _current_tenant.reset(token)
        return response

    def _is_exempt_path(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self.exempt_path_prefixes)

    def _resolve_tenant(self, request: HttpRequest) -> Tenant:
        if tenant_slug := self._extract_tenant_slug(request):
            try:
                return Tenant.objects.get(slug=tenant_slug, is_active=True)
            except Tenant.DoesNotExist as exc:  # pragma: no cover - protection runtime
                raise Http404("Tenant introuvable") from exc
        raise Http404("Entête ou sous-domaine tenant manquant")

    def _extract_tenant_slug(self, request: HttpRequest) -> str | None:
        if slug := self._tenant_from_path(request.path):
            return slug

        if header_value := request.META.get(self.header_name):
            return header_value

        host = request.get_host().split(":")[0]
        if host.count(".") >= 2:  # ex: tenant.smartqueue.app
            return host.split(".")[0]

        return None

    def _tenant_from_path(self, path: str) -> str | None:
        if "/tenants/" not in path:
            return None
        segments = [segment for segment in path.split("/") if segment]
        try:
            idx = segments.index("tenants")
        except ValueError:
            return None
        if idx + 1 < len(segments):
            return segments[idx + 1]
        return None


class SubscriptionStatusMiddleware:
    """
    Vérifie l'état de la souscription avant chaque requête tenant-scoped.

    Ce middleware bloque l'accès si:
    - Le tenant est suspendu (is_active = False)
    - La souscription est annulée
    - La souscription est suspendue (non-paiement)
    - Le trial est expiré

    NOTE: Ce middleware doit être placé APRÈS TenantMiddleware dans MIDDLEWARE.
    """

    EXEMPT_PATHS = (
        "/api/v1/auth/",
        "/api/v1/health/",
        "/api/v1/public/",
        "/api/v1/admin/",
        "/admin/",
        "/api/schema/",
        "/api/docs/",
    )

    def __init__(self, get_response):  # type: ignore[no-untyped-def]
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Ne s'applique qu'aux requêtes avec tenant
        tenant = getattr(request, "tenant", None)

        if tenant and not self._is_exempt_path(request.path):
            # Vérifier si le tenant est actif
            if not tenant.is_active:
                from django.http import JsonResponse

                return JsonResponse(
                    {
                        "error": "Compte suspendu",
                        "detail": tenant.suspension_reason
                        or "Votre compte a été suspendu. Veuillez contacter le support.",
                        "code": "tenant_suspended",
                    },
                    status=403,
                )

            # Vérifier l'état de la souscription
            if hasattr(tenant, "subscription"):
                sub = tenant.subscription

                # Souscription annulée
                if sub.status == "cancelled":
                    from django.http import JsonResponse

                    return JsonResponse(
                        {
                            "error": "Souscription annulée",
                            "detail": "Votre souscription a été annulée. Veuillez vous réabonner.",
                            "code": "subscription_cancelled",
                        },
                        status=403,
                    )

                # Souscription suspendue (non-paiement)
                if sub.status == "suspended":
                    from django.http import JsonResponse

                    return JsonResponse(
                        {
                            "error": "Paiement requis",
                            "detail": "Votre souscription est suspendue. Veuillez mettre à jour votre paiement.",
                            "code": "subscription_suspended",
                        },
                        status=403,
                    )

                # Trial expiré
                if sub.status == "trial" and hasattr(sub, "trial_ends_at") and sub.trial_ends_at:
                    from django.utils import timezone

                    if timezone.now().date() > sub.trial_ends_at:
                        from django.http import JsonResponse

                        return JsonResponse(
                            {
                                "error": "Période d'essai expirée",
                                "detail": "Votre période d'essai est terminée. Veuillez choisir un plan.",
                                "code": "trial_expired",
                            },
                            status=403,
                        )

        response = self.get_response(request)
        return response

    def _is_exempt_path(self, path: str) -> bool:
        """Vérifie si le path est exempté de vérification."""
        return any(path.startswith(prefix) for prefix in self.EXEMPT_PATHS)
