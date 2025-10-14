# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartQueue is a multi-tenant queue management system with three main components:
- **Backend**: Django/DRF API with real-time WebSocket support and async task processing
- **Frontend**: Next.js 14 web application (placeholder for now)
- **Mobile**: React Native/Expo mobile app (placeholder for now)

The backend is functional with core multi-tenant architecture. Frontend and mobile are planned for future iterations.

## Development Commands

### Backend Development

```bash
# Setup
make install-backend          # Create venv and install dependencies
cp .env.example .env          # Configure environment variables
make migrate                  # Run database migrations

# Create demo tenant (recommended for first setup)
. backend/.venv/bin/activate && DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev \
  python backend/manage.py create_tenant \
  --name "Demo Bank" --slug demo-bank \
  --admin-email admin@demo-bank.com --admin-password admin123 \
  --with-demo-data

# Running services
make run-backend              # Django development server (port 8000)
make celery                   # Celery worker for async tasks
make beat                     # Celery beat for scheduled tasks
make docker-up                # Start all services (Postgres, Redis, backend, workers)

# Code quality
make lint-backend             # Run ruff linter
make format-backend           # Format with ruff and black
make mypy                     # Type checking
make test-backend             # Run all tests with pytest

# Run specific tests
. backend/.venv/bin/activate && pytest backend/apps/queues/tests/  # Test specific app
. backend/.venv/bin/activate && pytest backend/apps/queues/tests/test_services.py  # Test specific file
. backend/.venv/bin/activate && pytest backend/apps/queues/tests/test_services.py::test_call_next  # Test specific function

# Django management
. backend/.venv/bin/activate && DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python backend/manage.py <command>
```

### Environment Variables

The backend requires a `.env` file based on `.env.example`. Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection for cache, Celery, and Channels
- `SECRET_KEY`: Django secret key
- `DEBUG`: Development mode flag

## Architecture

### Multi-Tenant System

The system implements tenant isolation through:

1. **Tenant Resolution** ([apps/core/middleware.py](apps/core/middleware.py:21-54)):
   - Uses `X-Tenant` header or subdomain extraction
   - Middleware attaches `tenant` to request object
   - Stores tenant in ContextVar for use in async tasks

2. **Tenant-Aware Models** ([apps/tenants/models.py](apps/tenants/models.py)):
   - All domain models should inherit from base classes that include tenant FK
   - Tenant isolation enforced at model level
   - Row Level Security can be configured in PostgreSQL

3. **TenantMembership**:
   - Links users to tenants with roles (admin, manager, agent)
   - Each user can belong to multiple tenants

### Backend Structure

```
backend/
├── apps/                    # Django applications
│   ├── core/               # Shared utilities, base models, middleware, permissions
│   ├── tenants/            # Tenant and membership models
│   ├── users/              # Custom user model + Agent profiles
│   ├── customers/          # Customer management
│   ├── queues/             # Queue, Service, Site models + business logic
│   ├── tickets/            # Ticket and Appointment lifecycle management
│   ├── notifications/      # Notification templates and delivery
│   ├── feedback/           # Customer feedback and satisfaction (CSAT/NPS)
│   └── displays/           # Display screens and kiosks
├── smartqueue_backend/     # Django project config
│   ├── settings/           # Split settings (base, dev, test)
│   ├── celery.py          # Celery configuration
│   ├── routing.py         # WebSocket routing (Channels)
│   ├── urls.py            # URL routing
│   └── asgi.py/wsgi.py    # ASGI/WSGI apps
└── pyproject.toml         # Dependencies and project metadata
```

### Key Technologies

- **Django 4.2+**: Web framework with custom user model (`users.User`)
- **Django REST Framework**: API endpoints with TokenAuth and SessionAuth
- **Django Channels**: WebSocket support via Channels + Redis
- **Celery**: Async tasks with Redis broker
- **PostgreSQL**: Primary database with optional read replica support
- **Redis**: Cache, session store, Celery broker, and Channels layer

### API Structure

**Tenant-scoped URL structure**: `/api/v1/tenants/{tenant_slug}/<resource>/`

All tenant resources are now accessed via URL path (e.g., `/api/v1/tenants/demo-bank/queues/`).

**Public endpoints** (not tenant-scoped):
- `/api/v1/auth/` - Authentication
- `/api/v1/health/` - Health check
- `/api/v1/tenants/` - Tenant management

**Authentication**: Token-based (DRF). Include `Authorization: Token <key>` header.

**Backward compatibility**: `X-Tenant` header still supported but no longer required when tenant is in URL path.

Schema documentation available via drf-spectacular at `/api/schema/`.

### WebSockets

Real-time features use Django Channels:
- Routing defined in [smartqueue_backend/routing.py](smartqueue_backend/routing.py)
- Consumers in individual app directories (e.g., [apps/tickets/consumers.py](apps/tickets/consumers.py))
- Channel layer backed by Redis

### Testing

- Framework: pytest with pytest-django
- Factories: model-bakery for test data
- Run tests: `make test-backend` or from venv: `pytest backend/`
- Settings: Test-specific config in [backend/smartqueue_backend/settings/test.py](backend/smartqueue_backend/settings/test.py)
- Test structure: Each app has a `tests/` directory (e.g., `apps/queues/tests/`)
- When running pytest directly, ensure `DJANGO_SETTINGS_MODULE` is not set, or set to `smartqueue_backend.settings.test`

## Important Development Notes

