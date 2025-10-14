from __future__ import annotations

from celery import shared_task

from apps.queues.analytics import QueueAnalytics

from .models import Ticket


@shared_task
def calculate_eta(ticket_id: str) -> None:
    """Calcule l'ETA intelligent d'un ticket en utilisant QueueAnalytics."""

    try:
        ticket = Ticket.objects.select_related(
            "queue",
            "queue__service"
        ).get(id=ticket_id)
    except Ticket.DoesNotExist:  # pragma: no cover - protection runtime
        return

    # Utiliser le service d'analytics pour calculer l'ETA intelligent
    eta = QueueAnalytics.calculate_eta(ticket)

    if eta is not None:
        ticket.eta_seconds = eta
        ticket.save(update_fields=["eta_seconds"])
