#!/usr/bin/env python
"""Script rapide pour envoyer un SMS de test."""

import os
import sys

# Charger les variables d'environnement depuis .env
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartqueue_backend.settings.dev")

import django
django.setup()

from django.conf import settings
from twilio.rest import Client


def test_connection():
    """Teste la connexion Twilio."""
    print("🔍 Test de connexion Twilio...")

    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        account = client.api.accounts(settings.TWILIO_ACCOUNT_SID).fetch()

        print(f"✅ Connexion réussie!")
        print(f"   Account SID: {account.sid}")
        print(f"   Status: {account.status}")
        print(f"   Type: {account.type}")
        return True
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False


def send_test_sms(to_number):
    """Envoie un SMS de test."""
    print(f"\n📱 Envoi d'un SMS à {to_number}...")

    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        message = client.messages.create(
            body=f"🎉 Test SMS depuis SmartQueue!\n\nL'intégration Twilio fonctionne correctement.\n\nEnvoyé depuis: {settings.TWILIO_PHONE_NUMBER}",
            from_=settings.TWILIO_PHONE_NUMBER,
            to=to_number
        )

        print(f"✅ SMS envoyé!")
        print(f"   Message SID: {message.sid}")
        print(f"   Status: {message.status}")
        print(f"   To: {message.to}")
        print(f"   From: {message.from_}")

        if message.error_code:
            print(f"   ⚠️  Error Code: {message.error_code}")
            print(f"   Error Message: {message.error_message}")

        return True
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False


def main():
    """Main function."""
    print("=" * 60)
    print("   TEST SMS TWILIO - SMARTQUEUE")
    print("=" * 60)
    print()

    # Test connexion
    if not test_connection():
        return

    # Demander le numéro
    print("\n" + "=" * 60)
    print("⚠️  IMPORTANT: Avec un compte Trial, vous devez d'abord")
    print("   vérifier le numéro destinataire dans la console Twilio:")
    print("   https://console.twilio.com/us1/develop/phone-numbers/manage/verified")
    print("=" * 60)
    print()

    to_number = input("Entrez le numéro de téléphone (format: +221XXXXXXXXX): ").strip()

    if not to_number:
        print("❌ Numéro requis")
        return

    if not to_number.startswith('+'):
        print("⚠️  Le numéro doit commencer par + (ex: +221XXXXXXXXX)")
        to_number = '+' + to_number

    # Envoyer le SMS
    send_test_sms(to_number)


if __name__ == "__main__":
    main()
