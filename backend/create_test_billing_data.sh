#!/bin/bash

# Script pour créer des données de test pour la facturation
. .venv/bin/activate

DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py shell <<EOF
from apps.tenants.models import Tenant, Subscription, Invoice, Transaction
from datetime import datetime, timedelta
from decimal import Decimal
import random

print('📊 Statistiques actuelles:')
print(f'  Tenants: {Tenant.objects.count()}')
print(f'  Subscriptions: {Subscription.objects.count()}')
print(f'  Invoices: {Invoice.objects.count()}')
print(f'  Transactions: {Transaction.objects.count()}')

# Créer quelques organisations simples
orgs_data = [
    {'name': 'Banque Atlantique', 'slug': 'banque-atlantique', 'plan': 'enterprise', 'price': 150000},
    {'name': 'Clinique Madeleine', 'slug': 'clinique-madeleine', 'plan': 'professional', 'price': 45000},
    {'name': 'Restaurant Le Lagon', 'slug': 'restaurant-lagon', 'plan': 'essential', 'price': 15000},
]

for org in orgs_data:
    tenant, created = Tenant.objects.get_or_create(
        slug=org['slug'],
        defaults={
            'name': org['name'],
            'email': f"contact@{org['slug']}.sn",
            'is_active': True
        }
    )

    if created:
        print(f"\\n✅ Créé: {tenant.name}")

        # Créer abonnement
        sub = Subscription.objects.create(
            tenant=tenant,
            plan=org['plan'],
            status='active',
            billing_cycle='monthly',
            monthly_price=org['price'],
            currency='XOF'
        )
        print(f"  → Abonnement {org['plan']} créé")

        # Créer 3 factures
        for i in range(3):
            days_ago = (3-i) * 30
            total_amount = org['price']
            subtotal = int(total_amount / 1.18)
            tax_amount = total_amount - subtotal

            invoice = Invoice.objects.create(
                tenant=tenant,
                subscription=sub,
                invoice_number=f"INV-{tenant.slug.upper()[:3]}-2025-{1000+i}",
                subtotal=subtotal,
                tax=tax_amount,
                total=total_amount,
                currency='XOF',
                status='paid' if i < 2 else 'open',
                invoice_date=datetime.now() - timedelta(days=days_ago),
                due_date=datetime.now() - timedelta(days=days_ago-15)
            )

            if i < 2:  # 2 premières factures payées
                trans = Transaction.objects.create(
                    tenant=tenant,
                    subscription=sub,
                    invoice=invoice,
                    transaction_id=f"TXN-{random.randint(100000, 999999)}",
                    amount=Decimal(str(org['price'])),
                    currency='XOF',
                    payment_method=random.choice(['orange_money', 'wave', 'free_money']),
                    status='succeeded'
                )
                invoice.payment = trans
                invoice.save()
                print(f"  → Facture {invoice.invoice_number}: {org['price']} XOF - payée")
            else:
                print(f"  → Facture {invoice.invoice_number}: {org['price']} XOF - en attente")
    else:
        print(f"\\nℹ️  Existe déjà: {tenant.name}")

print('\\n' + '='*60)
print('✅ Données de test créées!')
print('='*60)
print(f'\\n📊 Statistiques finales:')
print(f'  Tenants: {Tenant.objects.count()}')
print(f'  Subscriptions: {Subscription.objects.count()}')
print(f'  Invoices: {Invoice.objects.count()}')
print(f'  Transactions: {Transaction.objects.count()}')
print('\\nConnexion super-admin:')
print('  Email: superadmin@smartqueue.app')
print('  Password: Admin123!')
print('\\nURL: http://localhost:3001/superadmin/billing')
EOF
