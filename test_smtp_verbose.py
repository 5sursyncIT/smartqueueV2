#!/usr/bin/env python3
"""
Script de diagnostic SMTP avec logs verbeux pour voir exactement ce qui se passe.
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
from email.mime.multipart import MIMEMultipart
import logging

# Activer les logs SMTP détaillés
logging.basicConfig(level=logging.DEBUG)
smtplib.SMTP.debuglevel = 1  # Logs verbeux SMTP

def test_smtp_detailed():
    """Test SMTP avec logs détaillés."""
    config = SystemConfig.load()

    print("=" * 80)
    print("TEST SMTP DÉTAILLÉ - SmartQueue")
    print("=" * 80)
    print()

    print("📋 Configuration:")
    print(f"   Host: {config.smtp_host}")
    print(f"   Port: {config.smtp_port}")
    print(f"   TLS: {config.smtp_use_tls}")
    print(f"   SSL: {config.smtp_use_ssl}")
    print(f"   Username: {config.smtp_username}")
    print(f"   From: {config.smtp_from_email}")
    print()

    test_email = input("📧 Entrez l'adresse email de destination (Entrée = youssouphadiop@hotmail.fr): ").strip()
    if not test_email:
        test_email = "youssouphadiop@hotmail.fr"

    print()
    print(f"🚀 Envoi d'un email de test à: {test_email}")
    print()
    print("=" * 80)
    print("LOGS SMTP DÉTAILLÉS:")
    print("=" * 80)
    print()

    try:
        # Connexion SMTP avec logs détaillés
        if config.smtp_use_ssl:
            print("→ Connexion SSL...")
            server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port, timeout=30)
        else:
            print("→ Connexion standard...")
            server = smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=30)

        print("→ Connexion établie")
        print()

        # EHLO
        print("→ Envoi EHLO...")
        server.ehlo()
        print()

        # STARTTLS si nécessaire
        if config.smtp_use_tls and not config.smtp_use_ssl:
            print("→ Activation STARTTLS...")
            server.starttls()
            server.ehlo()  # EHLO après STARTTLS
            print()

        # Authentification
        if config.smtp_username and config.smtp_password:
            print("→ Authentification...")
            server.login(config.smtp_username, config.smtp_password)
            print("✓ Authentification réussie")
            print()

        # Créer l'email
        msg = MIMEMultipart('alternative')
        msg['Subject'] = '🧪 Test SMTP Détaillé - SmartQueue'
        msg['From'] = config.smtp_from_email
        msg['To'] = test_email
        msg['Reply-To'] = config.smtp_from_email

        # Corps de l'email
        text = f"""
Bonjour,

Ceci est un email de test envoyé avec logs SMTP détaillés.

Configuration utilisée:
- Serveur: {config.smtp_host}:{config.smtp_port}
- TLS: {'Oui' if config.smtp_use_tls else 'Non'}
- SSL: {'Oui' if config.smtp_use_ssl else 'Non'}
- Authentification: {'Oui' if config.smtp_username else 'Non'}
- De: {config.smtp_from_email}
- À: {test_email}

Si vous recevez cet email, la configuration SMTP fonctionne!

⚠️ IMPORTANT: Vérifiez également votre dossier SPAM/Courrier indésirable!

Cordialement,
SmartQueue Diagnostic Tool
"""

        html = f"""
<html>
<body>
<h2>🧪 Test SMTP Détaillé - SmartQueue</h2>
<p>Bonjour,</p>
<p>Ceci est un email de test envoyé avec logs SMTP détaillés.</p>

<h3>Configuration utilisée:</h3>
<ul>
<li><strong>Serveur:</strong> {config.smtp_host}:{config.smtp_port}</li>
<li><strong>TLS:</strong> {'Oui' if config.smtp_use_tls else 'Non'}</li>
<li><strong>SSL:</strong> {'Oui' if config.smtp_use_ssl else 'Non'}</li>
<li><strong>Authentification:</strong> {'Oui' if config.smtp_username else 'Non'}</li>
<li><strong>De:</strong> {config.smtp_from_email}</li>
<li><strong>À:</strong> {test_email}</li>
</ul>

<p style="color: green;">Si vous recevez cet email, la configuration SMTP fonctionne!</p>

<p style="color: red;"><strong>⚠️ IMPORTANT:</strong> Vérifiez également votre dossier SPAM/Courrier indésirable!</p>

<p>Cordialement,<br>SmartQueue Diagnostic Tool</p>
</body>
</html>
"""

        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)

        print("→ Envoi de l'email...")
        print()

        # Envoyer
        result = server.send_message(msg)

        print()
        print("=" * 80)
        print()

        if result:
            print(f"⚠️  AVERTISSEMENT: Certains destinataires ont été rejetés:")
            for recipient, (code, message) in result.items():
                print(f"   {recipient}: {code} - {message}")
        else:
            print("✅ Email envoyé avec succès!")
            print(f"   De: {config.smtp_from_email}")
            print(f"   À: {test_email}")

        server.quit()

        print()
        print("=" * 80)
        print()
        print("📬 PROCHAINES ÉTAPES:")
        print()
        print("1. Vérifiez votre boîte de réception")
        print("2. ⚠️  VÉRIFIEZ LE DOSSIER SPAM/COURRIER INDÉSIRABLE ⚠️")
        print("3. Attendez 2-5 minutes pour la livraison")
        print()
        print("Si vous ne recevez toujours pas l'email:")
        print("- Vérifiez les logs de votre serveur mail (cPanel, Plesk, etc.)")
        print("- Contactez votre hébergeur pour vérifier les restrictions")
        print("- Vérifiez les enregistrements SPF/DKIM de votre domaine")
        print()

    except smtplib.SMTPAuthenticationError as e:
        print()
        print("=" * 80)
        print()
        print(f"❌ ERREUR D'AUTHENTIFICATION: {e}")
        print()
        print("Solutions possibles:")
        print("- Vérifiez le username (email complet vs username seul)")
        print("- Vérifiez le mot de passe")
        print("- Vérifiez que le compte email existe")
        print()

    except smtplib.SMTPException as e:
        print()
        print("=" * 80)
        print()
        print(f"❌ ERREUR SMTP: {e}")
        print()

    except Exception as e:
        print()
        print("=" * 80)
        print()
        print(f"❌ ERREUR: {e}")
        print()

if __name__ == "__main__":
    test_smtp_detailed()
