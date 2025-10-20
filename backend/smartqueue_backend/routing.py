"""Routing Channels pour l'application SmartQueue."""

from __future__ import annotations

from django.urls import path

from apps.queues.consumers import QueueConsumer
from apps.tickets.consumers import TicketConsumer
from apps.users.consumers import AgentConsumer
from apps.displays.consumers import DisplayConsumer

websocket_urlpatterns = [
    path("ws/tenants/<slug:tenant_slug>/queues/<uuid:queue_id>/", QueueConsumer.as_asgi()),
    path("ws/tenants/<slug:tenant_slug>/tickets/<uuid:ticket_id>/", TicketConsumer.as_asgi()),
    path("ws/tenants/<slug:tenant_slug>/agents/<uuid:agent_id>/", AgentConsumer.as_asgi()),
    # Display IDs are stored without hyphens (char(32)), use str instead of uuid
    path("ws/tenants/<slug:tenant_slug>/displays/<str:display_id>/", DisplayConsumer.as_asgi()),
]
