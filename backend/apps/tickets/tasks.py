from __future__ import annotations

from celery import shared_task

from .models import Ticket


@shared_task
def calculate_eta(ticket_id: str) -> None:
    """Calcule un ETA basique en fonction de la position dans la file."""

    try:
        ticket = Ticket.objects.select_related("queue").get(id=ticket_id)
    except Ticket.DoesNotExist:  # pragma: no cover - protection runtime
        return

    queue = ticket.queue
    ahead_count = queue.tickets.filter(
        status=Ticket.STATUS_WAITING,
        created_at__lt=ticket.created_at,
    ).count()
    avg_service_time = 5 * 60  # TODO: hydrater depuis les statistiques réelles
    ticket.eta_seconds = ahead_count * avg_service_time
    ticket.save(update_fields=["eta_seconds"])
