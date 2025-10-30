#!/usr/bin/env python
"""Script rapide pour tester l'envoi d'emails."""

import os
import sys
from pathlib import Path

# Charger les variables d'environnement depuis .env
from dotenv import load_dotenv

env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartqueue_backend.settings.dev")

import django
django.setup()

from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives


def test_smtp_connection():
    """Teste la connexion au serveur SMTP."""
    print("🔍 Test de connexion SMTP...")
    print(f"   Host: {settings.EMAIL_HOST}")
    print(f"   Port: {settings.EMAIL_PORT}")
    print(f"   TLS: {settings.EMAIL_USE_TLS}")
    print(f"   SSL: {settings.EMAIL_USE_SSL}")

    try:
        import smtplib
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.ehlo()
        print(f"✅ Connexion SMTP réussie!")
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False


def send_simple_email(to_email):
    """Envoie un email simple."""
    print(f"\n📧 Envoi d'un email simple à {to_email}...")

    try:
        send_mail(
            subject='Test Email - SmartQueue',
            message='Ceci est un test du serveur SMTP local!\n\nSi vous voyez cet email, la configuration fonctionne correctement.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            fail_silently=False,
        )

        print(f"✅ Email envoyé!")
        print(f"   De: {settings.DEFAULT_FROM_EMAIL}")
        print(f"   Vers: {to_email}")
        print(f"\n📱 Vérifiez l'interface Mailpit: http://localhost:8025")
        return True
    except Exception as e:
        print(f"❌ Erreur d'envoi: {e}")
        return False


def send_html_email(to_email):
    """Envoie un email HTML."""
    print(f"\n📧 Envoi d'un email HTML à {to_email}...")

    subject = 'Test Email HTML - SmartQueue 🎉'
    text_content = 'Ceci est le contenu texte de secours.'
    html_content = '''
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; text-align: center; }
            .content { padding: 20px; }
            .info-box { background: #f0f4ff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 3px; }
            .footer { text-align: center; color: #888; font-size: 12px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">🎉 Test Email HTML</h1>
                <p style="margin: 10px 0 0 0;">SmartQueue - Système de Gestion de Files</p>
            </div>

            <div class="content">
                <h2>Bonjour!</h2>
                <p>Ceci est un test d'email HTML depuis SmartQueue.</p>

                <div class="info-box">
                    <strong>📋 Informations de test:</strong><br>
                    • Serveur SMTP: Local (Mailpit)<br>
                    • Date: Aujourd'hui<br>
                    • Status: ✅ Fonctionnel
                </div>

                <p>Si vous voyez cet email correctement formaté, votre configuration email fonctionne parfaitement!</p>

                <p><strong>Fonctionnalités testées:</strong></p>
                <ul>
                    <li>✅ Connexion SMTP</li>
                    <li>✅ Envoi d'email</li>
                    <li>✅ Formatage HTML</li>
                    <li>✅ CSS inline</li>
                    <li>✅ Emojis</li>
                </ul>
            </div>

            <div class="footer">
                <p>Cet email a été envoyé par SmartQueue<br>
                Système de gestion de files d'attente intelligent</p>
            </div>
        </div>
    </body>
    </html>
    '''

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()

        print(f"✅ Email HTML envoyé!")
        print(f"   De: {settings.DEFAULT_FROM_EMAIL}")
        print(f"   Vers: {to_email}")
        print(f"\n📱 Vérifiez l'interface Mailpit: http://localhost:8025")
        return True
    except Exception as e:
        print(f"❌ Erreur d'envoi: {e}")
        return False


def test_notification_system(to_email):
    """Teste le système de notification."""
    print(f"\n🔔 Test du système de notification SmartQueue...")

    try:
        from apps.notifications.models import Notification, NotificationTemplate
        from apps.notifications.tasks import send_notification
        from apps.tenants.models import Tenant

        # Récupérer le premier tenant
        tenant = Tenant.objects.first()
        if not tenant:
            print("❌ Aucun tenant trouvé. Créez-en un d'abord.")
            return False

        print(f"✅ Tenant: {tenant.name}")

        # Récupérer un template email
        template = NotificationTemplate.objects.filter(
            tenant=tenant,
            channel='email',
            event='ticket_created'
        ).first()

        if template:
            print(f"✅ Template trouvé: {template.name}")

        # Créer une notification
        notification = Notification.objects.create(
            tenant=tenant,
            template=template,
            channel='email',
            recipient=to_email,
            subject='Test Notification - Ticket créé',
            body='''
            <html>
            <body style="font-family: Arial; padding: 20px;">
                <h2 style="color: #4CAF50;">Bonjour!</h2>
                <p>Votre ticket <strong>#TEST-12345</strong> a été créé avec succès.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <strong>Détails:</strong><br>
                    Service: Test Service<br>
                    File d'attente: Test Queue<br>
                    Temps d'attente estimé: 15 minutes
                </div>
                <p>Nous vous notifierons lorsque votre tour approchera.</p>
                <p>Cordialement,<br>L'équipe SmartQueue</p>
            </body>
            </html>
            ''',
        )

        print(f"✅ Notification créée: {notification.id}")

        # Envoyer
        result = send_notification(str(notification.id))

        # Vérifier le statut
        notification.refresh_from_db()
        print(f"\n📊 Statut de la notification:")
        print(f"   Status: {notification.status}")
        if notification.sent_at:
            print(f"   Envoyée à: {notification.sent_at}")
        if notification.error_message:
            print(f"   Erreur: {notification.error_message}")

        if notification.status == 'sent':
            print(f"\n✅ Notification envoyée avec succès!")
            print(f"📱 Vérifiez Mailpit: http://localhost:8025")
            return True
        else:
            print(f"\n❌ Échec d'envoi")
            return False

    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Fonction principale."""
    print("=" * 60)
    print("   TEST EMAIL SMTP LOCAL - SMARTQUEUE")
    print("=" * 60)

    # Test connexion
    if not test_smtp_connection():
        print("\n⚠️  Impossible de se connecter au serveur SMTP.")
        print("   Assurez-vous que Mailpit est lancé:")
        print("   docker-compose -f docker-compose.mailpit.yml up -d")
        return

    print("\n" + "=" * 60)
    to_email = input("Entrez l'adresse email de test (ex: test@example.com): ").strip()

    if not to_email:
        to_email = "test@example.com"

    print("\n🧪 Tests disponibles:")
    print("1. Email simple (texte)")
    print("2. Email HTML")
    print("3. Via le système de notification SmartQueue")
    print("4. Tous les tests")

    choice = input("\nChoisissez un test (1-4): ").strip()

    if choice == "1":
        send_simple_email(to_email)
    elif choice == "2":
        send_html_email(to_email)
    elif choice == "3":
        test_notification_system(to_email)
    elif choice == "4":
        send_simple_email(to_email)
        send_html_email(to_email)
        test_notification_system(to_email)
    else:
        print("❌ Choix invalide")

    print("\n" + "=" * 60)
    print("   FIN DES TESTS")
    print("=" * 60)
    print("\n💡 Conseil: Ouvrez http://localhost:8025 pour voir les emails")


if __name__ == "__main__":
    main()
