"""Middlewares de sécurité pour protéger l'application."""

from __future__ import annotations

import logging
from typing import Callable

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils import timezone

from .models import SecurityEvent
from .services import (
    AttackDetectionService,
    IPBlockingService,
    RateLimitService,
    SecurityEventService,
)

logger = logging.getLogger(__name__)


class IPBlockingMiddleware:
    """Middleware pour bloquer les IPs malveillantes."""

    # IPs exemptées (développement local)
    EXEMPT_IPS = ['127.0.0.1', 'localhost', '::1']

    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Récupérer l'IP du client
        ip_address = SecurityEventService.get_client_ip(request)

        # Ignorer les IPs exemptées (localhost, etc.)
        if ip_address in self.EXEMPT_IPS:
            return self.get_response(request)

        # Vérifier si l'IP est bloquée
        if IPBlockingService.is_ip_blocked(ip_address):
            logger.warning(f"Blocked IP attempted access: {ip_address}")

            # Enregistrer l'événement
            SecurityEventService.log_event(
                event_type=SecurityEvent.EVENT_PERMISSION_DENIED,
                ip_address=ip_address,
                description="Tentative d'accès depuis une IP bloquée",
                severity=SecurityEvent.SEVERITY_HIGH,
                request=request,
            )

            return JsonResponse(
                {"error": "Access denied", "message": "Your IP address has been blocked"},
                status=403,
            )

        response = self.get_response(request)
        return response


class RateLimitMiddleware:
    """Middleware pour limiter le nombre de requêtes par IP."""

    # Configuration du rate limiting
    RATE_LIMIT_CONFIG = {
        "/api/v1/auth/": {"max_requests": 10, "window_seconds": 60},  # 10 req/min pour l'auth
        "/api/": {"max_requests": 100, "window_seconds": 60},  # 100 req/min pour l'API
    }

    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Ignorer pour les superusers
        if request.user.is_authenticated and request.user.is_superuser:
            return self.get_response(request)

        # Récupérer l'IP du client
        ip_address = SecurityEventService.get_client_ip(request)
        path = request.path

        # Trouver la configuration de rate limit appropriée
        config = None
        for prefix, limit_config in self.RATE_LIMIT_CONFIG.items():
            if path.startswith(prefix):
                config = limit_config
                break

        if not config:
            # Pas de rate limit pour ce endpoint
            return self.get_response(request)

        # Vérifier le rate limit
        key = f"{path}:{ip_address}"
        is_allowed, remaining = RateLimitService.check_rate_limit(
            key, config["max_requests"], config["window_seconds"]
        )

        if not is_allowed:
            logger.warning(f"Rate limit exceeded for IP: {ip_address} on {path}")

            # Enregistrer l'événement
            SecurityEventService.log_event(
                event_type=SecurityEvent.EVENT_API_RATE_LIMIT,
                ip_address=ip_address,
                description=f"Rate limit dépassé sur {path}",
                severity=SecurityEvent.SEVERITY_MEDIUM,
                request=request,
            )

            # Bloquer l'IP si trop d'abus (optionnel)
            abuse_key = f"rate_limit_abuse:{ip_address}"
            abuse_count = RateLimitService.check_rate_limit(abuse_key, 10, 3600)[1]
            if abuse_count == 0:  # 10ème abus en 1h
                IPBlockingService.block_ip(
                    ip_address=ip_address,
                    reason="brute_force",
                    description="Rate limit dépassé de manière répétée",
                    duration_hours=24,
                )

            return JsonResponse(
                {
                    "error": "Rate limit exceeded",
                    "message": "Too many requests. Please try again later.",
                },
                status=429,
            )

        response = self.get_response(request)

        # Ajouter les headers de rate limit
        response["X-RateLimit-Limit"] = str(config["max_requests"])
        response["X-RateLimit-Remaining"] = str(remaining)

        return response


