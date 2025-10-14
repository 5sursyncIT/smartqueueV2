from __future__ import annotations

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class TicketConsumer(AsyncJsonWebsocketConsumer):
    """Diffuse les mises à jour d'un ticket particulier."""

    async def connect(self):  # pragma: no cover
        tenant_slug = self.scope["url_route"]["kwargs"].get("tenant_slug")
        ticket_id = self.scope["url_route"]["kwargs"].get("ticket_id")
        self.group_name = f"ticket:{tenant_slug}:{ticket_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):  # pragma: no cover
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def ticket_updated(self, event):  # pragma: no cover
        await self.send_json(event["payload"])
