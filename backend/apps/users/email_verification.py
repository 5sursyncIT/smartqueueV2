"""Service de vérification d'email pour les utilisateurs."""

from __future__ import annotations

import random
from datetime import timedelta
from typing import TYPE_CHECKING

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

if TYPE_CHECKING:
    from .models import User


def generate_verification_code() -> str:
    """Génère un code de vérification à 6 chiffres."""
    return str(random.randint(100000, 999999))


def send_verification_email(user: User, base_url: str = None) -> bool:
    """
    Envoie un email de vérification à l'utilisateur avec un code à 6 chiffres.

    Args:
        user: L'utilisateur à vérifier
        base_url: Paramètre conservé pour compatibilité (non utilisé)

    Returns:
        True si l'email a été envoyé avec succès
    """
    # Générer un nouveau code à 6 chiffres
    code = generate_verification_code()
    user.email_verification_token = code
    user.email_verification_sent_at = timezone.now()
    user.save(update_fields=['email_verification_token', 'email_verification_sent_at'])

    # Rendu du template HTML avec code à 6 chiffres
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✉️ SmartQueue</h1>
                                <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Vérification de votre adresse email</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Bonjour {user.first_name or 'Utilisateur'},</h2>

                                <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    Bienvenue sur <strong>SmartQueue</strong>! Pour finaliser la création de votre compte, veuillez entrer le code de vérification ci-dessous :
                                </p>

                                <!-- Code de vérification -->
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 30px; margin: 30px 0; text-align: center;">
                                    <p style="color: #ffffff; font-size: 14px; margin: 0 0 15px 0; opacity: 0.9; text-transform: uppercase; letter-spacing: 2px;">Votre code de vérification</p>
                                    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; display: inline-block;">
                                        <p style="color: #667eea; font-size: 42px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">{code}</p>
                                    </div>
                                </div>

                                <div style="background-color: #f0f4ff; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
                                    <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">
                                        <strong>📧 Email:</strong> {user.email}<br>
                                        <strong>⏰ Validité:</strong> 15 minutes<br>
                                        <strong>🔒 Usage:</strong> Code à usage unique
                                    </p>
                                </div>

                                <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                                    <strong>⚠️ Important :</strong><br>
                                    • Ce code expire dans <strong>15 minutes</strong><br>
                                    • Il ne peut être utilisé qu'<strong>une seule fois</strong><br>
                                    • Si vous n'avez pas créé ce compte, ignorez cet email
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                                <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0;">
                                    Cet email a été envoyé par <strong>SmartQueue</strong><br>
                                    Système de gestion de files d'attente intelligent<br>
                                    <br>
                                    <span style="color: #cccccc;">© 2025 SmartQueue. Tous droits réservés.</span>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    # Message texte (fallback)
    text_message = f"""
    Bonjour {user.first_name or 'Utilisateur'},

    Bienvenue sur SmartQueue! Pour finaliser la création de votre compte, veuillez entrer le code de vérification suivant :

    CODE DE VÉRIFICATION: {code}

    Informations:
    • Email: {user.email}
    • Validité: 15 minutes
    • Usage: Code à usage unique

    IMPORTANT:
    - Ce code expire dans 15 minutes
    - Il ne peut être utilisé qu'une seule fois
    - Si vous n'avez pas créé ce compte, ignorez cet email

    ---
    SmartQueue - Système de gestion de files d'attente intelligent
    """

    try:
        send_mail(
            subject='Vérifiez votre adresse email - SmartQueue',
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email de vérification: {e}")
        return False


def verify_email(email: str, code: str) -> tuple[bool, str]:
    """
    Vérifie l'email d'un utilisateur avec le code à 6 chiffres fourni.

    Args:
        email: L'adresse email à vérifier
        code: Le code de vérification à 6 chiffres

    Returns:
        Tuple (succès, message)
    """
    from .models import User

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return False, "Utilisateur non trouvé"

    # Vérifier si l'email est déjà vérifié
    if user.email_verified:
        return True, "Email déjà vérifié"

    # Vérifier le code
    if not user.email_verification_token or user.email_verification_token != code:
        return False, "Code de vérification invalide"

    # Vérifier l'expiration (15 minutes au lieu de 24h)
    if user.email_verification_sent_at:
        expiration = user.email_verification_sent_at + timedelta(minutes=15)
        if timezone.now() > expiration:
            return False, "Code expiré. Veuillez demander un nouveau code de vérification"

    # Vérifier l'email
    user.email_verified = True
    user.email_verified_at = timezone.now()
    user.email_verification_token = None  # Invalider le code
    user.save(update_fields=['email_verified', 'email_verified_at', 'email_verification_token'])

    return True, "Email vérifié avec succès"


def resend_verification_email(email: str, base_url: str = None) -> tuple[bool, str]:
    """
    Renvoie un email de vérification.

    Args:
        email: L'adresse email
        base_url: L'URL de base pour le lien

    Returns:
        Tuple (succès, message)
    """
    from .models import User

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return False, "Utilisateur non trouvé"

    # Vérifier si l'email est déjà vérifié
    if user.email_verified:
        return False, "Email déjà vérifié"

    # Vérifier si un email a été envoyé récemment (cooldown de 1 minute)
    if user.email_verification_sent_at:
        cooldown = user.email_verification_sent_at + timedelta(minutes=1)
        if timezone.now() < cooldown:
            return False, "Veuillez attendre avant de renvoyer un email"

    # Envoyer l'email
    success = send_verification_email(user, base_url)

    if success:
        return True, "Email de vérification renvoyé"
    else:
        return False, "Erreur lors de l'envoi de l'email"
