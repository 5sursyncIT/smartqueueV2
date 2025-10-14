from __future__ import annotations

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class AgentConsumer(AsyncJsonWebsocketConsumer):
    """Flux temps réel pour l'état d'un agent."""

    async def connect(self):  # pragma: no cover
        tenant_slug = self.scope["url_route"]["kwargs"].get("tenant_slug")
        agent_id = self.scope["url_route"]["kwargs"].get("agent_id")
        self.group_name = f"agent:{tenant_slug}:{agent_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):  # pragma: no cover
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def status_updated(self, event):  # pragma: no cover
        await self.send_json(event["payload"])
