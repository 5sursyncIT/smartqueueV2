# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartQueue is a multi-tenant SaaS queue management system with:
- **Backend**: Django/DRF API with real-time WebSocket support, async task processing (Celery), and billing automation
- **Back Office**: Next.js 15 web application with role-based interfaces (super-admin, admin, manager, agent)
- **Frontend**: Next.js 15 public-facing website for tenant landing pages
- **Mobile**: React Native/Expo mobile app (planned)

The system serves multiple tenants with isolated data, scope-based RBAC, and automated billing/dunning management.

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

# Running services (IMPORTANT: Use Daphne for WebSocket support)
./start_with_websocket.sh     # Start Daphne (ASGI) with WebSocket support (RECOMMENDED)
# OR manually:
# cd backend && DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev \
#   .venv/bin/daphne -b 0.0.0.0 -p 8000 smartqueue_backend.asgi:application

make run-backend              # Django development server (port 8000) - NO WebSocket support
# Note: Always use Daphne/ASGI for development - WebSocket features won't work with runserver
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

### Frontend Development

```bash
# Back Office (multi-role admin interface)
cd back_office
npm install
npm run dev                   # Start dev server on port 3000
npm run dev:turbo             # Start dev server with Turbopack
npm run build                 # Production build
npm run lint                  # Run ESLint

# Frontend (public website)
cd frontend
npm install
npm run dev                   # Start dev server (Turbopack enabled by default)
npm run build                 # Production build
npm run lint                  # Run ESLint
```

### Environment Variables

The backend requires a `.env` file based on `.env.example`. Key variables:
- `DATABASE_URL`: PostgreSQL connection string (default: `postgres://postgres:postgres@localhost:5432/smartqueue`)
- `REDIS_URL`: Redis connection for cache, Celery, and Channels (default: `redis://localhost:6379/0`)
- `SECRET_KEY`: Django secret key
- `DEBUG`: Development mode flag
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `CORS_ALLOWED_ORIGINS`: Frontend URLs for CORS (default includes localhost:3000-3002)
- **Twilio** (SMS/WhatsApp): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`
- **SendGrid** (Email): `SENDGRID_API_KEY`, `DEFAULT_FROM_EMAIL`
- **Firebase** (Push notifications): `FIREBASE_CREDENTIALS_PATH`, `FCM_SERVER_KEY`

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
│   ├── tenants/            # Tenant and membership models, billing/subscriptions
│   ├── users/              # Custom user model + Agent profiles
│   ├── customers/          # Customer management
│   ├── queues/             # Queue, Service, Site models + business logic
│   ├── tickets/            # Ticket and Appointment lifecycle management
│   ├── notifications/      # Notification templates and delivery
│   ├── feedback/           # Customer feedback and satisfaction (CSAT/NPS)
│   ├── displays/           # Display screens and kiosks
│   ├── subscriptions/      # Subscription plans and billing
│   └── contact/            # Contact form submissions
├── smartqueue_backend/     # Django project config
│   ├── settings/           # Split settings (base, dev, test)
│   ├── celery.py          # Celery configuration
│   ├── routing.py         # WebSocket routing (Channels)
│   ├── urls.py            # URL routing
│   └── asgi.py/wsgi.py    # ASGI/WSGI apps
└── pyproject.toml         # Dependencies and project metadata
```

### Frontend Structure

**Back Office** (`back_office/`): Multi-role admin interface
```
back_office/
├── app/
│   ├── (auth)/            # Authentication pages (login, register)
│   ├── (super-admin)/     # Super-admin dashboard and tenant management
│   ├── (admin)/           # Tenant admin dashboard
│   ├── (manager)/         # Manager dashboard and analytics
│   ├── (agent)/           # Agent interface for queue operations
│   └── (public)/          # Public pages (landing, pricing)
├── components/            # Reusable UI components (shadcn/ui based)
├── contexts/              # React contexts (auth, tenant)
└── hooks/                 # Custom React hooks
```

