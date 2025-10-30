#!/usr/bin/env python
"""Script de test rapide pour l'intégration Twilio."""

import os
import sys
from pathlib import Path

# Ajouter le répertoire backend au path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Configurer Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartqueue_backend.settings.dev")

import django

django.setup()

from django.conf import settings
from django.utils import timezone


def test_twilio_config():
    """Vérifie la configuration Twilio."""
    print("🔍 Vérification de la configuration Twilio...\n")

    config = {
        "TWILIO_ACCOUNT_SID": settings.TWILIO_ACCOUNT_SID,
        "TWILIO_AUTH_TOKEN": (
            settings.TWILIO_AUTH_TOKEN[:8] + "..." if settings.TWILIO_AUTH_TOKEN else None
        ),
        "TWILIO_PHONE_NUMBER": settings.TWILIO_PHONE_NUMBER,
        "TWILIO_WHATSAPP_NUMBER": settings.TWILIO_WHATSAPP_NUMBER,
    }

    all_configured = True
    for key, value in config.items():
        if value and value != "your_twilio_account_sid" and value != "your_twilio_auth_token":
            print(f"✅ {key}: {value}")
        else:
            print(f"❌ {key}: NON CONFIGURÉ")
            all_configured = False

    return all_configured


def test_twilio_connection():
    """Teste la connexion à l'API Twilio."""
    print("\n📡 Test de connexion à l'API Twilio...\n")

    try:
        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        # Récupérer les infos du compte
        account = client.api.accounts(settings.TWILIO_ACCOUNT_SID).fetch()

        print(f"✅ Connexion réussie!")
        print(f"   - Account SID: {account.sid}")
        print(f"   - Statut: {account.status}")
        print(f"   - Type: {account.type}")

        return True
    except Exception as e:
        print(f"❌ Erreur de connexion: {str(e)}")
        return False


def test_send_sms(to_number):
    """Envoie un SMS de test."""
    print(f"\n📱 Envoi d'un SMS de test à {to_number}...\n")

    try:
        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        message = client.messages.create(
            body="🎉 Test SMS depuis SmartQueue! L'intégration Twilio fonctionne correctement.",
            from_=settings.TWILIO_PHONE_NUMBER,
            to=to_number,
        )

        print(f"✅ SMS envoyé avec succès!")
        print(f"   - Message SID: {message.sid}")
        print(f"   - Statut: {message.status}")
        print(f"   - Direction: {message.direction}")
        print(f"   - Prix: {message.price} {message.price_unit}")

        return True
    except Exception as e:
        print(f"❌ Erreur d'envoi SMS: {str(e)}")
        return False


def test_notification_system(to_number):
    """Teste le système de notification SmartQueue."""
    print(f"\n🔔 Test du système de notification SmartQueue...\n")

    try:
        from apps.notifications.models import Notification

        # Créer une notification de test
        notification = Notification.objects.create(
            tenant_id=None,  # Notification système sans tenant
            channel=Notification.CHANNEL_SMS,
            recipient=to_number,
            subject="",
            body="🧪 Test de notification via le système SmartQueue!",
            metadata={"test": True, "timestamp": timezone.now().isoformat()},
        )

        print(f"✅ Notification créée: {notification.id}")

        # Envoyer via la tâche Celery
        from apps.notifications.tasks import send_notification

        result = send_notification(str(notification.id))

        # Recharger la notification
        notification.refresh_from_db()

        print(f"   - Statut: {notification.status}")
        if notification.status == Notification.STATUS_SENT:
            print(f"   - Envoyé à: {notification.sent_at}")
            print(f"   - Provider ID: {notification.provider_id}")
            print(f"\n✅ Système de notification fonctionnel!")
            return True
        else:
            print(f"   - Erreur: {notification.error_message}")
            print(f"\n❌ Le système de notification a rencontré une erreur")
            return False

    except Exception as e:
        print(f"❌ Erreur du système de notification: {str(e)}")
        import traceback

        traceback.print_exc()
        return False


def list_phone_numbers():
    """Liste les numéros de téléphone Twilio disponibles."""
    print("\n📞 Numéros de téléphone disponibles:\n")

    try:
        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        incoming_phone_numbers = client.incoming_phone_numbers.list(limit=20)

        if not incoming_phone_numbers:
            print("❌ Aucun numéro trouvé")
            return

        for number in incoming_phone_numbers:
            print(f"📱 {number.phone_number}")
            print(f"   - Friendly Name: {number.friendly_name}")
            print(f"   - Capabilities: SMS={number.capabilities['sms']}, "
                  f"Voice={number.capabilities['voice']}, MMS={number.capabilities['mms']}")
            print()

    except Exception as e:
        print(f"❌ Erreur: {str(e)}")


def main():
    """Fonction principale."""
    print("=" * 60)
    print("   TEST D'INTÉGRATION TWILIO - SMARTQUEUE")
    print("=" * 60)

    # 1. Vérifier la configuration
    if not test_twilio_config():
        print("\n⚠️  Configuration incomplète. Veuillez configurer Twilio dans .env")
        print("   Voir: docs/TWILIO_SETUP.md")
        return

    # 2. Tester la connexion
    if not test_twilio_connection():
        print("\n⚠️  Impossible de se connecter à Twilio. Vérifiez vos credentials.")
        return

    # 3. Lister les numéros disponibles
    list_phone_numbers()

    # 4. Demander si on veut envoyer un SMS de test
    print("\n" + "=" * 60)
    response = input("Voulez-vous envoyer un SMS de test? (o/n): ")

    if response.lower() in ["o", "oui", "y", "yes"]:
        phone = input("Entrez le numéro de téléphone (format: +221XXXXXXXXX): ")

        # Test 1: SMS direct via Twilio
        if test_send_sms(phone):
            print("\n✅ Test SMS direct réussi!")

            # Test 2: Via le système de notification SmartQueue
            print("\n" + "-" * 60)
            response2 = input(
                "Voulez-vous tester le système de notification SmartQueue? (o/n): "
            )
            if response2.lower() in ["o", "oui", "y", "yes"]:
                test_notification_system(phone)

    print("\n" + "=" * 60)
    print("   FIN DES TESTS")
    print("=" * 60)


if __name__ == "__main__":
    main()
