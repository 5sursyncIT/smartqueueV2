from __future__ import annotations

from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.tenants.permissions import IsTenantAdmin
from apps.tickets.models import Ticket

from .analytics import QueueAnalytics
from .analytics_advanced import ABTestingFramework, AdvancedAnalytics
from .filters import QueueFilter
from .models import Queue, QueueAssignment, Service, Site
from .optimizer import QueueOptimizer
from .serializers import (
    QueueAssignmentSerializer,
    QueueSerializer,
    ServiceSerializer,
    SiteSerializer,
)
from .services import QueueService


class SiteViewSet(viewsets.ModelViewSet):
    serializer_class = SiteSerializer
    subscription_resource_type = "site"  # Pour vérification de quota

    def get_permissions(self):  # type: ignore[override]
        from apps.core.permissions import HasQuotaForResource

        if self.action == "create":
            return [IsAuthenticated(), IsTenantAdmin(), HasQuotaForResource()]
        return [IsAuthenticated(), IsTenantAdmin()]

    def get_queryset(self):  # type: ignore[override]
        return Site.objects.filter(tenant=self.request.tenant)

    def perform_create(self, serializer):  # type: ignore[override]
        # Double vérification de sécurité
        from apps.core.subscription_enforcement import SubscriptionEnforcement
        from rest_framework.exceptions import PermissionDenied

        if not SubscriptionEnforcement.can_create_site(self.request.tenant):
            raise PermissionDenied(
                SubscriptionEnforcement.get_quota_error_message(
                    "site", self.request.tenant
                )
            )

        serializer.save(tenant=self.request.tenant)


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def get_queryset(self):  # type: ignore[override]
        return Service.objects.filter(tenant=self.request.tenant).select_related("site")

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(tenant=self.request.tenant)


