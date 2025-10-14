# SmartQueue API Documentation

## Base URL
```
http://localhost:8000/api/v1/
```

## URL Structure

**Public endpoints** (auth, health):
```
/api/v1/auth/
/api/v1/health/
```

**Tenant-scoped endpoints** (all resources):
```
/api/v1/tenants/{tenant_slug}/<resource>/
```

## Authentication

L'API utilise Token Authentication. Chaque requête doit inclure:
- **Authorization**: `Token <your-token-key>`

Le tenant est désormais identifié via l'URL path (`/api/v1/tenants/{tenant_slug}/...`).

**Backward Compatibility**: Le header `X-Tenant` est toujours supporté mais n'est plus requis si le tenant est dans l'URL.

### Obtenir un token

```http
POST /api/v1/auth/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

## Endpoints

### Authentication

#### Login
```http
POST /api/v1/auth/
```

#### Get Current User
```http
GET /api/v1/auth/me/
Authorization: Token <token>
```

#### Logout
```http
POST /api/v1/auth/logout/
Authorization: Token <token>
```

---

### Sites

#### List Sites
```http
GET /api/v1/tenants/demo-bank/sites/
Authorization: Token <token>
```

#### Create Site
```http
POST /api/v1/tenants/demo-bank/sites/
Authorization: Token <token>
Content-Type: application/json

{
  "name": "Agence Dakar",
  "slug": "agence-dakar",
  "address": "Avenue Leopold Senghor",
  "city": "Dakar",
  "country": "SN",
  "latitude": 14.6928,
  "longitude": -17.4467,
  "phone": "+221 33 123 45 67",
  "timezone": "Africa/Dakar"
}
```

---

### Services

#### List Services
```http
GET /api/v1/tenants/demo-bank/queues/services/
Authorization: Token <token>
```

#### Create Service
```http
POST /api/v1/tenants/demo-bank/queues/services/
Authorization: Token <token>
Content-Type: application/json

{
  "name": "Ouverture de compte",
  "sla_seconds": 600,
  "priority_rules": {},
  "is_active": true
}
```

---

### Queues

#### List Queues
```http
GET /api/v1/tenants/demo-bank/queues/
Authorization: Token <token>
```

**Query Parameters:**
- `site=<uuid>` - Filter by site
- `service=<uuid>` - Filter by service
- `status=active|paused|closed` - Filter by status
- `algorithm=fifo|priority|sla` - Filter by algorithm

#### Get Queue Stats
```http
GET /api/v1/tenants/demo-bank/queues/<queue_id>/stats/
Authorization: Token <token>
```

**Response:**
```json
{
  "queue_id": "uuid",
  "queue_name": "File Ouverture de compte",
  "status": "active",
  "waiting_count": 5,
  "called_count": 2,
  "in_service_count": 3,
  "total_active": 10,
  "avg_wait_seconds": 180
}
```

#### Set Queue Status
```http
POST /api/v1/tenants/demo-bank/queues/<queue_id>/set_status/
Authorization: Token <token>
Content-Type: application/json

{
  "status": "paused"
}
```

---

### Customers

#### List Customers
```http
GET /api/v1/tenants/demo-bank/customers/
Authorization: Token <token>
```

**Query Parameters:**
- `phone=<phone>` - Search by phone
- `email=<email>` - Search by email
- `is_active=true|false` - Filter by status
- `search=<query>` - Search in name, phone, email

#### Create Customer
```http
POST /api/v1/tenants/demo-bank/customers/
Authorization: Token <token>
Content-Type: application/json

{
  "first_name": "Amadou",
  "last_name": "Diallo",
  "email": "amadou.diallo@example.com",
  "phone": "+221771234567",
  "language": "fr",
  "notify_sms": true,
  "notify_email": false,
  "notify_whatsapp": false
}
```

---

### Tickets

#### List Tickets
```http
GET /api/v1/tenants/demo-bank/tickets/
Authorization: Token <token>
```

**Query Parameters:**
- `queue=<uuid>` - Filter by queue
- `status=en_attente|appele|en_service|pause|transfere|clos|no_show`
- `channel=web|app|qr|whatsapp|kiosk`

#### Create Ticket
```http
POST /api/v1/tenants/demo-bank/tickets/
Authorization: Token <token>
Content-Type: application/json

{
  "queue": "queue-uuid",
  "customer": "customer-uuid",  // optional
  "channel": "web",
  "priority": 0,
  "customer_name": "John Doe",  // if no customer FK
  "customer_phone": "+221771234567"
}
```

#### Start Service
```http
POST /api/v1/tenants/demo-bank/tickets/<ticket_id>/start_service/
Authorization: Token <token>
```

#### Close Ticket
```http
POST /api/v1/tenants/demo-bank/tickets/<ticket_id>/close/
Authorization: Token <token>
```

#### Transfer Ticket
```http
POST /api/v1/tenants/demo-bank/tickets/<ticket_id>/transfer/
Authorization: Token <token>
Content-Type: application/json

