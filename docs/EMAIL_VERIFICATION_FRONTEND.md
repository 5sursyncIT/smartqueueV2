# Vérification Email - Interface Frontend

## 🎯 Vue d'ensemble

Système de vérification email complet avec code à 6 chiffres pour le back office SmartQueue.

## 📁 Structure des fichiers

### Hooks

**`back_office/lib/hooks/use-email-verification.ts`**
```typescript
export function useEmailVerification() {
  const { loading, error, verifyEmail, resendVerification, checkVerificationStatus } = useEmailVerification();
}
```

**Méthodes disponibles:**
- `verifyEmail(email, code)` - Vérifie le code à 6 chiffres
- `resendVerification(email)` - Renvoie un nouveau code
- `checkVerificationStatus(email)` - Vérifie si l'email est déjà vérifié

### Composants

**`back_office/components/auth/verification-code-input.tsx`**

Composant de saisie de code à 6 chiffres avec:
- 6 inputs séparés (un par chiffre)
- Auto-focus sur l'input suivant après saisie
- Support du paste (coller le code complet)
- Navigation au clavier (Backspace, flèches gauche/droite)
- Validation en temps réel
- État d'erreur visuel

**Props:**
```typescript
interface VerificationCodeInputProps {
  value: string;              // Code actuel (0-6 chiffres)
  onChange: (value: string) => void;  // Callback de changement
  onComplete?: (value: string) => void;  // Appelé quand les 6 chiffres sont saisis
  length?: number;            // Nombre de chiffres (défaut: 6)
  disabled?: boolean;         // Désactiver l'input
  error?: boolean;            // Afficher l'état d'erreur
}
```

### Pages

**`back_office/app/(auth)/verify-email/page.tsx`**

Page de vérification email avec:
- ✅ Input de code à 6 chiffres
- ✅ Timer de 15 minutes (countdown)
- ✅ Bouton "Renvoyer le code" avec cooldown de 60 secondes
- ✅ Gestion des erreurs
- ✅ État de succès avec redirection automatique
- ✅ Lien retour vers la page de connexion

**URL:** `/verify-email?email=user@example.com`

## 🎨 Interface utilisateur

### Page de vérification

```
┌─────────────────────────────────────────┐
│          📧 Icône Mail                  │
│                                         │
│    Vérification de votre email         │
│                                         │
│  Un code de vérification à 6 chiffres  │
│  a été envoyé à user@example.com       │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ⏱️ Code valide pendant encore 14:32│ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐       │
│  │ 3│ │ 4│ │ 9│ │ 8│ │ 0│ │ 1│       │
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘       │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Vérifier le code              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Vous n'avez pas reçu le code ?        │
│  [Renvoyer le code (60s)]              │
│                                         │
│  ← Retour à la connexion               │
└─────────────────────────────────────────┘
```

### État de succès

```
┌─────────────────────────────────────────┐
│          ✅ Icône Check                 │
│                                         │
│        Email vérifié !                  │
│                                         │
│  Votre adresse email a été vérifiée    │
│  avec succès                            │
│                                         │
│  Vous allez être redirigé vers la      │
│  page de connexion...                  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Aller à la connexion          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 🔄 Flux utilisateur

### 1. Création de compte
```
Super-admin crée utilisateur
  → Backend génère code 6 chiffres
  → Email envoyé avec le code
  → Utilisateur reçoit email
```

### 2. Vérification
```
Utilisateur accède à /verify-email?email=user@example.com
  → Saisit le code à 6 chiffres
  → Clique "Vérifier le code"
  → Backend vérifie le code
  → Si valide: email_verified = true
  → Redirection vers /login
```

### 3. Renvoi du code
```
Utilisateur clique "Renvoyer le code"
  → Cooldown de 60 secondes
  → Backend génère nouveau code
  → Email envoyé
  → Timer d'expiration réinitialisé (15 min)
```

## 🎯 Fonctionnalités

### ✅ Implémenté

1. **Input de code intelligent**
   - Auto-focus sur chiffre suivant
   - Support du paste (Ctrl+V)
   - Navigation clavier
   - Validation en temps réel

2. **Timer d'expiration**
   - Countdown de 15 minutes
   - Affichage temps restant (MM:SS)
   - Message "Code expiré" quand terminé

3. **Cooldown de renvoi**
   - 60 secondes entre chaque renvoi
   - Bouton désactivé pendant cooldown
   - Affichage du temps restant

4. **Gestion des erreurs**
   - Code invalide
   - Code expiré
   - Email non trouvé
   - Affichage visuel des erreurs

5. **État de succès**
   - Icône de validation
   - Message de succès
   - Redirection automatique (2s)
   - Bouton manuel vers login

6. **UX optimisée**
   - Responsive design
   - Loading states
   - Disabled states
   - Toast notifications
   - Retour à la connexion

## 🧪 Test manuel

### Prérequis
```bash
# Backend en cours d'exécution
cd backend
. .venv/bin/activate
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev daphne -p 8000 smartqueue_backend.asgi:application

# Frontend en cours d'exécution
cd back_office
npm run dev  # Port 3001
```

### Scénario de test complet

**1. Créer un utilisateur test et obtenir le code:**
```bash
. backend/.venv/bin/activate && \
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python -c "
import os, sys, django
sys.path.insert(0, 'backend')
os.chdir('backend')
django.setup()

from apps.users.models import User
from apps.users.email_verification import send_verification_email

# Supprimer l'ancien utilisateur
User.objects.filter(email='test-frontend@example.com').delete()

# Créer nouvel utilisateur
user = User(
    email='test-frontend@example.com',
    first_name='Test',
    last_name='Frontend',
    is_active=True,
    email_verified=False,
)
user.set_password('test123')
user.save()

