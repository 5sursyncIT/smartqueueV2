from __future__ import annotations

from django.urls import include, path

from apps.queues import public_views
from apps.displays.views import PublicDisplayTicketsView, PublicDisplayPingView
from apps.displays.admin_views import DisplayAdminViewSet

from .analytics_views import (
    AgentPerformanceReportView,
    QueueStatsReportView,
    SatisfactionReportView,
    WaitTimesReportView,
)
from .api_router import router, register_router
from .views import HealthcheckView
from .views_system import (
    get_system_config,
    update_system_config,
    test_smtp_config,
    get_smtp_status,
)

# Register displays admin ViewSet for tenant-scoped CRUD
register_router('displays', DisplayAdminViewSet, basename='display')

# Non-tenant-scoped URLs (public or auth-related)
public_urlpatterns = [
    path("auth/", include("apps.users.urls")),
    path("health/", HealthcheckView.as_view(), name="healthcheck"),
    # Public tenants list
    path(
        "public/tenants/",
        public_views.PublicTenantListView.as_view(),
        name="public-tenant-list",
    ),
    path(
        "public/tenants/<slug:tenant_slug>/queues/",
        public_views.PublicQueueListView.as_view(),
        name="public-queue-list",
    ),
    path(
        "public/tenants/<slug:tenant_slug>/queues/<uuid:queue_id>/signup/",
        public_views.QueueSignupView.as_view(),
        name="public-queue-signup",
    ),
    path(
        "public/tenants/<slug:tenant_slug>/tickets/<uuid:ticket_id>/",
        public_views.PublicTicketStatusView.as_view(),
        name="public-ticket-status",
    ),
    # Display screens (public access) - display IDs are char(32) not UUIDs
    path(
        "public/tenants/<slug:tenant_slug>/displays/<str:pk>/tickets/",
        PublicDisplayTicketsView.as_view(),
        name="public-display-tickets",
    ),
    path(
        "public/tenants/<slug:tenant_slug>/displays/<str:pk>/ping/",
        PublicDisplayPingView.as_view(),
        name="public-display-ping",
    ),
    # Super-admin endpoints
    path("admin/", include("apps.tenants.admin_urls")),
    # System configuration
    path("admin/system/config/", get_system_config, name="system-config-get"),
    path("admin/system/config/update/", update_system_config, name="system-config-update"),
    path("admin/system/smtp/test/", test_smtp_config, name="smtp-test"),
    path("admin/system/smtp/status/", get_smtp_status, name="smtp-status"),
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
