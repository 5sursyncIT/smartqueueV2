# Frontend Developer Book - SmartQueue

## 📋 Table des matières

1. [Architecture Frontend](#architecture-frontend)
2. [Configuration de l'environnement](#configuration-de-lenvironnement)
3. [Structure du projet](#structure-du-projet)
4. [Composants UI](#composants-ui)
5. [Gestion d'état](#gestion-détat)
6. [API & WebSockets](#api--websockets)
7. [Authentification](#authentification)
8. [Multi-tenancy côté client](#multi-tenancy-côté-client)
9. [Internationalisation](#internationalisation)
10. [Tests](#tests)
11. [Performance](#performance)
12. [Déploiement](#déploiement)

## 🏗️ Architecture Frontend

### Stack technique
- **Framework** : Next.js 14 (App Router)
- **Language** : TypeScript
- **Styling** : Tailwind CSS + shadcn/ui
- **State Management** : TanStack Query + Zustand
- **Forms** : React Hook Form + Zod
- **WebSockets** : Native WebSocket API
- **Mobile** : React Native/Expo (optionnel)

### Applications cibles
```
smartqueue-frontend/
├── web/                 # Application web principale
├── mobile/             # Application mobile (React Native)
├── kiosk/              # Interface borne
├── display/            # Écrans d'affichage
└── shared/             # Code partagé (types, utils)
```

## ⚙️ Configuration de l'environnement

### Variables d'environnement
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TENANT_DOMAIN=smartqueue.app

# Auth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Intégrations
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key
NEXT_PUBLIC_FCM_VAPID_KEY=your-fcm-key
```

### Installation
```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build de production
npm run build

# Lancer les tests
npm test
```

## 📁 Structure du projet

### Organisation Next.js (App Router)
```
src/
├── app/                    # App Router (Next.js 14)
│   ├── (auth)/            # Groupe de routes auth
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # Groupe de routes dashboard
│   │   ├── queues/
│   │   ├── agents/
│   │   ├── analytics/
│   │   └── settings/
│   ├── (public)/          # Routes publiques
│   │   ├── join/          # Rejoindre une file
│   │   └── track/         # Suivi de ticket
│   ├── api/               # API Routes
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/            # Composants réutilisables
│   ├── ui/               # shadcn/ui components
│   ├── forms/            # Composants de formulaires
│   ├── charts/           # Composants de graphiques
│   └── layout/           # Composants de mise en page
├── lib/                  # Utilitaires et configuration
│   ├── api.ts           # Client API
│   ├── auth.ts          # Configuration auth
│   ├── websocket.ts     # Client WebSocket
│   ├── utils.ts         # Utilitaires
│   └── validations.ts   # Schémas Zod
├── hooks/               # Hooks personnalisés
├── stores/              # Stores Zustand
├── types/               # Types TypeScript
└── constants/           # Constantes
```

## 🚀 Déploiement

### Vercel (recommandé pour Next.js)
```bash
# Installation de Vercel CLI
npm i -g vercel

# Déploiement
vercel

# Variables d'environnement
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXTAUTH_SECRET
```

### Docker
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

## 🔧 Commandes utiles

```bash
# Développement
npm run dev              # Lancer le serveur de développement
npm run build           # Build de production
npm run start           # Lancer en mode production
npm run lint            # Linter le code
npm run type-check      # Vérification TypeScript

# Tests
npm test                # Lancer les tests
npm run test:watch      # Tests en mode watch
npm run test:coverage   # Tests avec couverture
npm run test:e2e        # Tests E2E avec Playwright

# Outils
npm run analyze         # Analyser le bundle
npm run storybook       # Lancer Storybook
npm run generate        # Générer des composants

# Mobile (Expo)
npx expo start          # Lancer le serveur Expo
npx expo build:android  # Build Android
npx expo build:ios      # Build iOS
```

---

Ce guide couvre tous les aspects essentiels du développement frontend pour SmartQueue, de la configuration initiale au déploiement en production. Chaque section peut être approfondie selon les besoins spécifiques du projet.