{
  "target_queue_id": "queue-uuid",
  "reason": "Client misdirected"
}
```

#### Pause Ticket
```http
POST /api/v1/tenants/demo-bank/tickets/<ticket_id>/pause/
Authorization: Token <token>
Content-Type: application/json

{
  "reason": "Missing documents"
}
```

#### Resume Ticket
```http
POST /api/v1/tenants/demo-bank/tickets/<ticket_id>/resume/
Authorization: Token <token>
```

#### Mark No-Show
```http
POST /api/v1/tenants/demo-bank/tickets/<ticket_id>/mark_no_show/
Authorization: Token <token>
```

---

### Agents

#### Get Agent Status
```http
GET /api/v1/tenants/demo-bank/agents/
Authorization: Token <token>
```

**Response:**
```json
{
  "id": "uuid",
  "user": "user-uuid",
  "current_status": "available",
  "status_updated_at": "2025-10-02T10:30:00Z"
}
```

#### Call Next Ticket
```http
POST /api/v1/tenants/demo-bank/agents/call-next/
Authorization: Token <token>
Content-Type: application/json

{
  "queue_id": "queue-uuid"
}
```

**Response:** Returns the called ticket

**Errors:**
- `400 Bad Request` - Agent already has an active ticket
- `404 Not Found` - No waiting tickets in queue

#### Set Agent Status
```http
POST /api/v1/tenants/demo-bank/agents/set-status/
Authorization: Token <token>
Content-Type: application/json

{
  "status": "available"  // available|busy|paused
}
```

---

### Appointments

#### List Appointments
```http
GET /api/v1/tenants/demo-bank/tickets/appointments/
Authorization: Token <token>
```

**Query Parameters:**
- `service=<uuid>` - Filter by service
- `status=scheduled|checked_in|cancelled|completed`

#### Create Appointment
```http
POST /api/v1/tenants/demo-bank/tickets/appointments/
Authorization: Token <token>
Content-Type: application/json

{
  "service": "service-uuid",
  "customer": "customer-uuid",
  "starts_at": "2025-10-05T14:00:00Z",
  "ends_at": "2025-10-05T14:30:00Z",
  "metadata": {
    "notes": "Client VIP"
  }
}
```

---

## WebSocket Connections

### Queue Updates
```
ws://localhost:8000/ws/tenants/<tenant_slug>/queues/<queue_id>/
```

**Events Received:**
```json
{
  "event": "ticket.created",
  "ticket_id": "uuid",
  "status": "en_attente",
  "number": "A001"
}
```

Possible events:
- `ticket.created`
- `ticket.called`
- `ticket.service_started`
- `ticket.transferred`
- `ticket.closed`
- `ticket.paused`
- `ticket.resumed`
- `ticket.no_show`

### Agent Updates
```
ws://localhost:8000/ws/tenants/<tenant_slug>/agents/<agent_id>/
```

**Events Received:**
```json
{
  "type": "status_updated",
  "payload": {
    "agent_id": "uuid",
    "status": "busy",
    "updated_at": "2025-10-02T10:30:00Z"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "queue_id est requis"
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "Vous n'êtes pas membre de ce tenant."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

---

## Permissions & RBAC

### Roles
- **Admin**: Tous les scopes
- **Manager**: La plupart des scopes (pas de modification settings)
- **Agent**: Scopes limités (lecture/écriture queues et tickets)

### Scopes
- `read:queue`, `write:queue`, `manage:queue`
- `read:ticket`, `write:ticket`, `manage:ticket`
- `read:agent`, `manage:agent`
- `read:customer`, `write:customer`
- `read:reports`, `read:feedback`
- `manage:settings`, `send:notification`

Les permissions sont vérifiées automatiquement via les classes:
- `IsTenantMember` - User appartient au tenant
- `HasScope(scope)` - User a le scope requis
- `IsAgent` - User est un agent
- `IsManager` - User est manager ou admin

---

## Rate Limiting

*À implémenter*

## Pagination

Toutes les listes sont paginées par défaut:

```json
{
  "count": 100,
  "next": "http://localhost:8000/api/v1/tickets/?page=2",
  "previous": null,
  "results": [...]
}
```

Query parameters:
- `page=<number>` - Page number
- `page_size=<number>` - Items per page (max: 100)

---

## Schema Documentation

API Schema interactive disponible sur:
- **Swagger UI**: `http://localhost:8000/api/docs/`
- **OpenAPI Schema**: `http://localhost:8000/api/schema/`
