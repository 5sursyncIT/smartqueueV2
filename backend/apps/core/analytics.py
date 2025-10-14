"""Services d'analytics et de reporting."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from django.db.models import Avg, Count, F, Max, Min, Q
from django.utils import timezone

if TYPE_CHECKING:
    from apps.queues.models import Queue
    from apps.tenants.models import Tenant
    from apps.users.models import AgentProfile


def get_wait_times_report(
    tenant: Tenant,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    site_id: str | None = None,
    service_id: str | None = None,
) -> dict[str, Any]:
    """Génère un rapport sur les temps d'attente."""
    from apps.tickets.models import Ticket

    # Définir les dates par défaut (30 derniers jours)
    if not end_date:
        end_date = timezone.now()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Base queryset
    tickets = Ticket.objects.filter(
        tenant=tenant,
        created_at__gte=start_date,
        created_at__lte=end_date,
    )

    # Filtres optionnels
    if site_id:
        tickets = tickets.filter(queue__site_id=site_id)
    if service_id:
        tickets = tickets.filter(queue__service_id=service_id)

    # Calculer uniquement pour les tickets terminés
    completed = tickets.filter(status__in=[Ticket.STATUS_COMPLETED, Ticket.STATUS_NO_SHOW])

    if not completed.exists():
        return {
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "total_tickets": tickets.count(),
            "completed_tickets": 0,
            "metrics": {},
        }

    # Calculer les métriques
    # Note: wait_seconds = called_at - created_at (temps avant d'être appelé)
    # service_duration_seconds = closed_at - service_started_at
    metrics = completed.aggregate(
        avg_wait=Avg(
            (F("called_at") - F("created_at")),
        ),
        min_wait=Min(
            (F("called_at") - F("created_at")),
        ),
        max_wait=Max(
            (F("called_at") - F("created_at")),
        ),
        avg_service_duration=Avg(
            (F("closed_at") - F("service_started_at")),
        ),
    )

    # Convertir les timedelta en secondes
    return {
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
        },
        "total_tickets": tickets.count(),
        "completed_tickets": completed.count(),
        "metrics": {
            "avg_wait_seconds": int(metrics["avg_wait"].total_seconds()) if metrics["avg_wait"] else 0,
            "min_wait_seconds": int(metrics["min_wait"].total_seconds()) if metrics["min_wait"] else 0,
            "max_wait_seconds": int(metrics["max_wait"].total_seconds()) if metrics["max_wait"] else 0,
            "avg_service_duration_seconds": (
                int(metrics["avg_service_duration"].total_seconds())
                if metrics["avg_service_duration"]
                else 0
            ),
        },
    }


def get_agent_performance_report(
    tenant: Tenant,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    agent_id: str | None = None,
) -> dict[str, Any]:
    """Génère un rapport sur la performance des agents."""
    from apps.tickets.models import Ticket

    # Définir les dates par défaut
    if not end_date:
        end_date = timezone.now()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Base queryset
    tickets = Ticket.objects.filter(
        tenant=tenant,
        created_at__gte=start_date,
        created_at__lte=end_date,
        agent__isnull=False,
    )

    if agent_id:
        tickets = tickets.filter(agent_id=agent_id)

    # Grouper par agent
    agent_stats = tickets.values(
        "agent_id",
        "agent__user__first_name",
        "agent__user__last_name",
    ).annotate(
        total_tickets=Count("id"),
        completed=Count("id", filter=Q(status=Ticket.STATUS_COMPLETED)),
        no_show=Count("id", filter=Q(status=Ticket.STATUS_NO_SHOW)),
        avg_service_duration=Avg(
            (F("closed_at") - F("service_started_at")),
            filter=Q(status=Ticket.STATUS_COMPLETED),
        ),
    )

    agents = []
    for stat in agent_stats:
        agents.append({
            "agent_id": str(stat["agent_id"]),
            "agent_name": f"{stat['agent__user__first_name']} {stat['agent__user__last_name']}",
            "total_tickets": stat["total_tickets"],
            "completed_tickets": stat["completed"],
            "no_show_tickets": stat["no_show"],
            "avg_service_duration_seconds": (
                int(stat["avg_service_duration"].total_seconds())
                if stat["avg_service_duration"]
                else 0
            ),
        })

    return {
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
        },
        "agents": agents,
    }


