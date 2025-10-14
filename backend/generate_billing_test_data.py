#!/usr/bin/env python
"""
Script pour générer des données de test pour le système de facturation.
Usage: python generate_billing_test_data.py
"""
import os
import sys
import django
from decimal import Decimal
from datetime import datetime, timedelta
import random

# Configuration Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartqueue_backend.settings.dev')
django.setup()

from apps.tenants.models import (
    Tenant, SubscriptionPlan, Subscription,
    Invoice, Transaction, PaymentMethod, TenantMembership
)
from apps.users.models import User

def create_test_organizations():
    """Créer des organisations de test avec des abonnements."""
    print("🏢 Création des organisations de test...")

    # Récupérer ou créer les plans d'abonnement
    plans = {
        'essential': SubscriptionPlan.objects.filter(slug='essential').first(),
        'professional': SubscriptionPlan.objects.filter(slug='professional').first(),
        'enterprise': SubscriptionPlan.objects.filter(slug='enterprise').first(),
    }

    if not any(plans.values()):
        print("⚠️  Plans d'abonnement manquants. Création...")
        plans['essential'] = SubscriptionPlan.objects.create(
            name="Essential",
            slug="essential",
            description="Plan de base pour petites entreprises",
            price_monthly=Decimal("15000.00"),
            price_yearly=Decimal("150000.00"),
            features={"max_agents": 5, "max_queues": 10},
            is_active=True
        )
        plans['professional'] = SubscriptionPlan.objects.create(
            name="Professional",
            slug="professional",
            description="Plan avancé pour entreprises moyennes",
            price_monthly=Decimal("45000.00"),
            price_yearly=Decimal("450000.00"),
            features={"max_agents": 20, "max_queues": 50},
            is_active=True
        )
        plans['enterprise'] = SubscriptionPlan.objects.create(
            name="Enterprise",
            slug="enterprise",
            description="Plan personnalisé pour grandes entreprises",
            price_monthly=Decimal("150000.00"),
            price_yearly=Decimal("1500000.00"),
            features={"max_agents": -1, "max_queues": -1},
            is_active=True
        )

    organizations = [
        {
            'name': 'Banque Atlantique',
            'slug': 'banque-atlantique',
            'email': 'contact@atlantique.sn',
            'plan': 'enterprise',
            'billing_period': 'yearly',
            'status': 'active',
        },
        {
            'name': 'Clinique Madeleine',
            'slug': 'clinique-madeleine',
            'email': 'info@madeleine.sn',
            'plan': 'professional',
            'billing_period': 'monthly',
            'status': 'active',
        },
        {
            'name': 'Mairie de Dakar',
            'slug': 'mairie-dakar',
            'email': 'services@mairie-dakar.sn',
            'plan': 'professional',
            'billing_period': 'yearly',
            'status': 'active',
        },
        {
            'name': 'Restaurant Le Lagon',
            'slug': 'restaurant-lagon',
            'email': 'contact@lelagon.sn',
            'plan': 'essential',
            'billing_period': 'monthly',
            'status': 'trial',
        },
        {
            'name': 'Garage Auto Plus',
            'slug': 'garage-autoplus',
            'email': 'contact@autoplus.sn',
            'plan': 'essential',
            'billing_period': 'monthly',
            'status': 'past_due',
        },
    ]

    created_orgs = []
    for org_data in organizations:
        # Vérifier si l'organisation existe
        tenant = Tenant.objects.filter(slug=org_data['slug']).first()
        if not tenant:
            tenant = Tenant.objects.create(
                name=org_data['name'],
                slug=org_data['slug'],
                email=org_data['email'],
                company_name=org_data['name'],
                is_active=True
            )
            print(f"  ✅ Organisation créée: {tenant.name}")
        else:
            print(f"  ℹ️  Organisation existante: {tenant.name}")

        # Créer l'abonnement
        plan = plans[org_data['plan']]
        subscription = Subscription.objects.filter(tenant=tenant).first()

        if not subscription:
            # Calculer les dates
            now = datetime.now()
            if org_data['status'] == 'trial':
                start_date = now - timedelta(days=7)
                trial_end = now + timedelta(days=7)
                current_period_end = trial_end
            else:
                start_date = now - timedelta(days=60)  # Commencé il y a 2 mois
                trial_end = start_date + timedelta(days=14)
                if org_data['billing_period'] == 'monthly':
                    current_period_end = now + timedelta(days=30)
                else:
                    current_period_end = now + timedelta(days=335)  # ~11 mois restants

            subscription = Subscription.objects.create(
                tenant=tenant,
                plan=plan,
                status=org_data['status'],
                billing_period=org_data['billing_period'],
                start_date=start_date,
                trial_ends_at=trial_end if org_data['status'] == 'trial' else None,
                current_period_start=now - timedelta(days=30) if org_data['billing_period'] == 'monthly' else start_date,
                current_period_end=current_period_end,
            )
            print(f"    → Abonnement {org_data['plan']} ({org_data['billing_period']}) créé")

        created_orgs.append({'tenant': tenant, 'subscription': subscription})

    return created_orgs

