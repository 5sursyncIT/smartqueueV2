# 🚀 Guide de démarrage rapide - SmartQueue

## Prérequis

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (en cours d'exécution)
- Redis 7+ (en cours d'exécution)

## Démarrage en 3 minutes ⚡

### 1. Backend Django

```bash
# Terminal 1
cd backend
. .venv/bin/activate
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py runserver
```

✅ Backend disponible sur : http://localhost:8000

### 2. Back Office Next.js

```bash
# Terminal 2
cd back_office
npm run dev
```

✅ Back office disponible sur : http://localhost:3000

### 3. Se connecter

Ouvrez votre navigateur : http://localhost:3000

**Compte de démonstration** :
- Email : `admin@demo-bank.com`
- Password : `admin123`

## 🔍 Vérification rapide

### Backend est opérationnel ?
```bash
curl http://localhost:8000/api/v1/health/
```

Réponse attendue : `{"status":"ok"}`

### Créer un tenant de démo
```bash
cd backend
. .venv/bin/activate
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev \
  python manage.py create_tenant \
  --name "Demo Bank" --slug demo-bank \
  --admin-email admin@demo-bank.com --admin-password admin123 \
  --with-demo-data
```

## 📝 Services requis

### PostgreSQL
```bash
# Vérifier si PostgreSQL tourne
sudo systemctl status postgresql

# Ou avec Docker
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=smartqueue \
  -e POSTGRES_USER=smartqueue \
  -e POSTGRES_DB=smartqueue \
  --name smartqueue-postgres \
  postgres:14
```

### Redis
```bash
# Vérifier si Redis tourne
redis-cli ping

# Ou avec Docker
docker run -d -p 6379:6379 \
  --name smartqueue-redis \
  redis:7
```

## 🎯 Navigation dans le Back Office

Selon votre rôle, vous verrez :

### Super-admin
- Tenants
- Facturation
- Quotas & Plans
- + toutes les sections Admin et Manager

### Admin
- Sites
- Services
- Agents
- Intégrations
- Templates
- + toutes les sections Manager

### Manager
- Dashboard (supervision temps réel)
- Rapports (analytics)
- Équipe

## 🐛 Troubleshooting

### Erreur CORS
Si vous voyez une erreur CORS dans la console du navigateur :
- ✅ Vérifiez que `CORS_ALLOW_CREDENTIALS = True` dans `backend/smartqueue_backend/settings/base.py`
- ✅ Redémarrez le serveur Django

### Erreur "Network Error"
- Vérifiez que le backend tourne sur http://localhost:8000
- Vérifiez le fichier `.env.local` dans `back_office/`

### "Module not found"
```bash
cd back_office
npm install
```

### "No module named apps"
```bash
cd backend
. .venv/bin/activate
pip install -r requirements.txt
```

## 📚 Documentation

- [CLAUDE.md](CLAUDE.md) - Guide complet du projet
- [BACKOFFICE_PLAN.md](BACKOFFICE_PLAN.md) - Plan de développement
- [BACKOFFICE_STATUS.md](BACKOFFICE_STATUS.md) - Status actuel
- [backend/README.md](backend/README.md) - Documentation backend
- [back_office/README.md](back_office/README.md) - Documentation front-end

## 🔗 URLs utiles

- Backend API : http://localhost:8000/api/v1/
- API Schema : http://localhost:8000/api/schema/
- Django Admin : http://localhost:8000/admin/
- Back Office : http://localhost:3000

---

**Bon développement ! 🎉**
