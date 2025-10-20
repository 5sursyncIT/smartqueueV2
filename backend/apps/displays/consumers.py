"""WebSocket consumer for Display screens."""
from __future__ import annotations

import json
from typing import Any

from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone


class DisplayConsumer(AsyncWebsocketConsumer):
    """Consumer for display screen real-time updates."""

    async def connect(self) -> None:
        """Handle WebSocket connection."""
        import logging
        logger = logging.getLogger(__name__)

        try:
            logger.info("DisplayConsumer.connect() called")
            
            # Validate origin for CORS
            origin = ""
            headers = dict(self.scope.get('headers', []))
            if b'origin' in headers:
                origin = headers[b'origin'].decode('utf-8')
            
            if not self._is_valid_origin(origin):
                logger.warning(f"Rejected WebSocket connection from invalid origin: {origin}")
                await self.close(code=4001)  # Custom close code for invalid origin
                return

            self.tenant_slug = self.scope["url_route"]["kwargs"]["tenant_slug"]
            self.display_id = str(self.scope["url_route"]["kwargs"]["display_id"])
            self.room_group_name = f"display_{self.tenant_slug}_{self.display_id}"

            logger.info(f"Display WebSocket connecting: tenant={self.tenant_slug}, display={self.display_id}")

            # Join room group
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            logger.info(f"Added to channel group: {self.room_group_name}")

            # Accept the connection first
            await self.accept()
            logger.info("WebSocket connection accepted")

            # Send connection confirmation
            await self.send(text_data=json.dumps({
                "type": "connection.confirmed",
                "message": "WebSocket connection established",
                "timestamp": timezone.now().isoformat(),
            }))
            logger.info("Connection confirmation sent")

        except Exception as e:
            logger.error(f"Error in DisplayConsumer.connect(): {e}", exc_info=True)
            raise

    def _is_valid_origin(self, origin: str) -> bool:
        """Check if the origin is valid for CORS."""
        if not origin:
            return False
            
        # List of allowed origins for WebSocket connections
        allowed_origins = [
            "http://localhost:3000",
            "http://localhost:3001", 
            "http://localhost:3002",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:3002",
        ]
        
        # Also allow any localhost or 127.0.0.1 with any port for development
        import re
        localhost_regex = re.compile(r'^https?://(localhost|127\.0\.0\.1):\d+$')
        
        return origin in allowed_origins or bool(localhost_regex.match(origin))



    async def disconnect(self, close_code: int) -> None:
        """Handle WebSocket disconnection."""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"DisplayConsumer.disconnect() called with code: {close_code}")
        logger.info(f"Disconnecting from group: {getattr(self, 'room_group_name', 'unknown')}")
        
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            logger.info(f"Successfully left group: {self.room_group_name}")
        else:
            logger.warning("No room_group_name found during disconnect")

    async def receive(self, text_data: str) -> None:
        """Handle messages from WebSocket."""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            data = json.loads(text_data)
            message_type = data.get("type")
            logger.info(f"Received WebSocket message: {message_type}")

            if message_type == "ping":
                # Respond to ping
                await self.send(text_data=json.dumps({
                    "type": "pong",
                    "timestamp": timezone.now().isoformat(),
                }))
                logger.info("Sent pong response")

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON received: {e}")
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Invalid JSON",
            }))
        except Exception as e:
            logger.error(f"Error in receive(): {e}", exc_info=True)

    async def ticket_called(self, event: dict[str, Any]) -> None:
        """Handle ticket.called event from group."""
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            "type": "ticket_called",
            "ticket": event["ticket"],
            "timestamp": event.get("timestamp", timezone.now().isoformat()),
        }))

    async def ticket_updated(self, event: dict[str, Any]) -> None:
        """Handle ticket.updated event from group."""
        await self.send(text_data=json.dumps({
            "type": "ticket_updated",
            "ticket": event["ticket"],
            "timestamp": event.get("timestamp", timezone.now().isoformat()),
        }))

    async def display_refresh(self, event: dict[str, Any]) -> None:
        """Handle display.refresh event to force refresh."""
        await self.send(text_data=json.dumps({
            "type": "refresh",
            "timestamp": event.get("timestamp", timezone.now().isoformat()),
        }))
