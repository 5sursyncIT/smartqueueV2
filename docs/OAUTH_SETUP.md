# Guide de Configuration OAuth 2.0 - SmartQueue

## 📋 Vue d'ensemble

Ce guide explique comment configurer l'authentification OAuth 2.0 avec Google et Microsoft pour SmartQueue.

---

## 🔑 Configuration Google OAuth

### 1. Créer un Projet Google Cloud

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet ou sélectionner un projet existant
3. Activer l'API "Google+ API" (ou "People API")

### 2. Créer des Identifiants OAuth 2.0

1. **Navigation** : APIs & Services → Credentials
2. **Créer** : Click "Create Credentials" → "OAuth client ID"
3. **Type d'application** : Web application
4. **Nom** : SmartQueue Web Client
5. **Origines JavaScript autorisées** :
   ```
   http://localhost:3000
   http://localhost:3001
   http://localhost:3002
   https://votre-domaine.com
   ```
6. **URIs de redirection autorisées** :
   ```
   http://localhost:3000/auth/google/callback
   https://votre-domaine.com/auth/google/callback
   ```
7. **Créer** : Copier le Client ID et Client Secret

### 3. Configurer l'Écran de Consentement

1. **Navigation** : OAuth consent screen
2. **Type d'utilisateur** : External
3. **Informations de l'application** :
   - Nom : SmartQueue
   - Email de support : support@votre-domaine.com
   - Logo (optionnel)
4. **Scopes** : Ajouter les scopes suivants :
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

### 4. Variables d'Environnement

Ajouter dans `.env` :
```bash
# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=votre_client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=votre_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

---

## 🪟 Configuration Microsoft OAuth (Azure AD)

### 1. Créer une Application Azure AD

1. Aller sur [Azure Portal](https://portal.azure.com/)
2. **Navigation** : Azure Active Directory → App registrations
3. **Créer** : New registration
4. **Nom** : SmartQueue
5. **Types de comptes pris en charge** :
   - Comptes dans cet annuaire organisationnel uniquement (Single tenant)
   - OU Comptes dans n'importe quel annuaire organisationnel (Multi-tenant)
   - OU Comptes dans n'importe quel annuaire organisationnel et comptes personnels Microsoft

6. **URI de redirection** :
   - Plateforme : Web
   - URI : `http://localhost:3000/auth/microsoft/callback`

### 2. Configurer les Permissions API

1. **Navigation** : API permissions
2. **Ajouter** : Add a permission → Microsoft Graph
3. **Type** : Delegated permissions
4. **Permissions** :
   - `openid`
   - `profile`
   - `email`
   - `User.Read`
5. **Grant admin consent** (si vous êtes admin)

### 3. Créer un Client Secret

1. **Navigation** : Certificates & secrets
2. **Nouveau secret** : New client secret
3. **Description** : SmartQueue Backend
4. **Expiration** : 24 mois (ou jamais)
5. **Copier** : Copier la valeur du secret (ne sera plus affichée)

### 4. Récupérer les IDs

1. **Application (client) ID** : Visible sur la page "Overview"
2. **Directory (tenant) ID** : Visible sur la page "Overview"

### 5. Variables d'Environnement

Ajouter dans `.env` :
```bash
# Microsoft OAuth
MICROSOFT_OAUTH_CLIENT_ID=votre_application_id
MICROSOFT_OAUTH_CLIENT_SECRET=votre_client_secret
MICROSOFT_OAUTH_TENANT_ID=votre_tenant_id  # ou "common" pour multi-tenant
MICROSOFT_OAUTH_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback
```

---

## 🚀 Utilisation de l'API OAuth

### Endpoints Disponibles

```
POST   /api/v1/auth/oauth/get-url/        # Obtenir l'URL d'autorisation
POST   /api/v1/auth/oauth/callback/       # Callback après autorisation
GET    /api/v1/auth/oauth/connections/    # Lister les connexions OAuth
DELETE /api/v1/auth/oauth/disconnect/{provider}/  # Déconnecter un compte
POST   /api/v1/auth/oauth/link/           # Lier un compte OAuth existant
```

### Flow d'Authentification

#### 1. Obtenir l'URL d'Autorisation

**Requête** :
```bash
curl -X POST http://localhost:8000/api/v1/auth/oauth/get-url/ \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "redirect_uri": "http://localhost:3000/auth/google/callback"
  }'
```

**Réponse** :
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&state=...",
  "state": "random_csrf_token_123456"
}
```

#### 2. Rediriger l'Utilisateur

Le frontend redirige l'utilisateur vers l'URL retournée. L'utilisateur s'authentifie chez Google/Microsoft.

#### 3. Callback OAuth

Après authentification, l'utilisateur est redirigé vers votre `redirect_uri` avec :
- `code` : Code d'autorisation
- `state` : Token CSRF (doit correspondre)

**Requête** :
```bash
curl -X POST http://localhost:8000/api/v1/auth/oauth/callback/ \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "code": "authorization_code_from_google",
    "state": "random_csrf_token_123456",
    "redirect_uri": "http://localhost:3000/auth/google/callback"
  }'
```

**Réponse** :
```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "created": true,  // true si nouveau compte
  "message": "Compte créé avec succès"
}
```

#### 4. Utiliser le Token JWT

```bash
curl http://localhost:8000/api/v1/... \
  -H "Authorization: Bearer jwt_access_token"
