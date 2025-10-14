"""Tâches Celery pour la gestion des files d'attente."""

from __future__ import annotations

from celery import shared_task
from django.utils import timezone

from apps.tickets.models import Ticket

from .analytics import QueueAnalytics
from .models import Queue


@shared_task
def update_tickets_eta():
    """
    Met à jour l'ETA de tous les tickets en attente.

    Cette tâche devrait être exécutée toutes les 1-2 minutes.
    """
    waiting_tickets = Ticket.objects.filter(
        status=Ticket.STATUS_WAITING
    ).select_related("queue", "queue__service")

    updated_count = 0
    for ticket in waiting_tickets:
        eta = QueueAnalytics.calculate_eta(ticket)
        if eta is not None and eta != ticket.eta_seconds:
            ticket.eta_seconds = eta
            ticket.save(update_fields=["eta_seconds", "updated_at"])
            updated_count += 1

    return {
        "updated_count": updated_count,
        "total_waiting": waiting_tickets.count(),
        "timestamp": timezone.now().isoformat(),
    }


@shared_task
def check_queue_health():
    """
    Vérifie la santé de toutes les files actives et génère des alertes.

    Cette tâche devrait être exécutée toutes les 5 minutes.
    """
    active_queues = Queue.objects.filter(
        status=Queue.STATUS_ACTIVE
    ).select_related("service", "tenant")

    alerts_generated = []

    for queue in active_queues:
        health = QueueAnalytics.get_queue_health(queue)

        # Si des alertes critiques ou high, on pourrait les envoyer
        critical_alerts = [
            alert for alert in health["alerts"]
            if alert["severity"] in ["critical", "high"]
        ]

        if critical_alerts:
            alerts_generated.append({
                "queue_id": str(queue.id),
                "queue_name": queue.name,
                "health_score": health["health_score"],
                "alerts": critical_alerts,
            })

            # TODO: Envoyer notification aux managers du tenant
            # Exemple : send_notification_to_managers(queue.tenant, critical_alerts)

    return {
        "queues_checked": active_queues.count(),
        "alerts_generated": len(alerts_generated),
        "alerts": alerts_generated,
        "timestamp": timezone.now().isoformat(),
    }


@shared_task
def cleanup_old_tickets():
    """
    Archive ou nettoie les vieux tickets clôturés (> 90 jours).

    Cette tâche devrait être exécutée quotidiennement.
    """
    from datetime import timedelta

    cutoff_date = timezone.now() - timedelta(days=90)

    old_tickets = Ticket.objects.filter(
        status__in=[Ticket.STATUS_CLOSED, Ticket.STATUS_NO_SHOW],
        ended_at__lt=cutoff_date,
    )

    count = old_tickets.count()

    # Option 1 : Supprimer (attention aux contraintes FK)
    # old_tickets.delete()

    # Option 2 : Marquer pour archivage (nécessite un champ is_archived)
    # old_tickets.update(is_archived=True)

    return {
        "old_tickets_found": count,
        "action": "identified",  # ou "deleted" / "archived"
        "cutoff_date": cutoff_date.isoformat(),
        "timestamp": timezone.now().isoformat(),
    }
