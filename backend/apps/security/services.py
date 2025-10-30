"""Services de sécurité pour détecter et prévenir les attaques."""

from __future__ import annotations

import re
from datetime import timedelta
from typing import TYPE_CHECKING

from django.core.cache import cache
from django.utils import timezone

from .models import BlockedIP, PasswordHistory, PasswordPolicy, SecurityAlert, SecurityEvent

if TYPE_CHECKING:
    from django.http import HttpRequest

    from apps.users.models import User


class SecurityEventService:
    """Service pour enregistrer les événements de sécurité."""

    @staticmethod
    def log_event(
        event_type: str,
        ip_address: str,
        description: str,
        severity: str = SecurityEvent.SEVERITY_LOW,
        user: User | None = None,
        user_email: str | None = None,
        user_agent: str = "",
        metadata: dict | None = None,
        request: HttpRequest | None = None,
    ) -> SecurityEvent:
        """Enregistre un événement de sécurité.

        Args:
            event_type: Type d'événement
            ip_address: Adresse IP
            description: Description de l'événement
            severity: Niveau de sévérité
            user: Utilisateur concerné (optionnel)
            user_email: Email de l'utilisateur (optionnel)
            user_agent: User agent du navigateur
            metadata: Métadonnées additionnelles
            request: Requête HTTP (optionnel)

        Returns:
            SecurityEvent: L'événement créé
        """
        if request:
            ip_address = SecurityEventService.get_client_ip(request)
            user_agent = request.META.get("HTTP_USER_AGENT", "")

        event = SecurityEvent.objects.create(
            event_type=event_type,
            severity=severity,
            ip_address=ip_address,
            description=description,
            user=user,
            user_email=user_email or (user.email if user else ""),
            user_agent=user_agent,
            metadata=metadata or {},
        )

        # Créer une alerte si l'événement est critique
        if severity == SecurityEvent.SEVERITY_CRITICAL:
            SecurityEventService._create_alert_for_critical_event(event)

        return event

    @staticmethod
    def get_client_ip(request: HttpRequest) -> str:
        """Extrait l'adresse IP réelle du client.

        Args:
            request: Requête HTTP

        Returns:
            str: Adresse IP du client
        """
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            # Prendre la première IP (client réel)
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR", "0.0.0.0")
        return ip

    @staticmethod
    def _create_alert_for_critical_event(event: SecurityEvent) -> None:
        """Crée une alerte pour un événement critique."""
        alert_type = SecurityAlert.ALERT_TYPE_UNUSUAL_ACTIVITY

        if event.event_type == SecurityEvent.EVENT_LOGIN_FAILED:
            alert_type = SecurityAlert.ALERT_TYPE_MULTIPLE_FAILURES
        elif event.event_type in [
            SecurityEvent.EVENT_SQL_INJECTION_ATTEMPT,
            SecurityEvent.EVENT_XSS_ATTEMPT,
        ]:
            alert_type = SecurityAlert.ALERT_TYPE_SUSPICIOUS_IP

        SecurityAlert.objects.create(
            alert_type=alert_type,
            severity=event.severity,
            title=f"Événement critique: {event.get_event_type_display()}",
            description=event.description,
            metadata={
                "event_id": str(event.id),
                "ip_address": event.ip_address,
                "user_email": event.user_email,
            },
        )


