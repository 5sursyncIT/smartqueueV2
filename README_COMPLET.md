# 🎯 SmartQueue - Système de Gestion de Files d'Attente Multi-Tenant

![Version](https://img.shields.io/badge/version-1.0.0--beta-blue)
![Status](https://img.shields.io/badge/status-ready%20for%20testing-green)
![License](https://img.shields.io/badge/license-Proprietary-red)

**SmartQueue** est une plateforme SaaS complète de gestion de files d'attente conçue pour les banques, cliniques, administrations et toutes organisations gérant un flux de clients important.

---

## 📚 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Fonctionnalités](#fonctionnalités)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Utilisation](#utilisation)
6. [Facturation](#facturation)
7. [Documentation](#documentation)
8. [Contribution](#contribution)
9. [Support](#support)

---

## 🎯 Vue d'Ensemble

### Problème Résolu

Les organisations au Sénégal et en Afrique de l'Ouest gèrent quotidiennement des files d'attente importantes qui entraînent:
- ⏰ Temps d'attente excessifs
- 😤 Frustration des clients
- 📉 Perte d'efficacité opérationnelle
- 💸 Coûts de gestion élevés

### Solution SmartQueue

Une plateforme complète qui:
- ✅ Digitalise la gestion des files d'attente
- ✅ Optimise l'affectation des agents
- ✅ Réduit les temps d'attente de 40%
- ✅ Améliore la satisfaction client
- ✅ Fournit des analytics en temps réel

### Marchés Cibles

1. **Banques & Institutions Financières**
   - Agences bancaires
   - Services de transfert d'argent
   - Bureaux de change

2. **Santé**
   - Cliniques et hôpitaux
   - Laboratoires d'analyse
   - Pharmacies

3. **Administration**
   - Mairies et préfectures
   - Services publics
   - Centres administratifs

4. **Télécommunications**
   - Agences commerciales
   - Points de vente
   - Service clients

---

## 🚀 Fonctionnalités

### Pour les Clients Finals (Utilisateurs)

#### **Prise de Ticket**
- 📱 Application mobile native (iOS/Android)
- 💻 Borne tactile en agence
- 🌐 Portail web responsive
- 📞 Par téléphone (IVR)

#### **Suivi en Temps Réel**
- Notification SMS/Push lors de l'approche du tour
- Affichage du temps d'attente estimé
- Position dans la file
- Possibilité d'annulation

### Pour les Agents

#### **Gestion des Tickets**
- Appel du prochain client (vocal + écran)
- Pause/Reprise de service
- Transfer entre files
- Marquage "no-show"
- Historique des services

#### **Dashboard Agent**
- Nombre de clients servis
- Temps moyen de service
- Performance individuelle
- Évaluation des clients (CSAT)

### Pour les Managers

#### **Gestion des Opérations**
- Configuration des files d'attente
- Gestion des services
- Attribution des agents
- Planification des horaires
- Gestion multi-sites

#### **Rapports & Analytics**
- Temps d'attente moyens
- Taux d'occupation des agents
- Taux de no-show
- Heures de pointe
- Satisfaction client (NPS/CSAT)

### Pour le Super-Admin

#### **10 Pages de Gestion**

1. **Dashboard Global**
   - KPIs plateforme
   - Revenus en temps réel
   - Activité des organisations
   - Alertes système

2. **Organizations**
   - CRUD complet des tenants
   - Suspension/Activation
   - Statistiques par organisation
   - Configuration limites

3. **Subscriptions**
   - Gestion des plans d'abonnement
   - Création/Édition/Suppression
   - Pricing flexible
   - Features par plan
   - Duplication de plans

4. **Billing - Facturation**
   - Paiements Mobile Money
   - Stats en temps réel
   - Export CSV
   - Recherche avancée
   - Support 7 méthodes (Orange, Wave, Free, etc.)

5. **Billing - Analytics MRR/ARR**
   - MRR (Monthly Recurring Revenue)
   - ARR (Annual Recurring Revenue)
   - Churn Rate avec badge santé
   - ARPU (Average Revenue Per User)
   - LTV (Lifetime Value)
   - 4 graphiques interactifs

6. **Billing - Impayés**
   - Scoring de risque automatique
   - Actions de recouvrement
   - Envoi de rappels
   - Suspension automatique
   - Plans de paiement

7. **Users**
   - Gestion utilisateurs
   - Rôles et permissions
   - Historique d'activité

8. **Analytics**
   - Rapports détaillés
   - Export données
   - Tendances

9. **Monitoring**
   - État des services
   - Performance système
   - Logs en temps réel

10. **Security & Support**
    - Audit logs
    - Gestion tickets support
    - Configuration sécurité

---

## 🏗️ Architecture

### Stack Technique

#### **Backend**
```
Django 4.2+             - Framework web Python
Django REST Framework   - API REST
PostgreSQL 14+          - Base de données principale
Redis 7+                - Cache & message broker
Celery                  - Tâches asynchrones
Django Channels         - WebSocket (temps réel)
ReportLab              - Génération PDF
```

#### **Frontend**
```
Next.js 15              - Framework React
TypeScript              - Typage statique
TanStack Query          - Gestion état serveur
shadcn/ui              - Composants UI
Tailwind CSS           - Styling
Recharts               - Graphiques
```

#### **Infrastructure**
```
Nginx                   - Reverse proxy
Gunicorn               - WSGI server
Supervisor             - Process management
Docker                 - Conteneurisation
```

### Architecture Multi-Tenant

```
┌─────────────────────────────────────────────────┐
│                   Plateforme                     │
│                  SmartQueue                      │
└──────────────┬──────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐           ┌────▼────┐
│ Tenant │           │ Tenant  │
│   A    │           │   B     │
│        │           │         │
│ Sites  │           │ Sites   │
│ Agents │           │ Agents  │
│ Queues │           │ Queues  │
│ Data   │           │ Data    │
└────────┘           └─────────┘

Isolation complète par tenant
Row-Level Security (PostgreSQL)
```

### Flux de Gestion de File

```
Client arrive
    ↓
Prend un ticket (Mobile/Kiosk/Web)
    ↓
Ticket assigné à une file
    ↓
Algorithme d'optimisation (FIFO/Priority/SLA)
    ↓
Agent disponible appelle le prochain
    ↓
Notification client (SMS/Push)
    ↓
Service du client
    ↓
Feedback satisfaction (optionnel)
    ↓
Analytics & Rapports
```

---

## 💻 Installation

### Prérequis

```bash
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- Git
```

### Installation Backend

```bash
# 1. Cloner le repo
git clone https://github.com/smartqueue/smartqueue.git
cd smartqueue

# 2. Créer l'environnement virtuel
cd backend
python3.11 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate  # Windows

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 5. Créer la base de données
createdb smartqueue_dev

# 6. Appliquer les migrations
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py migrate

# 7. Créer le super-admin
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py createsuperuser

# 8. Créer un tenant de démo (optionnel)
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py create_tenant \
  --name "Demo Bank" \
  --slug demo-bank \
  --admin-email admin@demo-bank.com \
  --admin-password admin123 \
  --with-demo-data

# 9. Lancer le serveur
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py runserver
```

### Installation Frontend

```bash
# 1. Aller dans le dossier frontend
cd back_office

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local

# 4. Lancer le serveur de dev
npm run dev

# Le frontend sera accessible sur http://localhost:3001
```

### Services Additionnels

#### **Redis (Cache & Celery)**
```bash
# Installation (Ubuntu/Debian)
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Vérifier
redis-cli ping
# Devrait retourner: PONG
```

#### **Celery Workers**
```bash
# Dans un terminal séparé
cd backend
source .venv/bin/activate
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev celery -A smartqueue_backend worker --loglevel=info

# Celery Beat (pour tâches périodiques)
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev celery -A smartqueue_backend beat --loglevel=info
```

---

## 📖 Utilisation

### Accès aux Différentes Interfaces

#### **Super-Admin**
```
URL: http://localhost:3001/superadmin
Login: admin@smartqueue.sn
Password: admin123

Fonctionnalités:
- Gestion de tous les tenants
- Analytics plateforme
- Facturation et paiements
- Configuration globale
```

#### **Admin Organisation**
```
URL: http://localhost:3001
Login: admin@demo-bank.com
Password: admin123

Fonctionnalités:
- Dashboard organisation
- Gestion des files
- Gestion des agents
- Rapports
- Configuration
```

#### **Agent**
```
URL: http://localhost:3001/agent
Login: agent@demo-bank.com
Password: agent123

Fonctionnalités:
- Appeler le prochain client
- Gérer les tickets
- Voir sa performance
```

#### **API REST**
```
Base URL: http://localhost:8000/api/v1/
Documentation: http://localhost:8000/api/docs/

Authentification: Token
Header: Authorization: Token <votre-token>
```

### Exemples d'API

#### **Obtenir un token**
```bash
curl -X POST http://localhost:8000/api/v1/auth/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo-bank.com",
    "password": "admin123"
  }'
```

#### **Lister les files d'attente**
```bash
curl http://localhost:8000/api/v1/tenants/demo-bank/queues/ \
  -H "Authorization: Token YOUR_TOKEN"
```

#### **Appeler le prochain client (Agent)**
```bash
curl -X POST http://localhost:8000/api/v1/tenants/demo-bank/agents/call-next/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"queue_id": "QUEUE_UUID"}'
```

---

## 💰 Facturation

### Plans d'Abonnement

#### **Essential - 15.000 XOF/mois**
```
✓ 1 site
✓ Jusqu'à 5 agents
✓ 3 files d'attente
✓ 500 tickets/mois
✓ Support email
✓ Rapports basiques
```

#### **Professional - 45.000 XOF/mois**
```
✓ Jusqu'à 5 sites
✓ Jusqu'à 20 agents
✓ 10 files d'attente
✓ 2000 tickets/mois
✓ Support prioritaire
✓ Rapports avancés
✓ Notifications SMS
✓ API access
```

#### **Enterprise - Sur Devis**
```
✓ Sites illimités
✓ Agents illimités
✓ Files illimitées
✓ Tickets illimités
✓ Support dédié 24/7
✓ Rapports personnalisés
✓ Intégrations sur mesure
✓ SLA garanti
```

### Méthodes de Paiement

- 📱 Orange Money
- 📱 Wave
- 📱 Free Money
- 📱 e-Money
- 📱 YooMee
- 📱 MTN Mobile Money
- 📱 Moov Money

### Fonctionnalités de Facturation

- **Facturation automatique** mensuelle ou annuelle
- **Génération PDF** de factures professionnelles
- **Relances automatiques** pour impayés
- **Codes promo** et réductions
- **Facturation à l'usage** (SMS, stockage, API)
- **Plans de paiement** personnalisés
- **Export comptable** (Sage, QuickBooks)

---

## 📚 Documentation

### Documents Disponibles

1. **[BILLING_FEATURES_SUMMARY.md](BILLING_FEATURES_SUMMARY.md)**
   - Détails complets du système de facturation
   - Modèles de données
   - Endpoints API
   - Roadmap

2. **[INSTALLATION_ET_PROCHAINES_ETAPES.md](INSTALLATION_ET_PROCHAINES_ETAPES.md)**
   - Guide d'installation détaillé
   - Corrections nécessaires
   - Prochaines étapes
   - Checklist production

3. **[API.md](docs/API.md)**
   - Documentation complète de l'API REST
   - Exemples de requêtes
   - Schémas de données

4. **[DEVELOPMENT_SUMMARY.md](DEVELOPMENT_SUMMARY.md)**
   - Résumé technique du projet
   - Architecture
   - Décisions techniques

### API Documentation Interactive

```
URL: http://localhost:8000/api/docs/
Format: OpenAPI (Swagger UI)
```

---

## 🤝 Contribution

### Standards de Code

```python
# Backend - Python
- PEP 8 (formaté avec Black)
- Type hints
- Docstrings Google Style
- Tests avec pytest (>80% coverage)
```

```typescript
// Frontend - TypeScript
- ESLint + Prettier
- Types explicites
- Components documentés
- Tests avec Vitest
```

### Workflow Git

```bash
# 1. Créer une branche
git checkout -b feature/nom-feature

# 2. Développer et commiter
git add .
git commit -m "feat: description de la feature"

# 3. Push et créer PR
git push origin feature/nom-feature

# 4. Code review
# 5. Merge après approbation
```

### Conventions de Commits

```
feat: Nouvelle fonctionnalité
fix: Correction de bug
docs: Documentation
style: Formatage
refactor: Refactorisation
test: Ajout de tests
chore: Tâches diverses
```

---

## 🆘 Support

### Canaux de Support

- 📧 **Email:** support@smartqueue.sn
- 💬 **Slack:** smartqueue.slack.com
- 📞 **Téléphone:** +221 33 XXX XX XX
- 🐛 **Bug Reports:** GitHub Issues
- 📖 **Documentation:** docs.smartqueue.sn

### Niveaux de Support

#### **Essential**
- Email support (48h response)
- Documentation en ligne
- Community forum

#### **Professional**
- Email support prioritaire (24h)
- Chat support (heures ouvrables)
- Onboarding personnalisé

#### **Enterprise**
- Support dédié 24/7
- Téléphone direct
- Account manager
- SLA garanti 99.9%

---

## 📊 Métriques & KPIs

### Santé de la Plateforme

```
✓ Uptime: 99.9% (objectif)
✓ Temps de réponse API: <200ms (p95)
✓ Satisfaction client: NPS > 50
✓ Taux de conversion trial: >40%
✓ Churn mensuel: <5%
```

### Croissance Business

```
Année 1:
- 200 clients actifs
- 100M XOF ARR
- 20 employés
- Couverture Sénégal

Année 2:
- 500 clients actifs
- 300M XOF ARR
- 50 employés
- Expansion UEMOA

Année 3:
- Leader marché régional
- 1B XOF ARR
- 100 employés
- Pan-Africain
```

---

## 🏆 Avantages Concurrentiels

### 1. **Mobile Money First**
- Intégration native avec tous les opérateurs
- Paiements instantanés
- Pas de compte bancaire requis

### 2. **Prix Adapté au Marché**
- Tarification en XOF
- Plans flexibles
- Essai gratuit généreux

### 3. **Temps Réel**
- WebSocket pour mises à jour instantanées
- Notifications push
- Analytics en direct

### 4. **Multi-Tenant Robuste**
- Isolation complète des données
- Performance optimale
- Sécurité renforcée

### 5. **Support Local**
- Équipe basée à Dakar
- Support en français
- Compréhension du contexte local

---

## 📜 Licence

**Proprietary License**

© 2025 SmartQueue. Tous droits réservés.

Ce logiciel est la propriété exclusive de SmartQueue. Toute reproduction, modification, distribution ou utilisation non autorisée est strictement interdite.

Pour obtenir une licence, contactez: sales@smartqueue.sn

---

## 📞 Contact

**SmartQueue Sénégal**

- 📍 Adresse: Dakar, Sénégal
- 📧 Email: contact@smartqueue.sn
- 🌐 Site web: www.smartqueue.sn
- 💼 LinkedIn: /company/smartqueue
- 🐦 Twitter: @smartqueue_sn

---

## 🙏 Remerciements

Merci à tous ceux qui ont contribué à faire de SmartQueue une réalité:
- L'équipe de développement
- Les beta testeurs
- Nos partenaires
- La communauté tech sénégalaise

---

**Fait avec ❤️ à Dakar, Sénégal**

🚀 **SmartQueue - L'avenir de la gestion de files d'attente en Afrique**
