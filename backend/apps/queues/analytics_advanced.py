"""Advanced Analytics for Queue Intelligence - Phase 3.

This module provides advanced KPIs, trend analysis, and A/B testing capabilities
for queue management optimization.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from django.db.models import Avg, Count, ExpressionWrapper, F, FloatField, Q, Sum
from django.db.models.functions import ExtractHour, TruncDate, TruncHour
from django.utils import timezone

from apps.feedback.models import Feedback
from apps.tickets.models import Ticket
from apps.users.models import AgentProfile

from .models import Queue


class AdvancedAnalytics:
    """Advanced analytics for queue performance and agent productivity."""

    @staticmethod
    def calculate_abandonment_rate(queue: Queue, period_days: int = 7) -> dict[str, Any]:
        """
        Calculate abandonment rate for a queue.

        Abandonment = tickets created but never reached in_service status
        within reasonable time (e.g., 2x SLA).

        Args:
            queue: Queue to analyze
            period_days: Number of days to look back

        Returns:
            dict with abandonment_rate, total_tickets, abandoned_count
        """
        cutoff_date = timezone.now() - timedelta(days=period_days)

        # Tickets in the period
        tickets = queue.tickets.filter(created_at__gte=cutoff_date)
        total_count = tickets.count()

        if total_count == 0:
            return {
                "abandonment_rate": 0.0,
                "total_tickets": 0,
                "abandoned_count": 0,
                "period_days": period_days,
            }

        # Abandoned tickets: still waiting beyond 2x SLA or marked as no_show
        sla_seconds = queue.service.sla_seconds
        abandon_threshold = timezone.now() - timedelta(seconds=sla_seconds * 2)

        abandoned_count = tickets.filter(
            Q(status=Ticket.STATUS_NO_SHOW)
            | Q(status=Ticket.STATUS_WAITING, created_at__lte=abandon_threshold)
        ).count()

        abandonment_rate = (abandoned_count / total_count) * 100

        return {
            "abandonment_rate": round(abandonment_rate, 2),
            "total_tickets": total_count,
            "abandoned_count": abandoned_count,
            "period_days": period_days,
        }

    @staticmethod
    def calculate_agent_utilization(queue: Queue, period_days: int = 7) -> dict[str, Any]:
        """
        Calculate agent utilization rate for a queue.

        Utilization = (time in service) / (total available time) * 100

        Args:
            queue: Queue to analyze
            period_days: Number of days to look back

        Returns:
            dict with utilization_rate, agents_data, average_service_time
        """
        cutoff_date = timezone.now() - timedelta(days=period_days)

        # Get all agents assigned to this queue
        from .models import QueueAssignment

        assignments = QueueAssignment.objects.filter(queue=queue, is_active=True).select_related(
            "agent__user"
        )

        agents_data = []
        total_service_seconds = 0
        total_available_seconds = 0

        for assignment in assignments:
            agent = assignment.agent

            # Calculate service time from closed tickets
            closed_tickets = queue.tickets.filter(
                agent=agent,
                status=Ticket.STATUS_CLOSED,
                ended_at__gte=cutoff_date,
                started_at__isnull=False,
            )

            service_time_sum = closed_tickets.aggregate(
                total_service=Sum(
                    ExpressionWrapper(
                        F("ended_at") - F("started_at"),
                        output_field=FloatField(),
                    )
                )
            )["total_service"]

            service_seconds = service_time_sum or 0

            # Estimate available time (period_days * 8 hours work day)
            available_seconds = period_days * 8 * 3600

            utilization = (service_seconds / available_seconds * 100) if available_seconds > 0 else 0

            agents_data.append(
                {
                    "agent_id": str(agent.id),
                    "agent_name": agent.user.get_full_name(),
                    "tickets_served": closed_tickets.count(),
                    "total_service_seconds": int(service_seconds),
                    "available_seconds": available_seconds,
                    "utilization_rate": round(utilization, 2),
                }
            )

            total_service_seconds += service_seconds
            total_available_seconds += available_seconds

        overall_utilization = (
            (total_service_seconds / total_available_seconds * 100) if total_available_seconds > 0 else 0
        )

        # Calculate average service time
        avg_service_seconds = (
            total_service_seconds / sum(a["tickets_served"] for a in agents_data)
            if any(a["tickets_served"] for a in agents_data)
            else 0
        )

        return {
            "overall_utilization_rate": round(overall_utilization, 2),
            "agents_data": agents_data,
            "average_service_seconds": int(avg_service_seconds),
            "period_days": period_days,
        }

    @staticmethod
    def calculate_sla_compliance_rate(queue: Queue, period_days: int = 7) -> dict[str, Any]:
        """
        Calculate SLA compliance rate.

        SLA compliant = ticket served within SLA time from creation.

        Args:
            queue: Queue to analyze
            period_days: Number of days to look back

        Returns:
            dict with compliance_rate, compliant_count, total_count
        """
        cutoff_date = timezone.now() - timedelta(days=period_days)

        closed_tickets = queue.tickets.filter(
            status=Ticket.STATUS_CLOSED,
            ended_at__gte=cutoff_date,
            started_at__isnull=False,
        )

        total_count = closed_tickets.count()

        if total_count == 0:
            return {
                "compliance_rate": 100.0,
                "compliant_count": 0,
                "non_compliant_count": 0,
                "total_count": 0,
                "sla_seconds": queue.service.sla_seconds,
                "period_days": period_days,
            }

        sla_seconds = queue.service.sla_seconds

        # Tickets where wait time <= SLA
        compliant_tickets = closed_tickets.annotate(
            wait_seconds=ExpressionWrapper(
                F("started_at") - F("created_at"),
                output_field=FloatField(),
            )
        ).filter(wait_seconds__lte=sla_seconds)

        compliant_count = compliant_tickets.count()
        compliance_rate = (compliant_count / total_count) * 100

        return {
            "compliance_rate": round(compliance_rate, 2),
            "compliant_count": compliant_count,
            "non_compliant_count": total_count - compliant_count,
            "total_count": total_count,
            "sla_seconds": sla_seconds,
            "period_days": period_days,
        }

    @staticmethod
    def get_csat_by_queue(queue: Queue, period_days: int = 30) -> dict[str, Any]:
        """
        Calculate Customer Satisfaction (CSAT) metrics for a queue.

        Args:
            queue: Queue to analyze
            period_days: Number of days to look back

        Returns:
            dict with average CSAT, NPS, response count, distribution
        """
        cutoff_date = timezone.now() - timedelta(days=period_days)

        # Get feedback for tickets in this queue
        feedback_queryset = Feedback.objects.filter(
            ticket__queue=queue,
            created_at__gte=cutoff_date,
            rating__isnull=False,
        )

        total_feedback = feedback_queryset.count()

        if total_feedback == 0:
            return {
                "average_csat": None,
                "nps_score": None,
                "total_feedback": 0,
                "rating_distribution": {},
                "period_days": period_days,
            }

        # Average CSAT (1-5 scale)
        avg_rating = feedback_queryset.aggregate(Avg("rating"))["rating__avg"]

        # Rating distribution
        distribution = feedback_queryset.values("rating").annotate(count=Count("rating")).order_by("rating")

        rating_distribution = {str(item["rating"]): item["count"] for item in distribution}

        # Calculate NPS (Net Promoter Score)
        # Promoters: rating 4-5, Passives: rating 3, Detractors: rating 1-2
        promoters = feedback_queryset.filter(rating__gte=4).count()
        detractors = feedback_queryset.filter(rating__lte=2).count()

        nps_score = ((promoters - detractors) / total_feedback) * 100 if total_feedback > 0 else 0

        return {
            "average_csat": round(avg_rating, 2) if avg_rating else None,
            "nps_score": round(nps_score, 2),
            "total_feedback": total_feedback,
            "promoters_count": promoters,
            "passives_count": feedback_queryset.filter(rating=3).count(),
            "detractors_count": detractors,
            "rating_distribution": rating_distribution,
            "period_days": period_days,
        }

    @staticmethod
    def generate_hourly_heatmap(queue: Queue, period_days: int = 7) -> dict[str, Any]:
        """
        Generate hourly heatmap data showing ticket volume by hour of day.

        Args:
            queue: Queue to analyze
            period_days: Number of days to look back

        Returns:
            dict with heatmap data (hour -> average tickets)
        """
        cutoff_date = timezone.now() - timedelta(days=period_days)

        # Group tickets by hour
        hourly_data = (
            queue.tickets.filter(created_at__gte=cutoff_date)
            .annotate(hour=ExtractHour("created_at"))
            .values("hour")
            .annotate(count=Count("id"))
            .order_by("hour")
        )

        # Initialize all hours with 0
        heatmap = {hour: 0 for hour in range(24)}

        # Fill with actual data
        for item in hourly_data:
            heatmap[item["hour"]] = item["count"]

        # Calculate average per hour over the period
        for hour in heatmap:
            heatmap[hour] = round(heatmap[hour] / period_days, 2)

        # Find peak hour
        peak_hour = max(heatmap, key=heatmap.get)
        peak_volume = heatmap[peak_hour]

        return {
            "heatmap": heatmap,
            "peak_hour": peak_hour,
            "peak_volume": peak_volume,
            "period_days": period_days,
        }

    @staticmethod
    def generate_daily_trends(queue: Queue, period_days: int = 30) -> dict[str, Any]:
        """
        Generate daily trend data for tickets, service time, and wait time.

        Args:
            queue: Queue to analyze
            period_days: Number of days to look back

        Returns:
            dict with daily trend arrays
        """
        cutoff_date = timezone.now() - timedelta(days=period_days)

        # Daily ticket count
        daily_tickets = (
            queue.tickets.filter(created_at__gte=cutoff_date)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        # Daily average wait time
        daily_wait_time = (
            queue.tickets.filter(
                status=Ticket.STATUS_CLOSED,
                ended_at__gte=cutoff_date,
                started_at__isnull=False,
            )
            .annotate(
                date=TruncDate("created_at"),
                wait_seconds=ExpressionWrapper(
                    F("started_at") - F("created_at"),
                    output_field=FloatField(),
                ),
            )
            .values("date")
            .annotate(avg_wait=Avg("wait_seconds"))
            .order_by("date")
        )

        # Daily average service time
        daily_service_time = (
            queue.tickets.filter(
                status=Ticket.STATUS_CLOSED,
                ended_at__gte=cutoff_date,
                started_at__isnull=False,
            )
            .annotate(
                date=TruncDate("started_at"),
                service_seconds=ExpressionWrapper(
                    F("ended_at") - F("started_at"),
                    output_field=FloatField(),
                ),
            )
            .values("date")
            .annotate(avg_service=Avg("service_seconds"))
            .order_by("date")
        )

        # Format data
        tickets_trend = [
            {"date": str(item["date"]), "count": item["count"]} for item in daily_tickets
        ]

        wait_time_trend = [
            {"date": str(item["date"]), "avg_wait_seconds": int(item["avg_wait"]) if item["avg_wait"] else 0}
            for item in daily_wait_time
        ]

        service_time_trend = [
            {
                "date": str(item["date"]),
                "avg_service_seconds": int(item["avg_service"]) if item["avg_service"] else 0,
            }
            for item in daily_service_time
        ]

        return {
            "tickets_trend": tickets_trend,
            "wait_time_trend": wait_time_trend,
            "service_time_trend": service_time_trend,
            "period_days": period_days,
        }


class ABTestingFramework:
    """A/B Testing framework for queue algorithms."""

    @staticmethod
    def create_ab_test(
        queue: Queue, algorithm_a: str, algorithm_b: str, duration_days: int = 7
    ) -> dict[str, Any]:
        """
        Create an A/B test configuration for comparing two algorithms.

        Args:
            queue: Queue to run test on
            algorithm_a: First algorithm to test
            algorithm_b: Second algorithm to test
            duration_days: Test duration in days

        Returns:
            dict with test configuration
        """
        test_config = {
            "queue_id": str(queue.id),
            "queue_name": queue.name,
            "algorithm_a": algorithm_a,
            "algorithm_b": algorithm_b,
            "current_algorithm": queue.algorithm,
            "start_date": str(timezone.now().date()),
            "end_date": str((timezone.now() + timedelta(days=duration_days)).date()),
            "duration_days": duration_days,
            "status": "ready",
        }

        return test_config

    @staticmethod
    def compare_algorithms(
        queue: Queue, algorithm_a: str, period_a_start: datetime, period_a_end: datetime, algorithm_b: str, period_b_start: datetime, period_b_end: datetime
    ) -> dict[str, Any]:
        """
        Compare performance of two algorithms over different time periods.

        Args:
            queue: Queue being analyzed
            algorithm_a: Name of first algorithm
            period_a_start: Start of period A
            period_a_end: End of period A
            algorithm_b: Name of second algorithm
            period_b_start: Start of period B
            period_b_end: End of period B

        Returns:
            dict with comparison metrics
        """

        def get_period_metrics(start: datetime, end: datetime) -> dict:
            tickets = queue.tickets.filter(
                created_at__gte=start,
                created_at__lte=end,
            )

            closed_tickets = tickets.filter(
                status=Ticket.STATUS_CLOSED,
                started_at__isnull=False,
            )

            total_tickets = tickets.count()
            closed_count = closed_tickets.count()

            if closed_count == 0:
                return {
                    "total_tickets": total_tickets,
                    "closed_tickets": 0,
                    "avg_wait_seconds": 0,
                    "avg_service_seconds": 0,
                    "abandonment_rate": 0,
                }

            # Average wait time
            avg_wait = closed_tickets.annotate(
                wait_time=ExpressionWrapper(
                    F("started_at") - F("created_at"),
                    output_field=FloatField(),
                )
            ).aggregate(Avg("wait_time"))["wait_time__avg"]

            # Average service time
            avg_service = closed_tickets.annotate(
                service_time=ExpressionWrapper(
                    F("ended_at") - F("started_at"),
                    output_field=FloatField(),
                )
            ).aggregate(Avg("service_time"))["service_time__avg"]

            # Abandonment
            no_shows = tickets.filter(status=Ticket.STATUS_NO_SHOW).count()
            abandonment_rate = (no_shows / total_tickets * 100) if total_tickets > 0 else 0

            return {
                "total_tickets": total_tickets,
                "closed_tickets": closed_count,
                "avg_wait_seconds": int(avg_wait) if avg_wait else 0,
                "avg_service_seconds": int(avg_service) if avg_service else 0,
                "abandonment_rate": round(abandonment_rate, 2),
            }

        metrics_a = get_period_metrics(period_a_start, period_a_end)
        metrics_b = get_period_metrics(period_b_start, period_b_end)

        # Calculate improvements
        def calculate_improvement(metric_a: float, metric_b: float, lower_is_better: bool = True) -> float:
            if metric_a == 0:
                return 0.0
            improvement = ((metric_a - metric_b) / metric_a) * 100
            return improvement if lower_is_better else -improvement

        wait_improvement = calculate_improvement(
            metrics_a["avg_wait_seconds"], metrics_b["avg_wait_seconds"]
        )
        abandonment_improvement = calculate_improvement(
            metrics_a["abandonment_rate"], metrics_b["abandonment_rate"]
        )

        # Determine winner
        winner = None
        if wait_improvement > 5 and abandonment_improvement > 5:
            winner = algorithm_b
        elif wait_improvement < -5 and abandonment_improvement < -5:
            winner = algorithm_a
        else:
            winner = "tie"

        return {
            "algorithm_a": {
                "name": algorithm_a,
                "period_start": str(period_a_start.date()),
                "period_end": str(period_a_end.date()),
                "metrics": metrics_a,
            },
            "algorithm_b": {
                "name": algorithm_b,
                "period_start": str(period_b_start.date()),
                "period_end": str(period_b_end.date()),
                "metrics": metrics_b,
            },
            "improvements": {
                "wait_time_improvement_percent": round(wait_improvement, 2),
                "abandonment_improvement_percent": round(abandonment_improvement, 2),
            },
            "winner": winner,
            "recommendation": f"Algorithm '{winner}' shows better performance"
            if winner != "tie"
            else "Both algorithms show similar performance",
        }
