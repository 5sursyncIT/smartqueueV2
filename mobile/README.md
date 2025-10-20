# SmartQueue Mobile

Application mobile React Native/Expo pour SmartQueue - Système de gestion de files d'attente.

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- npm ou yarn
- Expo Go app (sur votre téléphone) ou un émulateur Android/iOS

### Installation

```bash
cd mobile
npm install
```

### Lancement

```bash
# Démarrer le serveur Expo
npm start

# ou directement sur une plateforme
npm run android  # Android
npm run ios      # iOS (Mac uniquement)
npm run web      # Web browser
```

### Scanner le QR Code
1. Lancez `npm start`
2. Scannez le QR code avec :
   - **Android** : Expo Go app
   - **iOS** : Caméra native (iOS 11+)

## 📱 Fonctionnalités

### ✅ Implémenté (Phase 1)
- ✅ Configuration API avec intercepteurs JWT
- ✅ Service d'authentification (login/logout/refresh)
- ✅ Store Zustand pour l'état global avec persistance
- ✅ Composants UI réutilisables (Button, Card, Input, Badge)
- ✅ Écran de connexion avec validation Zod
- ✅ Navigation complète (Stack + Bottom Tabs)
- ✅ Écran d'accueil avec liste des services
- ✅ Écran "Mes Tickets" avec tickets actifs
- ✅ Écran "Historique" des tickets passés
- ✅ Écran "Profil" avec déconnexion
- ✅ Écran de prise de ticket avec formulaire
- ✅ Écran de détails d'un ticket
- ✅ Écran de détails d'une file d'attente
- ✅ Services API (tickets, queues, services)
- ✅ Hooks personnalisés pour l'API
- ✅ Utilitaires (storage, formatters)
- ✅ Types TypeScript complets

### 🔄 En cours (Phase 2)
- Connexion réelle aux endpoints backend
- WebSocket pour mises à jour temps réel
- Gestion des notifications

### 📋 À venir (Phase 3)
- Écran d'inscription
- Notifications push (Firebase)
- QR Code scanning pour check-in
- Mode hors ligne
- Dark mode
- Multilangue (FR/EN/WO)

## 🏗️ Architecture

```
src/
├── components/
│   └── ui/              # Button, Card, Input, Badge
├── screens/
│   ├── auth/            # LoginScreen (RegisterScreen à venir)
│   ├── home/            # HomeScreen - Liste des services
│   ├── tickets/         # MyTicketsScreen, TicketDetailsScreen, TakeTicketScreen
│   ├── history/         # HistoryScreen - Historique des tickets
│   ├── profile/         # ProfileScreen - Profil utilisateur
│   └── queues/          # QueueDetailsScreen - Détails d'une file
├── navigation/
│   ├── types.ts         # Types pour React Navigation
│   ├── AuthStack.tsx    # Stack d'authentification
│   ├── MainTabs.tsx     # Bottom tabs (Home, MyTickets, History, Profile)
│   ├── MainStack.tsx    # Stack principale après auth
│   └── RootNavigator.tsx # Navigateur racine
├── services/
│   ├── api.ts           # Client Axios avec intercepteurs JWT
│   ├── auth.ts          # Service d'authentification
│   ├── tickets.ts       # Service API tickets
│   ├── queues.ts        # Service API files d'attente
│   └── services.ts      # Service API services
├── hooks/
│   ├── useServices.ts   # Hooks pour les services
│   ├── useTickets.ts    # Hooks pour les tickets (get, create, cancel)
│   ├── useQueues.ts     # Hooks pour les files d'attente
│   └── index.ts         # Export des hooks
├── stores/
│   └── authStore.ts     # Store Zustand (auth + persistence)
├── types/
│   └── api.types.ts     # Types TypeScript pour l'API
├── constants/
│   ├── Config.ts        # Configuration (API, WS, Cache, Notifications)
│   └── Colors.ts        # Palette de couleurs
└── utils/
    ├── storage.ts       # AsyncStorage helpers
    └── formatters.ts    # Formatage dates, durées, téléphones, etc.
```

## 🔌 Connexion au Backend

### Configuration
Le fichier `src/constants/Config.ts` contient la configuration de l'API :

```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://localhost:8000' : 'https://api.smartqueue.app',
  API_VERSION: '/api/v1',
};
```

