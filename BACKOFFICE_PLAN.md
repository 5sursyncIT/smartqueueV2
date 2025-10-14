# Plan de développement du Back Office SmartQueue

## 📋 Vue d'ensemble

Le back office SmartQueue est une application web destinée aux **Admins tenant** et **Managers** pour :
- Superviser les files d'attente en temps réel
- Gérer la configuration des sites, services, files et agents
- Consulter les analytics et rapports
- Configurer les notifications et intégrations
- Gérer les clients et le feedback

## 🎯 Objectifs Phase 1

### Fonctionnalités prioritaires
1. **Authentification & Multi-tenant**
   - Login avec JWT
   - Sélection de tenant (si l'utilisateur appartient à plusieurs)
   - Gestion des sessions
   - Refresh token automatique

2. **Dashboard temps réel**
   - Vue d'ensemble par site
   - Statistiques clés (tickets en attente, agents actifs, temps d'attente moyen)
   - Graphiques de tendances (aujourd'hui vs hier)
   - Alertes si seuils dépassés

3. **Gestion des files d'attente**
   - Liste des queues par site
   - Création/édition/désactivation de queues
   - Configuration de l'algorithme (FIFO, Priorité, SLA)
   - Monitoring des tickets en temps réel

4. **Gestion des services**
   - CRUD des services
   - Configuration SLA par service
   - Association services ↔ sites

5. **Gestion des agents**
   - Liste des agents par site
   - Création/invitation d'agents
   - Assignation aux services (skills)
   - Vue de l'activité en temps réel (statut, ticket en cours)

6. **Monitoring des tickets**
   - Liste des tickets actifs avec filtres
   - Historique des tickets
   - Actions manuelles (transfert, clôture forcée)

## 🏗️ Architecture technique

### Stack retenue
- **Framework** : Next.js 14 (App Router)
- **Language** : TypeScript 5
- **UI Components** : shadcn/ui + Tailwind CSS
- **State Management** :
  - TanStack Query (server state, cache, real-time sync)
  - Zustand (client state léger)
- **Forms** : React Hook Form + Zod validation
- **Charts** : Recharts
- **Real-time** : WebSocket client (reconnexion automatique)
- **Auth** : JWT avec refresh token

### Structure du projet
```
back_office/
├── app/                           # Next.js 14 App Router
│   ├── (auth)/                   # Routes publiques (login)
│   │   └── login/page.tsx
│   ├── (dashboard)/              # Routes protégées
│   │   ├── layout.tsx           # Layout avec sidebar
│   │   ├── page.tsx             # Dashboard principal
│   │   ├── queues/
│   │   │   ├── page.tsx         # Liste des files
│   │   │   ├── [id]/page.tsx   # Détail d'une file
│   │   │   └── new/page.tsx    # Créer une file
│   │   ├── services/
│   │   ├── agents/
│   │   ├── tickets/
│   │   ├── analytics/
│   │   └── settings/
│   ├── api/                     # API routes (si besoin)
│   └── layout.tsx               # Root layout
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── dashboard/               # Composants dashboard
│   ├── forms/                   # Form components
│   ├── tables/                  # Data tables
│   └── charts/                  # Chart components
├── lib/
│   ├── api/                     # API client (axios + interceptors)
│   ├── auth/                    # Auth helpers
│   ├── hooks/                   # Custom React hooks
│   ├── types/                   # TypeScript types
│   ├── utils/                   # Utilities
│   └── websocket/               # WebSocket client
├── public/
├── styles/
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 🔐 Authentification & Sécurité

### Flow d'authentification
1. **Login** : `POST /api/v1/users/jwt/token/`
   - Body : `{ email, password }`
   - Response : `{ access, refresh, user: { email, tenants: [...] } }`

2. **Token storage**
   - `accessToken` : httpOnly cookie (secure)
   - `refreshToken` : httpOnly cookie (secure)
   - User info : localStorage (non sensible)

3. **Refresh automatique**
   - Interceptor axios détecte 401
   - Appel `POST /api/v1/users/jwt/refresh/`
   - Retry de la requête originale

4. **Logout** : `POST /api/v1/users/jwt/blacklist/`
   - Révoque le refresh token
   - Clear cookies et localStorage

### Headers requis
```typescript
Authorization: Bearer <access_token>
X-Tenant: <tenant_slug>  // Optionnel si dans URL
```

## 📊 Dashboard - Composants clés

### Widgets principaux
1. **StatCard** - Carte de statistique
   - Nombre de tickets en attente
   - Agents actifs / total
   - Temps d'attente moyen
   - Tickets traités aujourd'hui

2. **QueueOverview** - Vue des files
   - Liste des queues avec statut
   - Nombre de tickets par queue
   - Temps d'attente estimé

3. **AgentActivity** - Activité des agents
   - Liste des agents avec statut
   - Ticket en cours
   - Durée depuis dernier appel

4. **TrendChart** - Graphique de tendance
   - Évolution des tickets (aujourd'hui)
   - Comparaison avec hier
   - Temps d'attente au fil de la journée

5. **AlertsList** - Alertes actives
   - SLA proche d'être dépassé
   - Queues surchargées
   - Agents inactifs depuis longtemps

### WebSocket events à écouter
```typescript
// Canal : queue.<queue_id>
{
  type: 'ticket.created',
  data: { ticket: {...} }
}
{
  type: 'ticket.called',
  data: { ticket: {...}, agent: {...} }
}
{
  type: 'ticket.closed',
  data: { ticket: {...} }
}

// Canal : agent.<agent_id>
{
  type: 'agent.status_changed',
  data: { agent: {...}, old_status, new_status }
}
```

## 🔧 Gestion des files d'attente

### Liste des queues
- **Endpoint** : `GET /api/v1/tenants/{tenant_slug}/queues/`
- **Filtres** : site, service, status (active/paused)
- **Colonnes** :
  - Nom
  - Site
  - Service
  - Algorithme
  - Tickets en attente
  - Temps d'attente moyen
  - Statut (active/paused)
  - Actions (voir détails, éditer, pause/reprendre)

### Formulaire de création/édition
```typescript
interface QueueFormData {
  name: string;
  site_id: string;
  service_id: string;
  algorithm: 'fifo' | 'priority' | 'sla';
  max_capacity?: number;
  is_active: boolean;
}
```

### Détail d'une queue
- Stats en temps réel (WebSocket)
- Liste des tickets actifs
- Graphique de l'affluence sur la journée
- Actions : pause, reprendre, transférer tous les tickets

## 👥 Gestion des agents

### Liste des agents
- **Endpoint** : `GET /api/v1/tenants/{tenant_slug}/agents/`
- **Colonnes** :
  - Nom
  - Email
  - Statut (available, busy, break, offline)
  - Services (skills)
  - Ticket en cours
  - Dernière activité
  - Actions

### Statuts d'agent
```typescript
enum AgentStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  BREAK = 'break',
  OFFLINE = 'offline'
}
```

### Invitation d'agent
1. Formulaire : email, prénom, nom, site, services
2. `POST /api/v1/tenants/{tenant_slug}/agents/invite/`
3. Email d'invitation envoyé avec lien d'activation

## 🎫 Monitoring des tickets

### Liste avec filtres avancés
- **Endpoint** : `GET /api/v1/tenants/{tenant_slug}/tickets/`
- **Filtres** :
  - Statut (waiting, called, in_service, etc.)
  - Queue
  - Agent
  - Période (aujourd'hui, 7j, 30j, custom)
  - Recherche par numéro/nom client

### Actions sur tickets
- Voir détail
- Transférer vers une autre queue
- Clôturer manuellement
- Voir historique des changements de statut

## 📈 Analytics (Phase 2)

### Rapports disponibles
1. **Temps d'attente** : `GET /api/v1/reports/wait-times/`
2. **Performance agents** : `GET /api/v1/reports/agent-performance/`
3. **Statistiques par queue** : `GET /api/v1/reports/queue-stats/`
4. **Satisfaction client** : `GET /api/v1/reports/satisfaction/`

### Filtres communs
```typescript
interface ReportFilters {
  start_date: string;    // ISO 8601
  end_date: string;
  site_id?: string;
  service_id?: string;
  agent_id?: string;
}
```

## 🚀 Plan d'implémentation

### Sprint 1 (Setup & Auth) - 3 jours
- [ ] Initialiser Next.js 14 + TypeScript + Tailwind
- [ ] Configurer shadcn/ui
- [ ] Setup TanStack Query + Zustand
- [ ] Créer API client avec interceptors
- [ ] Implémenter login/logout + JWT refresh
- [ ] Créer layout avec sidebar/header
- [ ] Page de sélection de tenant

### Sprint 2 (Dashboard) - 4 jours
- [ ] StatCards avec données en temps réel
- [ ] QueueOverview component
- [ ] AgentActivity component
- [ ] TrendChart avec Recharts
- [ ] WebSocket client avec reconnexion
- [ ] Intégration WebSocket → Dashboard

### Sprint 3 (Gestion Queues) - 3 jours
- [ ] Liste des queues avec DataTable
- [ ] Formulaire création/édition queue
- [ ] Page détail queue avec stats temps réel
- [ ] Actions : pause/reprendre queue

### Sprint 4 (Gestion Services & Sites) - 2 jours
- [ ] CRUD services
- [ ] CRUD sites
- [ ] Association services ↔ sites

### Sprint 5 (Gestion Agents) - 3 jours
- [ ] Liste agents avec filtres
- [ ] Formulaire invitation agent
- [ ] Édition profil agent (skills)
- [ ] Vue activité temps réel

### Sprint 6 (Tickets) - 3 jours
- [ ] Liste tickets avec filtres avancés
- [ ] Page détail ticket + historique
- [ ] Actions : transfert, clôture
- [ ] Export CSV

### Sprint 7 (Analytics) - 4 jours
- [ ] Page rapports avec filtres
- [ ] Graphiques wait times
- [ ] Graphiques performance agents
- [ ] Graphiques satisfaction
- [ ] Export PDF/Excel

### Sprint 8 (Polish & Tests) - 3 jours
- [ ] Tests unitaires (Vitest)
- [ ] Tests E2E (Playwright)
- [ ] Optimisations performance
- [ ] Documentation utilisateur
- [ ] Déploiement (Vercel/Netlify)

## 📦 Dépendances principales

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.51.0",
    "zustand": "^4.5.0",
    "axios": "^1.7.0",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",
    "recharts": "^2.12.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.417.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.14.0",
    "eslint": "^9.7.0",
    "prettier": "^3.3.0",
    "vitest": "^2.0.0",
    "@playwright/test": "^1.45.0"
  }
}
```

## 🎨 Design System

### Palette de couleurs
- **Primary** : Blue-600 (#2563eb) - Actions principales
- **Success** : Green-600 (#16a34a) - États positifs
- **Warning** : Orange-500 (#f97316) - Alertes
- **Danger** : Red-600 (#dc2626) - Erreurs/suppression
- **Neutral** : Gray-100 à Gray-900 - Textes et fonds

### Composants shadcn/ui à installer
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add form
```

## 🔗 Endpoints Backend à utiliser

### Authentication
- `POST /api/v1/users/jwt/token/` - Login
- `POST /api/v1/users/jwt/refresh/` - Refresh token
- `POST /api/v1/users/jwt/blacklist/` - Logout
- `GET /api/v1/users/jwt/me/` - Current user info

### Tenants
- `GET /api/v1/tenants/` - Liste des tenants (pour l'utilisateur)
- `GET /api/v1/tenants/{slug}/` - Détail d'un tenant

### Queues
- `GET /api/v1/tenants/{tenant_slug}/queues/`
- `POST /api/v1/tenants/{tenant_slug}/queues/`
- `GET /api/v1/tenants/{tenant_slug}/queues/{id}/`
- `PUT /api/v1/tenants/{tenant_slug}/queues/{id}/`
- `DELETE /api/v1/tenants/{tenant_slug}/queues/{id}/`
- `GET /api/v1/tenants/{tenant_slug}/queues/{id}/stats/`

### Services
- `GET /api/v1/tenants/{tenant_slug}/services/`
- `POST /api/v1/tenants/{tenant_slug}/services/`
- `GET /api/v1/tenants/{tenant_slug}/services/{id}/`
- `PUT /api/v1/tenants/{tenant_slug}/services/{id}/`

### Sites
- `GET /api/v1/tenants/{tenant_slug}/sites/`
- `POST /api/v1/tenants/{tenant_slug}/sites/`
- `GET /api/v1/tenants/{tenant_slug}/sites/{id}/`
- `PUT /api/v1/tenants/{tenant_slug}/sites/{id}/`

### Agents
- `GET /api/v1/tenants/{tenant_slug}/agents/`
- `POST /api/v1/tenants/{tenant_slug}/agents/invite/`
- `GET /api/v1/tenants/{tenant_slug}/agents/{id}/`
- `PUT /api/v1/tenants/{tenant_slug}/agents/{id}/`
- `POST /api/v1/tenants/{tenant_slug}/agents/{id}/set-status/`

### Tickets
- `GET /api/v1/tenants/{tenant_slug}/tickets/`
- `GET /api/v1/tenants/{tenant_slug}/tickets/{id}/`
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/transfer/`
- `POST /api/v1/tenants/{tenant_slug}/tickets/{id}/close/`

### Analytics
- `GET /api/v1/reports/wait-times/`
- `GET /api/v1/reports/agent-performance/`
- `GET /api/v1/reports/queue-stats/`
- `GET /api/v1/reports/satisfaction/`

## 🔄 État global de l'application

### Zustand stores

```typescript
// authStore.ts
interface AuthState {
  user: User | null;
  tenants: Tenant[];
  currentTenant: Tenant | null;
  isAuthenticated: boolean;
  login: (credentials) => Promise<void>;
  logout: () => Promise<void>;
  selectTenant: (tenant: Tenant) => void;
}

// uiStore.ts
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme) => void;
}

// websocketStore.ts
interface WebSocketState {
  isConnected: boolean;
  subscriptions: Map<string, Set<Function>>;
  connect: () => void;
  disconnect: () => void;
  subscribe: (channel, callback) => () => void;
}
```

## 📝 Notes importantes

1. **CORS** : S'assurer que le backend autorise `http://localhost:3000` en développement
2. **WebSocket URL** : `ws://localhost:8000/ws/` (dev) ou `wss://api.smartqueue.app/ws/` (prod)
3. **Tenant context** : Toujours passer le `tenant_slug` dans l'URL des requêtes API
4. **Error handling** : Interceptor axios pour gérer les erreurs 401, 403, 500
5. **Loading states** : Utiliser TanStack Query `isLoading`, `isError`, `isFetching`
6. **Optimistic updates** : Pour les actions rapides (toggle status, etc.)

## ✅ Checklist avant déploiement

- [ ] Variables d'environnement configurées (`.env.production`)
- [ ] Build optimisé (`next build`)
- [ ] Tests passent (unit + E2E)
- [ ] Lighthouse score > 90
- [ ] Pas de console.log en production
- [ ] Error boundaries sur toutes les pages
- [ ] Analytics configurés (Vercel Analytics ou autre)
- [ ] CORS configuré correctement sur le backend
- [ ] Rate limiting sur les endpoints sensibles
- [ ] Documentation déployée (Storybook ou autre)

---

**Prochaine étape** : Initialiser le projet Next.js et commencer Sprint 1
