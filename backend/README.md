# SmartQueue Backend

API Django multi-tenant pour la gestion de files d'attente et rendez-vous.

## 🚀 Quick Start

```bash
# Installation
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]

# Configuration
cp ../.env.example ../.env
# Éditer .env avec vos paramètres

# Migrations
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py migrate

# Créer un tenant de démo
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py create_tenant \
  --name "Demo Bank" \
  --slug demo-bank \
  --admin-email admin@demo-bank.com \
  --admin-password admin123 \
  --with-demo-data

# Lancer le serveur
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py runserver
```

## 📚 Structure

```
backend/
├── apps/
│   ├── core/              # Base models, permissions, audit
│   ├── tenants/           # Multi-tenant management
│   ├── users/             # User & Agent profiles
│   ├── customers/         # Customer management
│   ├── queues/            # Queue, Service, Site + business logic
│   ├── tickets/           # Ticket & Appointment lifecycle
│   ├── notifications/     # Multi-channel notifications
│   ├── feedback/          # CSAT/NPS feedback
│   └── displays/          # Display screens & kiosks
├── smartqueue_backend/    # Django project config
└── pyproject.toml
```

## 🔑 Features Implemented

### ✅ Multi-Tenant Architecture
- Tenant isolation via FK + middleware
- X-Tenant header or subdomain extraction
- ContextVar for async tasks

### ✅ RBAC with Scopes
- 14 granular scopes
- Role-based access (Admin, Manager, Agent)
- Permission classes: `IsTenantMember`, `HasScope`, `IsAgent`, `IsManager`

### ✅ Queue Management
- **3 Algorithms**: FIFO, Priority-based, SLA-aware
- Real-time stats
- Multi-site support

### ✅ Agent Actions
- `call_next()` - Call next ticket from queue
- `set_status()` - Change availability (available/busy/paused)

### ✅ Ticket Lifecycle
- `start_service()` - Start serving a called ticket
- `close()` - Close completed ticket
- `transfer()` - Transfer to another queue
- `pause()` / `resume()` - Pause/resume service
- `mark_no_show()` - Mark as no-show
- Automatic ETA calculation (Celery task)

### ✅ Real-time WebSockets
- Queue updates (ticket events)
- Agent status changes
- Django Channels + Redis

### ✅ Notifications (models ready, delivery TODO)
- Multi-channel: SMS, Email, WhatsApp, Push
- Template system with variable replacement
- Celery tasks for async delivery
- Integration stubs for Twilio, SendGrid, FCM

### ✅ Audit Logging
- All critical actions logged
- User tracking, IP address, changes (before/after)
- GenericForeignKey to any model

### ✅ Customer Management
- Profiles with notification preferences
- Phone/email validation
- Custom metadata per tenant

### ✅ Feedback & Satisfaction
- CSAT scores (1-5)
- NPS scores (0-10)
- Comments and tags
- Linked to tickets/appointments

### ✅ Display & Kiosk Management
- Display screens (main, counter, waiting room)
- Interactive kiosks for self-service
- Device tracking (online status, last ping)

## 🔒 Authentication

Token-based authentication with DRF.

```bash
# Login (public endpoint)
curl -X POST http://localhost:8000/api/v1/auth/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo-bank.com", "password": "admin123"}'

# Use token with tenant-scoped URL
curl http://localhost:8000/api/v1/tenants/demo-bank/queues/ \
  -H "Authorization: Token YOUR_TOKEN"

# Legacy: X-Tenant header still supported for backward compatibility
curl http://localhost:8000/api/v1/tenants/demo-bank/queues/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "X-Tenant: demo-bank"
```

## 🌐 API Endpoints

Full documentation: [docs/API.md](../docs/API.md)

**Note**: All tenant-scoped endpoints are now under `/api/v1/tenants/{tenant_slug}/`

### Public Endpoints
- `POST /api/v1/auth/` - Login
- `GET /api/v1/auth/me/` - Current user
- `POST /api/v1/auth/logout/` - Logout
- `GET /api/v1/health/` - Healthcheck