class AttackDetectionMiddleware:
    """Middleware pour détecter les tentatives d'attaque."""

    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        ip_address = SecurityEventService.get_client_ip(request)

        # Vérifier les paramètres GET
        for key, value in request.GET.items():
            if self._check_attack_patterns(value, ip_address, request, key):
                return JsonResponse({"error": "Invalid request"}, status=400)

        # Vérifier le body pour les requêtes POST/PUT/PATCH
        if request.method in ["POST", "PUT", "PATCH"] and request.body:
            try:
                body_str = request.body.decode("utf-8")
                if self._check_attack_patterns(body_str, ip_address, request, "body"):
                    return JsonResponse({"error": "Invalid request"}, status=400)
            except Exception:
                pass  # Ignore les erreurs de décodage

        response = self.get_response(request)
        return response

    def _check_attack_patterns(
        self, value: str, ip_address: str, request: HttpRequest, param_name: str
    ) -> bool:
        """Vérifie les patterns d'attaque dans une valeur.

        Returns:
            bool: True si une attaque est détectée
        """
        # Détection SQL Injection
        if AttackDetectionService.detect_sql_injection(value):
            logger.critical(
                f"SQL injection attempt detected from {ip_address} in parameter '{param_name}'"
            )

            SecurityEventService.log_event(
                event_type=SecurityEvent.EVENT_SQL_INJECTION_ATTEMPT,
                ip_address=ip_address,
                description=f"Tentative d'injection SQL détectée dans '{param_name}': {value[:100]}",
                severity=SecurityEvent.SEVERITY_CRITICAL,
                request=request,
            )

            # Bloquer immédiatement l'IP
            IPBlockingService.block_ip(
                ip_address=ip_address,
                reason="suspicious",
                description="Tentative d'injection SQL détectée",
                duration_hours=72,
            )

            return True

        # Détection XSS
        if AttackDetectionService.detect_xss(value):
            logger.warning(f"XSS attempt detected from {ip_address} in parameter '{param_name}'")

            SecurityEventService.log_event(
                event_type=SecurityEvent.EVENT_XSS_ATTEMPT,
                ip_address=ip_address,
                description=f"Tentative XSS détectée dans '{param_name}': {value[:100]}",
                severity=SecurityEvent.SEVERITY_HIGH,
                request=request,
            )

            return True

        return False


class SecurityHeadersMiddleware:
    """Middleware pour ajouter les headers de sécurité."""

    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)

        # Content Security Policy
        response["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self';"
        )

        # Protection XSS
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "DENY"
        response["X-XSS-Protection"] = "1; mode=block"

        # HSTS (Strict-Transport-Security)
        response["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Referrer Policy
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy (anciennement Feature-Policy)
        response["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=()"
        )

        return response


class LoginAttemptMiddleware:
    """Middleware pour tracker les tentatives de connexion."""

    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)

        # Vérifier si c'est une tentative de login
        if request.path.endswith("/token/") or request.path.endswith("/login/"):
            ip_address = SecurityEventService.get_client_ip(request)

            if response.status_code == 401:
                # Échec de connexion
                self._handle_failed_login(request, ip_address)
            elif response.status_code == 200:
                # Connexion réussie - réinitialiser le compteur
                RateLimitService.reset_rate_limit(f"login_failures:{ip_address}")

        return response

    def _handle_failed_login(self, request: HttpRequest, ip_address: str) -> None:
        """Gère un échec de connexion."""
        key = f"login_failures:{ip_address}"

        # Incrémenter le compteur d'échecs
        is_allowed, remaining = RateLimitService.check_rate_limit(key, 5, 900)  # 5 échecs en 15 min

        if not is_allowed:
            # Trop de tentatives - bloquer l'IP temporairement
            logger.warning(f"Too many failed login attempts from {ip_address}")

            SecurityEventService.log_event(
                event_type=SecurityEvent.EVENT_LOGIN_FAILED,
                ip_address=ip_address,
                description="Trop de tentatives de connexion échouées",
                severity=SecurityEvent.SEVERITY_HIGH,
                request=request,
            )

            IPBlockingService.block_ip(
                ip_address=ip_address,
                reason="brute_force",
                description="Tentatives de connexion par force brute",
                duration_hours=1,
            )
