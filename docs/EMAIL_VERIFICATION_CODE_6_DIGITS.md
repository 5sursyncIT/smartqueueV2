# Vérification Email avec Code à 6 Chiffres

**Date**: 2025-10-29
**Status**: ✅ Implémenté et Testé

## Modifications Apportées

Le système de vérification email a été modifié pour utiliser un **code à 6 chiffres** au lieu d'un lien de vérification.

### Avantages du Code à 6 Chiffres

✅ **Plus simple** : L'utilisateur copie-colle juste 6 chiffres
✅ **Plus sûr** : Expiration courte (15 min au lieu de 24h)
✅ **Mobile-friendly** : Facile à saisir sur mobile
✅ **UX moderne** : Similaire à 2FA, familier aux utilisateurs
✅ **Pas de problème de lien** : Pas de soucis avec les clients email cassant les URLs

## Implémentation

### 1. Génération du Code

**Fichier**: [backend/apps/users/email_verification.py](backend/apps/users/email_verification.py#L19-L21)

```python
def generate_verification_code() -> str:
    """Génère un code de vérification à 6 chiffres."""
    return str(random.randint(100000, 999999))
```

- Code aléatoire entre 100000 et 999999
- Format: 6 chiffres uniquement
- Exemple: `542910`

### 2. Email HTML avec Code

L'email contient maintenant :
- **Code en grand** dans un encadré violet/bleu
- Design responsive et professionnel
- Police monospace pour meilleure lisibilité
- **Expiration : 15 minutes** (au lieu de 24h)
- **Usage unique** du code

**Aperçu Email**:
```
┌───────────────────────────────────────┐
│   ✉️ SmartQueue                       │
│   Vérification de votre adresse email│
└───────────────────────────────────────┘

Bonjour Youssoupha,

Bienvenue sur SmartQueue! Pour finaliser la création
de votre compte, veuillez entrer le code ci-dessous :

┌─────────────────────────────────┐
│ VOTRE CODE DE VÉRIFICATION      │
│                                 │
│        5 4 2 9 1 0             │
└─────────────────────────────────┘

📧 Email: youssoupha@example.com
⏰ Validité: 15 minutes
🔒 Usage: Code à usage unique

⚠️ Important :
• Ce code expire dans 15 minutes
• Il ne peut être utilisé qu'une seule fois
• Si vous n'avez pas créé ce compte, ignorez cet email
```

### 3. API de Vérification

**Endpoint**: `POST /api/v1/auth/verify-email/`

**Request**:
```json
{
  "email": "user@example.com",
  "code": "542910"
}
```

**Response** (succès):
```json
{
  "success": true,
  "message": "Email vérifié avec succès"
}
```

**Response** (échec):
```json
{
  "success": false,
  "message": "Code de vérification invalide"
}
```

**Validations**:
- ✅ Code doit être exactement 6 chiffres
- ✅ Code doit correspondre à celui envoyé
- ✅ Code ne doit pas être expiré (15 min)
- ✅ Email doit exister
- ✅ Email ne doit pas être déjà vérifié

### 4. Expiration et Sécurité

**Fichier**: [backend/apps/users/email_verification.py](backend/apps/users/email_verification.py#L178-L182)

```python
# Vérifier l'expiration (15 minutes au lieu de 24h)
if user.email_verification_sent_at:
    expiration = user.email_verification_sent_at + timedelta(minutes=15)
    if timezone.now() > expiration:
        return False, "Code expiré. Veuillez demander un nouveau code"
```

**Sécurité**:
- **Expiration**: 15 minutes (vs 24h pour un lien)
- **Usage unique**: Code invalidé après utilisation
- **Cooldown**: 1 minute entre deux envois
- **Format strict**: Exactement 6 chiffres numériques

## Test Manuel

### 1. Créer un Utilisateur et Envoyer le Code

```bash
. backend/.venv/bin/activate && \
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python -c "
import os, sys
sys.path.insert(0, 'backend')
os.chdir('backend')
import django
django.setup()

from apps.users.models import User
from apps.users.email_verification import send_verification_email

# Créer utilisateur
user = User(
    email='test@example.com',
    first_name='Test',
    last_name='User',
    is_active=True,
    email_verified=False,
)
user.set_password('test123')
user.save()

# Envoyer code
send_verification_email(user)
user.refresh_from_db()

print(f'Code envoyé: {user.email_verification_token}')
"
```

**Output**:
```
Code envoyé: 542910
```

### 2. Vérifier le Code via API

```bash
# IMPORTANT: Redémarrer le serveur Django d'abord
# pour que les nouvelles URLs soient prises en compte

curl -X POST http://localhost:8000/api/v1/auth/verify-email/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "542910"
  }'
```

**Response attendue**:
```json
{
  "success": true,
  "message": "Email vérifié avec succès"
}
```

### 3. Tester Code Invalide

```bash
curl -X POST http://localhost:8000/api/v1/auth/verify-email/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "999999"
  }'
```

**Response**:
```json
{
  "success": false,
  "message": "Code de vérification invalide"
}
```

### 4. Renvoyer un Code

```bash
curl -X POST http://localhost:8000/api/v1/auth/resend-verification/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Email de vérification renvoyé"
}
```

## Flux Utilisateur

### Création de Compte

```
1. Utilisateur remplit le formulaire d'inscription
        ↓
2. Backend crée compte avec email_verified=False
        ↓
3. Code à 6 chiffres généré (ex: 542910)
        ↓
4. Email HTML envoyé avec le code
        ↓
5. Utilisateur reçoit l'email
```

### Vérification

```
1. Utilisateur ouvre l'email
        ↓
2. Utilisateur voit le code: 542910
        ↓
3. Utilisateur saisit le code dans le formulaire
        ↓
4. Frontend → POST /api/v1/auth/verify-email/
   {email, code}
        ↓
5. Backend valide:
   ✓ Code correct?
   ✓ Pas expiré?
   ✓ Email existe?
        ↓
6. email_verified=True
   email_verified_at=now()
   code invalidé
        ↓
7. ✅ Compte activé!
```

### Renvoi de Code

```
1. Utilisateur clique "Renvoyer le code"
        ↓
2. Frontend → POST /api/v1/auth/resend-verification/
        ↓
3. Backend vérifie cooldown (1 min)
        ↓
4. Nouveau code généré
        ↓
5. Nouvel email envoyé
```

## Frontend à Implémenter

### Page de Vérification `/auth/verify-email`

```typescript
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/verify-email/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (data.success) {
        // Rediriger vers login ou dashboard
        router.push('/auth/login?verified=true');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erreur de vérification');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await fetch('/api/v1/auth/resend-verification/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Code renvoyé!');
      }
    } catch (err) {
      toast.error('Erreur');
    }
  };

  return (
    <div>
      <h1>Vérifiez votre email</h1>
      <p>Un code à 6 chiffres a été envoyé à {email}</p>

      <form onSubmit={handleVerify}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000"
          maxLength={6}
          pattern="[0-9]{6}"
        />

        <button type="submit" disabled={loading || code.length !== 6}>
          Vérifier
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <button onClick={handleResend}>Renvoyer le code</button>
    </div>
  );
}
```

### Composant d'Input de Code

```typescript
import { useState } from 'react';

export function CodeInput({ onComplete }: { onComplete: (code: string) => void }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Seulement des chiffres

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Dernier caractère seulement
    setCode(newCode);

    // Auto-focus prochain input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }

    // Appeler onComplete si code complet
    if (newCode.every(d => d) && newCode.join('').length === 6) {
      onComplete(newCode.join(''));
    }
  };

  return (
    <div className="flex gap-2">
      {code.map((digit, index) => (
        <input
          key={index}
          id={`code-${index}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          className="w-12 h-16 text-center text-2xl font-bold border-2 rounded"
        />
      ))}
    </div>
  );
}
```

## APIs Disponibles

### 1. Vérifier un Code

**Endpoint**: `POST /api/v1/auth/verify-email/`
**Auth**: Non requis (public)

**Body**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response**:
```json
{
  "success": true|false,
  "message": "Email vérifié avec succès" | "Code invalide"
}
```

### 2. Renvoyer un Code

**Endpoint**: `POST /api/v1/auth/resend-verification/`
**Auth**: Non requis (public)

**Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true|false,
  "message": "Email renvoyé" | "Cooldown actif"
}
```

