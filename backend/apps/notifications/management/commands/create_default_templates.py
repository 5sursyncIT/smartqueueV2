"""Commande pour créer les templates de notification par défaut."""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.notifications.models import NotificationTemplate
from apps.tenants.models import Tenant


class Command(BaseCommand):
    help = "Crée les templates de notification par défaut pour tous les tenants"

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant-slug",
            type=str,
            help="Slug du tenant (optionnel, sinon tous les tenants)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Remplacer les templates existants",
        )

    def handle(self, *args, **options):
        tenant_slug = options.get("tenant_slug")
        force = options.get("force", False)

        # Sélectionner les tenants
        if tenant_slug:
            tenants = Tenant.objects.filter(slug=tenant_slug)
            if not tenants.exists():
                self.stdout.write(self.style.ERROR(f"Tenant '{tenant_slug}' introuvable"))
                return
        else:
            tenants = Tenant.objects.all()

        total_created = 0
        total_updated = 0

        for tenant in tenants:
            self.stdout.write(f"\n📝 Tenant: {tenant.name} ({tenant.slug})")
            created, updated = self.create_templates_for_tenant(tenant, force)
            total_created += created
            total_updated += updated

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Terminé! {total_created} templates créés, {total_updated} mis à jour"
            )
        )

    @transaction.atomic
    def create_templates_for_tenant(self, tenant, force=False):
        """Crée les templates pour un tenant donné."""
        created_count = 0
        updated_count = 0

        templates = [
            # SMS - Ticket créé
            {
                "name": "SMS - Ticket créé",
                "channel": NotificationTemplate.CHANNEL_SMS,
                "event": NotificationTemplate.EVENT_TICKET_CREATED,
                "subject": "",
                "body": (
                    "Bonjour {{customer_name}},\n\n"
                    "Votre ticket #{{ticket_number}} a été créé.\n\n"
                    "Service: {{service_name}}\n"
                    "File: {{queue_name}}\n"
                    "Temps d'attente estimé: {{eta_minutes}} min\n\n"
                    "Merci de votre patience!\n"
                    "- {{tenant_name}}"
                ),
            },
            # SMS - Ticket appelé
            {
                "name": "SMS - Ticket appelé",
                "channel": NotificationTemplate.CHANNEL_SMS,
                "event": NotificationTemplate.EVENT_TICKET_CALLED,
                "subject": "",
                "body": (
                    "{{customer_name}}, c'est votre tour! 🔔\n\n"
                    "Ticket #{{ticket_number}}\n"
                    "Présentez-vous au guichet {{counter_number}}\n"
                    "Agent: {{agent_name}}\n\n"
                    "- {{tenant_name}}"
                ),
            },
            # SMS - Ticket presque appelé
            {
                "name": "SMS - Votre tour approche",
                "channel": NotificationTemplate.CHANNEL_SMS,
                "event": NotificationTemplate.EVENT_TICKET_READY,
                "subject": "",
                "body": (
                    "{{customer_name}}, votre tour approche! ⏰\n\n"
                    "Ticket #{{ticket_number}}\n"
                    "Encore environ 5 minutes d'attente.\n\n"
                    "Merci de rester disponible.\n"
                    "- {{tenant_name}}"
                ),
            },
            # Email - Ticket créé
            {
                "name": "Email - Ticket créé",
                "channel": NotificationTemplate.CHANNEL_EMAIL,
                "event": NotificationTemplate.EVENT_TICKET_CREATED,
                "subject": "Votre ticket #{{ticket_number}} - {{tenant_name}}",
                "body": (
                    "<h2>Bonjour {{customer_name}},</h2>\n\n"
                    "<p>Votre ticket a été créé avec succès.</p>\n\n"
                    "<div style='background:#f5f5f5; padding:15px; border-radius:5px;'>\n"
                    "  <strong>Numéro de ticket:</strong> #{{ticket_number}}<br>\n"
                    "  <strong>Service:</strong> {{service_name}}<br>\n"
                    "  <strong>File d'attente:</strong> {{queue_name}}<br>\n"
                    "  <strong>Temps d'attente estimé:</strong> {{eta_minutes}} minutes\n"
                    "</div>\n\n"
                    "<p>Nous vous notifierons lorsque votre tour approchera.</p>\n\n"
                    "<p>Merci de votre patience!<br>- L'équipe {{tenant_name}}</p>"
                ),
            },
            # Email - Ticket appelé
            {
                "name": "Email - Ticket appelé",
                "channel": NotificationTemplate.CHANNEL_EMAIL,
                "event": NotificationTemplate.EVENT_TICKET_CALLED,
                "subject": "🔔 C'est votre tour! - Ticket #{{ticket_number}}",
                "body": (
                    "<h2>{{customer_name}}, c'est votre tour!</h2>\n\n"
                    "<div style='background:#4CAF50; color:white; padding:20px; "
                    "border-radius:5px; text-align:center; font-size:18px;'>\n"
                    "  <strong>Ticket #{{ticket_number}}</strong>\n"
                    "</div>\n\n"
                    "<p style='font-size:16px;'>\n"
                    "  <strong>Guichet:</strong> {{counter_number}}<br>\n"
                    "  <strong>Agent:</strong> {{agent_name}}\n"
                    "</p>\n\n"
                    "<p>Veuillez vous présenter immédiatement.</p>\n\n"
                    "<p>Cordialement,<br>- L'équipe {{tenant_name}}</p>"
                ),
            },
            # WhatsApp - Ticket créé
            {
                "name": "WhatsApp - Ticket créé",
                "channel": NotificationTemplate.CHANNEL_WHATSAPP,
                "event": NotificationTemplate.EVENT_TICKET_CREATED,
                "subject": "",
                "body": (
                    "👋 Bonjour {{customer_name}},\n\n"
                    "✅ Votre ticket a été créé:\n\n"
                    "🎫 Numéro: *#{{ticket_number}}*\n"
                    "📋 Service: {{service_name}}\n"
                    "👥 File: {{queue_name}}\n"
                    "⏱️ Attente estimée: *{{eta_minutes}} minutes*\n\n"
                    "Nous vous notifierons quand ce sera votre tour!\n\n"
                    "Merci 🙏\n"
                    "- {{tenant_name}}"
                ),
            },
            # WhatsApp - Ticket appelé
            {
                "name": "WhatsApp - Ticket appelé",
                "channel": NotificationTemplate.CHANNEL_WHATSAPP,
                "event": NotificationTemplate.EVENT_TICKET_CALLED,
                "subject": "",
                "body": (
                    "🔔 *C'EST VOTRE TOUR!*\n\n"
                    "{{customer_name}}, présentez-vous maintenant:\n\n"
                    "🎫 Ticket: *#{{ticket_number}}*\n"
                    "🪟 Guichet: *{{counter_number}}*\n"
                    "👤 Agent: {{agent_name}}\n\n"
                    "À tout de suite! 😊\n"
                    "- {{tenant_name}}"
                ),
            },
            # SMS - Rendez-vous rappel
            {
                "name": "SMS - Rappel rendez-vous",
                "channel": NotificationTemplate.CHANNEL_SMS,
                "event": NotificationTemplate.EVENT_APPOINTMENT_REMINDER,
                "subject": "",
                "body": (
                    "Rappel: Rendez-vous demain ⏰\n\n"
                    "{{customer_name}},\n"
                    "Date: {{appointment_date}}\n"
                    "Heure: {{appointment_time}}\n"
                    "Service: {{service_name}}\n\n"
                    "À bientôt!\n"
                    "- {{tenant_name}}"
                ),
            },
        ]

        for template_data in templates:
            # Vérifier si le template existe
            existing = NotificationTemplate.objects.filter(
                tenant=tenant,
                event=template_data["event"],
                channel=template_data["channel"],
            ).first()

            if existing:
                if force:
                    # Mettre à jour
                    for key, value in template_data.items():
                        setattr(existing, key, value)
                    existing.is_active = True
                    existing.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f"  ↻ {template_data['name']} (mis à jour)")
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  ⊘ {template_data['name']} (existe déjà, utilisez --force)"
                        )
                    )
            else:
                # Créer nouveau template
                NotificationTemplate.objects.create(tenant=tenant, **template_data)
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ {template_data['name']}"))

        return created_count, updated_count