1. **Always use tenant context**: All queries for tenant-aware models must filter by tenant
2. **Settings module**: Always set `DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev` for local development
3. **Virtual environment**: Backend uses Python 3.11+ in `backend/.venv`
4. **Working directory**: All Makefile commands run from repository root. Manual commands should use full paths (e.g., `backend/manage.py`)
5. **API versioning**: All endpoints under `/api/v1/` namespace
6. **Time zones**: System uses UTC internally; tenant timezone stored but not yet enforced
7. **Database migrations**: Run `make migrate` after pulling changes or creating new models
8. **Permissions & RBAC**: Use scope-based permissions from [apps/core/permissions.py](apps/core/permissions.py)
   - `IsTenantMember` - User belongs to tenant
   - `HasScope(scope)` - User has specific scope based on role
   - `IsAgent`, `IsManager` - Role shortcuts
   - **14 scopes available**: `read:queue`, `write:queue`, `manage:queue`, `read:ticket`, `write:ticket`, `manage:ticket`, `read:agent`, `manage:agent`, `read:customer`, `write:customer`, `read:reports`, `manage:settings`, `send:notification`, `read:feedback`
9. **Queue business logic**: Use [apps/queues/services.py](apps/queues/services.py) for queue operations
   - `call_next(agent, queue)` - Agent calls next ticket
   - `transfer_ticket(ticket, target_queue, reason)` - Transfer between queues
   - `close_ticket(ticket, agent)`, `pause_ticket(ticket, reason)`, `resume_ticket(ticket)` - Ticket lifecycle
   - `mark_no_show(ticket, agent)`, `start_service(ticket)` - Additional actions
   - All methods handle status transitions, broadcasting, and validation
10. **Audit logging**: Use [apps/core/audit.py](apps/core/audit.py) `log_action()` for tracking critical operations
11. **Notifications**: Celery tasks in [apps/notifications/tasks.py](apps/notifications/tasks.py) handle async delivery
    - `send_notification(notification_id)` - Send via configured channel
    - `render_and_send_notification(template_id, recipient, context, tenant_id)` - Render template + send
    - Templates support variables: `{{ticket_number}}`, `{{queue_name}}`, `{{customer_name}}`, etc.

## Recent Updates (2025-10)

**New Models Added:**
- `Site` - Physical locations with geolocation
- `Customer` - Customer profiles with notification preferences
- `NotificationTemplate` + `Notification` - Multi-channel notification system
- `Feedback` - CSAT/NPS feedback collection
- `Display` + `Kiosk` - Hardware device management

**RBAC System:**
- Scope-based permissions in [apps/core/permissions.py](apps/core/permissions.py)
- Role → Scopes mapping: Admin (all), Manager (most), Agent (limited)
- Custom permission classes: `HasScope`, `IsTenantMember`, `IsAgent`, `IsManager`

**Queue Services:**
- Algorithm implementations: FIFO, Priority-based, SLA-aware
- Agent actions: `call_next`, `set_status`
- Ticket actions: `transfer`, `close`, `pause`, `resume`, `mark_no_show`, `start_service`
- Real-time WebSocket broadcasting for all state changes

**API Actions Added:**
- `POST /api/v1/agents/call-next/` - Agent calls next ticket
- `POST /api/v1/agents/set-status/` - Change agent availability
- `POST /api/v1/tickets/{id}/transfer/` - Transfer ticket to another queue
- `POST /api/v1/tickets/{id}/start_service/` - Start serving a called ticket
- `POST /api/v1/tickets/{id}/close/` - Close completed ticket
- `POST /api/v1/tickets/{id}/pause/` - Pause ticket service
- `POST /api/v1/tickets/{id}/resume/` - Resume paused ticket
- `POST /api/v1/tickets/{id}/mark_no_show/` - Mark ticket as no-show

## Useful Commands

```bash
# Create a new tenant with demo data
python manage.py create_tenant --name "Bank XYZ" --slug bank-xyz \
  --admin-email admin@xyz.com --admin-password admin123 --with-demo-data

# Test API with curl
curl -X POST http://localhost:8000/api/v1/auth/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo-bank.com", "password": "admin123"}'

# Call next ticket (as agent) - tenant-scoped URL
curl -X POST http://localhost:8000/api/v1/tenants/demo-bank/agents/call-next/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"queue_id": "QUEUE_UUID"}'

# Get queue stats - tenant-scoped URL
curl http://localhost:8000/api/v1/tenants/demo-bank/queues/QUEUE_UUID/stats/ \
  -H "Authorization: Token YOUR_TOKEN"
```

## Additional Documentation

- **API Reference**: [docs/API.md](docs/API.md) - Complete API documentation with examples
- **Backend README**: [backend/README.md](backend/README.md) - Detailed backend guide
- **Changelog**: [CHANGELOG.md](CHANGELOG.md) - Recent updates and changes
- **Development Summary**: [DEVELOPMENT_SUMMARY.md](DEVELOPMENT_SUMMARY.md) - Technical overview

## Next Steps

1. ~~**API Restructuring**~~ - ✅ COMPLETED: URLs are now tenant-scoped (`/api/v1/tenants/{tenant_slug}/...`)
2. **External Integrations** - Complete Twilio (SMS), SendGrid (Email), FCM (Push) integrations
3. **Analytics** - Real-time dashboards and reporting endpoints
4. **OAuth/JWT** - Replace basic token auth with OAuth2 + JWT scopes
5. **RLS PostgreSQL** - Activate Row Level Security for database-level isolation
6. **Frontend/Mobile** - Initialize Next.js and Expo projects
