# SmartQueue Monorepo

Ce dépôt centralise les trois piliers de SmartQueue : **backend** (Django/DRF/Channels/Celery), **frontend** (Next.js) et **mobile** (React Native/Expo). Pour l'instant, seul le backend possède un squelette fonctionnel. Les autres projets seront amorcés dans des itérations ultérieures.

## Structure

```
smartqueue/
├── backend/        # Projet Django (API REST + WebSockets + tâches Celery)
├── frontend/       # (à venir) Application web Next.js 14
├── mobile/         # (à venir) Application mobile Expo
├── docs/           # Documentation produit & devbooks
├── docker-compose.dev.yml
├── Makefile
└── .env.example
```

## Prérequis

- Python 3.11+
- Docker & Docker Compose
- Poetry facultatif (nous utilisons pip + pyproject standard)

## Mise en route backend

```bash
cp .env.example .env
make install-backend
make migrate
make run-backend
```

Services complémentaires :

- Lancer les workers Celery : `make celery`
- Lancer Celery Beat : `make beat`
- Lancer toute la stack via Docker : `make docker-up`

L'API sera disponible sur `http://localhost:8000/api/v1/`. Pensez à ajouter l'en-tête `X-TENANT` (ex. `demo-bank`) pour cibler un tenant.

## Tests & qualité

```bash
make lint-backend
make format-backend
make mypy
make test-backend
```

## Étapes suivantes

1. Alimenter le backend avec des migrations initiales (`python manage.py makemigrations`).
2. Étirer la surface API (auth JWT/OAuth, supervision, notifications, etc.).
3. Initialiser les projets `frontend/` et `mobile/` en réutilisant les contrats REST/WebSocket du backend.

## Notes

- Les entités centrales (tenants, utilisateurs, files, tickets) sont prêtes à être migrées.
- La configuration Channels + Celery est opérationnelle via `docker-compose.dev.yml`.
- Les devbooks situés dans `docs/` détaillent les spécifications produit et techniques.
