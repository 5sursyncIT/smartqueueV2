"""Management command pour créer les plans d'abonnement par défaut."""

from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.tenants.models import SubscriptionPlan


class Command(BaseCommand):
    help = "Crée les plans d'abonnement par défaut pour SmartQueue Sénégal"

    def handle(self, *args, **options):
        self.stdout.write("Création des plans d'abonnement...")

        plans = [
            {
                "name": "Essential",
                "slug": "essential",
                "description": "Idéal pour les petites structures qui débutent avec la gestion de files d'attente",
                "monthly_price": Decimal("15000.00"),  # 15 000 XOF
                "yearly_price": Decimal("150000.00"),  # 150 000 XOF (2 mois gratuits)
                "currency": "XOF",
                "features": [
                    "1 site",
                    "Jusqu'à 5 agents",
                    "3 files d'attente",
                    "500 tickets/mois",
                    "Support email",
                    "Rapports basiques",
                ],
                "max_sites": 1,
                "max_agents": 5,
                "max_queues": 3,
                "max_tickets_per_month": 500,
                "is_active": True,
                "display_order": 1,
            },
            {
                "name": "Professional",
                "slug": "professional",
                "description": "Pour les entreprises en croissance nécessitant plus de flexibilité",
                "monthly_price": Decimal("45000.00"),  # 45 000 XOF
                "yearly_price": Decimal("450000.00"),  # 450 000 XOF (2 mois gratuits)
                "currency": "XOF",
                "features": [
                    "3 sites",
                    "Jusqu'à 20 agents",
                    "10 files d'attente",
                    "2000 tickets/mois",
                    "Support prioritaire",
                    "Rapports avancés",
                    "Notifications SMS",
                    "API access",
                ],
                "max_sites": 3,
                "max_agents": 20,
                "max_queues": 10,
                "max_tickets_per_month": 2000,
                "is_active": True,
                "display_order": 2,
            },
            {
                "name": "Enterprise",
                "slug": "enterprise",
                "description": "Solution complète pour les grandes organisations avec besoins sur mesure",
                "monthly_price": Decimal("120000.00"),  # 120 000 XOF
                "yearly_price": Decimal("1200000.00"),  # 1 200 000 XOF (2 mois gratuits)
                "currency": "XOF",
                "features": [
                    "Sites illimités",
                    "Agents illimités",
                    "Files d'attente illimitées",
                    "Tickets illimités",
                    "Support 24/7",
                    "Rapports personnalisés",
                    "Notifications multi-canaux",
                    "API illimitée",
                    "Intégrations sur mesure",
                    "Formation dédiée",
                    "SLA garanti",
                ],
                "max_sites": 999,
                "max_agents": 999,
                "max_queues": 999,
                "max_tickets_per_month": 999999,
                "is_active": True,
                "display_order": 3,
            },
        ]

        created_count = 0
        updated_count = 0

        for plan_data in plans:
            plan, created = SubscriptionPlan.objects.update_or_create(
                slug=plan_data["slug"], defaults=plan_data
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Plan créé: {plan.name} - {plan.monthly_price} XOF/mois")
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f"↻ Plan mis à jour: {plan.name} - {plan.monthly_price} XOF/mois")
                )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Terminé! {created_count} plan(s) créé(s), {updated_count} plan(s) mis à jour"
            )
        )
