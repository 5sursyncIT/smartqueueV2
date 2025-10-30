# Guide d'Implémentation de la Sécurité - SmartQueue

## 📋 Vue d'ensemble

Ce document décrit le système de sécurité complet implémenté pour SmartQueue, conforme aux meilleures pratiques pour les applications SaaS de niveau entreprise.

---

## 🔐 Fonctionnalités Implémentées

### 1. Authentification à Deux Facteurs (2FA)

#### 1.1 TOTP (Time-based One-Time Password)
- **Fichier**: `backend/apps/users/two_factor.py`
- **Fonctionnalités**:
  - Génération de secrets TOTP compatibles avec Google Authenticator, Authy, etc.
  - Génération de QR codes pour configuration facile
  - Vérification des codes avec fenêtre de tolérance (±30s)
  - Algorithme: HMAC-SHA1 (standard TOTP RFC 6238)

**Exemple d'utilisation**:
```python
from apps.users.two_factor import TOTPService

# Générer un secret
secret = TOTPService.generate_secret()

# Générer un QR code
qr_code_bytes = TOTPService.generate_qr_code(user, secret)

# Vérifier un code
is_valid = TOTPService.verify_totp_code(secret, "123456")
```

#### 1.2 SMS 2FA
- **Fichier**: `backend/apps/users/two_factor.py`
- **Fonctionnalités**:
  - Génération de codes à 6 chiffres
  - Envoi via Twilio
  - Stockage sécurisé en cache Redis (5 min)
  - Usage unique (code supprimé après vérification)

#### 1.3 Codes de Backup
- **Fichier**: `backend/apps/users/two_factor.py`
- **Fonctionnalités**:
  - Génération de 8 codes de récupération
  - Format: XXXX-XXXX-XX
  - Stockage hashé (impossible de les récupérer)
  - Usage unique

### 2. Gestion des Événements de Sécurité

#### 2.1 Modèle SecurityEvent
- **Fichier**: `backend/apps/security/models.py`
- **Types d'événements trackés**:
  - ✅ Connexions (succès/échecs)
  - ✅ Changements de mot de passe
  - ✅ Activation/désactivation 2FA
  - ✅ Verrouillage/déverrouillage de comptes
  - ✅ Permissions refusées
  - ✅ Activités suspectes
  - ✅ Exports de données
  - ✅ Tentatives d'injection SQL
  - ✅ Tentatives XSS
  - ✅ Échecs CSRF
  - ✅ Rate limiting dépassé

#### 2.2 Niveaux de Sévérité
- `low`: Événements normaux (connexion réussie)
- `medium`: Événements notables (changement de permissions)
- `high`: Événements préoccupants (tentatives de force brute)
- `critical`: Événements critiques (injection SQL détectée)

### 3. Protection contre les Attaques

#### 3.1 Blocage d'IP
- **Fichier**: `backend/apps/security/models.py`, `services.py`
- **Fonctionnalités**:
  - Blocage manuel ou automatique
  - Blocage temporaire ou permanent
  - Expiration automatique
  - Cache Redis pour performance

#### 3.2 Rate Limiting
- **Fichier**: `backend/apps/security/middleware.py`
- **Configuration**:
  - `/api/v1/auth/`: 10 req/min
  - `/api/`: 100 req/min
  - Headers de réponse: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

#### 3.3 Détection d'Attaques
- **Fichier**: `backend/apps/security/services.py`
- **Protections**:
  - ✅ Injection SQL: Patterns regex avancés
  - ✅ XSS: Détection de scripts malveillants
  - ✅ Force Brute: Blocage après 5 tentatives
  - ✅ Automatique: Blocage IP instantané si détection

### 4. Chiffrement des Données

#### 4.1 EncryptionService
- **Fichier**: `backend/apps/security/encryption.py`
- **Algorithme**: Fernet (AES-128 CBC + HMAC)
- **Fonctionnalités**:
  - Chiffrement/déchiffrement de strings
  - Chiffrement de dictionnaires (JSON)
  - Dérivation de clé via PBKDF2 (100k iterations)

**Exemple**:
```python
from apps.security.encryption import EncryptionService

# Chiffrer
encrypted = EncryptionService.encrypt("données sensibles")

# Déchiffrer
decrypted = EncryptionService.decrypt(encrypted)
```

#### 4.2 Protection PII
- **Fichier**: `backend/apps/security/encryption.py`
- **Fonctionnalités**:
  - Masquage d'emails: `j***@example.com`
  - Masquage de téléphones: `+221 ** *** **34`
  - Redaction de champs sensibles

### 5. Politiques de Mot de Passe