**Frontend** (`frontend/`): Public-facing website
```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # UI components
│   ├── contexts/         # React contexts
│   └── hooks/            # Custom hooks (including WebSocket hook)
```

### Key Technologies

**Backend:**
- **Django 4.2+**: Web framework with custom user model (`users.User`)
- **Django REST Framework**: API endpoints with JWT (primary), Token, and Session auth
- **Django Channels**: WebSocket support via Channels + Redis
- **Celery**: Async tasks with Redis broker, Celery Beat for scheduled tasks
- **PostgreSQL**: Primary database with optional read replica support
- **Redis**: Cache, session store, Celery broker, and Channels layer
- **drf-spectacular**: OpenAPI schema generation
- **Integrations**: Twilio (SMS/WhatsApp), SendGrid (Email), Firebase (Push)

**Frontend:**
- **Next.js 15**: React framework with App Router and Turbopack
- **React 19**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS 4**: Styling (back_office v3, frontend v4)
- **shadcn/ui**: Component library built on Radix UI
- **React Hook Form + Zod**: Form handling and validation
- **TanStack Query**: Server state management (back_office)
- **Zustand**: Client state management (back_office)
- **Axios**: HTTP client

**Custom Hooks** (back_office/lib/hooks/):
- `use-tickets.ts` - Ticket CRUD and queries
- `use-agents.ts` - Agent management and status updates
- `use-queues.ts` - Queue operations and stats
- `use-sites.ts`, `use-services.ts` - Site and service management
- `use-stats.ts` - Dashboard statistics (real-time calculations from tickets/agents/queues)
- `use-websocket.ts` - WebSocket connection management for real-time updates

### API Structure

**Tenant-scoped URL structure**: `/api/v1/tenants/{tenant_slug}/<resource>/`

All tenant resources are now accessed via URL path (e.g., `/api/v1/tenants/demo-bank/queues/`).

**Public endpoints** (not tenant-scoped):
- `/api/v1/auth/jwt/token/` - JWT authentication (POST email/password, returns access/refresh tokens)
- `/api/v1/auth/jwt/refresh/` - Refresh JWT access token
- `/api/v1/health/` - Health check
- `/api/v1/admin/` - Super-admin endpoints
- `/api/v1/public/tenants/` - Public tenant listing

**Authentication**: JWT-based (primary). Include `Authorization: Bearer <token>` header.
- Token auth (`Authorization: Token <key>`) still supported for backward compatibility
- Session auth available for Django admin

**Backward compatibility**: `X-Tenant` header still supported but no longer required when tenant is in URL path.

Schema documentation available via drf-spectacular at `/api/schema/`.

### WebSockets

Real-time features use Django Channels with tenant-scoped WebSocket URLs:
- Routing defined in [backend/smartqueue_backend/routing.py](backend/smartqueue_backend/routing.py)
- **WebSocket endpoints**:
  - `ws/tenants/{tenant_slug}/queues/{queue_id}/` - Queue updates (QueueConsumer)
  - `ws/tenants/{tenant_slug}/tickets/{ticket_id}/` - Ticket updates (TicketConsumer)
  - `ws/tenants/{tenant_slug}/agents/{agent_id}/` - Agent status updates (AgentConsumer)
  - `ws/tenants/{tenant_slug}/displays/{display_id}/` - Display screen updates (DisplayConsumer)
- Consumers in individual app directories (e.g., [apps/tickets/consumers.py](backend/apps/tickets/consumers.py))
- Channel layer backed by Redis
- All state changes (ticket calls, transfers, status updates) broadcast in real-time

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
8. **JWT vs Token Auth**: Use JWT for new integrations (`/api/v1/auth/jwt/token/`). Token auth still works for backward compatibility.
9. **Field Naming Consistency**:
   - Backend serializers use `_id` suffix for foreign keys (e.g., `service_id`, `site_id`, `queue_id`)
   - Frontend TypeScript types must match these field names exactly
   - When adding `SerializerMethodField` or aliases, include both the original field and alias for frontend compatibility