def create_invoices_and_transactions(organizations):
    """Créer des factures et transactions pour les organisations."""
    print("\n💰 Création des factures et transactions...")

    payment_methods = [
        'orange_money', 'wave', 'free_money',
        'card', 'bank_transfer'
    ]

    statuses_by_sub_status = {
        'active': ['succeeded', 'succeeded', 'succeeded', 'processing'],
        'trial': [],  # Pas de paiements en trial
        'past_due': ['failed', 'pending'],
    }

    for org in organizations:
        tenant = org['tenant']
        subscription = org['subscription']

        # Nombre de factures selon le statut
        if subscription.status == 'trial':
            num_invoices = 0
        elif subscription.status == 'past_due':
            num_invoices = 3  # Plusieurs impayés
        else:
            num_invoices = random.randint(3, 6)  # 3 à 6 factures historiques

        for i in range(num_invoices):
            # Calculer la date de facture
            days_ago = (num_invoices - i) * 30 + random.randint(-5, 5)
            invoice_date = datetime.now() - timedelta(days=days_ago)
            due_date = invoice_date + timedelta(days=15)

            # Montant basé sur le plan
            if subscription.billing_period == 'monthly':
                amount = subscription.plan.price_monthly
            else:
                amount = subscription.plan.price_yearly

            # TVA 18%
            subtotal = amount / Decimal("1.18")
            tax_amount = amount - subtotal

            # Statut de la facture
            if subscription.status == 'past_due' and i >= num_invoices - 2:
                invoice_status = 'overdue'
                paid_at = None
            elif datetime.now() < due_date:
                invoice_status = 'sent'
                paid_at = None
            else:
                invoice_status = 'paid'
                paid_at = invoice_date + timedelta(days=random.randint(1, 10))

            # Créer la facture
            invoice = Invoice.objects.create(
                tenant=tenant,
                subscription=subscription,
                invoice_number=f"INV-{tenant.slug.upper()[:3]}-{datetime.now().year}-{random.randint(1000, 9999)}",
                subtotal=subtotal,
                tax_amount=tax_amount,
                total=amount,
                currency='XOF',
                status=invoice_status,
                issue_date=invoice_date,
                due_date=due_date,
                paid_at=paid_at,
                notes=f"Abonnement {subscription.plan.name} - {subscription.billing_period}",
            )

            # Créer la transaction si payée ou en cours
            if invoice_status in ['paid', 'sent']:
                payment_method = random.choice(payment_methods)

                # Déterminer le statut de transaction
                if invoice_status == 'paid':
                    transaction_status = 'succeeded'
                else:
                    transaction_status = random.choice(['pending', 'processing'])

                transaction = Transaction.objects.create(
                    tenant=tenant,
                    subscription=subscription,
                    invoice=invoice,
                    transaction_id=f"TXN-{random.randint(100000, 999999)}",
                    amount=amount,
                    currency='XOF',
                    payment_method=payment_method,
                    status=transaction_status,
                    provider_response={'message': 'Payment processed successfully'} if transaction_status == 'succeeded' else {},
                )

                # Lier la transaction à la facture
                invoice.payment = transaction
                invoice.save()

                print(f"  ✅ Facture {invoice.invoice_number}: {amount} XOF - {invoice_status}")
                print(f"    → Transaction {transaction.transaction_id}: {payment_method} - {transaction_status}")
            else:
                print(f"  ⚠️  Facture {invoice.invoice_number}: {amount} XOF - {invoice_status} (impayée)")

def main():
    """Fonction principale."""
    print("=" * 60)
    print("🚀 Génération des données de test pour la facturation")
    print("=" * 60)

    # Créer les organisations
    organizations = create_test_organizations()

    # Créer les factures et transactions
    create_invoices_and_transactions(organizations)

    # Statistiques finales
    print("\n" + "=" * 60)
    print("📊 STATISTIQUES FINALES")
    print("=" * 60)
    print(f"  • Organisations: {Tenant.objects.count()}")
    print(f"  • Plans d'abonnement: {SubscriptionPlan.objects.count()}")
    print(f"  • Abonnements: {Subscription.objects.count()}")
    print(f"  • Factures: {Invoice.objects.count()}")
    print(f"  • Transactions: {Transaction.objects.count()}")

    # Statistiques par statut
    print("\n📈 RÉPARTITION DES ABONNEMENTS:")
    for status in ['trial', 'active', 'past_due', 'suspended', 'cancelled']:
        count = Subscription.objects.filter(status=status).count()
        if count > 0:
            print(f"  • {status.capitalize()}: {count}")

    print("\n💵 RÉPARTITION DES FACTURES:")
    for status in ['draft', 'sent', 'paid', 'overdue', 'cancelled']:
        count = Invoice.objects.filter(status=status).count()
        if count > 0:
            print(f"  • {status.capitalize()}: {count}")

    print("\n✅ Données de test créées avec succès!")
    print("\nPour tester, connectez-vous avec:")
    print("  Email: superadmin@smartqueue.app")
    print("  Password: Admin123!")

if __name__ == '__main__':
    main()
