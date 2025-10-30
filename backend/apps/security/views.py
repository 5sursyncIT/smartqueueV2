"""Vues API pour la gestion de la sécurité."""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from apps.users.two_factor import BackupCodesService, SMSTwoFactorService, TOTPService

from .models import BlockedIP, PasswordPolicy, SecurityAlert, SecurityEvent
from .serializers import (
    BlockedIPSerializer,
    PasswordChangeSerializer,
    PasswordPolicySerializer,
    SecurityAlertSerializer,
    SecurityEventSerializer,
    SecurityEventStatsSerializer,
    TwoFactorSetupSerializer,
    TwoFactorVerifySerializer,
)
from .services import PasswordPolicyService, SecurityEventService


class SecurityEventViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour consulter les événements de sécurité."""

    serializer_class = SecurityEventSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filterset_fields = ["event_type", "severity", "status"]
    search_fields = ["user_email", "ip_address", "description"]
    ordering_fields = ["created_at", "severity"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Retourne les événements de sécurité."""
        return SecurityEvent.objects.all().select_related("user", "resolved_by")

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Retourne les statistiques des événements de sécurité."""
        # Événements des 30 derniers jours
        thirty_days_ago = timezone.now() - timedelta(days=30)
        events = SecurityEvent.objects.filter(created_at__gte=thirty_days_ago)

        # Compter par sévérité
        events_by_severity = dict(
            events.values("severity").annotate(count=Count("id")).values_list("severity", "count")
        )

        # Compter par type
        events_by_type = dict(
            events.values("event_type")
            .annotate(count=Count("id"))
            .values_list("event_type", "count")
        )

        # Événements récents
        recent_events = events.order_by("-created_at")[:10]

        stats = {
            "total_events": events.count(),
            "events_by_severity": events_by_severity,
            "events_by_type": events_by_type,
            "recent_events": SecurityEventSerializer(recent_events, many=True).data,
        }

        serializer = SecurityEventStatsSerializer(stats)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Retourne un résumé des menaces."""
        # IPs bloquées
        blocked_ips_count = BlockedIP.objects.filter(is_active=True).count()

        # Échecs de connexion aujourd'hui
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        failed_logins_today = SecurityEvent.objects.filter(
            event_type=SecurityEvent.EVENT_LOGIN_FAILED, created_at__gte=today
        ).count()

        # Activités suspectes (7 derniers jours)
        seven_days_ago = timezone.now() - timedelta(days=7)
        suspicious_activities = SecurityEvent.objects.filter(
            event_type=SecurityEvent.EVENT_SUSPICIOUS_ACTIVITY, created_at__gte=seven_days_ago
        ).count()

        # Incidents ouverts
        open_incidents = SecurityEvent.objects.filter(
            severity__in=[SecurityEvent.SEVERITY_HIGH, SecurityEvent.SEVERITY_CRITICAL],
            status__in=[SecurityEvent.STATUS_OPEN, SecurityEvent.STATUS_INVESTIGATING],
        ).count()

        return Response(
            {
                "blocked_ips": blocked_ips_count,
                "failed_logins_today": failed_logins_today,
                "suspicious_activities": suspicious_activities,
                "open_incidents": open_incidents,
            }
        )

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Marque un événement comme résolu."""
        event = self.get_object()
        event.status = SecurityEvent.STATUS_RESOLVED
        event.resolved_by = request.user
        event.resolved_at = timezone.now()
        event.resolution_notes = request.data.get("notes", "")
        event.save()

        return Response(SecurityEventSerializer(event).data)


class BlockedIPViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les IPs bloquées."""

    serializer_class = BlockedIPSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filterset_fields = ["reason", "is_active"]
    search_fields = ["ip_address", "description"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Retourne les IPs bloquées."""
        return BlockedIP.objects.all().select_related("blocked_by")

    def perform_create(self, serializer):
        """Crée un blocage d'IP."""
        serializer.save(blocked_by=self.request.user)

    @action(detail=True, methods=["post"])
    def unblock(self, request, pk=None):
        """Débloque une IP."""
        blocked_ip = self.get_object()
        blocked_ip.is_active = False
        blocked_ip.save()

        # Log l'événement
        SecurityEventService.log_event(
            event_type=SecurityEvent.EVENT_ACCOUNT_UNLOCKED,
            ip_address=blocked_ip.ip_address,
            description=f"IP débloquée par {request.user.email}",
            severity=SecurityEvent.SEVERITY_LOW,
            user=request.user,
        )

        return Response({"message": "IP débloquée avec succès"})


class PasswordPolicyViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les politiques de mot de passe."""

    serializer_class = PasswordPolicySerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        """Retourne les politiques de mot de passe."""
        return PasswordPolicy.objects.all().select_related("tenant")


class SecurityAlertViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour consulter les alertes de sécurité."""

    serializer_class = SecurityAlertSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filterset_fields = ["alert_type", "severity", "is_acknowledged"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Retourne les alertes de sécurité."""
        return SecurityAlert.objects.all().select_related("acknowledged_by")

    @action(detail=True, methods=["post"])
    def acknowledge(self, request, pk=None):
        """Accuse réception d'une alerte."""
        alert = self.get_object()
        alert.is_acknowledged = True
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save()

        return Response(SecurityAlertSerializer(alert).data)


class TwoFactorViewSet(viewsets.ViewSet):
    """ViewSet pour gérer l'authentification à deux facteurs."""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def setup_totp(self, request):
        """Configure TOTP (Google Authenticator).

        Returns le secret et le QR code.
        """
        user = request.user

        # Générer un nouveau secret
        from apps.security.encryption import EncryptionService

        secret = TOTPService.generate_secret()

        # Chiffrer et sauvegarder le secret
        user.totp_secret = EncryptionService.encrypt(secret)
        user.save(update_fields=["totp_secret"])

        # Générer le QR code
        qr_code_bytes = TOTPService.generate_qr_code(user, secret)

        # Convertir en base64 pour le frontend
        import base64

        qr_code_base64 = base64.b64encode(qr_code_bytes).decode("utf-8")

        return Response(
            {
                "secret": secret,
                "qr_code": f"data:image/png;base64,{qr_code_base64}",
                "message": "Scannez le QR code avec votre application d'authentification",
            }
        )

    @action(detail=False, methods=["post"])
    def setup_sms(self, request):
        """Configure 2FA par SMS."""
        serializer = TwoFactorSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        phone_number = serializer.validated_data.get("phone_number")

        if not phone_number:
            return Response(
                {"error": "Le numéro de téléphone est requis"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Sauvegarder le numéro
        user.two_factor_phone = phone_number
        user.save(update_fields=["two_factor_phone"])

        # Envoyer un code de test
        success = SMSTwoFactorService.send_sms_code(user, phone_number)

        if not success:
            return Response(
                {"error": "Impossible d'envoyer le SMS"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {"message": "Code de vérification envoyé par SMS", "phone_number": phone_number}
        )

    @action(detail=False, methods=["post"])
    def verify_and_enable(self, request):
        """Vérifie le code 2FA et active la fonctionnalité."""
        serializer = TwoFactorVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        code = serializer.validated_data["code"]

        # Vérifier selon la méthode configurée
        is_valid = False

        if user.totp_secret:
            # Vérification TOTP
            from apps.security.encryption import EncryptionService

            secret = EncryptionService.decrypt(user.totp_secret)
            is_valid = TOTPService.verify_totp_code(secret, code)
            method = "totp"
        elif user.two_factor_phone:
            # Vérification SMS
            is_valid = SMSTwoFactorService.verify_sms_code(user, code)
            method = "sms"
        else:
            return Response(
                {"error": "Aucune méthode 2FA configurée"}, status=status.HTTP_400_BAD_REQUEST
            )

        if not is_valid:
            return Response({"error": "Code invalide"}, status=status.HTTP_400_BAD_REQUEST)

        # Activer 2FA
        user.two_factor_enabled = True
        user.two_factor_method = method
        user.save(update_fields=["two_factor_enabled", "two_factor_method"])

        # Générer des codes de backup
        backup_codes = BackupCodesService.generate_backup_codes()
        hashed_codes = [BackupCodesService.hash_backup_code(code) for code in backup_codes]
        user.backup_codes = hashed_codes
        user.save(update_fields=["backup_codes"])

        # Log l'événement
        SecurityEventService.log_event(
            event_type=SecurityEvent.EVENT_2FA_ENABLED,
            ip_address=SecurityEventService.get_client_ip(request),
            description=f"2FA activé avec la méthode {method}",
            severity=SecurityEvent.SEVERITY_LOW,
            user=user,
            request=request,
        )

        return Response(
            {
                "message": "2FA activé avec succès",
                "method": method,
                "backup_codes": backup_codes,
                "warning": "Sauvegardez ces codes de backup, ils ne seront plus affichés",
            }
        )

    @action(detail=False, methods=["post"])
    def disable(self, request):
        """Désactive 2FA."""
        user = request.user

        # Vérifier le mot de passe pour la sécurité
        password = request.data.get("password")
        if not user.check_password(password):
            return Response(
                {"error": "Mot de passe incorrect"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Désactiver 2FA
        user.two_factor_enabled = False
        user.two_factor_method = None
        user.totp_secret = None
        user.two_factor_phone = None
        user.backup_codes = []
        user.save(
            update_fields=[
                "two_factor_enabled",
                "two_factor_method",
                "totp_secret",
                "two_factor_phone",
                "backup_codes",
            ]
        )

        # Log l'événement
        SecurityEventService.log_event(
            event_type=SecurityEvent.EVENT_2FA_DISABLED,
            ip_address=SecurityEventService.get_client_ip(request),
            description="2FA désactivé",
            severity=SecurityEvent.SEVERITY_MEDIUM,
            user=user,
            request=request,
        )

        return Response({"message": "2FA désactivé avec succès"})

    @action(detail=False, methods=["get"])
    def status(self, request):
        """Retourne le statut 2FA de l'utilisateur."""
        user = request.user

        return Response(
            {
                "enabled": user.two_factor_enabled,
                "method": user.two_factor_method,
                "phone_number": user.two_factor_phone if user.two_factor_phone else None,
                "backup_codes_count": len(user.backup_codes) if user.backup_codes else 0,
            }
        )


class PasswordSecurityViewSet(viewsets.ViewSet):
    """ViewSet pour la gestion sécurisée des mots de passe."""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def change_password(self, request):
        """Change le mot de passe de l'utilisateur."""
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        # Vérifier le mot de passe actuel
        if not user.check_password(serializer.validated_data["current_password"]):
            return Response(
                {"error": "Mot de passe actuel incorrect"}, status=status.HTTP_400_BAD_REQUEST
            )

        new_password = serializer.validated_data["new_password"]

        # Récupérer la politique de mot de passe
        if hasattr(request, "tenant"):
            policy = PasswordPolicyService.get_policy_for_tenant(request.tenant)
        else:
            # Politique par défaut pour les super-admins
            policy = PasswordPolicy(
                min_length=8,
                require_uppercase=True,
                require_lowercase=True,
                require_digit=True,
                require_special_char=True,
                prevent_reuse_count=5,
            )

        # Valider le nouveau mot de passe
        is_valid, errors = PasswordPolicyService.validate_password(new_password, policy)
        if not is_valid:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        # Vérifier la réutilisation
        if not PasswordPolicyService.check_password_reuse(user, new_password, policy):
            return Response(
                {"error": "Ce mot de passe a déjà été utilisé récemment"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Changer le mot de passe
        from django.contrib.auth.hashers import make_password

        password_hash = make_password(new_password)

        # Sauvegarder dans l'historique
        PasswordPolicyService.save_password_to_history(user, password_hash)

        # Mettre à jour l'utilisateur
        user.set_password(new_password)
        user.password_changed_at = timezone.now()
        user.require_password_change = False
        user.save(update_fields=["password", "password_changed_at", "require_password_change"])

        # Log l'événement
        SecurityEventService.log_event(
            event_type=SecurityEvent.EVENT_PASSWORD_CHANGE,
            ip_address=SecurityEventService.get_client_ip(request),
            description="Mot de passe changé avec succès",
            severity=SecurityEvent.SEVERITY_LOW,
            user=user,
            request=request,
        )

        return Response({"message": "Mot de passe changé avec succès"})
