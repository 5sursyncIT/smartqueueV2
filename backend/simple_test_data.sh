#!/bin/bash
# Script simple pour créer des données de test minimales

. .venv/bin/activate

DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py shell <<'EOF'
from apps.tenants.models import Tenant, Subscription, Invoice
from datetime import datetime, timedelta

print('='*60)
print('📊 Création de données de test pour facturation')
print('='*60)

# Organisations à créer
orgs = [
    {'name': 'Banque Atlantique', 'slug': 'banque-atlantique', 'plan': 'enterprise', 'price': 150000},
    {'name': 'Clinique Madeleine', 'slug': 'clinique-madeleine', 'plan': 'professional', 'price': 45000},
    {'name': 'Restaurant Le Lagon', 'slug': 'restaurant-lagon', 'plan': 'essential', 'price': 15000},
]

for org_data in orgs:
    # Créer ou récupérer le tenant
    tenant, created = Tenant.objects.get_or_create(
        slug=org_data['slug'],
        defaults={
            'name': org_data['name'],
            'email': f"contact@{org_data['slug']}.sn",
            'is_active': True
        }
    )

    if created:
        print(f"\n✅ {tenant.name}")
    else:
        print(f"\nℹ️  {tenant.name} (déjà existant)")

    # Créer abonnement
    if not hasattr(tenant, 'subscription'):
        sub = Subscription.objects.create(
            tenant=tenant,
            plan=org_data['plan'],
            status='active',
            billing_cycle='monthly',
            monthly_price=org_data['price'],
            currency='XOF'
        )
        print(f"  → Abonnement créé: {org_data['plan']}")

        # Créer 3 factures simples
        for i in range(3):
            days_ago = (3-i) * 30
            price = org_data['price']
            subtotal = int(price / 1.18)
            tax = price - subtotal

            status = 'paid' if i < 2 else 'open'

            inv = Invoice.objects.create(
                tenant=tenant,
                subscription=sub,
                invoice_number=f"INV-{org_data['slug'].upper()[:4]}-{2025}-{1000+i}",
                subtotal=subtotal,
                tax=tax,
                total=price,
                currency='XOF',
                status=status,
                invoice_date=datetime.now().date() - timedelta(days=days_ago),
                due_date=datetime.now().date() - timedelta(days=days_ago-15),
                description=f"Abonnement {org_data['plan']} - {org_data['slug']}"
            )
            print(f"  → Facture {inv.invoice_number}: {price:,} XOF - {status}")
    else:
        print(f"  → Abonnement déjà existant")

print('\n' + '='*60)
print('✅ Terminé!')
print('='*60)
print(f"\nStatistiques:")
print(f"  • Tenants: {Tenant.objects.count()}")
print(f"  • Abonnements: {Subscription.objects.count()}")
print(f"  • Factures: {Invoice.objects.count()}")
print(f"\n🔐 Connexion super-admin:")
print(f"  Email: superadmin@smartqueue.app")
print(f"  Password: Admin123!")
print(f"\n🌐 URL: http://localhost:3001/superadmin/billing")
EOF
