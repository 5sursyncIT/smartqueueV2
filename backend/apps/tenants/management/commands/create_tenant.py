"""Management command pour créer un tenant avec données de démo."""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.customers.models import Customer
from apps.notifications.models import NotificationTemplate
from apps.queues.models import Queue, Service, Site
from apps.tenants.models import Tenant, TenantMembership
from apps.users.models import AgentProfile, User


class Command(BaseCommand):
    help = "Crée un nouveau tenant avec des données de démonstration"

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument("--name", type=str, required=True, help="Nom du tenant")
        parser.add_argument("--slug", type=str, help="Slug du tenant (auto-généré si omis)")
        parser.add_argument(
            "--admin-email", type=str, required=True, help="Email de l'administrateur"
        )
        parser.add_argument("--admin-password", type=str, default="admin123", help="Mot de passe admin")
        parser.add_argument("--with-demo-data", action="store_true", help="Créer des données de démo")

    @transaction.atomic
    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        name = options["name"]
        slug = options.get("slug") or slugify(name)
        admin_email = options["admin_email"]
        admin_password = options["admin_password"]
        with_demo = options.get("with_demo_data", False)

        # Créer le tenant
        self.stdout.write(f"Création du tenant '{name}' ({slug})...")
        tenant, created = Tenant.objects.get_or_create(
            slug=slug,
            defaults={
                "name": name,
                "plan": "standard",
                "locale": "fr",
                "timezone": "Africa/Dakar",
            },
        )

        if not created:
            self.stdout.write(self.style.WARNING(f"Le tenant '{slug}' existe déjà."))
            return

        # Créer l'utilisateur admin
        self.stdout.write(f"Création de l'administrateur {admin_email}...")
        user, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                "first_name": "Admin",
                "last_name": name,
            },
        )
        if created:
            user.set_password(admin_password)
            user.save()

        # Créer le membership
        TenantMembership.objects.get_or_create(
            tenant=tenant,
            user=user,
            defaults={"role": TenantMembership.ROLE_ADMIN},
        )

        if with_demo:
            self.stdout.write("Création des données de démonstration...")
            self._create_demo_data(tenant)

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ Tenant '{name}' créé avec succès!\n"
                f"  Slug: {slug}\n"
                f"  Admin: {admin_email}\n"
                f"  Password: {admin_password}\n"
                f"  Pour vous connecter, utilisez l'en-tête: X-Tenant: {slug}\n"
            )
        )

    def _create_demo_data(self, tenant: Tenant) -> None:
        """Crée des données de démonstration."""
        # Créer un site
        site = Site.objects.create(
            tenant=tenant,
            name="Agence Principale",
            slug="agence-principale",
            address="Avenue Léopold Sédar Senghor",
            city="Dakar",
            country="SN",
            timezone="Africa/Dakar",
        )
        self.stdout.write(f"  ✓ Site créé: {site.name}")

        # Créer des services
        services = [
            Service.objects.create(
                tenant=tenant,
                name="Ouverture de compte",
                sla_seconds=600,  # 10 minutes
            ),
            Service.objects.create(
                tenant=tenant,
                name="Retrait d'espèces",
                sla_seconds=300,  # 5 minutes
            ),
            Service.objects.create(
                tenant=tenant,
                name="Conseil financier",
                sla_seconds=1800,  # 30 minutes
            ),
        ]
        self.stdout.write(f"  ✓ {len(services)} services créés")

        # Créer des files
        queues = []
        for service in services:
            queue = Queue.objects.create(
                tenant=tenant,
                site=site,
                name=f"File {service.name}",
                slug=slugify(service.name),
                service=service,
                algorithm=Queue.ALGO_FIFO,
                status=Queue.STATUS_ACTIVE,
            )
            queues.append(queue)
        self.stdout.write(f"  ✓ {len(queues)} files créées")

        # Créer des agents
        for i in range(1, 4):
            user = User.objects.create(
                email=f"agent{i}@{tenant.slug}.smartqueue.app",
                first_name=f"Agent",
                last_name=f"{i}",
            )
            user.set_password("agent123")
            user.save()

            TenantMembership.objects.create(
                tenant=tenant,
                user=user,
                role=TenantMembership.ROLE_AGENT,
            )

            AgentProfile.objects.create(
                user=user,
                current_status=AgentProfile.STATUS_AVAILABLE,
            )
        self.stdout.write("  ✓ 3 agents créés")

        # Créer des clients de démo
        customers = [
            Customer.objects.create(
                tenant=tenant,
                first_name="Amadou",
                last_name="Diallo",
                phone="+221771234567",
                email="amadou.diallo@example.com",
                notify_sms=True,
            ),
            Customer.objects.create(
                tenant=tenant,
                first_name="Fatou",
                last_name="Sall",
                phone="+221772345678",
                email="fatou.sall@example.com",
                notify_sms=True,
                notify_email=True,
            ),
        ]
        self.stdout.write(f"  ✓ {len(customers)} clients créés")

        # Créer des templates de notification
        templates = [
            NotificationTemplate.objects.create(
                tenant=tenant,
                name="Ticket créé - SMS",
                event=NotificationTemplate.EVENT_TICKET_CREATED,
                channel=NotificationTemplate.CHANNEL_SMS,
                body="Bonjour {{customer_name}}, votre ticket {{ticket_number}} est créé. "
                "Temps d'attente estimé: {{eta_minutes}} minutes.",
            ),
            NotificationTemplate.objects.create(
                tenant=tenant,
                name="Ticket appelé - SMS",
                event=NotificationTemplate.EVENT_TICKET_CALLED,
                channel=NotificationTemplate.CHANNEL_SMS,
                body="Ticket {{ticket_number}}, veuillez vous présenter au guichet. "
                "{{agent_name}} vous attend.",
            ),
        ]
        self.stdout.write(f"  ✓ {len(templates)} templates de notification créés")