```

---

## 🔗 Lier un Compte OAuth

Pour lier un compte Google/Microsoft à un utilisateur déjà connecté :

```bash
curl -X POST http://localhost:8000/api/v1/auth/oauth/link/ \
  -H "Authorization: Bearer existing_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "microsoft",
    "code": "authorization_code",
    "state": "csrf_token",
    "redirect_uri": "http://localhost:3000/auth/microsoft/callback"
  }'
```

---

## 📊 Gérer les Connexions OAuth

### Lister les Connexions

```bash
curl http://localhost:8000/api/v1/auth/oauth/connections/ \
  -H "Authorization: Bearer jwt_token"
```

**Réponse** :
```json
[
  {
    "id": "uuid",
    "provider": "google",
    "email": "user@gmail.com",
    "avatar_url": "https://...",
    "connected_at": "2025-01-15T10:00:00Z",
    "last_used_at": "2025-01-20T14:30:00Z"
  }
]
```

### Déconnecter un Compte

```bash
curl -X DELETE http://localhost:8000/api/v1/auth/oauth/disconnect/google/ \
  -H "Authorization: Bearer jwt_token"
```

---

## 🛡️ Sécurité

### CSRF Protection (State Token)

- Chaque flow OAuth génère un token `state` unique
- Stocké en cache Redis (15 minutes)
- Usage unique (supprimé après vérification)
- Protection contre les attaques CSRF

### Chiffrement des Tokens

- Access tokens et refresh tokens chiffrés avec Fernet (AES-128)
- Stockés de manière sécurisée dans la base de données
- Déchiffrés uniquement à l'utilisation

### PKCE (Proof Key for Code Exchange)

Pour une sécurité renforcée, utilisez PKCE :

```python
from apps.users.oauth import PKCEHelper

# Générer code_verifier et code_challenge
code_verifier = PKCEHelper.generate_code_verifier()
code_challenge = PKCEHelper.generate_code_challenge(code_verifier)

# Envoyer code_challenge dans l'URL d'autorisation
# Envoyer code_verifier dans l'échange de code
```

---

## 🧪 Tests

### Test Google OAuth (Développement)

1. Obtenir l'URL :
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/oauth/get-url/ \
     -H "Content-Type: application/json" \
     -d '{"provider": "google"}'
   ```

2. Ouvrir l'URL dans le navigateur
3. S'authentifier avec Google
4. Copier le `code` depuis l'URL de callback
5. Appeler le endpoint callback avec le code

### Test Microsoft OAuth

Même procédure avec `provider: "microsoft"`

---

## 📝 Intégration Frontend (React/Next.js)

### Hook Personnalisé

```typescript
// hooks/useOAuth.ts
import { useState } from 'react';

export function useOAuth() {
  const [loading, setLoading] = useState(false);

  const loginWithProvider = async (provider: 'google' | 'microsoft') => {
    setLoading(true);

    try {
      // 1. Obtenir l'URL d'autorisation
      const response = await fetch('/api/v1/auth/oauth/get-url/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      const { url, state } = await response.json();

      // 2. Sauvegarder le state
      sessionStorage.setItem('oauth_state', state);

      // 3. Rediriger vers le provider
      window.location.href = url;
    } catch (error) {
      console.error('OAuth error:', error);
      setLoading(false);
    }
  };

  const handleCallback = async (code: string, state: string, provider: string) => {
    const savedState = sessionStorage.getItem('oauth_state');

    if (state !== savedState) {
      throw new Error('Invalid state token');
    }

    const response = await fetch('/api/v1/auth/oauth/callback/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, code, state }),
    });

    const data = await response.json();

    // Sauvegarder les tokens
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);

    return data;
  };

  return { loginWithProvider, handleCallback, loading };
}
```

### Boutons de Connexion

```tsx
import { useOAuth } from '@/hooks/useOAuth';

export function LoginButtons() {
  const { loginWithProvider, loading } = useOAuth();

  return (
    <div className="space-y-3">
      <button
        onClick={() => loginWithProvider('google')}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        <GoogleIcon />
        Continuer avec Google
      </button>

      <button
        onClick={() => loginWithProvider('microsoft')}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        <MicrosoftIcon />
        Continuer avec Microsoft
      </button>
    </div>
  );
}
```

### Page de Callback

```tsx
// app/auth/google/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOAuth } from '@/hooks/useOAuth';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleCallback } = useOAuth();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      handleCallback(code, state, 'google')
        .then(() => router.push('/dashboard'))
        .catch((error) => {
          console.error(error);
          router.push('/login?error=oauth_failed');
        });
    }
  }, [searchParams, handleCallback, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Connexion en cours...</p>
      </div>
    </div>
  );
}
```

---

## 🔧 Dépannage

### Erreur "redirect_uri_mismatch"

- Vérifier que l'URI de redirection est exactement la même dans :
  - La console Google/Azure
  - Le code frontend
  - Les variables d'environnement backend

### Erreur "invalid_client"

- Vérifier le Client ID et Client Secret
- S'assurer qu'ils sont bien configurés dans `.env`

### Erreur "access_denied"

- L'utilisateur a refusé l'autorisation
- Vérifier les scopes demandés
- S'assurer que l'application est approuvée (pour production)

### State Token Invalide

- Le token a expiré (15 min)
- Le token a déjà été utilisé
- Problème de cache Redis

---

## 📚 Ressources

- [Documentation Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Documentation Microsoft Identity Platform](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
- [RFC 6749 - OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)

---

**Version**: 1.0
**Date**: Janvier 2025
**Auteur**: Équipe SmartQueue