10. **Permissions & RBAC**: Use scope-based permissions from [backend/apps/core/permissions.py](backend/apps/core/permissions.py)
   - `IsTenantMember` - User belongs to tenant
   - `HasScope(scope)` - User has specific scope based on role
   - `IsAgent`, `IsManager` - Role shortcuts
   - **14 scopes available**: `read:queue`, `write:queue`, `manage:queue`, `read:ticket`, `write:ticket`, `manage:ticket`, `read:agent`, `manage:agent`, `read:customer`, `write:customer`, `read:reports`, `manage:settings`, `send:notification`, `read:feedback`
11. **Queue business logic**: Use [backend/apps/queues/services.py](backend/apps/queues/services.py) for queue operations
   - `call_next(agent, queue)` - Agent calls next ticket
   - `transfer_ticket(ticket, target_queue, reason)` - Transfer between queues
   - `close_ticket(ticket, agent)`, `pause_ticket(ticket, reason)`, `resume_ticket(ticket)` - Ticket lifecycle
   - `mark_no_show(ticket, agent)`, `start_service(ticket)` - Additional actions
   - All methods handle status transitions, broadcasting, and validation
12. **Audit logging**: Use [backend/apps/core/audit.py](backend/apps/core/audit.py) `log_action()` for tracking critical operations
13. **Notifications**: Celery tasks in [backend/apps/notifications/tasks.py](backend/apps/notifications/tasks.py) handle async delivery
    - `send_notification(notification_id)` - Send via configured channel
    - `render_and_send_notification(template_id, recipient, context, tenant_id)` - Render template + send
    - Templates support variables: `{{ticket_number}}`, `{{queue_name}}`, `{{customer_name}}`, etc.
14. **Celery Beat Scheduled Tasks**: Configured in [backend/smartqueue_backend/settings/base.py](backend/smartqueue_backend/settings/base.py)
    - **Billing**: `check-overdue-invoices` (daily 9h), `retry-failed-payments` (daily 2h), `generate-recurring-invoices` (monthly 1st), `cleanup-expired-trials` (daily 3h)
    - **Queue Intelligence**: `update-tickets-eta` (every 2min), `check-queue-health` (every 5min), `cleanup-old-tickets` (daily 4h)

## Recent Updates (2025-10)

**New Models Added:**
- `Site` - Physical locations with geolocation
- `Customer` - Customer profiles with notification preferences
- `NotificationTemplate` + `Notification` - Multi-channel notification system
- `Feedback` - CSAT/NPS feedback collection
- `Display` + `Kiosk` - Hardware device management

**RBAC System:**
- Scope-based permissions in [backend/apps/core/permissions.py](backend/apps/core/permissions.py)
- Role → Scopes mapping: Admin (all), Manager (most), Agent (limited)
- Custom permission classes: `HasScope`, `IsTenantMember`, `IsAgent`, `IsManager`
- JWT tokens include user's current tenant, role, and scopes in claims

**Queue Services:**
- Algorithm implementations: FIFO, Priority-based, SLA-aware
- Agent actions: `call_next`, `set_status`
- Ticket actions: `transfer`, `close`, `pause`, `resume`, `mark_no_show`, `start_service`
- Real-time WebSocket broadcasting for all state changes

**API Actions Added:**
- `POST /api/v1/tenants/{tenant_slug}/agents/call-next/` - Agent calls next ticket
- `POST /api/v1/tenants/{tenant_slug}/agents/set-status/` - Change agent availability
- `PATCH /api/v1/tenants/{tenant_slug}/agents/me/` - Agent updates own profile (counter number)
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/transfer/` - Transfer ticket to another queue
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/start_service/` - Start serving a called ticket
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/close/` - Close completed ticket
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/pause/` - Pause ticket service
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/resume/` - Resume paused ticket
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/mark_no_show/` - Mark ticket as no-show

