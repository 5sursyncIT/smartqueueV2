"""API views pour la configuration système."""

from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .models import SystemConfig


@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_system_config(request):
    """Récupérer la configuration système."""
    config = SystemConfig.load()

    data = {
        "id": config.pk,
        "platform_name": config.platform_name,
        "default_language": config.default_language,
        "default_timezone": config.default_timezone,
        "default_currency": config.default_currency,
        "maintenance_mode": config.maintenance_mode,
        "registration_enabled": config.registration_enabled,
        "email_notifications": config.email_notifications,
        "sms_notifications": config.sms_notifications,
        "push_notifications": config.push_notifications,
        "max_upload_size_mb": config.max_upload_size_mb,
        "session_timeout_minutes": config.session_timeout_minutes,
        "password_min_length": config.password_min_length,
        "require_email_verification": config.require_email_verification,
        "require_2fa": config.require_2fa,
        # Configuration SMTP (sans le mot de passe)
        "smtp_host": config.smtp_host,
        "smtp_port": config.smtp_port,
        "smtp_use_tls": config.smtp_use_tls,
        "smtp_use_ssl": config.smtp_use_ssl,
        "smtp_username": config.smtp_username,
        "smtp_from_email": config.smtp_from_email,
        "smtp_password_set": bool(config.smtp_password),
        "created_at": config.created_at.isoformat(),
        "updated_at": config.updated_at.isoformat(),
    }

    return Response(data)


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def update_system_config(request):
    """Mettre à jour la configuration système."""
    config = SystemConfig.load()

    # Champs modifiables
    allowed_fields = [
        "platform_name",
        "default_language",
        "default_timezone",
        "default_currency",
        "maintenance_mode",
        "registration_enabled",
        "email_notifications",
        "sms_notifications",
        "push_notifications",
        "max_upload_size_mb",
        "session_timeout_minutes",
        "password_min_length",
        "require_email_verification",
        "require_2fa",
        # SMTP
        "smtp_host",
        "smtp_port",
        "smtp_use_tls",
        "smtp_use_ssl",
        "smtp_username",
        "smtp_password",
        "smtp_from_email",
    ]

    # Mise à jour des champs
    for field in allowed_fields:
        if field in request.data:
            setattr(config, field, request.data[field])

    # Validation
    if config.smtp_use_tls and config.smtp_use_ssl:
        return Response(
            {"error": "TLS et SSL ne peuvent pas être activés simultanément"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    config.save()

    return Response(
        {
            "message": "Configuration mise à jour avec succès",
            "config": {
                "platform_name": config.platform_name,
                "smtp_host": config.smtp_host,
                "smtp_port": config.smtp_port,
            },
        }
    )


@api_view(["POST"])
@permission_classes([IsAdminUser])
def test_smtp_config(request):
    """Tester la configuration SMTP en envoyant un email de test."""
    config = SystemConfig.load()

    # Email de test
    test_email = request.data.get("test_email")
    if not test_email:
        return Response(
            {"error": "L'adresse email de test est requise"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Configurer temporairement les settings email avec la config de la BDD
        from django.core.mail import get_connection
        from django.core.mail.message import EmailMessage

        # Créer une connexion SMTP avec la config
        connection = get_connection(
            host=config.smtp_host,
            port=config.smtp_port,
            username=config.smtp_username if config.smtp_username else None,
            password=config.smtp_password if config.smtp_password else None,
            use_tls=config.smtp_use_tls,
            use_ssl=config.smtp_use_ssl,
            fail_silently=False,
        )

        # Créer et envoyer l'email de test
        email = EmailMessage(
            subject="Test Configuration SMTP - SmartQueue",
            body=f"""
Bonjour,

Ceci est un email de test pour valider la configuration SMTP de SmartQueue.

Configuration utilisée:
- Serveur SMTP: {config.smtp_host}
- Port: {config.smtp_port}
- TLS: {'Oui' if config.smtp_use_tls else 'Non'}
- SSL: {'Oui' if config.smtp_use_ssl else 'Non'}
- Authentification: {'Oui' if config.smtp_username else 'Non'}

Si vous recevez cet email, la configuration SMTP fonctionne correctement!

Cordialement,
L'équipe SmartQueue
            """,
            from_email=config.smtp_from_email,
            to=[test_email],
            connection=connection,
        )

        email.send()

        return Response(
            {
                "success": True,
                "message": f"Email de test envoyé avec succès à {test_email}",
                "details": {
                    "smtp_host": config.smtp_host,
                    "smtp_port": config.smtp_port,
                    "smtp_use_tls": config.smtp_use_tls,
                    "smtp_use_ssl": config.smtp_use_ssl,
                    "from_email": config.smtp_from_email,
                },
            }
        )

    except Exception as e:
        return Response(
            {
                "success": False,
                "error": str(e),
                "message": "Erreur lors de l'envoi de l'email de test",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_smtp_status(request):
    """Vérifier le statut de la configuration SMTP."""
    config = SystemConfig.load()

    # Test de connexion SMTP
    try:
        import smtplib

        if config.smtp_use_ssl:
            server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port, timeout=5)
        else:
            server = smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=5)

        if config.smtp_use_tls and not config.smtp_use_ssl:
            server.starttls()

        if config.smtp_username and config.smtp_password:
            server.login(config.smtp_username, config.smtp_password)

        server.quit()

        return Response(
            {
                "connected": True,
                "message": "Connexion SMTP réussie",
                "host": config.smtp_host,
                "port": config.smtp_port,
            }
        )

    except Exception as e:
        return Response(
            {
                "connected": False,
                "error": str(e),
                "message": "Impossible de se connecter au serveur SMTP",
                "host": config.smtp_host,
                "port": config.smtp_port,
            },
            status=status.HTTP_200_OK,  # Return 200 even on connection failure
        )
