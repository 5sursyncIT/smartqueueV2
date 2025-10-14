# Corrections appliquées - SmartQueue

## ✅ Problème 1 : Erreur CORS

**Symptôme** :
```
Raison : « true » attendu dans l'en-tête CORS « Access-Control-Allow-Credentials »
```

**Solution** :
Ajout de `CORS_ALLOW_CREDENTIALS = True` dans `backend/smartqueue_backend/settings/base.py`

```python
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3000", "http://127.0.0.1:3000"])
CORS_ALLOW_CREDENTIALS = True  # ✅ Ajouté
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["http://localhost:3000"])
```

## ✅ Problème 2 : Endpoint JWT 404

**Symptôme** :
```
POST http://localhost:8000/api/v1/users/jwt/token/
[HTTP/1.1 404 Not Found]
```

**Cause** :
Les endpoints JWT sont montés sur `/api/v1/auth/jwt/...` et non `/api/v1/users/jwt/...`

**Structure des URLs** :
```
/api/v1/
├── auth/                    # apps.users.urls (public_urlpatterns)
│   ├── jwt/token/          ✅ Login
│   ├── jwt/refresh/        ✅ Refresh token
│   ├── jwt/verify/         ✅ Verify token
│   ├── jwt/blacklist/      ✅ Logout
│   └── jwt/me/             ✅ Current user info
├── tenants/                # Gestion des tenants
└── tenants/{slug}/         # Routes tenant-scoped
    ├── queues/
    ├── tickets/
    ├── sites/
    └── services/
```

**Solution** :
Correction dans `back_office/lib/api/auth.ts` :

```typescript
// ❌ Avant
const response = await apiClient.post<AuthTokens>('/users/jwt/token/', credentials);

// ✅ Après
const response = await apiClient.post<AuthTokens>('/auth/jwt/token/', credentials);
```

Toutes les routes JWT corrigées :
- `/auth/jwt/token/` - Login
- `/auth/jwt/refresh/` - Refresh
- `/auth/jwt/verify/` - Verify
- `/auth/jwt/blacklist/` - Logout
- `/auth/jwt/me/` - Current user

## 🧪 Test de la correction

### 1. Vérifier l'endpoint
```bash
curl -X POST http://localhost:8000/api/v1/auth/jwt/token/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo-bank.com", "password": "admin123"}'
```

**Réponse attendue** :
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 2. Tester depuis le front-end

1. Démarrer le backend :
```bash
cd backend
. .venv/bin/activate
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py runserver
```

2. Démarrer le front-end :
```bash
cd back_office
npm run dev
```

3. Ouvrir http://localhost:3000
4. Se connecter avec `admin@demo-bank.com` / `admin123`
5. ✅ Devrait rediriger vers `/sites` (rôle admin)

## 📝 Checklist de vérification

- [x] CORS configuré avec `CORS_ALLOW_CREDENTIALS = True`
- [x] Endpoints JWT corrigés vers `/api/v1/auth/jwt/*`
- [x] Backend démarre sans erreur
- [x] Front-end démarre sans erreur
- [ ] Login fonctionne (à tester par l'utilisateur)
- [ ] Redirection selon le rôle fonctionne
- [ ] Sidebar affiche les menus corrects

## 🔍 Si ça ne marche toujours pas

### Erreur CORS persiste
```bash
# Redémarrer complètement le backend
cd backend
. .venv/bin/activate
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py runserver
```

### Erreur 404 persiste
Vérifier que le fichier a bien été sauvegardé :
```bash
cd back_office
grep "'/auth/jwt/token/'" lib/api/auth.ts
# Devrait afficher : const response = await apiClient.post<AuthTokens>('/auth/jwt/token/', credentials);
```

### Erreur "Invalid credentials"
Vérifier que le tenant demo existe :
```bash
cd backend
. .venv/bin/activate
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev \
  python manage.py create_tenant \
  --name "Demo Bank" --slug demo-bank \
  --admin-email admin@demo-bank.com --admin-password admin123 \
  --with-demo-data
```

---

**Date** : 13 Octobre 2025
**Status** : ✅ Corrections appliquées, en attente de test utilisateur