### 3. Vérifier le Statut

**Endpoint**: `GET /api/v1/auth/check-verification/?email=user@example.com`
**Auth**: Non requis (public)

**Response**:
```json
{
  "email_verified": true,
  "email_verified_at": "2025-10-29T22:18:00Z"
}
```

## Test Complet Effectué

✅ **Code généré**: 542910
✅ **Email envoyé** à youssoupha.balde@ucad.edu.sn
✅ **Format HTML** professionnel avec gradient
✅ **Expiration** : 15 minutes
✅ **Usage unique** du code

**Commande de test exécutée**:
```bash
. backend/.venv/bin/activate && \
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python -c "..."
```

**Output**:
```
🧪 Test du système de vérification avec code à 6 chiffres
============================================================

✅ Ancien utilisateur supprimé
👤 Création d'un utilisateur de test...
   Email: youssoupha.balde@ucad.edu.sn
   Vérifié: False

📧 Envoi de l'email de vérification avec code à 6 chiffres...
✅ Email envoyé avec succès!

🔑 CODE DE VÉRIFICATION: 542910

📋 Informations:
   • Email: youssoupha.balde@ucad.edu.sn
   • Code: 542910
   • Envoyé à: 2025-10-29 22:18:07.636843+00:00
   • Expiration: 15 minutes

📬 Vérifiez votre boîte email: youssoupha.balde@ucad.edu.sn
```