class QueueViewSet(viewsets.ModelViewSet):
    serializer_class = QueueSerializer
    filterset_class = QueueFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):  # type: ignore[override]
        qs = Queue.objects.filter(tenant=self.request.tenant).select_related("service", "site")
        return qs.annotate(
            waiting_count=Count("tickets", filter=Q(tickets__status=Ticket.STATUS_WAITING))
        )

    # Indiquer le type de ressource pour la vérification de quota
    subscription_resource_type = "queue"

    def get_permissions(self):  # type: ignore[override]
        from apps.core.permissions import HasQuotaForResource

        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsTenantAdmin(), HasQuotaForResource()]
        return super().get_permissions()

    def perform_create(self, serializer):  # type: ignore[override]
        # Double vérification de sécurité (defense in depth)
        from apps.core.subscription_enforcement import SubscriptionEnforcement
        from rest_framework.exceptions import PermissionDenied

        if not SubscriptionEnforcement.can_create_queue(self.request.tenant):
            raise PermissionDenied(
                SubscriptionEnforcement.get_quota_error_message(
                    "queue", self.request.tenant
                )
            )

        serializer.save(tenant=self.request.tenant)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def stats(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Statistiques basiques d'une file."""
        queue = self.get_object()
        stats = QueueService.get_queue_stats(queue)

        data = {
            "id": str(queue.id),
            "name": queue.name,
            "status": queue.status,
            "algorithm": queue.algorithm,
            **stats,
        }
        return Response(data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def health(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Santé et alertes d'une file d'attente."""
        queue = self.get_object()
        health_data = QueueAnalytics.get_queue_health(queue)
        return Response(health_data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def predictions(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Prédictions d'affluence pour la prochaine heure."""
        queue = self.get_object()
        predictions = QueueAnalytics.get_queue_predictions(queue)
        return Response(predictions)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def overview(self, request, tenant_slug=None):  # type: ignore[override]
        """Vue d'ensemble de toutes les files avec santé et métriques."""
        queues = self.get_queryset()

        overview_data = []
        for queue in queues:
            stats = QueueService.get_queue_stats(queue)
            health = QueueAnalytics.get_queue_health(queue)

            overview_data.append({
                "id": str(queue.id),
                "name": queue.name,
                "status": queue.status,
                "algorithm": queue.algorithm,
                "health_score": health["health_score"],
                "health_status": health["status"],
                "alerts_count": len(health["alerts"]),
                "critical_alerts": len([a for a in health["alerts"] if a["severity"] == "critical"]),
                "waiting_count": stats["waiting_count"],
                "in_service_count": stats["in_service_count"],
            })

        return Response({
            "queues": overview_data,
            "total_queues": len(overview_data),
            "queues_with_alerts": len([q for q in overview_data if q["alerts_count"] > 0]),
        })

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def load_balance(self, request, tenant_slug=None):  # type: ignore[override]
        """Analyse de l'équilibre de charge entre toutes les files."""
        tenant = request.tenant
        load_data = QueueOptimizer.analyze_load_balance(tenant)
        return Response(load_data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def optimization_report(self, request, tenant_slug=None):  # type: ignore[override]
        """Rapport complet d'optimisation avec toutes les suggestions."""
        tenant = request.tenant
        report = QueueOptimizer.get_optimization_report(tenant)
        return Response(report)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def algorithm_recommendation(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Recommandation d'algorithme optimal pour cette file."""
        queue = self.get_object()
        recommendation = QueueOptimizer.recommend_algorithm(queue)
        return Response(recommendation)

    # ========== Phase 3: Advanced Analytics Endpoints ==========

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def abandonment_rate(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Taux d'abandon des tickets pour cette file.

        Query params:
            - period_days (int): Période en jours (défaut: 7)
        """
        queue = self.get_object()
        period_days = int(request.query_params.get("period_days", 7))
        data = AdvancedAnalytics.calculate_abandonment_rate(queue, period_days)
        return Response(data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def agent_utilization(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Taux d'utilisation des agents de cette file.

        Query params:
            - period_days (int): Période en jours (défaut: 7)
        """
        queue = self.get_object()
        period_days = int(request.query_params.get("period_days", 7))
        data = AdvancedAnalytics.calculate_agent_utilization(queue, period_days)
        return Response(data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def sla_compliance(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Taux de conformité SLA pour cette file.

        Query params:
            - period_days (int): Période en jours (défaut: 7)
        """
        queue = self.get_object()
        period_days = int(request.query_params.get("period_days", 7))
        data = AdvancedAnalytics.calculate_sla_compliance_rate(queue, period_days)
        return Response(data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def csat(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Métriques de satisfaction client (CSAT/NPS) pour cette file.

        Query params:
            - period_days (int): Période en jours (défaut: 30)
        """
        queue = self.get_object()
        period_days = int(request.query_params.get("period_days", 30))
        data = AdvancedAnalytics.get_csat_by_queue(queue, period_days)
        return Response(data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def hourly_heatmap(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Heatmap horaire du volume de tickets.

        Query params:
            - period_days (int): Période en jours (défaut: 7)
        """
        queue = self.get_object()
        period_days = int(request.query_params.get("period_days", 7))
        data = AdvancedAnalytics.generate_hourly_heatmap(queue, period_days)
        return Response(data)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def daily_trends(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Tendances quotidiennes (tickets, temps d'attente, temps de service).

        Query params:
            - period_days (int): Période en jours (défaut: 30)
        """
        queue = self.get_object()
        period_days = int(request.query_params.get("period_days", 30))
        data = AdvancedAnalytics.generate_daily_trends(queue, period_days)
        return Response(data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsTenantAdmin])
    def create_ab_test(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Créer une configuration de test A/B pour comparer des algorithmes.

        Body params:
            - algorithm_a (str): Premier algorithme à tester
            - algorithm_b (str): Deuxième algorithme à tester
            - duration_days (int): Durée du test en jours (défaut: 7)
        """
        queue = self.get_object()
        algorithm_a = request.data.get("algorithm_a")
        algorithm_b = request.data.get("algorithm_b")
        duration_days = request.data.get("duration_days", 7)

        if not algorithm_a or not algorithm_b:
            return Response(
                {"error": "algorithm_a and algorithm_b are required"},
                status=400,
            )

        test_config = ABTestingFramework.create_ab_test(
            queue, algorithm_a, algorithm_b, duration_days
        )
        return Response(test_config)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def compare_algorithms(self, request, pk=None, tenant_slug=None):  # type: ignore[override]
        """Comparer les performances de deux algorithmes sur des périodes différentes.

        Body params:
            - algorithm_a (str): Nom du premier algorithme
            - period_a_start (str): Date de début période A (YYYY-MM-DD)
            - period_a_end (str): Date de fin période A (YYYY-MM-DD)
            - algorithm_b (str): Nom du deuxième algorithme
            - period_b_start (str): Date de début période B (YYYY-MM-DD)
            - period_b_end (str): Date de fin période B (YYYY-MM-DD)
        """
        from datetime import datetime

        queue = self.get_object()

        try:
            algorithm_a = request.data.get("algorithm_a")
            algorithm_b = request.data.get("algorithm_b")

            period_a_start = datetime.fromisoformat(request.data.get("period_a_start"))
            period_a_end = datetime.fromisoformat(request.data.get("period_a_end"))
            period_b_start = datetime.fromisoformat(request.data.get("period_b_start"))
            period_b_end = datetime.fromisoformat(request.data.get("period_b_end"))
        except (ValueError, TypeError) as e:
            return Response(
                {"error": f"Invalid date format or missing parameters: {e}"},
                status=400,
            )

        comparison = ABTestingFramework.compare_algorithms(
            queue,
            algorithm_a,
            period_a_start,
            period_a_end,
            algorithm_b,
            period_b_start,
            period_b_end,
        )
        return Response(comparison)


class QueueAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = QueueAssignmentSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def get_queryset(self):  # type: ignore[override]
        return QueueAssignment.objects.filter(tenant=self.request.tenant).select_related("queue", "agent")

    def perform_create(self, serializer):  # type: ignore[override]
        serializer.save(tenant=self.request.tenant)
