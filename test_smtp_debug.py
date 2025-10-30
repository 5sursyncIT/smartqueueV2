#!/usr/bin/env python3
"""
Script de diagnostic SMTP pour identifier pourquoi les emails ne sont pas reçus.
"""
import os
import sys
import django
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Configuration Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartqueue_backend.settings.dev")
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
django.setup()

from apps.core.models import SystemConfig
import smtplib
from email.mime.text import MIMEText

def test_smtp_connection():
    """Teste la connexion SMTP avec différentes configurations."""
    config = SystemConfig.load()

    print("=" * 80)
    print("DIAGNOSTIC SMTP - SmartQueue")
    print("=" * 80)
    print()

    print("📋 Configuration actuelle:")
    print(f"   Host: {config.smtp_host}")
    print(f"   Port: {config.smtp_port}")
    print(f"   TLS: {config.smtp_use_tls}")
    print(f"   SSL: {config.smtp_use_ssl}")
    print(f"   Username: {config.smtp_username}")
    print(f"   From: {config.smtp_from_email}")
    print(f"   Password: {'✓ Configuré' if config.smtp_password else '✗ Non configuré'}")
    print()

    # Test 1: Connexion basique
    print("🔍 Test 1: Connexion au serveur SMTP...")
    try:
        if config.smtp_use_ssl:
            print("   → Tentative avec SSL...")
            server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port, timeout=10)
        else:
            print("   → Tentative sans SSL...")
            server = smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=10)
        print("   ✓ Connexion réussie")

        # Test 2: STARTTLS si nécessaire
        if config.smtp_use_tls and not config.smtp_use_ssl:
            print()
            print("🔍 Test 2: Activation de STARTTLS...")
            try:
                server.starttls()
                print("   ✓ STARTTLS activé")
            except Exception as e:
                print(f"   ✗ Erreur STARTTLS: {e}")
                return

        # Test 3: Authentification
        if config.smtp_username and config.smtp_password:
            print()
            print("🔍 Test 3: Authentification...")
            try:
                server.login(config.smtp_username, config.smtp_password)
                print("   ✓ Authentification réussie")
            except smtplib.SMTPAuthenticationError as e:
                print(f"   ✗ Erreur d'authentification: {e}")
                print()
                print("💡 Suggestions:")
                print("   - Vérifiez que le username est correct (souvent l'email complet)")
                print("   - Vérifiez que le mot de passe est correct")
                print("   - Pour Gmail, utilisez un 'App Password' au lieu du mot de passe normal")
                print("   - Vérifiez que le compte email existe et peut envoyer des emails")
                server.quit()
                return
            except Exception as e:
                print(f"   ✗ Erreur: {e}")
                server.quit()
                return

        # Test 4: Envoi d'un email de test
        print()
        print("🔍 Test 4: Envoi d'un email de test...")
        test_email = input("   Entrez l'adresse email de destination (ou Entrée pour ydiop@5sursync.com): ").strip()
        if not test_email:
            test_email = "ydiop@5sursync.com"

        msg = MIMEText("""
Ceci est un email de test envoyé depuis le script de diagnostic SMTP.

Configuration testée:
- Serveur: {host}:{port}
- TLS: {tls}
- SSL: {ssl}
- Authentification: {auth}

Si vous recevez cet email, votre configuration SMTP fonctionne correctement!

Note: Vérifiez également vos dossiers SPAM/Courrier indésirable.

--
SmartQueue Diagnostic Tool
""".format(
            host=config.smtp_host,
            port=config.smtp_port,
            tls="Oui" if config.smtp_use_tls else "Non",
            ssl="Oui" if config.smtp_use_ssl else "Non",
            auth="Oui" if config.smtp_username else "Non"
        ))

        msg['Subject'] = '🧪 Test SMTP Diagnostic - SmartQueue'
        msg['From'] = config.smtp_from_email
        msg['To'] = test_email

        try:
            server.send_message(msg)
            print(f"   ✓ Email envoyé à {test_email}")
            print()
            print("📬 Email envoyé avec succès!")
            print()
            print("⚠️  Important:")
            print("   - Vérifiez votre boîte de réception")
            print("   - Vérifiez le dossier SPAM/Courrier indésirable")
            print("   - L'email peut prendre quelques minutes à arriver")
            print("   - Vérifiez que l'adresse email de destination est correcte")
        except Exception as e:
            print(f"   ✗ Erreur lors de l'envoi: {e}")
            print()
            print("💡 Suggestions:")
            print("   - L'adresse email d'expéditeur doit être valide et autorisée")
            print("   - Vérifiez les logs du serveur SMTP")
            print("   - Certains serveurs ont des restrictions sur les domaines autorisés")

        server.quit()

    except smtplib.SMTPConnectError as e:
        print(f"   ✗ Impossible de se connecter au serveur: {e}")
        print()
        print("💡 Suggestions:")
        print("   - Vérifiez que le serveur SMTP est accessible")
        print("   - Vérifiez le port (587 pour STARTTLS, 465 pour SSL, 25 pour non-sécurisé)")
        print("   - Vérifiez votre pare-feu")
    except smtplib.SMTPException as e:
        print(f"   ✗ Erreur SMTP: {e}")
    except Exception as e:
        print(f"   ✗ Erreur inattendue: {e}")

    print()
    print("=" * 80)
    print()

    # Recommandations basées sur la config actuelle
    print("💡 RECOMMANDATIONS:")
    print()

    if config.smtp_port == 587 and not config.smtp_use_tls:
        print("⚠️  Le port 587 nécessite généralement TLS (STARTTLS)")
        print("   → Activez TLS dans l'interface de configuration")
        print()

    if config.smtp_port == 465 and not config.smtp_use_ssl:
        print("⚠️  Le port 465 nécessite généralement SSL")
        print("   → Activez SSL dans l'interface de configuration")
        print()

    if not config.smtp_username or not config.smtp_password:
        print("⚠️  Aucune authentification configurée")
        print("   → La plupart des serveurs SMTP nécessitent une authentification")
        print()

    print("📚 Configurations courantes:")
    print()
    print("   Port 587 (STARTTLS):")
    print("   - TLS: ✓ Activé")
    print("   - SSL: ✗ Désactivé")
    print("   - Authentification: Requise")
    print()
    print("   Port 465 (SSL/TLS):")
    print("   - TLS: ✗ Désactivé")
    print("   - SSL: ✓ Activé")
    print("   - Authentification: Requise")
    print()
    print("   Port 25 (Non sécurisé):")
    print("   - TLS: ✗ Désactivé")
    print("   - SSL: ✗ Désactivé")
    print("   - Authentification: Optionnelle")
    print()

if __name__ == "__main__":
    test_smtp_connection()