def get_queue_stats_report(
    tenant: Tenant,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    queue_id: str | None = None,
) -> dict[str, Any]:
    """Génère un rapport sur les statistiques des files."""
    from apps.tickets.models import Ticket

    # Définir les dates par défaut
    if not end_date:
        end_date = timezone.now()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Base queryset
    tickets = Ticket.objects.filter(
        tenant=tenant,
        created_at__gte=start_date,
        created_at__lte=end_date,
    )

    if queue_id:
        tickets = tickets.filter(queue_id=queue_id)

    # Grouper par queue
    queue_stats = tickets.values(
        "queue_id",
        "queue__name",
        "queue__service__name",
    ).annotate(
        total_tickets=Count("id"),
        waiting=Count("id", filter=Q(status=Ticket.STATUS_WAITING)),
        called=Count("id", filter=Q(status=Ticket.STATUS_CALLED)),
        in_service=Count("id", filter=Q(status=Ticket.STATUS_IN_SERVICE)),
        completed=Count("id", filter=Q(status=Ticket.STATUS_COMPLETED)),
        no_show=Count("id", filter=Q(status=Ticket.STATUS_NO_SHOW)),
        avg_wait=Avg(
            (F("called_at") - F("created_at")),
            filter=Q(called_at__isnull=False),
        ),
    )

    queues = []
    for stat in queue_stats:
        queues.append({
            "queue_id": str(stat["queue_id"]),
            "queue_name": stat["queue__name"],
            "service_name": stat["queue__service__name"],
            "total_tickets": stat["total_tickets"],
            "waiting": stat["waiting"],
            "called": stat["called"],
            "in_service": stat["in_service"],
            "completed": stat["completed"],
            "no_show": stat["no_show"],
            "avg_wait_seconds": (
                int(stat["avg_wait"].total_seconds())
                if stat["avg_wait"]
                else 0
            ),
        })

    return {
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
        },
        "queues": queues,
    }


def get_satisfaction_report(
    tenant: Tenant,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> dict[str, Any]:
    """Génère un rapport sur la satisfaction client (CSAT et NPS)."""
    from apps.feedback.models import Feedback

    # Définir les dates par défaut
    if not end_date:
        end_date = timezone.now()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Base queryset
    feedbacks = Feedback.objects.filter(
        tenant=tenant,
        created_at__gte=start_date,
        created_at__lte=end_date,
    )

    if not feedbacks.exists():
        return {
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "total_feedbacks": 0,
            "csat": {},
            "nps": {},
        }

    # CSAT (scores 1-5)
    csat_feedbacks = feedbacks.filter(csat_score__isnull=False)
    csat_avg = csat_feedbacks.aggregate(avg=Avg("csat_score"))["avg"]

    # NPS (scores 0-10)
    nps_feedbacks = feedbacks.filter(nps_score__isnull=False)
    if nps_feedbacks.exists():
        promoters = nps_feedbacks.filter(nps_score__gte=9).count()
        detractors = nps_feedbacks.filter(nps_score__lte=6).count()
        total_nps = nps_feedbacks.count()
        nps_score = ((promoters - detractors) / total_nps) * 100 if total_nps > 0 else 0
    else:
        nps_score = 0
        promoters = 0
        detractors = 0

    return {
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
        },
        "total_feedbacks": feedbacks.count(),
        "csat": {
            "total_responses": csat_feedbacks.count(),
            "average_score": round(csat_avg, 2) if csat_avg else 0,
        },
        "nps": {
            "total_responses": nps_feedbacks.count(),
            "nps_score": round(nps_score, 1),
            "promoters": promoters,
            "detractors": detractors,
        },
    }