class IPBlockingService:
    """Service pour bloquer les IPs malveillantes."""

    @staticmethod
    def is_ip_blocked(ip_address: str) -> bool:
        """Vérifie si une IP est bloquée.

        Args:
            ip_address: Adresse IP à vérifier

        Returns:
            bool: True si l'IP est bloquée
        """
        # Vérifier en cache d'abord
        cache_key = f"blocked_ip:{ip_address}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        # Vérifier en base de données
        blocked = BlockedIP.objects.filter(
            ip_address=ip_address, is_active=True
        ).exists()

        # Mettre en cache (15 minutes)
        cache.set(cache_key, blocked, timeout=900)

        return blocked

    @staticmethod
    def block_ip(
        ip_address: str,
        reason: str,
        description: str = "",
        blocked_by: User | None = None,
        duration_hours: int | None = None,
    ) -> BlockedIP:
        """Bloque une adresse IP.

        Args:
            ip_address: Adresse IP à bloquer
            reason: Raison du blocage
            description: Description détaillée
            blocked_by: Utilisateur qui bloque
            duration_hours: Durée du blocage en heures (None = permanent)

        Returns:
            BlockedIP: L'objet créé
        """
        expires_at = None
        if duration_hours:
            expires_at = timezone.now() + timedelta(hours=duration_hours)

        blocked_ip, created = BlockedIP.objects.get_or_create(
            ip_address=ip_address,
            defaults={
                "reason": reason,
                "description": description,
                "blocked_by": blocked_by,
                "expires_at": expires_at,
                "is_active": True,
            },
        )

        # Invalider le cache
        cache.delete(f"blocked_ip:{ip_address}")

        return blocked_ip

    @staticmethod
    def unblock_ip(ip_address: str) -> bool:
        """Débloque une adresse IP.

        Args:
            ip_address: Adresse IP à débloquer

        Returns:
            bool: True si l'IP a été débloquée
        """
        updated = BlockedIP.objects.filter(ip_address=ip_address).update(is_active=False)

        # Invalider le cache
        cache.delete(f"blocked_ip:{ip_address}")

        return updated > 0


class RateLimitService:
    """Service pour gérer le rate limiting."""

    @staticmethod
    def check_rate_limit(
        key: str, max_requests: int, window_seconds: int
    ) -> tuple[bool, int]:
        """Vérifie le rate limit.

        Args:
            key: Clé unique (ex: "login:192.168.1.1")
            max_requests: Nombre max de requêtes autorisées
            window_seconds: Fenêtre de temps en secondes

        Returns:
            tuple: (is_allowed, remaining_requests)
        """
        cache_key = f"rate_limit:{key}"

        # Récupérer le compteur actuel
        current = cache.get(cache_key, 0)

        if current >= max_requests:
            return False, 0

        # Incrémenter le compteur
        new_count = current + 1
        cache.set(cache_key, new_count, timeout=window_seconds)

        remaining = max_requests - new_count
        return True, remaining

    @staticmethod
    def reset_rate_limit(key: str) -> None:
        """Réinitialise le rate limit pour une clé.

        Args:
            key: Clé à réinitialiser
        """
        cache_key = f"rate_limit:{key}"
        cache.delete(cache_key)


class AttackDetectionService:
    """Service pour détecter les tentatives d'attaque."""

    # Patterns pour détecter les injections SQL
    SQL_INJECTION_PATTERNS = [
        r"(\bUNION\b.*\bSELECT\b)",
        r"(\bSELECT\b.*\bFROM\b.*\bWHERE\b)",
        r"(\bDROP\b.*\bTABLE\b)",
        r"(\bINSERT\b.*\bINTO\b)",
        r"(--|\#|\/\*|\*\/)",
        r"(\bOR\b\s+\d+\s*=\s*\d+)",
        r"(\bAND\b\s+\d+\s*=\s*\d+)",
        r"('.*OR.*'.*=.*')",
    ]

    # Patterns pour détecter les XSS
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe",
        r"<object",
        r"<embed",
    ]

    @staticmethod
    def detect_sql_injection(input_string: str) -> bool:
        """Détecte les tentatives d'injection SQL.

        Args:
            input_string: Chaîne à analyser

        Returns:
            bool: True si une injection est détectée
        """
        if not input_string:
            return False

        input_lower = input_string.lower()

        for pattern in AttackDetectionService.SQL_INJECTION_PATTERNS:
            if re.search(pattern, input_lower, re.IGNORECASE):
                return True

        return False

    @staticmethod
    def detect_xss(input_string: str) -> bool:
        """Détecte les tentatives XSS.

        Args:
            input_string: Chaîne à analyser

        Returns:
            bool: True si XSS détecté
        """
        if not input_string:
            return False

        for pattern in AttackDetectionService.XSS_PATTERNS:
            if re.search(pattern, input_string, re.IGNORECASE):
                return True

        return False

    @staticmethod
    def sanitize_input(input_string: str) -> str:
        """Nettoie une chaîne d'entrée.

        Args:
            input_string: Chaîne à nettoyer

        Returns:
            str: Chaîne nettoyée
        """
        if not input_string:
            return ""

        # Supprimer les balises HTML dangereuses
        sanitized = re.sub(r"<script[^>]*>.*?</script>", "", input_string, flags=re.IGNORECASE)
        sanitized = re.sub(r"<iframe[^>]*>.*?</iframe>", "", sanitized, flags=re.IGNORECASE)

        # Échapper les caractères spéciaux
        sanitized = sanitized.replace("<", "&lt;").replace(">", "&gt;")

        return sanitized


