# SmartQueue Monorepo

SmartQueue est une plateforme multi-tenant de gestion des files d’attente et des rendez-vous. Le monorepo regroupe :
- Backend (Django + DRF + Channels + Celery) — fonctionnel
- Frontend (Next.js) — en cours d’amorçage
- Mobile (React Native / Expo) — en cours d’amorçage

## Structure

```
smartqueue/
├── backend/        # API REST, WebSockets (ASGI), tâches Celery
├── frontend/       # Application web Next.js
├── mobile/         # Application mobile Expo
├── docs/           # Documentation technique et produit
├── docker-compose.dev.yml
├── Makefile
└── .env.example
```

## Configuration requise

- Python 3.11+
- Docker & Docker Compose (pour Redis/Postgres en dev si besoin)
- Redis (local ou via Docker)
- Node 18+ (pour frontend et mobile)
- Expo CLI (pour mobile)

## Instructions d’installation (Backend)

1) Créer votre fichier d’environnement
```bash
cp .env.example .env
```
Pour un démarrage rapide en local :
```
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev
DATABASE_URL=sqlite:///./backend/smartqueue.db
REDIS_URL=redis://localhost:6379/0
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

2) Installer et préparer le backend
```bash
make install-backend
make migrate
```

3) Démarrer le serveur de développement
```bash
make run-backend
```
WebSockets : pour activer Daphne (ASGI) et vérifier Redis, utilisez :
```bash
./start_with_websocket.sh
```

Services complémentaires :
- Workers Celery : `make celery`
- Scheduler Celery Beat : `make beat`
- Stack Docker dev (Redis/Postgres) : `make docker-up`

## Guide d’utilisation

- API : `http://localhost:8000/api/v1`
- WebSocket : `ws://localhost:8000/ws`
- Multi-tenant : ajoutez l’en-tête `X-TENANT` (ex. `demo-bank`) à vos requêtes.

Exemple de requête (avec tenant) :
```bash
curl -H "X-TENANT: demo-bank" http://localhost:8000/api/v1/
```

Voir aussi :
- `docs/DISPLAY_WEBSOCKET.md` pour les écrans d’affichage connectés en temps réel
- `docs/*` (API/backend/frontend/mobile) pour les devbooks et spécifications

## Informations de contribution

- Format & Lint : `make format-backend` et `make lint-backend`
- Types : `make mypy`
- Tests : `make test-backend`
- Conventions de commit : utilisez des messages clairs (ex. `feat`, `fix`, `chore`, `docs`).
- Hygiène du dépôt : ne commitez pas les bases `.db` ni les Markdown hors `README.md`, `CHANGELOG.md` et `docs/` (règles en place dans `.gitignore`).
- Secrets : ne commitez jamais `.env` ni des clés API; utilisez des variables d’environnement.

## Notes

- La configuration Channels + Celery est opérationnelle (voir `docker-compose.dev.yml`).
- Les apps centrales (tenants, users, queues, tickets, displays, notifications) sont déjà intégrées au backend.
- Le frontend et le mobile réutilisent les contrats REST/WebSocket exposés par le backend.
