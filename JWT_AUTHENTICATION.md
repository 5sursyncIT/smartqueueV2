# 🔐 JWT Authentication - SmartQueue

**Date**: 2025-10-12
**Statut**: Implémenté ✅

---

## Vue d'Ensemble

SmartQueue utilise maintenant **JWT (JSON Web Tokens)** pour l'authentification avec :
- ✅ Access tokens (1 heure)
- ✅ Refresh tokens (7 jours) avec rotation
- ✅ Token blacklist (révocation)
- ✅ Scopes et tenants dans le payload
- ✅ Backward compatibility avec Token auth

---

## 🚀 Endpoints JWT

### 1. Obtenir un Token (Login)

```http
POST /api/v1/auth/jwt/token/
Content-Type: application/json

{
  "email": "admin@demo-bank.com",
  "password": "admin123"
}
```

**Réponse** :
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "access_expires_at": "2025-10-12T11:00:00Z",
  "refresh_expires_at": "2025-10-19T10:00:00Z"
}
```

### 2. Rafraîchir le Token

```http
POST /api/v1/auth/jwt/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Réponse** :
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",  // Nouveau access token
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."   // Nouveau refresh token (rotation)
}
```

### 3. Vérifier un Token

```http
POST /api/v1/auth/jwt/verify/
Content-Type: application/json

{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Réponse** :
```json
{}  // 200 OK si valide, 401 si invalide
```

### 4. Révoquer un Token (Logout)

```http
POST /api/v1/auth/jwt/blacklist/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Réponse** :
```json
{
  "message": "Token révoqué avec succès"
}
```

### 5. Informations Utilisateur

```http
GET /api/v1/auth/jwt/me/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Réponse** :
```json
{
  "id": "uuid",
  "email": "admin@demo-bank.com",
  "first_name": "Admin",
  "last_name": "User",
  "phone_number": "+221771234567",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-10-12T10:00:00Z"
}
```

---

## 📦 Payload JWT

Le JWT contient des **claims personnalisés** :

### Access Token Payload

```json
{
  "token_type": "access",
  "exp": 1697115600,
  "iat": 1697112000,
  "jti": "abc123...",
  "user_id": "uuid-user",

  // Claims personnalisés
  "email": "admin@demo-bank.com",
  "first_name": "Admin",
  "last_name": "User",

  // Tenants et permissions
  "tenants": [
    {
      "tenant_id": "uuid-tenant",
      "tenant_slug": "demo-bank",
      "tenant_name": "Demo Bank",
      "role": "admin",
      "scopes": [
        "read:queue", "write:queue", "manage:queue",
        "read:ticket", "write:ticket", "manage:ticket",
        "read:agent", "manage:agent",
        "read:customer", "write:customer",
        "read:reports", "manage:settings",
        "send:notification", "read:feedback"
      ]
    }
  ],

  // Pour compatibilité (premier tenant)
  "current_tenant": "demo-bank",
  "current_role": "admin",
  "scopes": ["read:queue", "write:queue", ...]
}
```

---

## 🔧 Utilisation dans le Code Frontend

### JavaScript/TypeScript

```typescript
// 1. Login et stockage du token
async function login(email: string, password: string) {
  const response = await fetch('http://localhost:8000/api/v1/auth/jwt/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  // Stocker les tokens (localStorage ou secure cookie)
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);

  return data;
}

// 2. Utiliser le token dans les requêtes
async function fetchQueues(tenantSlug: string) {
  const accessToken = localStorage.getItem('access_token');

  const response = await fetch(
    `http://localhost:8000/api/v1/tenants/${tenantSlug}/queues/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // Si 401, rafraîchir le token
  if (response.status === 401) {
    await refreshToken();
    return fetchQueues(tenantSlug); // Réessayer
  }

  return response.json();
}

// 3. Rafraîchir le token automatiquement
async function refreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');

  const response = await fetch('http://localhost:8000/api/v1/auth/jwt/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken })
  });

  const data = await response.json();

  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);

  return data;
}

// 4. Logout
async function logout() {
  const refreshToken = localStorage.getItem('refresh_token');

  await fetch('http://localhost:8000/api/v1/auth/jwt/blacklist/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken })
  });

  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// 5. Décoder le JWT pour lire les claims
function getTokenPayload(token: string) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(base64));

  return payload;
}

// Exemple: Vérifier les scopes
const accessToken = localStorage.getItem('access_token');
const payload = getTokenPayload(accessToken);

if (payload.scopes.includes('manage:queue')) {
  // L'utilisateur peut gérer les files
  console.log('Permission granted');
}

// Lister tous les tenants accessibles
payload.tenants.forEach(tenant => {
  console.log(`${tenant.tenant_name} (${tenant.role})`);
});
```

### Python (tests, scripts)

```python
import requests
import jwt

# 1. Login
response = requests.post(
    'http://localhost:8000/api/v1/auth/jwt/token/',
    json={'email': 'admin@demo-bank.com', 'password': 'admin123'}
)
tokens = response.json()

access_token = tokens['access']
refresh_token = tokens['refresh']

# 2. Utiliser le token
headers = {'Authorization': f'Bearer {access_token}'}
response = requests.get(
    'http://localhost:8000/api/v1/tenants/demo-bank/queues/',
    headers=headers
)
queues = response.json()

