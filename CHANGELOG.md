# Changelog

## [Unreleased] - 2025-10-03

### Changed

#### API URL Structure (BREAKING CHANGE)
- **Tenant-scoped URLs**: All tenant resources now use path-based tenant identification
  - Old: `/api/v1/queues/` with `X-Tenant` header
  - New: `/api/v1/tenants/{tenant_slug}/queues/`
- **Backward compatibility**: `X-Tenant` header still supported but no longer required
- **Middleware updated**: Tenant resolution now prioritizes URL path over headers
- **Public endpoints** remain unchanged: `/api/v1/auth/`, `/api/v1/health/`
- **Documentation updated**: All examples in [docs/API.md](docs/API.md) and [backend/README.md](backend/README.md) reflect new structure

#### Migration Guide
```bash
# Before
curl http://localhost:8000/api/v1/queues/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "X-Tenant: demo-bank"

# After (recommended)
curl http://localhost:8000/api/v1/tenants/demo-bank/queues/ \
  -H "Authorization: Token YOUR_TOKEN"

# Still works (backward compatible)
curl http://localhost:8000/api/v1/tenants/demo-bank/queues/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "X-Tenant: demo-bank"
```

## [Unreleased] - 2025-10-02

### Added

#### New Django Apps
- **customers**: Gestion des clients avec préférences de notification
- **notifications**: Système de templates et d'envoi multi-canal (SMS, Email, WhatsApp, Push)
- **feedback**: Collection de feedbacks CSAT et NPS
- **displays**: Gestion des écrans d'affichage et bornes interactives

#### New Models
- `Site` - Sites physiques (agences) avec géolocalisation
- `Customer` - Profils clients avec préférences de notification
- `NotificationTemplate` - Templates de notification personnalisables par événement et canal
- `Notification` - Historique des notifications envoyées
- `Feedback` - Feedbacks clients avec scores CSAT (1-5) et NPS (0-10)
- `Display` - Écrans d'affichage (principal, guichet, salle d'attente)
- `Kiosk` - Bornes interactives d'enregistrement

#### Enhanced Models
- `Queue` - Ajout du champ `site` (FK vers Site)
- `Ticket` - Ajout du champ `customer` (FK vers Customer)
- `Appointment` - Ajout des champs `customer` et `agent`

#### RBAC & Permissions System
- **Scopes**: Système de permissions basé sur des scopes granulaires
  - `read:queue`, `write:queue`, `manage:queue`
  - `read:ticket`, `write:ticket`, `manage:ticket`
  - `read:agent`, `manage:agent`
  - `read:customer`, `write:customer`
  - `read:reports`, `manage:settings`, `send:notification`, `read:feedback`
- **Mappings rôle → scopes**:
  - Admin: tous les scopes
  - Manager: la plupart des scopes (pas manage:settings)
  - Agent: scopes lecture/écriture limités
- **Permission classes**: `IsTenantMember`, `HasScope`, `HasAnyScope`, `IsAgent`, `IsManager`

#### Queue Business Logic
- **QueueService** ([apps/queues/services.py](backend/apps/queues/services.py)):
  - `get_next_ticket()` - Récupération selon algorithme (FIFO, Priority, SLA)
  - `call_next(agent, queue)` - Agent appelle le prochain ticket
  - `start_service(ticket)` - Démarre le service d'un ticket appelé
  - `close_ticket(ticket, agent)` - Clôture un ticket
  - `transfer_ticket(ticket, target_queue)` - Transfert inter-files
  - `mark_no_show(ticket, agent)` - Marque un ticket comme no-show
  - `pause_ticket(ticket)` / `resume_ticket(ticket)` - Pause/reprise
  - `get_queue_stats(queue)` - Statistiques temps réel

#### New API Endpoints

**Agent Actions:**
- `POST /api/v1/agents/call-next/` - Appeler le prochain ticket
  ```json
  {"queue_id": "uuid"}
  ```
- `POST /api/v1/agents/set-status/` - Changer le statut agent
  ```json
  {"status": "available|busy|paused"}
  ```

**Ticket Actions:**
- `POST /api/v1/tickets/{id}/start_service/` - Démarrer le service
- `POST /api/v1/tickets/{id}/close/` - Clôturer
- `POST /api/v1/tickets/{id}/transfer/` - Transférer
  ```json
  {"target_queue_id": "uuid", "reason": "..."}
  ```
- `POST /api/v1/tickets/{id}/mark_no_show/` - Marquer no-show
- `POST /api/v1/tickets/{id}/pause/` - Mettre en pause
  ```json
  {"reason": "..."}
  ```
- `POST /api/v1/tickets/{id}/resume/` - Reprendre

#### Algorithm Implementations
- **FIFO**: Premier arrivé, premier servi
- **Priority**: Tri par priorité descendante, puis FIFO
- **SLA**: Tickets dépassant le SLA en premier, puis priorité, puis FIFO

#### Real-time Features
- Broadcasting WebSocket pour tous les changements d'état de tickets
- Notifications temps réel des changements de statut d'agent
- Événements: `ticket.created`, `ticket.called`, `ticket.service_started`, `ticket.transferred`, `ticket.closed`, `ticket.paused`, `ticket.resumed`, `ticket.no_show`

### Changed
- Permissions des ViewSets: Ajout de `IsTenantMember` partout
- `AgentStatusViewSet`: Utilise maintenant les nouvelles permissions RBAC
- `TicketViewSet`: Toutes les actions utilisent `QueueService` pour la logique métier
- Settings: Ajout des nouvelles apps dans `INSTALLED_APPS`

### Fixed
- Validation des transitions d'état de tickets
- Libération automatique de l'agent lors de la clôture/no-show
- Vérification qu'un agent n'a pas déjà un ticket actif avant d'en appeler un nouveau

### Technical
- Django migrations créées pour tous les nouveaux modèles
- Respect de l'isolation tenant sur tous les nouveaux modèles
- Indexes ajoutés sur les champs fréquemment interrogés (status, dates)
- Unique constraints pour éviter les doublons

## Conformité au Cahier des Charges

**Avant cette mise à jour**: ~35-40% de conformité
**Après cette mise à jour**: ~65-70% de conformité

### Reste à faire (pour MVP):
1. Restructuration URL API (tenant-scoped)
2. Workers Celery pour notifications (SMS/Email/WhatsApp)
3. Intégrations externes (Twilio, SendGrid)
4. Analytics et reporting temps réel
5. Audit logging complet
6. OAuth2/JWT avec scopes
7. Row Level Security PostgreSQL

---
*Généré le 2025-10-02*
