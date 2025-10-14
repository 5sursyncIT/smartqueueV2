"""Views pour les endpoints d'analytics."""

from __future__ import annotations

from datetime import datetime

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import HasScope, IsTenantMember, Scopes

from .analytics import (
    get_agent_performance_report,
    get_queue_stats_report,
    get_satisfaction_report,
    get_wait_times_report,
)


class WaitTimesReportView(APIView):
    """Rapport sur les temps d'attente."""

    permission_classes = [IsAuthenticated, IsTenantMember, HasScope(Scopes.READ_REPORTS)]

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", str, description="Date de début (ISO format)"),
            OpenApiParameter("end_date", str, description="Date de fin (ISO format)"),
            OpenApiParameter("site_id", str, description="Filtrer par site"),
            OpenApiParameter("service_id", str, description="Filtrer par service"),
        ],
        responses={200: dict},
    )
    def get(self, request):
        """Récupère le rapport des temps d'attente."""
        # Parse dates
        start_date = None
        end_date = None
        if request.query_params.get("start_date"):
            start_date = datetime.fromisoformat(request.query_params["start_date"])
        if request.query_params.get("end_date"):
            end_date = datetime.fromisoformat(request.query_params["end_date"])

        report = get_wait_times_report(
            tenant=request.tenant,
            start_date=start_date,
            end_date=end_date,
            site_id=request.query_params.get("site_id"),
            service_id=request.query_params.get("service_id"),
        )

        return Response(report)


class AgentPerformanceReportView(APIView):
    """Rapport sur la performance des agents."""

    permission_classes = [IsAuthenticated, IsTenantMember, HasScope(Scopes.READ_REPORTS)]

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", str, description="Date de début (ISO format)"),
            OpenApiParameter("end_date", str, description="Date de fin (ISO format)"),
            OpenApiParameter("agent_id", str, description="Filtrer par agent"),
        ],
        responses={200: dict},
    )
    def get(self, request):
        """Récupère le rapport de performance des agents."""
        start_date = None
        end_date = None
        if request.query_params.get("start_date"):
            start_date = datetime.fromisoformat(request.query_params["start_date"])
        if request.query_params.get("end_date"):
            end_date = datetime.fromisoformat(request.query_params["end_date"])

        report = get_agent_performance_report(
            tenant=request.tenant,
            start_date=start_date,
            end_date=end_date,
            agent_id=request.query_params.get("agent_id"),
        )

        return Response(report)


class QueueStatsReportView(APIView):
    """Rapport sur les statistiques des files."""

    permission_classes = [IsAuthenticated, IsTenantMember, HasScope(Scopes.READ_REPORTS)]

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", str, description="Date de début (ISO format)"),
            OpenApiParameter("end_date", str, description="Date de fin (ISO format)"),
            OpenApiParameter("queue_id", str, description="Filtrer par file"),
        ],
        responses={200: dict},
    )
    def get(self, request):
        """Récupère le rapport des statistiques des files."""
        start_date = None
        end_date = None
        if request.query_params.get("start_date"):
            start_date = datetime.fromisoformat(request.query_params["start_date"])
        if request.query_params.get("end_date"):
            end_date = datetime.fromisoformat(request.query_params["end_date"])

        report = get_queue_stats_report(
            tenant=request.tenant,
            start_date=start_date,
            end_date=end_date,
            queue_id=request.query_params.get("queue_id"),
        )

        return Response(report)


class SatisfactionReportView(APIView):
    """Rapport sur la satisfaction client."""

    permission_classes = [IsAuthenticated, IsTenantMember, HasScope(Scopes.READ_REPORTS)]

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", str, description="Date de début (ISO format)"),
            OpenApiParameter("end_date", str, description="Date de fin (ISO format)"),
        ],
        responses={200: dict},
    )
    def get(self, request):
        """Récupère le rapport de satisfaction client."""
        start_date = None
        end_date = None
        if request.query_params.get("start_date"):
            start_date = datetime.fromisoformat(request.query_params["start_date"])
        if request.query_params.get("end_date"):
            end_date = datetime.fromisoformat(request.query_params["end_date"])

        report = get_satisfaction_report(
            tenant=request.tenant,
            start_date=start_date,
            end_date=end_date,
        )

        return Response(report)
