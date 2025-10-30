# Generated manually to migrate plan data

from django.db import migrations


def migrate_plan_data(apps, schema_editor):
    """
    Migration de données pour corriger les incohérences de plans:
    1. Mapper les anciens noms de plans vers les nouveaux SubscriptionPlan
    2. Mettre à jour les tenants avec les quotas corrects
    3. Créer/Corriger les souscriptions avec les FK vers SubscriptionPlan
    """
    Tenant = apps.get_model('tenants', 'Tenant')
    SubscriptionPlan = apps.get_model('tenants', 'SubscriptionPlan')
    Subscription = apps.get_model('tenants', 'Subscription')

    # Mapping des anciens noms vers les nouveaux plans
    PLAN_MAPPING = {
        'trial': 'essential',
        'starter': 'essential',
        'standard': 'professional',
        'business': 'professional',
        'professional': 'professional',
        'essential': 'essential',
        'enterprise': 'enterprise',
    }

    print("\n" + "=" * 80)
    print("MIGRATION DES DONNÉES DE PLANS")
    print("=" * 80)

    # 1. Récupérer les plans créés
    plans = {}
    for plan in SubscriptionPlan.objects.all():
        plans[plan.slug] = plan
        print(f"✓ Plan trouvé: {plan.name} ({plan.slug}) - ID: {plan.id}")

    if not plans:
        print("⚠️  ERREUR: Aucun plan trouvé! Exécutez d'abord: python manage.py create_subscription_plans")
        return

    # 2. Mettre à jour tous les tenants
    print("\n" + "=" * 80)
    print("MISE À JOUR DES TENANTS")
    print("=" * 80)

    for tenant in Tenant.objects.all():
        old_plan = tenant.plan.lower() if tenant.plan else 'trial'
        new_plan_slug = PLAN_MAPPING.get(old_plan, 'essential')
        new_plan = plans.get(new_plan_slug)

        if not new_plan:
            print(f"⚠️  Plan '{new_plan_slug}' non trouvé pour {tenant.name}")
            continue

        # Mettre à jour les quotas du tenant selon le plan
        tenant.max_sites = new_plan.max_sites
        tenant.max_agents = new_plan.max_agents
        tenant.max_queues = new_plan.max_queues
        tenant.plan = new_plan_slug  # Garder le slug pour compatibilité
        tenant.save()

        print(f"✓ {tenant.name}: {old_plan} → {new_plan_slug}")
        print(f"  Quotas: Sites={new_plan.max_sites}, Agents={new_plan.max_agents}, Queues={new_plan.max_queues}")

        # 3. Créer ou mettre à jour la souscription
        try:
            subscription = Subscription.objects.get(tenant=tenant)
            # Mettre à jour avec la FK vers le bon plan
            old_sub_plan = subscription.plan if isinstance(subscription.plan, str) else str(subscription.plan)
            mapped_slug = PLAN_MAPPING.get(old_sub_plan.lower(), 'essential')
            subscription.plan = plans[mapped_slug]
            subscription.save()
            print(f"  ✓ Souscription mise à jour: {old_sub_plan} → {mapped_slug}")
        except Subscription.DoesNotExist:
            # Créer une nouvelle souscription
            from datetime import date, timedelta
            subscription = Subscription.objects.create(
                tenant=tenant,
                plan=new_plan,
                status='active',
                billing_cycle='monthly',
                monthly_price=int(new_plan.monthly_price * 100),  # Convertir en centimes
                currency='XOF',
                starts_at=date.today(),
                current_period_start=date.today(),
                current_period_end=date.today() + timedelta(days=30),
            )
            print(f"  ✓ Souscription créée: {new_plan_slug}")

    print("\n" + "=" * 80)
    print("MIGRATION TERMINÉE")
    print("=" * 80)


def reverse_migration(apps, schema_editor):
    """Annuler la migration (pas de reverse pour les données)"""
    print("⚠️  La migration de données ne peut pas être annulée automatiquement")


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0007_add_subscription_plan_and_update_subscription'),
    ]

    operations = [
        migrations.RunPython(migrate_plan_data, reverse_migration),
    ]