class PasswordPolicyService:
    """Service pour gérer les politiques de mot de passe."""

    @staticmethod
    def get_policy_for_tenant(tenant) -> PasswordPolicy:
        """Récupère la politique de mot de passe d'un tenant.

        Args:
            tenant: Le tenant

        Returns:
            PasswordPolicy: La politique (ou une politique par défaut)
        """
        policy, _ = PasswordPolicy.objects.get_or_create(
            tenant=tenant,
            defaults={
                "min_length": 8,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_digit": True,
                "require_special_char": True,
                "password_expires_days": 90,
                "prevent_reuse_count": 5,
                "max_failed_attempts": 5,
                "lockout_duration_minutes": 30,
                "require_2fa_for_admins": True,
                "session_timeout_minutes": 60,
            },
        )
        return policy

    @staticmethod
    def validate_password(password: str, policy: PasswordPolicy) -> tuple[bool, list[str]]:
        """Valide un mot de passe selon une politique.

        Args:
            password: Le mot de passe à valider
            policy: La politique à appliquer

        Returns:
            tuple: (is_valid, errors)
        """
        errors = []

        # Longueur minimale
        if len(password) < policy.min_length:
            errors.append(f"Le mot de passe doit contenir au moins {policy.min_length} caractères")

        # Majuscule
        if policy.require_uppercase and not re.search(r"[A-Z]", password):
            errors.append("Le mot de passe doit contenir au moins une majuscule")

        # Minuscule
        if policy.require_lowercase and not re.search(r"[a-z]", password):
            errors.append("Le mot de passe doit contenir au moins une minuscule")

        # Chiffre
        if policy.require_digit and not re.search(r"\d", password):
            errors.append("Le mot de passe doit contenir au moins un chiffre")

        # Caractère spécial
        if policy.require_special_char and not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            errors.append("Le mot de passe doit contenir au moins un caractère spécial")

        is_valid = len(errors) == 0
        return is_valid, errors

    @staticmethod
    def check_password_reuse(user: User, new_password: str, policy: PasswordPolicy) -> bool:
        """Vérifie si le mot de passe a déjà été utilisé récemment.

        Args:
            user: L'utilisateur
            new_password: Le nouveau mot de passe
            policy: La politique

        Returns:
            bool: True si le mot de passe peut être réutilisé
        """
        from django.contrib.auth.hashers import check_password

        # Récupérer l'historique des mots de passe
        history = PasswordHistory.objects.filter(user=user).order_by(
            "-created_at"
        )[: policy.prevent_reuse_count]

        # Vérifier si le nouveau mot de passe correspond à un ancien
        for entry in history:
            if check_password(new_password, entry.password_hash):
                return False

        return True

    @staticmethod
    def save_password_to_history(user: User, password_hash: str) -> None:
        """Sauvegarde un mot de passe dans l'historique.

        Args:
            user: L'utilisateur
            password_hash: Hash du mot de passe
        """
        PasswordHistory.objects.create(user=user, password_hash=password_hash)

        # Nettoyer l'historique (garder seulement les 10 derniers)
        old_entries = PasswordHistory.objects.filter(user=user).order_by("-created_at")[10:]
        PasswordHistory.objects.filter(id__in=[e.id for e in old_entries]).delete()
