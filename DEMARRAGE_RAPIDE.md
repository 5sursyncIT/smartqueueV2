# 🚀 Démarrage Rapide - SmartQueue (Sans PostgreSQL)

## Configuration actuelle

✅ **Base de données** : SQLite (pas besoin de PostgreSQL)
✅ **Backend** : Django avec JWT
✅ **Front-end** : Next.js 14
✅ **Tenant demo** : Créé avec données de test

---

## 🎯 Démarrer en 2 minutes

### Terminal 1 - Backend Django

```bash
cd backend
./start_dev.sh
```

Ou manuellement :
```bash
cd backend
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev
python manage.py runserver
```

✅ Backend disponible sur : **http://localhost:8000**

---

### Terminal 2 - Front-end Next.js

```bash
cd back_office
npm run dev
```

✅ Back office disponible sur : **http://localhost:3000**

---

## 🔑 Se connecter

Ouvrez votre navigateur : **http://localhost:3000**

**Compte de démonstration** :
- **Email** : `admin@demo-bank.com`
- **Password** : `admin123`

---

## ✅ Vérifications

### 1. Backend fonctionne ?

```bash
curl http://localhost:8000/api/v1/health/
```

Réponse attendue : `{"status":"ok"}`

### 2. Test endpoint JWT

```bash
curl -X POST http://localhost:8000/api/v1/auth/jwt/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo-bank.com","password":"admin123"}'
```

Réponse attendue :
```json
{
  "access": "eyJ0eXAi...",
  "refresh": "eyJ0eXAi..."
}
```

### 3. Front-end charge ?

- Ouvrez http://localhost:3000
- Page de login doit s'afficher
- Aucune erreur CORS dans la console

---

## 🎭 Rôles disponibles

Après connexion, selon votre rôle :

### 👤 Admin (compte demo)
**Menu visible** :
- Sites
- Services
- Agents
- Intégrations
- Templates
- Dashboard
- Rapports
- Équipe

**Redirecti

on après login** : `/sites`

### 👁️ Manager
- Dashboard
- Rapports
- Équipe

### 🔧 Super-admin
- Tenants
- Facturation
- Quotas
- + tout le reste

---

## 🛠️ Configuration actuelle

### Backend (`.env`)
```env
DATABASE_URL=sqlite:///./smartqueue.db  ← SQLite au lieu de PostgreSQL
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
REDIS_URL=redis://localhost:6379/0
CORS_ALLOW_CREDENTIALS=True  ← Ajouté pour le front-end
```

### Front-end (`back_office/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## 🐛 Troubleshooting

### Erreur "Network Error" ou CORS

**Cause** : Backend n'est pas démarré ou CORS mal configuré

**Solution** :
1. Vérifiez que le backend tourne sur http://localhost:8000
2. Vérifiez `CORS_ALLOW_CREDENTIALS = True` dans `backend/smartqueue_backend/settings/base.py`
3. Redémarrez le backend

---

### Erreur 404 sur `/api/v1/users/jwt/token/`

**Cause** : L'URL JWT est `/api/v1/auth/jwt/token/` et non `/users/jwt/token/`

**Solution** : Déjà corrigé dans `back_office/lib/api/auth.ts`

Si l'erreur persiste :
1. Arrêtez Next.js (Ctrl+C)
2. Relancez : `npm run dev`
3. Rechargez la page (F5)

---

### Erreur "Invalid credentials"

**Cause** : Le tenant demo n'existe pas

**Solution** : Recréez le tenant
```bash
cd backend
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev
python manage.py create_tenant \
  --name "Demo Bank" --slug demo-bank \
  --admin-email admin@demo-bank.com \
  --admin-password admin123 \
  --with-demo-data
```

---

### Base de données vide

**Cause** : Migrations pas appliquées

**Solution** :
```bash
cd backend
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev
python manage.py migrate
```

---

## 📝 Données de démo créées

Le tenant `demo-bank` contient :

### Sites
- Agence Principale

### Services
- Compte Bancaire
- Crédit
- Conseil

### Files d'attente
- 3 queues (une par service)

### Agents
- 3 agents de test

### Clients
- 2 clients de test

### Templates de notification
- 2 templates (SMS, Email)

---

## 🔄 Passer à PostgreSQL (optionnel)

Si vous voulez utiliser PostgreSQL plus tard :

### 1. Installer et démarrer PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# macOS avec Homebrew
brew install postgresql
brew services start postgresql
```

### 2. Créer la base de données

```bash
sudo -u postgres psql
CREATE DATABASE smartqueue;
CREATE USER smartqueue WITH PASSWORD 'smartqueue';
GRANT ALL PRIVILEGES ON DATABASE smartqueue TO smartqueue;
\q
```

### 3. Modifier `.env`

```env
DATABASE_URL=postgres://smartqueue:smartqueue@localhost:5432/smartqueue
```

### 4. Appliquer les migrations

```bash
cd backend
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev
python manage.py migrate
python manage.py create_tenant --name "Demo Bank" --slug demo-bank --admin-email admin@demo-bank.com --admin-password admin123 --with-demo-data
```

---

## 📚 Documentation complète

- **[CLAUDE.md](CLAUDE.md)** - Guide du projet
- **[BACKOFFICE_PLAN.md](BACKOFFICE_PLAN.md)** - Plan de développement
- **[BACKOFFICE_STATUS.md](BACKOFFICE_STATUS.md)** - Status + roadmap
- **[RESUME_SESSION.md](RESUME_SESSION.md)** - Récapitulatif
- **[FIXES.md](FIXES.md)** - Corrections appliquées

---

## ✨ Prochaines étapes

Une fois connecté :

1. **Explorer les menus** selon votre rôle
2. **Dashboard** : Voir les stats (placeholders pour l'instant)
3. **Sites** : Page admin (à implémenter)
4. **Développement** : Suivre [BACKOFFICE_PLAN.md](BACKOFFICE_PLAN.md)

---

**Date** : 13 Octobre 2025
**Version** : 0.1.0 (MVP Foundation)
**Status** : ✅ Backend + Front-end opérationnels avec SQLite
