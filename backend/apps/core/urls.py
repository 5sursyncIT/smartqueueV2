from __future__ import annotations

from django.urls import include, path

from .analytics_views import (
    AgentPerformanceReportView,
    QueueStatsReportView,
    SatisfactionReportView,
    WaitTimesReportView,
)
from .api_router import router
from .views import HealthcheckView

# Non-tenant-scoped URLs (public or auth-related)
public_urlpatterns = [
    path("auth/", include("apps.users.urls")),
    path("health/", HealthcheckView.as_view(), name="healthcheck"),
    # Super-admin endpoints
    path("admin/", include("apps.tenants.admin_urls")),
]

# Tenant-scoped URLs (require tenant context)
tenant_urlpatterns = [
    path("", include(router.urls)),
    path("", include("apps.customers.urls")),
    path("", include("apps.users.agent_urls")),
    path("", include("apps.tenants.membership_urls")),
    path("queues/", include("apps.queues.urls")),
    path("tickets/", include("apps.tickets.urls")),
    # Analytics & Reports
    path("reports/wait-times/", WaitTimesReportView.as_view(), name="reports-wait-times"),
    path("reports/agent-performance/", AgentPerformanceReportView.as_view(), name="reports-agent-performance"),
    path("reports/queue-stats/", QueueStatsReportView.as_view(), name="reports-queue-stats"),
    path("reports/satisfaction/", SatisfactionReportView.as_view(), name="reports-satisfaction"),
]

# Main URL patterns with tenant prefix
urlpatterns = [
    # Public endpoints
    *public_urlpatterns,
    # Tenant management (non-scoped but for tenant CRUD)
    path("tenants/", include("apps.tenants.urls")),
    # Tenant-scoped resources under /tenants/{slug}/
    path("tenants/<slug:tenant_slug>/", include(tenant_urlpatterns)),
]