#### 5.1 PasswordPolicy
- **Fichier**: `backend/apps/security/models.py`
- **Règles configurables par tenant**:
  - Longueur minimale (défaut: 8)
  - Exiger majuscule
  - Exiger minuscule
  - Exiger chiffre
  - Exiger caractère spécial
  - Expiration (défaut: 90 jours)
  - Prévention de réutilisation (5 derniers)
  - Verrouillage après échecs (défaut: 5)
  - Durée de verrouillage (défaut: 30 min)
  - 2FA obligatoire pour admins
  - Timeout de session (défaut: 60 min)

#### 5.2 PasswordHistory
- Historique des 10 derniers mots de passe
- Hashés avec PBKDF2
- Empêche la réutilisation

### 6. Middlewares de Sécurité

#### 6.1 IPBlockingMiddleware
- Vérifie si l'IP est bloquée
- Retourne 403 Forbidden si bloquée
- Log l'événement

#### 6.2 RateLimitMiddleware
- Limite par endpoint et IP
- Headers de rate limit
- Blocage automatique en cas d'abus

#### 6.3 AttackDetectionMiddleware
- Scan des paramètres GET
- Scan du body POST/PUT/PATCH
- Blocage immédiat si SQL injection
- Warning si XSS

#### 6.4 SecurityHeadersMiddleware
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)
- Referrer-Policy
- Permissions-Policy

#### 6.5 LoginAttemptMiddleware
- Track les tentatives de connexion
- Réinitialise le compteur si succès
- Bloque après 5 échecs en 15 min

### 7. API de Sécurité

#### 7.1 Endpoints Disponibles

**Événements de Sécurité**:
```
GET    /api/v1/security/events/              # Liste des événements
GET    /api/v1/security/events/stats/        # Statistiques
GET    /api/v1/security/events/summary/      # Résumé des menaces
POST   /api/v1/security/events/{id}/resolve/ # Résoudre un événement
```

**IPs Bloquées**:
```
GET    /api/v1/security/blocked-ips/         # Liste des IPs
POST   /api/v1/security/blocked-ips/         # Bloquer une IP
POST   /api/v1/security/blocked-ips/{id}/unblock/ # Débloquer
```

**Politiques de Mot de Passe**:
```
GET    /api/v1/security/password-policies/   # Liste des politiques
POST   /api/v1/security/password-policies/   # Créer une politique
PUT    /api/v1/security/password-policies/{id}/ # Modifier
```

**Alertes de Sécurité**:
```
GET    /api/v1/security/alerts/              # Liste des alertes
POST   /api/v1/security/alerts/{id}/acknowledge/ # Accuser réception
```

**2FA**:
```
POST   /api/v1/security/2fa/setup_totp/      # Configurer TOTP
POST   /api/v1/security/2fa/setup_sms/       # Configurer SMS
POST   /api/v1/security/2fa/verify_and_enable/ # Vérifier et activer
POST   /api/v1/security/2fa/disable/         # Désactiver 2FA
GET    /api/v1/security/2fa/status/          # Statut 2FA
```

**Mot de Passe**:
```
POST   /api/v1/security/password/change_password/ # Changer le MDP
```

---

## 🚀 Installation

### 1. Installer les dépendances Python

```bash
cd backend
pip install -r requirements-security.txt
```

### 2. Ajouter l'app dans les settings (déjà fait)

`backend/smartqueue_backend/settings/base.py`:
```python
INSTALLED_APPS = [
    # ...
    "apps.security",  # Nouvelle app
    # ...
]
```

### 3. Configurer les middlewares (déjà fait)

```python
MIDDLEWARE = [
    # ...
    "apps.security.middleware.IPBlockingMiddleware",
    "apps.security.middleware.RateLimitMiddleware",
    "apps.security.middleware.AttackDetectionMiddleware",
    "apps.security.middleware.SecurityHeadersMiddleware",
    "apps.security.middleware.LoginAttemptMiddleware",
    # ...
]
```

### 4. Exécuter les migrations

```bash
cd backend
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev

# Migrations pour security
python manage.py makemigrations security
python manage.py migrate security

# Migrations pour users (2FA fields)
python manage.py migrate users
```

### 5. Créer des politiques de mot de passe

```python
from apps.tenants.models import Tenant
from apps.security.models import PasswordPolicy

# Pour chaque tenant
for tenant in Tenant.objects.all():
    PasswordPolicy.objects.get_or_create(
        tenant=tenant,
        defaults={
            "min_length": 8,
            "require_uppercase": True,
            "require_lowercase": True,
            "require_digit": True,
            "require_special_char": True,
            "password_expires_days": 90,
            "prevent_reuse_count": 5,
            "max_failed_attempts": 5,
            "lockout_duration_minutes": 30,
            "require_2fa_for_admins": True,
            "session_timeout_minutes": 60,
        },
    )
```

---

## 📊 Modèles de Données

