"""Service d'optimisation et de load balancing pour les files d'attente."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import TYPE_CHECKING

from django.db.models import Avg, Count, Q
from django.utils import timezone

from apps.tickets.models import Ticket
from apps.users.models import AgentProfile

from .analytics import QueueAnalytics
from .models import Queue, QueueAssignment

if TYPE_CHECKING:
    from apps.tenants.models import Tenant


@dataclass
class TransferSuggestion:
    """Suggestion de transfert de ticket entre files."""

    ticket_id: str
    ticket_number: str
    from_queue_id: str
    from_queue_name: str
    to_queue_id: str
    to_queue_name: str
    reason: str
    priority: str  # 'high', 'medium', 'low'
    estimated_time_saved: int  # en secondes


@dataclass
class AgentReallocationSuggestion:
    """Suggestion de réallocation d'agent entre files."""

    agent_id: str
    agent_name: str
    from_queue_id: str | None
    from_queue_name: str | None
    to_queue_id: str
    to_queue_name: str
    reason: str
    impact_score: float  # 0-100, plus c'est élevé, plus c'est important


class QueueOptimizer:
    """Service d'optimisation des files d'attente."""

    @staticmethod
    def analyze_load_balance(tenant: Tenant) -> dict:
        """
        Analyse l'équilibre de charge entre toutes les files d'un tenant.

        Returns:
            dict avec métriques et score d'équilibre
        """
        queues = Queue.objects.filter(
            tenant=tenant,
            status=Queue.STATUS_ACTIVE
        ).select_related("service")

        if not queues.exists():
            return {
                "balance_score": 100,
                "status": "optimal",
                "queues_data": [],
            }

        queues_data = []
        total_waiting = 0
        max_load = 0
        min_load = float('inf')

        for queue in queues:
            waiting_count = queue.tickets.filter(status=Ticket.STATUS_WAITING).count()
            available_agents = QueueAnalytics._count_available_agents(queue)

            # Calculer le ratio charge/capacité
            if available_agents > 0:
                load_ratio = waiting_count / available_agents
            else:
                load_ratio = waiting_count * 10  # Pénalité si aucun agent

            queues_data.append({
                "queue_id": str(queue.id),
                "queue_name": queue.name,
                "waiting_count": waiting_count,
                "available_agents": available_agents,
                "load_ratio": round(load_ratio, 2),
            })

            total_waiting += waiting_count
            max_load = max(max_load, load_ratio)
            min_load = min(min_load, load_ratio) if load_ratio > 0 else min_load

        # Calculer le score d'équilibre (0-100)
        # Plus les ratios sont proches, meilleur est le score
        if min_load > 0 and max_load > 0:
            variance = max_load - min_load
            # Normaliser : variance faible = bon score
            balance_score = max(0, 100 - (variance * 10))
        else:
            balance_score = 100 if total_waiting == 0 else 50

        status = "optimal" if balance_score >= 80 else "needs_balancing" if balance_score >= 50 else "critical"

        return {
            "balance_score": round(balance_score, 2),
            "status": status,
            "total_waiting_tickets": total_waiting,
            "queues_data": sorted(queues_data, key=lambda x: x["load_ratio"], reverse=True),
            "max_load_ratio": round(max_load, 2),
            "min_load_ratio": round(min_load, 2) if min_load != float('inf') else 0,
        }

    @staticmethod
    def suggest_transfers(tenant: Tenant, max_suggestions: int = 10) -> list[TransferSuggestion]:
        """
        Suggère des transferts de tickets pour équilibrer les files.

        Args:
            tenant: Le tenant
            max_suggestions: Nombre max de suggestions

        Returns:
            Liste de suggestions de transfert
        """
        suggestions = []

        queues = Queue.objects.filter(
            tenant=tenant,
            status=Queue.STATUS_ACTIVE
        ).select_related("service")

        if queues.count() < 2:
            return suggestions  # Pas de transfert possible avec moins de 2 files

        # Identifier les files surchargées et sous-chargées
        queue_loads = []
        for queue in queues:
            waiting_count = queue.tickets.filter(status=Ticket.STATUS_WAITING).count()
            available_agents = QueueAnalytics._count_available_agents(queue)
            load_ratio = waiting_count / max(available_agents, 1)

            queue_loads.append({
                "queue": queue,
                "waiting_count": waiting_count,
                "available_agents": available_agents,
                "load_ratio": load_ratio,
            })

        # Trier par charge (décroissant)
        queue_loads.sort(key=lambda x: x["load_ratio"], reverse=True)

        overloaded = [q for q in queue_loads if q["load_ratio"] > 3]  # > 3 tickets/agent
        underloaded = [q for q in queue_loads if q["load_ratio"] < 1.5 and q["available_agents"] > 0]

        # Suggérer des transferts depuis les files surchargées vers les sous-chargées
        for overloaded_data in overloaded:
            if len(suggestions) >= max_suggestions:
                break

            source_queue = overloaded_data["queue"]

            # Prendre les tickets en attente depuis le plus longtemps
            tickets_to_transfer = source_queue.tickets.filter(
                status=Ticket.STATUS_WAITING
            ).order_by("created_at")[:5]

            for ticket in tickets_to_transfer:
                if len(suggestions) >= max_suggestions:
                    break

                # Trouver la meilleure file de destination
                for underloaded_data in underloaded:
                    target_queue = underloaded_data["queue"]

                    # Vérifier si le service est compatible (optionnel)
                    # Pour simplifier, on suppose que tous les services sont compatibles

                    # Calculer le temps économisé estimé
                    source_eta = QueueAnalytics.calculate_eta(ticket) or 0
                    # Estimer l'ETA dans la nouvelle file (simplification)
                    target_waiting = underloaded_data["waiting_count"]
                    target_agents = underloaded_data["available_agents"]
                    avg_service_time = QueueAnalytics._get_average_service_time(target_queue) or 300

                    target_eta = int((target_waiting / max(target_agents, 1)) * avg_service_time)
                    time_saved = max(0, source_eta - target_eta)

                    if time_saved > 60:  # Au moins 1 minute économisée
                        priority = "high" if time_saved > 300 else "medium" if time_saved > 120 else "low"

                        suggestions.append(TransferSuggestion(
                            ticket_id=str(ticket.id),
                            ticket_number=ticket.number,
                            from_queue_id=str(source_queue.id),
                            from_queue_name=source_queue.name,
                            to_queue_id=str(target_queue.id),
                            to_queue_name=target_queue.name,
                            reason=f"Équilibrage de charge ({overloaded_data['waiting_count']} tickets en attente)",
                            priority=priority,
                            estimated_time_saved=time_saved,
                        ))
                        break

        return suggestions

    @staticmethod
    def suggest_agent_reallocation(tenant: Tenant) -> list[AgentReallocationSuggestion]:
        """
        Suggère des réallocations d'agents entre files.

        Returns:
            Liste de suggestions de réallocation
        """
        suggestions = []

        queues = Queue.objects.filter(
            tenant=tenant,
            status=Queue.STATUS_ACTIVE
        ).select_related("service")

        if queues.count() < 2:
            return suggestions

        # Analyser chaque file
        queue_analysis = []
        for queue in queues:
            waiting_count = queue.tickets.filter(status=Ticket.STATUS_WAITING).count()

            # Compter les agents assignés (actifs ou non)
            all_assigned_agents = QueueAssignment.objects.filter(
                queue=queue,
                is_active=True
            ).count()

            # Compter les agents disponibles
            available_agents = QueueAnalytics._count_available_agents(queue)

            queue_analysis.append({
                "queue": queue,
                "waiting_count": waiting_count,
                "total_agents": all_assigned_agents,
                "available_agents": available_agents,
                "load_ratio": waiting_count / max(available_agents, 1),
                "utilization": available_agents / max(all_assigned_agents, 1),
            })

        # Trier par charge
        queue_analysis.sort(key=lambda x: x["load_ratio"], reverse=True)

        # Identifier les files qui ont besoin de renfort
        needs_help = [q for q in queue_analysis if q["load_ratio"] > 3 and q["waiting_count"] > 5]

        # Identifier les files qui ont des agents disponibles non utilisés
        has_spare = [q for q in queue_analysis if q["available_agents"] > 0 and q["waiting_count"] < 2]

        # Suggérer des réallocations
        for needy in needs_help:
            for spare in has_spare:
                if needy["queue"].id == spare["queue"].id:
                    continue

                # Trouver des agents disponibles dans la file "spare"
                spare_assignments = QueueAssignment.objects.filter(
                    queue=spare["queue"],
                    is_active=True
                ).select_related("agent", "agent__user")

                for assignment in spare_assignments[:1]:  # Suggérer 1 agent max par paire
                    agent = assignment.agent

                    # Vérifier si l'agent est disponible
                    if agent.current_status != AgentProfile.STATUS_AVAILABLE:
                        continue

                    # Calculer l'impact
                    impact_score = min(100, needy["load_ratio"] * 10)

                    suggestions.append(AgentReallocationSuggestion(
                        agent_id=str(agent.id),
                        agent_name=f"{agent.user.first_name} {agent.user.last_name}",
                        from_queue_id=str(spare["queue"].id),
                        from_queue_name=spare["queue"].name,
                        to_queue_id=str(needy["queue"].id),
                        to_queue_name=needy["queue"].name,
                        reason=f"File surchargée ({needy['waiting_count']} tickets, ratio {needy['load_ratio']:.1f})",
                        impact_score=impact_score,
                    ))
                    break

        return suggestions

    @staticmethod
    def recommend_algorithm(queue: Queue) -> dict:
        """
        Recommande l'algorithme optimal pour une file basé sur les patterns historiques.

        Returns:
            dict avec algorithme recommandé et raisons
        """
        # Analyser l'historique des 7 derniers jours
        from datetime import timedelta
        week_ago = timezone.now() - timedelta(days=7)

        tickets = queue.tickets.filter(
            created_at__gte=week_ago
        )

        total_tickets = tickets.count()
        if total_tickets < 10:
            return {
                "recommended_algorithm": queue.algorithm,
                "reason": "Pas assez de données historiques pour une recommandation",
                "confidence": "low",
            }

        # Statistiques sur les priorités
        high_priority_count = tickets.filter(priority__gte=5).count()
        high_priority_rate = (high_priority_count / total_tickets) * 100 if total_tickets > 0 else 0

        # Statistiques sur les SLA
        sla_seconds = queue.service.sla_seconds
        cutoff_time = timezone.now() - timedelta(seconds=sla_seconds)
        late_tickets = tickets.filter(
            status=Ticket.STATUS_WAITING,
            created_at__lte=cutoff_time
        ).count()
        sla_breach_rate = (late_tickets / total_tickets) * 100 if total_tickets > 0 else 0

        # Logique de recommandation
        if sla_breach_rate > 20:
            return {
                "recommended_algorithm": "sla",
                "current_algorithm": queue.algorithm,
                "reason": f"Taux de dépassement SLA élevé ({sla_breach_rate:.1f}%)",
                "confidence": "high",
                "expected_improvement": "Réduction de 30-40% des dépassements SLA",
            }

        if high_priority_rate > 30:
            return {
                "recommended_algorithm": "priority",
                "current_algorithm": queue.algorithm,
                "reason": f"Haute proportion de tickets prioritaires ({high_priority_rate:.1f}%)",
                "confidence": "high",
                "expected_improvement": "Meilleure gestion des urgences",
            }

        # Si tout va bien, FIFO est simple et efficace
        return {
            "recommended_algorithm": "fifo",
            "current_algorithm": queue.algorithm,
            "reason": "Distribution uniforme des tickets, FIFO optimal pour l'équité",
            "confidence": "medium",
            "expected_improvement": "Simplicité et équité maximales",
        }

    @staticmethod
    def get_optimization_report(tenant: Tenant) -> dict:
        """
        Génère un rapport complet d'optimisation pour un tenant.

        Returns:
            dict avec toutes les analyses et suggestions
        """
        load_balance = QueueOptimizer.analyze_load_balance(tenant)
        transfer_suggestions = QueueOptimizer.suggest_transfers(tenant, max_suggestions=10)
        agent_suggestions = QueueOptimizer.suggest_agent_reallocation(tenant)

        # Analyser chaque file pour recommandations d'algorithme
        algorithm_recommendations = []
        queues = Queue.objects.filter(tenant=tenant, status=Queue.STATUS_ACTIVE)

        for queue in queues:
            rec = QueueOptimizer.recommend_algorithm(queue)
            if rec["recommended_algorithm"] != rec["current_algorithm"]:
                algorithm_recommendations.append({
                    "queue_id": str(queue.id),
                    "queue_name": queue.name,
                    **rec
                })

        return {
            "load_balance": load_balance,
            "transfer_suggestions": [
                {
                    "ticket_id": s.ticket_id,
                    "ticket_number": s.ticket_number,
                    "from_queue": {"id": s.from_queue_id, "name": s.from_queue_name},
                    "to_queue": {"id": s.to_queue_id, "name": s.to_queue_name},
                    "reason": s.reason,
                    "priority": s.priority,
                    "estimated_time_saved_minutes": round(s.estimated_time_saved / 60, 1),
                }
                for s in transfer_suggestions
            ],
            "agent_reallocation_suggestions": [
                {
                    "agent_id": s.agent_id,
                    "agent_name": s.agent_name,
                    "from_queue": {"id": s.from_queue_id, "name": s.from_queue_name} if s.from_queue_id else None,
                    "to_queue": {"id": s.to_queue_id, "name": s.to_queue_name},
                    "reason": s.reason,
                    "impact_score": round(s.impact_score, 1),
                }
                for s in agent_suggestions
            ],
            "algorithm_recommendations": algorithm_recommendations,
            "summary": {
                "total_transfer_suggestions": len(transfer_suggestions),
                "total_agent_suggestions": len(agent_suggestions),
                "total_algorithm_changes": len(algorithm_recommendations),
                "optimization_priority": "high" if load_balance["balance_score"] < 50 else "medium" if load_balance["balance_score"] < 80 else "low",
            }
        }
