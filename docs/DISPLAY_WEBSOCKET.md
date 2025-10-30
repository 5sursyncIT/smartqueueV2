# Display WebSocket Real-Time Updates

## Overview

The display system now supports real-time updates via WebSocket connections, allowing external screens to instantly show newly called tickets without polling.

## Architecture

### Backend Components

#### 1. DisplayConsumer (`backend/apps/displays/consumers.py`)

WebSocket consumer that handles connections from display screens:

```python
class DisplayConsumer(AsyncWebsocketConsumer):
    """Consumer for display screen real-time updates."""

    async def connect(self) -> None:
        """Join display-specific group and accept connection."""
        self.tenant_slug = self.scope["url_route"]["kwargs"]["tenant_slug"]
        self.display_id = str(self.scope["url_route"]["kwargs"]["display_id"])
        self.room_group_name = f"display_{self.tenant_slug}_{self.display_id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def ticket_called(self, event: dict[str, Any]) -> None:
        """Handle ticket.called event and send to WebSocket."""
        await self.send(text_data=json.dumps({
            "type": "ticket_called",
            "ticket": event["ticket"],
            "timestamp": event.get("timestamp", timezone.now().isoformat()),
        }))
```

**WebSocket URL**: `ws://localhost:8000/ws/tenants/{tenant_slug}/displays/{display_id}/`

#### 2. Ticket Broadcasting (`backend/apps/tickets/views.py`)

When a ticket is called, the system broadcasts to all displays showing that queue:

```python
# In TicketViewSet._broadcast_ticket_event()
if event_type == "ticket.called":
    # Find all active displays showing this queue
    displays = Display.objects.filter(
        tenant=ticket.tenant,
        queues=ticket.queue,
        is_active=True
    )

    # Prepare ticket data
    ticket_data = {
        "id": str(ticket.id),
        "number": ticket.number,
        "queue_name": ticket.queue.name,
        "queue_id": str(ticket.queue_id),
        "status": ticket.status,
        "called_at": ticket.called_at.isoformat() if ticket.called_at else None,
        "agent_name": f"{ticket.agent.user.first_name} {ticket.agent.user.last_name}" if ticket.agent else None,
    }

    # Broadcast to each display's WebSocket group
    for display in displays:
        display_group = f"display_{tenant_slug}_{str(display.id)}"
        async_to_sync(channel_layer.group_send)(
            display_group,
            {"type": "ticket_called", "ticket": ticket_data}
        )
```

### Frontend Components

#### 1. useWebSocket Hook (`frontend/src/hooks/use-websocket.ts`)

Reusable React hook for WebSocket connections with auto-reconnect:

**Features**:
- Automatic reconnection with exponential backoff (max 10 attempts)
- Connection state tracking
- Message parsing and handling
- Cleanup on unmount

**Usage**:
```typescript
const { isConnected, sendMessage } = useWebSocket(wsUrl, {
  onMessage: (message) => {
    console.log('Received:', message);
  },
  onConnect: () => console.log('Connected'),
  onDisconnect: () => console.log('Disconnected'),
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
});
```

#### 2. Display Page (`frontend/src/app/display/[displayId]/page.tsx`)

**WebSocket Integration**:
```typescript
const wsUrl = `ws://${window.location.hostname}:8000/ws/tenants/${tenantSlug}/displays/${displayId}/`;

const { isConnected } = useWebSocket(wsUrl, {
  onMessage: (message) => {
    if (message.type === 'ticket_called' && message.ticket) {
      // Play notification sound
      playNotificationSound();

      // Add new ticket to the list (avoid duplicates)
      setData((prev) => {
        if (!prev) return prev;
        const exists = prev.tickets.some((t) => t.id === message.ticket.id);
        if (exists) return prev;

        const newTickets = [message.ticket, ...prev.tickets].slice(0, 10);
        return { ...prev, tickets: newTickets };
      });

      // Refresh to get updated waiting stats
      fetchDisplayData();
    }
  }
});
```

**Features**:
- Real-time ticket updates via WebSocket
- Fallback polling (every 5 seconds by default)
- Audio notification using Web Audio API
- Connection status indicator (green = connected, red = disconnected)
- Automatic duplicate prevention

## Message Types

### 1. `ticket_called`

Sent when a ticket is called by an agent:

```json
{
  "type": "ticket_called",
  "ticket": {
    "id": "uuid",
    "number": "A001",
    "queue_name": "Consultations",
    "queue_id": "uuid",
    "status": "appele",
    "called_at": "2025-10-17T14:30:00Z",
    "agent_name": "Dr. Awa Diop"
  },
  "timestamp": "2025-10-17T14:30:00Z"
}
```

### 2. `ticket_updated`

Sent when a ticket status changes:

```json
{
  "type": "ticket_updated",
  "ticket": {
    "id": "uuid",
    "number": "A001",
    // ... ticket data
  },
  "timestamp": "2025-10-17T14:30:00Z"
}
```

### 3. `refresh`

Force display to refresh all data:

```json
{
  "type": "refresh",
  "timestamp": "2025-10-17T14:30:00Z"
}
```

### 4. `connection` (sent on connect)

Confirmation of successful connection:

```json
{
  "type": "connection",
  "status": "connected",
  "timestamp": "2025-10-17T14:30:00Z"
}
```

### 5. `pong` (response to ping)

Keep-alive response:

```json
{
  "type": "pong",
  "timestamp": "2025-10-17T14:30:00Z"
}
```

## Testing

### 1. Test Display Creation

Create a test display for a tenant:

```python
from apps.displays.models import Display
from apps.tenants.models import Tenant
from apps.queues.models import Queue