### Tenant Management
- `GET /api/v1/tenants/` - List tenants
- `POST /api/v1/tenants/` - Create tenant
- `GET /api/v1/tenants/{id}/` - Get tenant details

### Tenant-Scoped Resources
All require authentication and tenant context via URL path.

- `/api/v1/tenants/{tenant_slug}/sites/` - Physical locations
- `/api/v1/tenants/{tenant_slug}/queues/services/` - Services offered
- `/api/v1/tenants/{tenant_slug}/queues/` - Queues
- `/api/v1/tenants/{tenant_slug}/customers/` - Customers
- `/api/v1/tenants/{tenant_slug}/tickets/` - Tickets
- `/api/v1/tenants/{tenant_slug}/tickets/appointments/` - Appointments

### Actions
- `POST /api/v1/tenants/{tenant_slug}/agents/call-next/` - Agent calls next ticket
- `POST /api/v1/tenants/{tenant_slug}/agents/set-status/` - Change agent status
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/transfer/` - Transfer ticket
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/close/` - Close ticket
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/pause/` - Pause ticket
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/resume/` - Resume ticket
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/mark_no_show/` - Mark no-show
- `GET /api/v1/tenants/{tenant_slug}/queues/{id}/stats/` - Real-time stats

### WebSockets
- `ws://localhost:8000/ws/tenants/{tenant_slug}/queues/{queue_id}/`
- `ws://localhost:8000/ws/tenants/{tenant_slug}/agents/{agent_id}/`

## 🧪 Testing

```bash
# Run all tests
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.test pytest

# With coverage
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.test pytest --cov=apps

# Specific app
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.test pytest apps/queues/tests/
```

## 🛠️ Development Commands

```bash
# Create superuser
python manage.py createsuperuser

# Create tenant with demo data
python manage.py create_tenant \
  --name "My Tenant" \
  --slug my-tenant \
  --admin-email admin@example.com \
  --with-demo-data

# Shell
python manage.py shell

# Database shell
python manage.py dbshell
```

## 🚀 Deployment

### Docker

```bash
# Development
docker compose -f ../docker-compose.dev.yml up

# Production (TODO)
docker compose -f docker-compose.prod.yml up
```

### Services Required
- PostgreSQL 14+
- Redis 7+
- Celery worker
- Celery beat (for scheduled tasks)

### Environment Variables

See `.env.example` for all variables. Key ones:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/smartqueue
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=api.smartqueue.app
CORS_ALLOWED_ORIGINS=https://app.smartqueue.app
```

## 📊 Performance Tips

1. **Database Indexes**: Already on key fields (tenant, status, dates)
2. **Select Related**: Use in queries for FKs
3. **Caching**: Redis cache enabled
4. **Read Replica**: Configure `DATABASE_REPLICA_URL` for reads
5. **Celery**: Offload heavy tasks (ETA calculation, notifications)

## 🔜 TODO / Roadmap

### Phase 1 (MVP completion)
- [x] Restructure URLs to be tenant-scoped (`/api/v1/tenants/{slug}/...`) ✅
- [ ] Complete notification delivery (Twilio, SendGrid integration)
- [ ] Analytics endpoints (dashboards, reports)
- [ ] OAuth2/JWT authentication with scopes
- [ ] Row Level Security (PostgreSQL)

### Phase 2
- [ ] Webhooks (inbound & outbound)
- [ ] USSD support
- [ ] Advanced analytics (ML-based ETA)
- [ ] Multi-language support (i18n)
- [ ] Appointment booking rules & conflicts
- [ ] Agent performance metrics

### Phase 3
- [ ] GraphQL API
- [ ] Event sourcing for audit
- [ ] Multi-region support
- [ ] Advanced queue routing rules
- [ ] Customer journey analytics

## 📖 Additional Documentation

- [API Documentation](../docs/API.md)
- [Backend Developer Book](../docs/backend_devbook.md)
- [Architecture](../CLAUDE.md)
- [Changelog](../CHANGELOG.md)

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run tests
4. Run linter: `ruff check . && black .`
5. Create PR

## 📝 License

Proprietary - All rights reserved
