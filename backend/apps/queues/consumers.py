from __future__ import annotations

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class QueueConsumer(AsyncJsonWebsocketConsumer):
    """Diffuse en temps réel l'état d'une file."""

    async def connect(self):  # pragma: no cover - logique async testée séparément
        tenant_slug = self.scope["url_route"]["kwargs"].get("tenant_slug")
        queue_id = self.scope["url_route"]["kwargs"].get("queue_id")
        self.group_name = f"queue:{tenant_slug}:{queue_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):  # pragma: no cover
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def queue_updated(self, event):  # pragma: no cover
        await self.send_json(event["payload"])
