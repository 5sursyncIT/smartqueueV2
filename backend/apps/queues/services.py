"""Services métier pour la gestion des files d'attente."""

from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.db.models import BooleanField, Case, Value, When
from django.utils import timezone

from apps.tickets.models import Ticket
from apps.users.models import AgentProfile

from .models import Queue


class QueueService:
    """Logique métier pour les files d'attente."""

    @staticmethod
    def get_next_ticket(queue: Queue, algorithm: str | None = None) -> Ticket | None:
        """Récupère le prochain ticket selon l'algorithme de la file."""
        algo = algorithm or queue.algorithm

        waiting_tickets = queue.tickets.filter(
            status=Ticket.STATUS_WAITING
        ).select_for_update()

        if not waiting_tickets.exists():
            return None

        if algo == Queue.ALGO_FIFO:
            return waiting_tickets.order_by("created_at").first()

        if algo == Queue.ALGO_PRIORITY:
            return waiting_tickets.order_by("-priority", "created_at").first()

        if algo == Queue.ALGO_SLA:
            sla_seconds = queue.service.sla_seconds
            cutoff_time = timezone.now() - timedelta(seconds=sla_seconds)
            return (
                waiting_tickets
                .annotate(
                    is_late=Case(
                        When(created_at__lte=cutoff_time, then=Value(True)),
                        default=Value(False),
                        output_field=BooleanField(),
                    )
                )
                .order_by("-is_late", "-priority", "created_at")
                .first()
            )

        return waiting_tickets.order_by("created_at").first()

    @staticmethod
    @transaction.atomic
    def call_next(agent: AgentProfile, queue: Queue) -> Ticket | None:
        """Agent appelle le prochain ticket de la file."""
        active_ticket = Ticket.objects.filter(
            agent=agent,
            status__in=[Ticket.STATUS_CALLED, Ticket.STATUS_IN_SERVICE],
        ).first()

        if active_ticket:
            raise ValueError(f"Agent a déjà un ticket actif: {active_ticket.number}")

        next_ticket = QueueService.get_next_ticket(queue)
        if not next_ticket:
            return None

        next_ticket.status = Ticket.STATUS_CALLED
        next_ticket.agent = agent
        next_ticket.called_at = timezone.now()
        next_ticket.save(update_fields=["status", "agent", "called_at", "updated_at"])

        agent.set_status(AgentProfile.STATUS_BUSY)

        return next_ticket

    @staticmethod
    @transaction.atomic
    def start_service(ticket: Ticket) -> Ticket:
        """Démarrer le service d'un ticket appelé."""
        if ticket.status != Ticket.STATUS_CALLED:
            raise ValueError(f"Le ticket doit être en statut 'appelé', pas '{ticket.status}'")

        ticket.status = Ticket.STATUS_IN_SERVICE
        ticket.started_at = timezone.now()
        ticket.save(update_fields=["status", "started_at", "updated_at"])

        return ticket

    @staticmethod
    @transaction.atomic
    def close_ticket(ticket: Ticket, agent: AgentProfile | None = None) -> Ticket:
        """Clôturer un ticket."""
        if ticket.status not in [Ticket.STATUS_IN_SERVICE, Ticket.STATUS_CALLED]:
            raise ValueError(f"Impossible de clôturer un ticket en statut '{ticket.status}'")

        ticket.status = Ticket.STATUS_CLOSED
        ticket.ended_at = timezone.now()
        ticket.save(update_fields=["status", "ended_at", "updated_at"])

        if agent:
            agent.set_status(AgentProfile.STATUS_AVAILABLE)

        return ticket

    @staticmethod
    @transaction.atomic
    def transfer_ticket(ticket: Ticket, target_queue: Queue, reason: str = "") -> Ticket:
        """Transférer un ticket vers une autre file."""
        if ticket.queue == target_queue:
            raise ValueError("La file cible est la même que la file actuelle")

        if ticket.tenant != target_queue.tenant:
            raise ValueError("Impossible de transférer vers un autre tenant")

        ticket.queue = target_queue
        ticket.status = Ticket.STATUS_TRANSFERRED
        ticket.priority += 10
        ticket.agent = None
        ticket.save(update_fields=["queue", "status", "priority", "agent", "updated_at"])

        return ticket

    @staticmethod
    @transaction.atomic
    def mark_no_show(ticket: Ticket, agent: AgentProfile | None = None) -> Ticket:
        """Marquer un ticket comme no-show."""
        if ticket.status != Ticket.STATUS_CALLED:
            raise ValueError("Seuls les tickets appelés peuvent être marqués no-show")

        ticket.status = Ticket.STATUS_NO_SHOW
        ticket.ended_at = timezone.now()
        ticket.save(update_fields=["status", "ended_at", "updated_at"])

        if agent:
            agent.set_status(AgentProfile.STATUS_AVAILABLE)

        return ticket

    @staticmethod
    @transaction.atomic
    def pause_ticket(ticket: Ticket, reason: str = "") -> Ticket:
        """Mettre un ticket en pause."""
        if ticket.status != Ticket.STATUS_IN_SERVICE:
            raise ValueError("Seuls les tickets en service peuvent être mis en pause")

        ticket.status = Ticket.STATUS_PAUSED
        ticket.save(update_fields=["status", "updated_at"])

        return ticket

    @staticmethod
    @transaction.atomic
    def resume_ticket(ticket: Ticket) -> Ticket:
        """Reprendre un ticket en pause."""
        if ticket.status != Ticket.STATUS_PAUSED:
            raise ValueError("Seuls les tickets en pause peuvent être repris")

        ticket.status = Ticket.STATUS_IN_SERVICE
        ticket.save(update_fields=["status", "updated_at"])

        return ticket

    @staticmethod
    def get_queue_stats(queue: Queue) -> dict:
        """Statistiques en temps réel d'une file."""
        tickets = queue.tickets.all()

        waiting_count = tickets.filter(status=Ticket.STATUS_WAITING).count()
        called_count = tickets.filter(status=Ticket.STATUS_CALLED).count()
        in_service_count = tickets.filter(status=Ticket.STATUS_IN_SERVICE).count()

        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        closed_today = tickets.filter(
            status=Ticket.STATUS_CLOSED,
            ended_at__gte=today,
            started_at__isnull=False,
        )

        avg_wait_seconds = None
        if closed_today.exists():
            from django.db.models import Avg, ExpressionWrapper, F, fields

            avg_wait_seconds = closed_today.annotate(
                wait_time=ExpressionWrapper(
                    F("started_at") - F("created_at"),
                    output_field=fields.DurationField(),
                )
            ).aggregate(Avg("wait_time"))["wait_time__avg"]

        return {
            "waiting_count": waiting_count,
            "called_count": called_count,
            "in_service_count": in_service_count,
            "avg_wait_seconds": avg_wait_seconds.total_seconds() if avg_wait_seconds else None,
        }