### SecurityEvent
```python
event_type: str          # Type d'événement (login_failed, etc.)
severity: str            # low, medium, high, critical
status: str              # open, investigating, resolved
user: ForeignKey         # Utilisateur concerné
user_email: str          # Email au moment de l'événement
ip_address: str          # IP source
user_agent: str          # User agent du navigateur
description: str         # Description de l'événement
metadata: JSONField      # Métadonnées additionnelles
resolved_by: ForeignKey  # Qui a résolu
resolved_at: datetime    # Quand résolu
```

### BlockedIP
```python
ip_address: str          # IP bloquée (unique)
reason: str              # brute_force, suspicious, spam, manual
description: str         # Description
blocked_by: ForeignKey   # Qui a bloqué
expires_at: datetime     # Expiration (optionnel)
is_active: bool          # Actif ou non
```

### PasswordPolicy
```python
tenant: ForeignKey       # Tenant concerné
min_length: int          # Longueur min (8)
require_uppercase: bool  # Majuscule requise
require_lowercase: bool  # Minuscule requise
require_digit: bool      # Chiffre requis
require_special_char: bool # Caractère spécial requis
password_expires_days: int # Expiration (90)
prevent_reuse_count: int   # Nb de MDP à ne pas réutiliser (5)
max_failed_attempts: int   # Tentatives max (5)
lockout_duration_minutes: int # Durée verrouillage (30)
require_2fa_for_admins: bool  # 2FA obligatoire admins
session_timeout_minutes: int  # Timeout session (60)
```

### User (champs 2FA ajoutés)
```python
two_factor_enabled: bool     # 2FA activé
two_factor_method: str       # totp ou sms
totp_secret: str             # Secret TOTP chiffré
backup_codes: JSONField      # Codes de backup hashés
two_factor_phone: str        # Téléphone pour SMS
failed_login_attempts: int   # Tentatives échouées
account_locked_until: datetime # Verrouillage jusqu'à
password_changed_at: datetime  # Dernier changement MDP
require_password_change: bool  # Forcer changement MDP
```

---

## 🔒 Bonnes Pratiques de Sécurité

### 1. Production
- ✅ Activer HTTPS: `SECURE_SSL_REDIRECT=True`
- ✅ Cookies sécurisés: `SESSION_COOKIE_SECURE=True`
- ✅ HSTS activé
- ✅ Content-Security-Policy strict
- ✅ Rate limiting agressif

### 2. Gestion des Secrets
- ✅ SECRET_KEY stocké dans .env (jamais en clair)
- ✅ Secrets TOTP chiffrés avec EncryptionService
- ✅ Mots de passe hashés avec PBKDF2
- ✅ Codes de backup hashés

### 3. Monitoring
- ✅ Log tous les événements critiques
- ✅ Alertes automatiques pour événements critical
- ✅ Dashboard de sécurité pour super-admins
- ✅ Rapports quotidiens d'événements

### 4. Conformité
- ✅ RGPD: Droit à l'oubli, portabilité, consentement
- ✅ Audit trail complet
- ✅ Chiffrement des données sensibles
- ✅ Rétention limitée des logs (90 jours)

---

## 🧪 Tests

### Tester 2FA TOTP
```bash
curl -X POST http://localhost:8000/api/v1/security/2fa/setup_totp/ \
  -H "Authorization: Bearer YOUR_TOKEN"
# → Retourne un secret et un QR code
```

### Tester le blocage d'IP
```python
from apps.security.services import IPBlockingService

# Bloquer une IP
IPBlockingService.block_ip(
    ip_address="192.168.1.100",
    reason="manual",
    description="Test de blocage"
)

# Vérifier
is_blocked = IPBlockingService.is_ip_blocked("192.168.1.100")  # True
```

### Tester la détection SQL Injection
```python
from apps.security.services import AttackDetectionService

# Test injection SQL
malicious = "SELECT * FROM users WHERE '1'='1'"
is_attack = AttackDetectionService.detect_sql_injection(malicious)  # True
```

---

## 📈 Prochaines Étapes

### OAuth 2.0 (Google, Microsoft)
- [ ] Implémenter django-allauth
- [ ] Configurer Google OAuth
- [ ] Configurer Microsoft Azure AD
- [ ] Interface de liaison de comptes

### Surveillance Avancée
- [ ] Intégration Sentry pour erreurs
- [ ] Intégration ELK Stack pour logs
- [ ] Dashboard Grafana pour métriques
- [ ] Alertes Slack/Email automatiques

### Intelligence Artificielle
- [ ] Détection d'anomalies avec ML
- [ ] Scoring de risque par utilisateur
- [ ] Prédiction d'attaques
- [ ] Auto-apprentissage des patterns

---

## 📞 Support

Pour toute question sur la sécurité, contacter:
- Équipe sécurité: security@smartqueue.app
- Documentation: https://docs.smartqueue.app/security
- Issues GitHub: https://github.com/smartqueue/smartqueue/issues

---

**Version**: 1.0
**Date**: Janvier 2025
**Statut**: ✅ Implémentation Complète
