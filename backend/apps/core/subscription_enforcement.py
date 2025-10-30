"""
Service pour vérifier et appliquer les quotas de souscription.

Ce service vérifie que les tenants respectent les limites de leur plan de souscription.
"""
from typing import Dict, Any
from django.utils import timezone


class SubscriptionEnforcement:
    """Service pour vérifier les quotas de souscription."""

    @staticmethod
    def can_create_queue(tenant) -> bool:
        """
        Vérifie si le tenant peut créer une nouvelle queue.

        Args:
            tenant: Instance du tenant

        Returns:
            bool: True si le tenant peut créer une queue, False sinon
        """
        from apps.queues.models import Queue

        current_count = Queue.objects.filter(tenant=tenant).count()
        max_allowed = SubscriptionEnforcement._get_max_queues(tenant)

        return current_count < max_allowed

    @staticmethod
    def can_create_site(tenant) -> bool:
        """
        Vérifie si le tenant peut créer un nouveau site.

        Args:
            tenant: Instance du tenant

        Returns:
            bool: True si le tenant peut créer un site, False sinon
        """
        from apps.queues.models import Site

        current_count = Site.objects.filter(tenant=tenant).count()
        max_allowed = SubscriptionEnforcement._get_max_sites(tenant)

        return current_count < max_allowed

    @staticmethod
    def can_create_agent(tenant) -> bool:
        """
        Vérifie si le tenant peut ajouter un agent.

        Args:
            tenant: Instance du tenant

        Returns:
            bool: True si le tenant peut ajouter un agent, False sinon
        """
        from apps.tenants.models import TenantMembership

        current_count = TenantMembership.objects.filter(
            tenant=tenant, role="agent", is_active=True
        ).count()
        max_allowed = SubscriptionEnforcement._get_max_agents(tenant)

        return current_count < max_allowed

    @staticmethod
    def can_create_ticket(tenant) -> bool:
        """
        Vérifie si le tenant peut créer un ticket ce mois-ci.

        Args:
            tenant: Instance du tenant

        Returns:
            bool: True si le tenant peut créer un ticket, False sinon
        """
        from apps.tickets.models import Ticket

        now = timezone.now()

        current_count = Ticket.objects.filter(
            tenant=tenant, created_at__year=now.year, created_at__month=now.month
        ).count()

        max_allowed = SubscriptionEnforcement._get_max_tickets_per_month(tenant)

        return current_count < max_allowed

    @staticmethod
    def get_usage_stats(tenant) -> Dict[str, Any]:
        """
        Retourne les statistiques d'utilisation du tenant.

        Args:
            tenant: Instance du tenant

        Returns:
            dict: Statistiques d'utilisation par ressource
        """
        from apps.queues.models import Queue, Site
        from apps.tickets.models import Ticket
        from apps.tenants.models import TenantMembership

        now = timezone.now()

        sites_current = Site.objects.filter(tenant=tenant).count()
        sites_max = SubscriptionEnforcement._get_max_sites(tenant)

        agents_current = TenantMembership.objects.filter(
            tenant=tenant, role="agent", is_active=True
        ).count()
        agents_max = SubscriptionEnforcement._get_max_agents(tenant)

        queues_current = Queue.objects.filter(tenant=tenant).count()
        queues_max = SubscriptionEnforcement._get_max_queues(tenant)

        tickets_current = Ticket.objects.filter(
            tenant=tenant, created_at__year=now.year, created_at__month=now.month
        ).count()
        tickets_max = SubscriptionEnforcement._get_max_tickets_per_month(tenant)

        return {
            "sites": {
                "current": sites_current,
                "max": sites_max,
                "percentage": (sites_current / sites_max * 100) if sites_max > 0 else 0,
                "available": sites_max - sites_current,
            },
            "agents": {
                "current": agents_current,
                "max": agents_max,
                "percentage": (agents_current / agents_max * 100) if agents_max > 0 else 0,
                "available": agents_max - agents_current,
            },
            "queues": {
                "current": queues_current,
                "max": queues_max,
                "percentage": (queues_current / queues_max * 100) if queues_max > 0 else 0,
                "available": queues_max - queues_current,
            },
            "tickets_this_month": {
                "current": tickets_current,
                "max": tickets_max,
                "percentage": (tickets_current / tickets_max * 100)
                if tickets_max > 0
                else 0,
                "available": tickets_max - tickets_current,
            },
        }

    @staticmethod
    def _get_max_sites(tenant) -> int:
        """Récupère la limite de sites pour le tenant."""
        # Priorité 1: Depuis la souscription avec ForeignKey vers SubscriptionPlan
        if hasattr(tenant, "subscription"):
            subscription = tenant.subscription
            if hasattr(subscription, "plan") and hasattr(subscription.plan, "max_sites"):
                # Si plan est un ForeignKey vers SubscriptionPlan
                if not isinstance(subscription.plan, str):
                    return subscription.plan.max_sites

        # Priorité 2: Depuis l'attribut max_sites du tenant (fallback)
        if hasattr(tenant, "max_sites"):
            return tenant.max_sites

        # Défaut
        return 1

    @staticmethod
    def _get_max_agents(tenant) -> int:
        """Récupère la limite d'agents pour le tenant."""
        if hasattr(tenant, "subscription"):
            subscription = tenant.subscription
            if hasattr(subscription, "plan") and hasattr(subscription.plan, "max_agents"):
                if not isinstance(subscription.plan, str):
                    return subscription.plan.max_agents

        if hasattr(tenant, "max_agents"):
            return tenant.max_agents

        return 5

    @staticmethod
    def _get_max_queues(tenant) -> int:
        """Récupère la limite de queues pour le tenant."""
        if hasattr(tenant, "subscription"):
            subscription = tenant.subscription
            if hasattr(subscription, "plan") and hasattr(subscription.plan, "max_queues"):
                if not isinstance(subscription.plan, str):
                    return subscription.plan.max_queues

        if hasattr(tenant, "max_queues"):
            return tenant.max_queues

        return 3

    @staticmethod
    def _get_max_tickets_per_month(tenant) -> int:
        """Récupère la limite de tickets/mois pour le tenant."""
        if hasattr(tenant, "subscription"):
            subscription = tenant.subscription
            if hasattr(subscription, "plan") and hasattr(
                subscription.plan, "max_tickets_per_month"
            ):
                if not isinstance(subscription.plan, str):
                    return subscription.plan.max_tickets_per_month

        # Défaut
        return 500

    @staticmethod
    def get_quota_error_message(resource_type: str, tenant) -> str:
        """
        Génère un message d'erreur approprié quand une limite est atteinte.

        Args:
            resource_type: Type de ressource (queue, site, agent, ticket)
            tenant: Instance du tenant

        Returns:
            str: Message d'erreur localisé
        """
        messages = {
            "queue": "Vous avez atteint la limite de queues pour votre plan ({max}). "
            "Mettez à niveau votre souscription pour créer plus de queues.",
            "site": "Vous avez atteint la limite de sites pour votre plan ({max}). "
            "Mettez à niveau votre souscription pour créer plus de sites.",
            "agent": "Vous avez atteint la limite d'agents pour votre plan ({max}). "
            "Mettez à niveau votre souscription pour ajouter plus d'agents.",
            "ticket": "Vous avez atteint la limite de tickets pour ce mois ({max}). "
            "Mettez à niveau votre souscription ou attendez le mois prochain.",
        }

        max_values = {
            "queue": SubscriptionEnforcement._get_max_queues(tenant),
            "site": SubscriptionEnforcement._get_max_sites(tenant),
            "agent": SubscriptionEnforcement._get_max_agents(tenant),
            "ticket": SubscriptionEnforcement._get_max_tickets_per_month(tenant),
        }

        message = messages.get(
            resource_type, "Vous avez atteint la limite pour votre plan."
        )
        max_val = max_values.get(resource_type, 0)

        return message.format(max=max_val)
