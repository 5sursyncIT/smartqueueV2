"""Services d'analytics et de prédiction pour les files d'attente."""

from __future__ import annotations

from datetime import timedelta
from typing import TYPE_CHECKING

from django.db.models import Avg, Count, ExpressionWrapper, F, Q
from django.db.models import fields as model_fields
from django.utils import timezone

from apps.tickets.models import Ticket
from apps.users.models import AgentProfile

if TYPE_CHECKING:
    from .models import Queue


class QueueAnalytics:
    """Service d'analytics pour les files d'attente."""

    @staticmethod
    def calculate_eta(ticket: Ticket) -> int | None:
        """
        Calcule le temps d'attente estimé (ETA) en secondes pour un ticket.

        Prend en compte :
        - Position du ticket dans la file
        - Temps de service moyen historique
        - Nombre d'agents disponibles
        - Algorithme de la file

        Returns:
            int | None: ETA en secondes, ou None si impossible à calculer
        """
        if ticket.status != Ticket.STATUS_WAITING:
            return None

        queue = ticket.queue

        # 1. Calculer le temps de service moyen des 50 derniers tickets clôturés
        avg_service_time = QueueAnalytics._get_average_service_time(queue)
        if not avg_service_time:
            # Fallback sur le SLA du service si pas d'historique
            avg_service_time = queue.service.sla_seconds

        # 2. Compter les tickets devant celui-ci selon l'algorithme
        tickets_ahead = QueueAnalytics._count_tickets_ahead(ticket, queue)

        # 3. Compter les agents disponibles pour cette queue
        available_agents = QueueAnalytics._count_available_agents(queue)
        if available_agents == 0:
            # Aucun agent disponible, impossible de calculer
            return None

        # 4. Calculer l'ETA
        # Formule : (tickets_ahead / agents_disponibles) * temps_moyen
        eta_seconds = int((tickets_ahead / available_agents) * avg_service_time)

        return eta_seconds

    @staticmethod
    def _get_average_service_time(queue: Queue, limit: int = 50) -> float | None:
        """
        Calcule le temps de service moyen des derniers tickets clôturés.

        Args:
            queue: La file d'attente
            limit: Nombre de tickets à considérer (par défaut 50)

        Returns:
            float | None: Temps moyen en secondes, ou None si pas d'historique
        """
        recent_closed = (
            queue.tickets.filter(
                status=Ticket.STATUS_CLOSED,
                started_at__isnull=False,
                ended_at__isnull=False,
            )
            .order_by("-ended_at")[:limit]
        )

        if not recent_closed.exists():
            return None

        avg_duration = recent_closed.annotate(
            service_duration=ExpressionWrapper(
                F("ended_at") - F("started_at"),
                output_field=model_fields.DurationField(),
            )
        ).aggregate(avg=Avg("service_duration"))["avg"]

        if avg_duration:
            return avg_duration.total_seconds()

        return None

    @staticmethod
    def _count_tickets_ahead(ticket: Ticket, queue: Queue) -> int:
        """
        Compte le nombre de tickets qui seront servis avant ce ticket.

        Prend en compte l'algorithme de la file.
        """
        algo = queue.algorithm

        # Tickets en attente dans la même file
        waiting_tickets = queue.tickets.filter(status=Ticket.STATUS_WAITING)

        if algo == "fifo":
            # FIFO : tous les tickets créés avant
            return waiting_tickets.filter(created_at__lt=ticket.created_at).count()

        elif algo == "priority":
            # Priority : tickets avec priorité supérieure, ou même priorité mais créés avant
            return waiting_tickets.filter(
                Q(priority__gt=ticket.priority) |
                Q(priority=ticket.priority, created_at__lt=ticket.created_at)
            ).count()

        elif algo == "sla":
            # SLA : tickets en retard + haute priorité, puis tickets créés avant
            sla_seconds = queue.service.sla_seconds
            cutoff_time = timezone.now() - timedelta(seconds=sla_seconds)

            ticket_is_late = ticket.created_at <= cutoff_time

            if ticket_is_late:
                # Ce ticket est en retard, compter les tickets aussi en retard avec priorité supérieure
                return waiting_tickets.filter(
                    created_at__lte=cutoff_time,
                    priority__gt=ticket.priority
                ).count()
            else:
                # Ce ticket n'est pas en retard, compter tous les tickets en retard + ceux à l'heure avec priorité supérieure
                late_tickets = waiting_tickets.filter(created_at__lte=cutoff_time).count()
                on_time_higher_priority = waiting_tickets.filter(
                    created_at__gt=cutoff_time,
                    priority__gt=ticket.priority
                ).count()
                return late_tickets + on_time_higher_priority

        # Fallback FIFO
        return waiting_tickets.filter(created_at__lt=ticket.created_at).count()

    @staticmethod
    def _count_available_agents(queue: Queue) -> int:
        """
        Compte le nombre d'agents disponibles pour cette queue.

        Un agent est considéré disponible s'il est :
        - Assigné à cette queue
        - Avec statut 'available' ou 'busy' (busy peut prendre le prochain)
        """
        from .models import QueueAssignment

        # Récupérer les agents assignés à cette queue
        assigned_agents = QueueAssignment.objects.filter(
            queue=queue,
            is_active=True,
        ).values_list("agent_id", flat=True)

        # Compter ceux qui sont disponibles
        available_count = AgentProfile.objects.filter(
            id__in=assigned_agents,
            current_status__in=[
                AgentProfile.STATUS_AVAILABLE,
                # On compte aussi les busy car ils pourront prendre le prochain après leur ticket actuel
            ],
        ).count()

        return max(available_count, 1)  # Au minimum 1 pour éviter division par zéro

    @staticmethod
    def get_queue_health(queue: Queue) -> dict:
        """
        Évalue la "santé" d'une file d'attente.

        Returns:
            dict avec :
            - health_score: score de 0 à 100
            - alerts: liste des alertes
            - metrics: métriques détaillées
        """
        alerts = []
        metrics = {}

        # 1. Vérifier la capacité
        waiting_count = queue.tickets.filter(status=Ticket.STATUS_WAITING).count()
        metrics["waiting_count"] = waiting_count

        if queue.max_capacity and waiting_count >= queue.max_capacity * 0.9:
            alerts.append({
                "type": "capacity",
                "severity": "high",
                "message": f"File proche de la capacité maximale ({waiting_count}/{queue.max_capacity})",
            })

        # 2. Vérifier les tickets en retard (SLA)
        sla_seconds = queue.service.sla_seconds
        cutoff_time = timezone.now() - timedelta(seconds=sla_seconds)

        late_tickets = queue.tickets.filter(
            status=Ticket.STATUS_WAITING,
            created_at__lte=cutoff_time,
        )
        late_count = late_tickets.count()
        metrics["late_tickets_count"] = late_count

        if late_count > 0:
            sla_breach_rate = (late_count / waiting_count * 100) if waiting_count > 0 else 0
            metrics["sla_breach_rate"] = round(sla_breach_rate, 2)

            severity = "high" if sla_breach_rate > 50 else "medium"
            alerts.append({
                "type": "sla_breach",
                "severity": severity,
                "message": f"{late_count} ticket(s) en retard (SLA dépassé)",
                "details": {"rate": sla_breach_rate},
            })

        # 3. Vérifier la disponibilité des agents
        available_agents = QueueAnalytics._count_available_agents(queue)
        metrics["available_agents"] = available_agents

        if available_agents == 0 and waiting_count > 0:
            alerts.append({
                "type": "no_agents",
                "severity": "critical",
                "message": "Aucun agent disponible pour cette file",
            })

        # 4. Calculer le temps d'attente moyen actuel
        if waiting_count > 0:
            total_eta = 0
            for ticket in queue.tickets.filter(status=Ticket.STATUS_WAITING)[:10]:
                eta = QueueAnalytics.calculate_eta(ticket)
                if eta:
                    total_eta += eta

            if total_eta > 0:
                avg_eta = total_eta / min(waiting_count, 10)
                metrics["avg_eta_seconds"] = int(avg_eta)

                # Alerte si temps d'attente > 2x SLA
                if avg_eta > sla_seconds * 2:
                    alerts.append({
                        "type": "high_wait_time",
                        "severity": "medium",
                        "message": f"Temps d'attente élevé (~{int(avg_eta/60)} min)",
                    })

        # 5. Calculer le score de santé (0-100)
        health_score = 100

        # Pénalités
        if queue.max_capacity:
            capacity_usage = (waiting_count / queue.max_capacity) * 100
            if capacity_usage > 90:
                health_score -= 30
            elif capacity_usage > 70:
                health_score -= 15

        if late_count > 0:
            sla_penalty = min(40, late_count * 5)
            health_score -= sla_penalty

        if available_agents == 0:
            health_score -= 50

        health_score = max(0, health_score)

        return {
            "health_score": health_score,
            "alerts": alerts,
            "metrics": metrics,
            "status": "critical" if health_score < 30 else "warning" if health_score < 60 else "good",
        }

    @staticmethod
    def get_queue_predictions(queue: Queue) -> dict:
        """
        Prédictions sur l'évolution de la file dans la prochaine heure.

        Returns:
            dict avec prédictions d'affluence, temps d'attente, etc.
        """
        now = timezone.now()
        current_hour = now.hour
        current_weekday = now.weekday()  # 0=lundi, 6=dimanche

        # Analyser l'historique des 4 dernières semaines pour cette heure/jour
        four_weeks_ago = now - timedelta(weeks=4)

        # Compter les tickets créés pendant cette même heure sur les semaines passées
        historical_tickets = Ticket.objects.filter(
            queue=queue,
            created_at__gte=four_weeks_ago,
            created_at__hour=current_hour,
            created_at__week_day=(current_weekday + 2) % 7 + 1,  # Django week_day format
        ).count()

        # Moyenne par semaine
        avg_tickets_per_hour = historical_tickets / 4 if historical_tickets > 0 else 0

        # Prédire la charge dans l'heure suivante
        prediction = {
            "predicted_tickets_next_hour": int(avg_tickets_per_hour),
            "current_waiting": queue.tickets.filter(status=Ticket.STATUS_WAITING).count(),
            "confidence": "medium" if historical_tickets > 10 else "low",
        }

        # Estimer si renfort nécessaire
        avg_service_time = QueueAnalytics._get_average_service_time(queue) or queue.service.sla_seconds
        available_agents = QueueAnalytics._count_available_agents(queue)

        if available_agents > 0:
            # Capacité = agents * (3600 / temps_moyen_service)
            hourly_capacity = available_agents * (3600 / avg_service_time)

            if avg_tickets_per_hour > hourly_capacity * 0.8:
                prediction["reinforcement_needed"] = True
                prediction["recommended_agents"] = int((avg_tickets_per_hour / (3600 / avg_service_time)) + 1)
            else:
                prediction["reinforcement_needed"] = False

        return prediction