# Envoyer email et obtenir le code
success = send_verification_email(user)
user.refresh_from_db()

print(f'✅ Utilisateur créé: {user.email}')
print(f'🔑 CODE: {user.email_verification_token}')
print(f'📧 Email envoyé: {success}')
print(f'\n🌐 URL de test:')
print(f'http://localhost:3001/verify-email?email={user.email}')
"
```

**2. Accéder à la page de vérification:**
```
http://localhost:3001/verify-email?email=test-frontend@example.com
```

**3. Tests à effectuer:**

✅ **Saisie du code:**
- [ ] Taper les 6 chiffres un par un → Auto-focus fonctionne
- [ ] Coller le code (Ctrl+V) → Tous les chiffres se remplissent
- [ ] Naviguer avec Backspace → Retour en arrière
- [ ] Naviguer avec flèches → Déplacement entre inputs

✅ **Vérification:**
- [ ] Saisir code correct → "Email vérifié !" + redirection
- [ ] Saisir code incorrect → Message d'erreur
- [ ] Attendre 15 minutes → Message "Code expiré"

✅ **Renvoi du code:**
- [ ] Cliquer "Renvoyer le code" → Nouveau code généré
- [ ] Vérifier cooldown 60s → Bouton désactivé
- [ ] Timer réinitialisé → 15:00 à nouveau

✅ **Navigation:**
- [ ] Cliquer "Retour à la connexion" → /login
- [ ] Après succès → Redirection automatique vers /login

## 🔗 API Endpoints utilisés

### POST /api/v1/auth/verify-email/
```json
// Request
{
  "email": "user@example.com",
  "code": "123456"
}

// Response (succès)
{
  "success": true,
  "message": "Email vérifié avec succès"
}

// Response (erreur)
{
  "success": false,
  "message": "Code invalide ou expiré"
}
```

### POST /api/v1/auth/resend-verification/
```json
// Request
{
  "email": "user@example.com"
}

// Response
{
  "success": true,
  "message": "Email de vérification renvoyé avec succès"
}
```

### GET /api/v1/auth/check-verification/?email=user@example.com
```json
// Response
{
  "email_verified": true,
  "email_verified_at": "2025-10-29T22:22:32.683413+00:00"
}
```

## 📱 Responsive Design

### Desktop (>768px)
- Inputs de code: 48px × 56px
- Espacement: 8px entre inputs
- Card: max-width 448px

### Mobile (<768px)
- Inputs de code: 40px × 48px
- Espacement: 4px entre inputs
- Card: full width avec padding

## 🎨 Thème et couleurs

### États des inputs
- **Vide:** Bordure grise (border-gray-300)
- **Rempli:** Bordure bleue + fond bleu clair (border-blue-500, bg-blue-50)
- **Focus:** Ring bleu (ring-blue-500)
- **Erreur:** Bordure rouge + ring rouge (border-red-500, ring-red-500)
- **Désactivé:** Opacité 50% + fond gris (opacity-50, bg-gray-50)

### Icônes
- Mail: Bleu (text-blue-600)
- Check: Vert (text-green-600)
- Clock: Défaut
- Alert: Rouge (destructive)

## 🔧 Configuration

### Timeouts
```typescript
// Timer d'expiration du code
const EXPIRATION_MINUTES = 15;

// Cooldown de renvoi
const RESEND_COOLDOWN_SECONDS = 60;

// Délai de redirection après succès
const REDIRECT_DELAY_MS = 2000;
```

### Validation
```typescript
// Longueur du code
const CODE_LENGTH = 6;

// Format accepté
const CODE_PATTERN = /^\d{6}$/;  // Exactement 6 chiffres
```

## 📝 Notes d'implémentation

1. **Suspense boundary:** La page utilise `<Suspense>` pour gérer le chargement de `useSearchParams()`

2. **State management:** État local avec `useState` (pas de zustand nécessaire)

3. **Timer effects:** Deux `useEffect` séparés:
   - Un pour le countdown d'expiration (15 min)
   - Un pour le cooldown de renvoi (60s)

4. **Auto-completion:** Le formulaire se soumet automatiquement quand les 6 chiffres sont saisis

5. **Accessibilité:**
   - Labels ARIA sur les inputs
   - Gestion du focus
   - États visuels clairs

## 🚀 Prochaines étapes

### Frontend (Optionnel)
- [ ] Animations de transition entre états
- [ ] Son de succès/erreur
- [ ] Mode sombre (dark mode)
- [ ] Tests unitaires (Jest + React Testing Library)
- [ ] Tests E2E (Playwright)

### Backend (Déjà implémenté)
- ✅ Génération code 6 chiffres
- ✅ Email HTML avec code
- ✅ Validation avec expiration 15 min
- ✅ Cooldown renvoi 1 minute
- ✅ Usage unique du code

## 📚 Documentation liée

- [EMAIL_VERIFICATION_CODE_6_DIGITS.md](./EMAIL_VERIFICATION_CODE_6_DIGITS.md) - Implémentation backend
- [EMAIL_VERIFICATION_IMPLEMENTATION.md](./EMAIL_VERIFICATION_IMPLEMENTATION.md) - Version originale (lien)
- [EMAIL_FIX_REPORT.md](./EMAIL_FIX_REPORT.md) - Corrections système email

## ✅ Checklist de déploiement

Avant de déployer en production:

- [ ] Tests manuels complets effectués
- [ ] Vérifier configuration SMTP production
- [ ] Tester avec vrais emails (pas de test@example.com)
- [ ] Vérifier responsive sur mobile
- [ ] Tester avec différents navigateurs
- [ ] Vérifier logs backend (pas d'erreurs)
- [ ] Documentation à jour
- [ ] Variables d'environnement configurées
