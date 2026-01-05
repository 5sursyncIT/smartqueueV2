# SmartQueue Back Office

Interface d'administration multi-rôle pour SmartQueue.

## 🎯 Rôles supportés

1. **Super-admin** - Gestion plateforme (tenants, billing, quotas)
2. **Admin** - Configuration tenant (sites, services, agents, intégrations)
3. **Manager** - Supervision (dashboard, reports, team)

## 🚀 Démarrage

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

**Compte démo**: `admin@demo-bank.com` / `admin123`

## 📁 Structure

- `app/(auth)/` - Login
- `app/(super-admin)/` - Routes super-admin
- `app/(admin)/` - Routes admin
- `app/(manager)/` - Routes manager
- `components/` - Composants UI
- `lib/` - API client, stores, types

## 🛠️ Stack

Next.js 14 • TypeScript • Tailwind • shadcn/ui • TanStack Query • Zustand
