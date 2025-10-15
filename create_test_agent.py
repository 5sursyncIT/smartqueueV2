#!/usr/bin/env python
"""
Script pour créer un agent de test
"""
import os
import sys
import django

# Configurer Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartqueue_backend.settings.dev')
django.setup()

from apps.users.models import User, AgentProfile
from apps.tenants.models import Tenant, TenantMembership

def create_test_agent():
    """Créer un agent de test pour le tenant demo-bank"""

    # Email de l'agent
    email = 'agent@demo-bank.com'
    password = 'agent123'

    # Vérifier si l'utilisateur existe déjà
    if User.objects.filter(email=email).exists():
        print(f"❌ L'utilisateur {email} existe déjà")
        user = User.objects.get(email=email)
        print(f"✅ Utilisateur existant récupéré: {user.email}")
    else:
        # Créer l'utilisateur
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name='Agent',
            last_name='Demo',
            phone_number='+221771234567'
        )
        print(f"✅ Utilisateur créé: {user.email}")

    # Récupérer le tenant
    try:
        tenant = Tenant.objects.get(slug='demo-bank')
        print(f"✅ Tenant trouvé: {tenant.name}")
    except Tenant.DoesNotExist:
        print("❌ Tenant 'demo-bank' non trouvé")
        print("   Liste des tenants disponibles:")
        for t in Tenant.objects.all():
            print(f"   - {t.slug} ({t.name})")
        return

    # Créer ou récupérer le membership
    membership, created = TenantMembership.objects.get_or_create(
        user=user,
        tenant=tenant,
        defaults={
            'role': 'agent',
            'is_active': True
        }
    )

    if created:
        print(f"✅ Membership créé avec rôle: {membership.role}")
    else:
        if membership.role != 'agent':
            membership.role = 'agent'
            membership.save()
            print(f"✅ Membership mis à jour avec rôle: agent")
        else:
            print(f"✅ Membership existant: {membership.role}")

    # Créer ou récupérer le profil agent
    agent_profile, created = AgentProfile.objects.get_or_create(
        user=user,
        defaults={
            'current_status': 'available'
        }
    )

    if created:
        print(f"✅ Profil agent créé")
    else:
        print(f"✅ Profil agent existant")

    print("\n" + "="*60)
    print("🎉 Agent de test prêt !")
    print("="*60)
    print(f"📧 Email    : {email}")
    print(f"🔑 Password : {password}")
    print(f"🏢 Tenant   : {tenant.name} ({tenant.slug})")
    print(f"👤 Rôle     : agent")
    print(f"✨ Statut   : {agent_profile.current_status}")
    print("="*60)
    print("\n📌 Connexion:")
    print(f"   1. Allez sur: http://localhost:3000/login")
    print(f"   2. Email: {email}")
    print(f"   3. Password: {password}")
    print(f"   4. Vous serez redirigé vers: /agent")
    print("="*60)

if __name__ == '__main__':
    create_test_agent()