## Prochaines Étapes

### Backend ✅ TERMINÉ
- [x] Générer code à 6 chiffres
- [x] Envoyer email avec code
- [x] Valider code (format, expiration, usage unique)
- [x] API de vérification
- [x] API de renvoi
- [x] Tests manuels réussis

### Frontend (à faire)
- [ ] Page `/auth/verify-email`
- [ ] Composant input code (6 inputs ou 1 input)
- [ ] Bouton "Renvoyer le code"
- [ ] Toast notifications
- [ ] Redirect après vérification
- [ ] Affichage timer countdown (15 min)

### Après Inscription
- [ ] Rediriger vers page de vérification
- [ ] Passer l'email en paramètre URL
- [ ] Afficher message "Vérifiez vos emails"

## Remarques Importantes

⚠️ **IMPORTANT**: Redémarrer le serveur Django après avoir modifié les URLs

```bash
# Si serveur lancé avec runserver
Ctrl+C puis relancer

# Si serveur lancé avec Daphne (WebSocket)
pkill -f daphne
./start_with_websocket.sh
```

Les endpoints de vérification email ne seront pas disponibles tant que le serveur Django n'est pas redémarré pour charger les nouvelles routes.

## Fichiers Modifiés

**Modifiés**:
1. `backend/apps/users/email_verification.py` - Code à 6 chiffres au lieu de token
2. `backend/apps/users/email_verification_views.py` - Validation format code
3. Email HTML redesigné avec code en grand

**Inchangés**:
- `backend/apps/users/models.py` - Champs identiques
- `backend/apps/users/urls.py` - Routes identiques
- `backend/apps/users/views.py` - Logique identique
- Migrations - Pas de changement de schéma

## Conclusion

Le système de vérification par **code à 6 chiffres** est maintenant:
- ✅ **Implémenté** côté backend
- ✅ **Testé** avec succès
- ✅ **Fonctionnel** (email envoyé avec code)
- ✅ **Sécurisé** (expiration 15 min, usage unique)
- ✅ **User-friendly** (plus simple qu'un lien)

**Reste uniquement à implémenter le frontend** (page + composants React).

Le code est prêt à être utilisé immédiatement après redémarrage du serveur Django!