tenant = Tenant.objects.get(slug='clinique-madeleine')
queue = Queue.objects.filter(tenant=tenant).first()

display = Display.objects.create(
    tenant=tenant,
    name='Écran Principal',
    display_type='tv',
    layout='grid',
    is_active=True,
    theme={
        'primaryColor': '#3b82f6',
        'backgroundColor': '#ffffff',
        'textColor': '#1f2937'
    }
)
display.queues.add(queue)
```

### 2. Test WebSocket Connection

Open browser console and navigate to:
```
http://localhost:3002/display/{display_id}
```

You should see:
```
[WebSocket] Connecting to: ws://localhost:8000/ws/tenants/clinique-madeleine/displays/{display_id}/
[WebSocket] Connected
[Display] WebSocket connected
```

### 3. Test Real-Time Updates

1. Open display page in one browser window
2. Open agent interface in another window
3. Call a ticket from the agent interface
4. Display should instantly update with the new ticket
5. Notification sound should play

### 4. Test Reconnection

1. Stop Django server
2. Display should show "Déconnecté" status
3. Restart Django server
4. Display should automatically reconnect within 3 seconds
5. Status should change to "Connecté"

## Troubleshooting

### WebSocket Connection Fails

**Issue**: `WebSocket connection to 'ws://...' failed`

**Solutions**:
1. Ensure Django Channels is configured correctly
2. Check Redis is running: `redis-cli ping`
3. Verify CHANNEL_LAYERS setting in Django settings
4. Check browser console for CORS errors

### No Real-Time Updates

**Issue**: Display doesn't update when ticket is called

**Solutions**:
1. Check display is active: `Display.objects.filter(id=display_id, is_active=True)`
2. Verify display has queues assigned: `display.queues.all()`
3. Check Django logs for broadcasting errors
4. Verify ticket belongs to one of the display's queues

### Audio Not Playing

**Issue**: Notification sound doesn't play

**Solutions**:
1. Check browser autoplay policy (user interaction may be required first)
2. Verify Web Audio API is supported: `window.AudioContext`
3. Check browser console for audio errors
4. Try clicking on the page first (autoplay restriction)

## Performance Considerations

### Backend

- **Channel Layer**: Uses Redis for efficient group messaging
- **Broadcasting**: Only sends to displays actively showing the queue
- **Connection Limits**: Configure Daphne/Uvicorn workers for concurrent connections

### Frontend

- **Reconnection**: Exponential backoff prevents server overload
- **Duplicate Prevention**: Checks ticket.id before adding to list
- **Memory Management**: Keeps only last 10 tickets in memory
- **Fallback Polling**: Maintains 5-second polling as backup

## Security

- **Authentication**: Currently public access (read-only)
- **Tenant Isolation**: Display IDs are UUIDs, hard to guess
- **Rate Limiting**: Consider implementing for production
- **CORS**: Configure allowed WebSocket origins in production

## Future Improvements

1. **Authentication**: JWT token in WebSocket connection
2. **Compression**: Enable WebSocket compression for large payloads
3. **Heartbeat**: Implement ping/pong for connection health
4. **Statistics**: Track connection uptime and message counts
5. **Custom Sounds**: Upload custom notification sounds per tenant
6. **Multi-language**: Support French/Wolof/English audio announcements
7. **Fullscreen API**: Auto-enter fullscreen for kiosk mode
8. **Offline Mode**: Cache tickets and sync when reconnected

## Related Files

### Backend
- `/backend/apps/displays/consumers.py` - WebSocket consumer
- `/backend/apps/displays/views.py` - REST API endpoints
- `/backend/apps/tickets/views.py` - Broadcasting logic
- `/backend/smartqueue_backend/routing.py` - WebSocket URL routing

### Frontend
- `/frontend/src/hooks/use-websocket.ts` - WebSocket hook
- `/frontend/src/app/display/[displayId]/page.tsx` - Display page component
- `/frontend/src/lib/api/client.ts` - API client configuration