# 3. Décoder le JWT (sans vérification)
payload = jwt.decode(access_token, options={"verify_signature": False})
print(payload['email'])
print(payload['tenants'])
print(payload['scopes'])
```

---

## ⚙️ Configuration

### Settings Django

```python
# settings/base.py

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),      # Durée access token
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),      # Durée refresh token
    "ROTATE_REFRESH_TOKENS": True,                    # Rotation automatique
    "BLACKLIST_AFTER_ROTATION": True,                 # Blacklist ancien token
    "UPDATE_LAST_LOGIN": True,                        # Mettre à jour last_login
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "TOKEN_OBTAIN_SERIALIZER": "apps.users.serializers.CustomTokenObtainPairSerializer",
}
```

### Authentication Classes

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",  # JWT (priorité)
        "rest_framework.authentication.SessionAuthentication",         # Admin Django
        "rest_framework.authentication.TokenAuthentication",          # Backward compat
    ],
}
```

---

## 🔄 Migration Token → JWT

### Pour les Clients Existants

**L'ancien système Token reste fonctionnel** pour assurer la compatibilité :

```http
# Ancien système (toujours supporté)
GET /api/v1/tenants/demo-bank/queues/
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

**Nouveau système (recommandé)** :

```http
GET /api/v1/tenants/demo-bank/queues/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

### Migration Progressive

1. **Phase 1 (actuelle)** : Les deux systèmes coexistent
2. **Phase 2** : Les nouveaux clients utilisent JWT uniquement
3. **Phase 3** : Dépréciation Token auth (prévoir 6 mois)
4. **Phase 4** : Suppression Token auth

---

## 🛡️ Sécurité

### Bonnes Pratiques

1. **Stocker les tokens de manière sécurisée**
   - ✅ Cookie httpOnly + secure (recommandé)
   - ⚠️ localStorage (OK pour SPA, risque XSS)
   - ❌ Jamais dans l'URL ou paramètres GET

2. **Rotation des refresh tokens**
   - Activée par défaut
   - Ancien refresh token automatiquement blacklisté

3. **Expiration courte des access tokens**
   - 1 heure par défaut
   - Réduit la fenêtre d'exploitation

4. **HTTPS obligatoire en production**
   - Tokens transmis en clair sur HTTP = vulnérable

5. **Logout propre**
   - Toujours blacklister le refresh token

### Vérification des Scopes

Le backend vérifie automatiquement les scopes avec les permissions :

```python
from apps.core.permissions import HasScope, Scopes

class QueueViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasScope(Scopes.MANAGE_QUEUE)]
```

Le JWT contient les scopes, pas besoin de requête DB supplémentaire !

---

## 🧪 Tests

### Test avec curl

```bash
# 1. Obtenir le token
curl -X POST http://localhost:8000/api/v1/auth/jwt/token/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo-bank.com", "password": "admin123"}'

# Réponse (copier le access token)
# {"access": "eyJ0eXAi...", "refresh": "eyJ0eXAi..."}

# 2. Utiliser le token
curl http://localhost:8000/api/v1/tenants/demo-bank/queues/ \
  -H "Authorization: Bearer eyJ0eXAi..."

# 3. Rafraîchir
curl -X POST http://localhost:8000/api/v1/auth/jwt/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "eyJ0eXAi..."}'

# 4. Logout (blacklist)
curl -X POST http://localhost:8000/api/v1/auth/jwt/blacklist/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "eyJ0eXAi..."}'
```

### Test avec Python (pytest)

```python
import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_jwt_authentication(user, admin_membership):
    """Test l'authentification JWT complète."""
    client = APIClient()

    # Login
    response = client.post('/api/v1/auth/jwt/token/', {
        'email': user.email,
        'password': 'testpass123'
    })
    assert response.status_code == 200

    tokens = response.json()
    assert 'access' in tokens
    assert 'refresh' in tokens

    # Utiliser le token
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
    response = client.get('/api/v1/auth/jwt/me/')
    assert response.status_code == 200
    assert response.json()['email'] == user.email
```

---

## 📚 Références

- **djangorestframework-simplejwt** : https://django-rest-framework-simplejwt.readthedocs.io/
- **JWT.io** : https://jwt.io/ (décoder/vérifier tokens)
- **RFC 7519** : https://tools.ietf.org/html/rfc7519 (spécification JWT)

---

## 🐛 Troubleshooting

### Erreur "Token is invalid or expired"

```python
# Le token a expiré (access: 1h, refresh: 7j)
# Solution: Rafraîchir avec /api/v1/auth/jwt/refresh/
```

### Erreur "Token is blacklisted"

```python
# Le refresh token a été révoqué (logout ou rotation)
# Solution: Faire un nouveau login avec /api/v1/auth/jwt/token/
```

### Erreur "User not found"

```python
# Le user_id dans le JWT n'existe plus
# Solution: Nouveau login requis
```

### Token trop volumineux (>4KB)

```python
# Si l'utilisateur a beaucoup de tenants (>20)
# Solution: Ne pas inclure tous les tenants dans le token,
# utiliser un endpoint séparé pour récupérer la liste
```

---

*Documentation générée le 2025-10-12*