**Recent Enhancements (January 2025):**
- ✅ **Wait Time Tracking**: Added `wait_time_seconds` to TicketSerializer - calculates time from `created_at` to `called_at`
- ✅ **Agent Self-Service**: Agents can update their own counter number via `/agents/me/` endpoint
- ✅ **Auto-Assignment**: Tickets automatically assigned to calling agent
- ✅ **Ticket Security**: Only assigned agent or admin/manager can start/close tickets
- ✅ **Agent Status Sync**: Fixed AgentSerializer to return both `status` and `current_status` for frontend compatibility
- ✅ **Team Dashboard**: Connected to real agent data with live status updates
- ✅ **Reports Dashboard**: Real-time statistics calculated from tickets, agents, and queues
- ✅ **Queue Creation Fix**: Fixed frontend-backend field name mismatch (`service_id` vs `service`)
- ✅ **Display TTS**: Modified to announce only last 4 digits of ticket numbers

## Useful Commands

```bash
# Create a new tenant with demo data
. backend/.venv/bin/activate && DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev \
  python backend/manage.py create_tenant --name "Bank XYZ" --slug bank-xyz \
  --admin-email admin@xyz.com --admin-password admin123 --with-demo-data

# Test API with curl - JWT authentication (recommended)
curl -X POST http://localhost:8000/api/v1/auth/jwt/token/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo-bank.com", "password": "admin123"}'
# Response: {"access": "...", "refresh": "...", "user": {...}}

# Call next ticket (as agent) - tenant-scoped URL with JWT
curl -X POST http://localhost:8000/api/v1/tenants/demo-bank/agents/call-next/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"queue_id": "QUEUE_UUID"}'

# Get queue stats - tenant-scoped URL
curl http://localhost:8000/api/v1/tenants/demo-bank/queues/QUEUE_UUID/stats/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Run Celery tasks manually (for debugging)
. backend/.venv/bin/activate && DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev \
  python backend/manage.py shell
>>> from apps.notifications.tasks import send_notification
>>> send_notification.delay(notification_id)

# Check Celery worker status
. backend/.venv/bin/activate && DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev \
  celery -A smartqueue_backend inspect active
```

## Additional Documentation

- **API Reference**: [docs/API.md](docs/API.md) - Complete API documentation with examples
- **Backend Guide**: [docs/backend_devbook.md](docs/backend_devbook.md) - Backend architecture and development guide
- **Frontend Guide**: [docs/frontend_devbook.md](docs/frontend_devbook.md) - Frontend architecture and development guide
- **Display WebSocket**: [docs/DISPLAY_WEBSOCKET.md](docs/DISPLAY_WEBSOCKET.md) - Display screen WebSocket integration
- **Changelog**: [CHANGELOG.md](CHANGELOG.md) - Recent updates and changes
- **Cahier des Charges**: [docs/cahier_des_charges.md](docs/cahier_des_charges.md) - Project specifications (French)

## Project Status & Next Steps

**Completed:**
- ✅ Multi-tenant backend with scope-based RBAC
- ✅ Tenant-scoped API URLs (`/api/v1/tenants/{tenant_slug}/...`)
- ✅ JWT authentication with custom claims
- ✅ Real-time WebSocket support for queues, tickets, agents, displays
- ✅ Celery async tasks and Beat scheduled tasks
- ✅ Queue management with FIFO, Priority, and SLA algorithms
- ✅ Back Office Next.js 15 application with role-based routing
- ✅ Frontend public website with Next.js 15
- ✅ Display screen and kiosk management

**In Progress / Planned:**
1. **External Integrations** - Complete Twilio (SMS), SendGrid (Email), FCM (Push) integrations
2. **Analytics Dashboard** - Real-time dashboards and reporting endpoints
3. **RLS PostgreSQL** - Activate Row Level Security for database-level isolation
4. **Mobile App** - React Native/Expo mobile application
5. **Advanced Features** - AI-powered queue prediction, smart routing, customer journey analytics

sudo password : orion