### Endpoints utilisés

**Authentification**
- `POST /api/v1/auth/jwt/token/` - Connexion (JWT)
- `POST /api/v1/auth/jwt/refresh/` - Refresh token
- `GET /api/v1/auth/jwt/me/` - Utilisateur connecté

**Services**
- `GET /api/v1/tenants/{slug}/services/` - Liste des services
- `GET /api/v1/tenants/{slug}/services/{id}/` - Détails d'un service
- `GET /api/v1/tenants/{slug}/services/{id}/stats/` - Statistiques d'un service

**Tickets**
- `GET /api/v1/tenants/{slug}/tickets/` - Tous les tickets
- `GET /api/v1/tenants/{slug}/tickets/my/` - Mes tickets actifs
- `GET /api/v1/tenants/{slug}/tickets/history/` - Mon historique
- `GET /api/v1/tenants/{slug}/tickets/{id}/` - Détails d'un ticket
- `POST /api/v1/tenants/{slug}/tickets/` - Créer un ticket
- `POST /api/v1/tenants/{slug}/tickets/{id}/cancel/` - Annuler un ticket

**Files d'attente**
- `GET /api/v1/tenants/{slug}/queues/` - Liste des files
- `GET /api/v1/tenants/{slug}/queues/{id}/` - Détails d'une file
- `GET /api/v1/tenants/{slug}/queues/{id}/stats/` - Statistiques d'une file
- `GET /api/v1/tenants/{slug}/queues/{id}/tickets/` - Tickets d'une file

## 📦 Technologies

- **Expo SDK 54** - Framework React Native
- **React 19** - Bibliothèque UI
- **TypeScript** - Typage statique
- **React Navigation 6** - Navigation
- **Zustand** - State management
- **Axios** - Client HTTP
- **React Hook Form + Zod** - Gestion des formulaires
- **AsyncStorage** - Stockage local

## 🎨 Design

Inspiré par **Queekly** avec :
- Cartes modernes avec ombres
- Palette de couleurs vives
- Navigation par onglets
- Composants réutilisables
- Interface intuitive

### Palette de couleurs
- **Primary** : #3B82F6 (Bleu)
- **Success** : #10B981 (Vert)
- **Warning** : #F59E0B (Orange)
- **Danger** : #EF4444 (Rouge)

## 🧪 Tests

```bash
# Lancer les tests (à venir)
npm test
```

## 📝 Documentation

- [Plan de développement](MOBILE_PLAN.md) - Plan complet et roadmap
- [Documentation API](../docs/API.md) - Documentation du backend

## 🔐 Sécurité

- Tokens JWT stockés dans AsyncStorage sécurisé
- HTTPS uniquement en production
- Validation des inputs (Zod)
- Refresh automatique des tokens

## 🚧 Développement

### Structure des commits
```
feat: Ajout de l'écran de connexion
fix: Correction du refresh token
refactor: Amélioration du store auth
docs: Mise à jour du README
```

### Bonnes pratiques
- Toujours typer avec TypeScript
- Utiliser les composants UI réutilisables
- Valider les formulaires avec Zod
- Gérer les erreurs avec try/catch
- Tester sur Android ET iOS

## 📱 Build & Déploiement

### Build local
```bash
# Android APK
npx expo build:android

# iOS IPA
npx expo build:ios
```

### Expo EAS (Recommandé)
```bash
# Configuration
npx eas build:configure

# Build Android
npx eas build --platform android

# Build iOS
npx eas build --platform ios

# Submit aux stores
npx eas submit
```

## 🐛 Débogage

### Logs
```bash
# Voir les logs
npx expo start

# Logs React Native
npx react-native log-android  # Android
npx react-native log-ios      # iOS
```

### Erreurs courantes

**Metro bundler error**
```bash
rm -rf node_modules
npm install
npx expo start --clear
```

**AsyncStorage error**
```bash
cd ios && pod install && cd ..
```

## 📞 Support

Pour toute question ou problème :
- Voir la [documentation complète](MOBILE_PLAN.md)
- Consulter les [issues GitHub](https://github.com/anthropics/smartqueue/issues)

---

**Version** : 0.1.0 (MVP en développement)
**Dernière mise à jour** : 20 octobre 2025
