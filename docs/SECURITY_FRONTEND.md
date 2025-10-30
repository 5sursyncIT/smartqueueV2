# Guide Frontend - Interface de Sécurité

## 📋 Vue d'ensemble

L'interface de sécurité est accessible à l'adresse `http://localhost:3000/superadmin/security` et fournit aux super-administrateurs un centre de contrôle complet pour la sécurité de la plateforme.

---

## 🏗️ Architecture

### Structure des Fichiers

```
back_office/
├── app/(super-admin)/security/
│   └── page.tsx                          # Page principale du centre de sécurité
├── components/security/
│   ├── security-events-table.tsx         # Tableau des événements de sécurité
│   ├── security-alerts.tsx               # Alertes de sécurité
│   ├── two-factor-settings.tsx           # Configuration 2FA
│   ├── oauth-settings.tsx                # Configuration OAuth
│   ├── blocked-ips-manager.tsx           # Gestion des IPs bloquées
│   └── index.ts                          # Export barrel
└── lib/hooks/
    ├── use-security.ts                   # Hooks pour événements, stats, IPs, alertes
    ├── use-2fa.ts                        # Hooks pour authentification 2FA
    └── use-oauth.ts                      # Hooks pour OAuth
```

---

## 🔌 Hooks React

### 1. use-security.ts

**Hooks disponibles** :
- `useSecurityEvents(filters)` - Gestion des événements de sécurité
- `useSecurityStats()` - Statistiques de sécurité
- `useThreatSummary()` - Résumé des menaces (auto-refresh 30s)
- `useBlockedIPs()` - Gestion des IPs bloquées
- `useSecurityAlerts()` - Alertes de sécurité actives

**Exemple - Événements** :
```typescript
import { useSecurityEvents } from '@/lib/hooks/use-security';

export function MyComponent() {
  const { events, loading, filters, setFilters, refetch } = useSecurityEvents({
    severity: 'high',
    event_type: 'login_failed',
  });

  return (
    <div>
      {events.map((event) => (
        <div key={event.id}>
          {event.description} - {event.severity}
        </div>
      ))}
    </div>
  );
}
```

**Exemple - Résumé des menaces** :
```typescript
import { useThreatSummary } from '@/lib/hooks/use-security';

export function ThreatDashboard() {
  const { summary, loading } = useThreatSummary();

  return (
    <div>
      <p>IPs bloquées : {summary.blocked_ips}</p>
      <p>Connexions échouées : {summary.failed_logins}</p>
      <p>Activités suspectes : {summary.suspicious_activities}</p>
      <p>Incidents ouverts : {summary.open_incidents}</p>
    </div>
  );
}
```

**Exemple - Bloquer une IP** :
```typescript
import { useBlockedIPs } from '@/lib/hooks/use-security';

export function IPBlocker() {
  const { blockedIPs, block, unblock, loading } = useBlockedIPs();

  const handleBlock = async () => {
    try {
      await block('192.168.1.100', 'Tentatives de connexion suspectes');
      toast.success('IP bloquée');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleUnblock = async (ip: string) => {
    try {
      await unblock(ip);
      toast.success('IP débloquée');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <button onClick={handleBlock}>Bloquer IP</button>
      {blockedIPs.map((ip) => (
        <div key={ip.id}>
          {ip.ip_address} - {ip.reason}
          <button onClick={() => handleUnblock(ip.ip_address)}>Débloquer</button>
        </div>
      ))}
    </div>
  );
}
```

### 2. use-2fa.ts

**Hook** : `useTwoFactor()`

**Méthodes** :
- `status` - Statut actuel de la 2FA
- `setupTOTP()` - Configurer TOTP (retourne secret + QR code)
- `setupSMS(phoneNumber)` - Configurer SMS
- `verifyAndEnable(code)` - Vérifier code et activer 2FA
- `disable()` - Désactiver 2FA

**Exemple - Configuration TOTP** :
```typescript
import { useTwoFactor } from '@/lib/hooks/use-2fa';

export function TOTPSetup() {
  const { setupTOTP, verifyAndEnable, loading } = useTwoFactor();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');

  const handleSetup = async () => {
    try {
      const data = await setupTOTP();
      setQrCode(data.qrCode);
      setSecret(data.secret);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleVerify = async (code: string) => {
    try {
      const result = await verifyAndEnable(code);
      toast.success('2FA activée');
      console.log('Codes de secours:', result.backupCodes);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <button onClick={handleSetup}>Configurer TOTP</button>
      {qrCode && (
        <>
          <img src={qrCode} alt="QR Code" />
          <p>Secret: {secret}</p>
          <input
            type="text"
            placeholder="Code de vérification"
            onChange={(e) => handleVerify(e.target.value)}
          />
        </>
      )}
    </div>
  );
}
```

**Exemple - Configuration SMS** :
```typescript
import { useTwoFactor } from '@/lib/hooks/use-2fa';

export function SMSSetup() {
  const { setupSMS, verifyAndEnable, loading } = useTwoFactor();

  const handleSetup = async (phone: string) => {
    try {
      await setupSMS(phone);
      toast.success('Code SMS envoyé');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleVerify = async (code: string) => {
    try {
      const result = await verifyAndEnable(code);
      toast.success('2FA activée');
    } catch (error) {
      toast.error('Code invalide');
    }
  };

  return (
    <div>
      <input
        type="tel"
        placeholder="+33 6 12 34 56 78"
        onChange={(e) => handleSetup(e.target.value)}
      />
    </div>
  );
}
```

### 3. use-oauth.ts

**Hooks disponibles** :
- `useOAuth()` - Connexion et gestion OAuth
- `useOAuthConnections()` - Liste des connexions OAuth existantes

**Méthodes useOAuth** :
- `loginWithProvider(provider)` - Connexion via Google/Microsoft
- `handleCallback(code, state)` - Traiter le callback OAuth
- `linkAccount(provider, code, state)` - Lier un compte OAuth existant

**Méthodes useOAuthConnections** :
- `connections` - Liste des connexions
- `disconnect(provider)` - Déconnecter un compte

**Exemple - Boutons de connexion** :
```typescript
import { useOAuth } from '@/lib/hooks/use-oauth';

export function OAuthButtons() {
  const { loginWithProvider, loading } = useOAuth();

  return (
    <div>
      <button
        onClick={() => loginWithProvider('google')}
        disabled={loading}
      >
        Se connecter avec Google
      </button>
      <button
        onClick={() => loginWithProvider('microsoft')}
        disabled={loading}
      >
        Se connecter avec Microsoft
      </button>
    </div>
  );
}
```

**Exemple - Page de callback** :
```typescript
'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOAuth } from '@/lib/hooks/use-oauth';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleCallback } = useOAuth();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      handleCallback(code, state)
        .then((data) => {
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          router.push('/dashboard');
        })
        .catch((error) => {
          console.error(error);
          router.push('/login?error=oauth_failed');
        });
    }
  }, [searchParams, handleCallback, router]);

  return <div>Connexion en cours...</div>;
}
```

**Exemple - Gérer les connexions** :
```typescript
import { useOAuthConnections } from '@/lib/hooks/use-oauth';

export function OAuthManager() {
  const { connections, disconnect, loading } = useOAuthConnections();

  return (
    <div>
      {connections.map((conn) => (
        <div key={conn.id}>
          <p>{conn.provider} - {conn.email}</p>
          <button onClick={() => disconnect(conn.provider)}>
            Déconnecter
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎨 Composants UI

### SecurityEventsTable

**Props** :
```typescript
interface SecurityEventsTableProps {
  events: SecurityEvent[];
  loading: boolean;
  filters?: {
    event_type?: string;
    severity?: string;
    search?: string;
  };
  onFiltersChange?: (filters: any) => void;
  onRefresh?: () => void;
}
```

**Fonctionnalités** :
- Filtrage par type, sévérité, recherche
- Affichage des événements avec badges de sévérité
- Refresh manuel
- Pagination automatique

**Utilisation** :
```typescript
import { SecurityEventsTable } from '@/components/security';

<SecurityEventsTable
  events={events}
  loading={loading}
  filters={filters}
  onFiltersChange={setFilters}
  onRefresh={refetch}
/>
```

### TwoFactorSettings

**Fonctionnalités** :
- Affichage du statut 2FA actuel
- Configuration TOTP avec QR code
- Configuration SMS avec vérification
- Affichage et copie des codes de secours
- Désactivation 2FA

**Utilisation** :
```typescript
import { TwoFactorSettings } from '@/components/security';

<TwoFactorSettings />
```

### OAuthSettings

**Fonctionnalités** :
- Boutons de connexion Google/Microsoft
- Affichage des comptes connectés
- Déconnexion de comptes
- Logos et design des providers

**Utilisation** :
```typescript
import { OAuthSettings } from '@/components/security';

<OAuthSettings />
```

### BlockedIPsManager

**Fonctionnalités** :
- Liste des IPs bloquées avec détails
- Recherche par IP ou raison
- Blocage manuel d'IP
- Déblocage d'IP
- Affichage de l'expiration

**Utilisation** :
```typescript
import { BlockedIPsManager } from '@/components/security';

<BlockedIPsManager />
```

### SecurityAlerts

**Props** :
```typescript
interface SecurityAlertsProps {
  alerts: SecurityAlert[];
  loading: boolean;
  onResolve: (alertId: string) => Promise<void>;
}
```

**Fonctionnalités** :
- Affichage des alertes actives
- Badge de sévérité
- Bouton de résolution
- Auto-dismiss après résolution

**Utilisation** :
```typescript
import { SecurityAlerts } from '@/components/security';

<SecurityAlerts
  alerts={alerts}
  loading={loading}
  onResolve={markAsResolved}
/>
```

---

## 📊 Page Principale

La page `/superadmin/security` combine tous les composants :

**Sections** :
1. **Cartes de résumé** - 4 cartes avec métriques clés
2. **Alertes** - Alertes actives en haut de page
3. **Onglets** :
   - Événements de sécurité
   - Authentification 2FA
   - OAuth & SSO
   - IPs bloquées

**Layout** :
```typescript
import { SecurityPage } from '@/app/(super-admin)/security/page';

// Structure:
<SecurityPage>
  <Header>Centre de Sécurité</Header>
  <ThreatSummaryCards />
  <SecurityAlerts />
  <Tabs>
    <Tab label="Événements">
      <SecurityEventsTable />
    </Tab>
    <Tab label="2FA">
      <TwoFactorSettings />
    </Tab>
    <Tab label="OAuth">
      <OAuthSettings />
    </Tab>
    <Tab label="IPs Bloquées">
      <BlockedIPsManager />
    </Tab>
  </Tabs>
</SecurityPage>
```

---

## 🔄 Flux de Données

### Événements de Sécurité

```
useSecurityEvents
  ↓
apiClient.get('/api/v1/security/events/')
  ↓
Backend: SecurityEventViewSet
  ↓
Retour: Liste d'événements avec filtres
  ↓
Affichage dans SecurityEventsTable
```

### Configuration 2FA

```
setupTOTP()
  ↓
apiClient.post('/api/v1/security/2fa/setup_totp/')
  ↓
Backend: TOTPService.generate_secret() + QR code
  ↓
Retour: { secret, qr_code }
  ↓
Affichage QR + input code
  ↓
verifyAndEnable(code)
  ↓
apiClient.post('/api/v1/security/2fa/verify_and_enable/')
  ↓
Backend: Vérification + génération backup codes
  ↓
Retour: { backup_codes }
  ↓
Affichage codes de secours
```

### OAuth Flow

```
loginWithProvider('google')
  ↓
getAuthorizationUrl()
  ↓
apiClient.post('/api/v1/auth/oauth/get-url/')
  ↓
Backend: GoogleOAuthProvider.get_authorization_url()
  ↓
Retour: { url, state }
  ↓
Redirection vers Google
  ↓
Callback: /auth/google/callback?code=...&state=...
  ↓
handleCallback(code, state)
  ↓
Vérification CSRF (state)
  ↓
apiClient.post('/api/v1/auth/oauth/callback/')
  ↓
Backend: Exchange code + create/link user
  ↓
Retour: { access, refresh, user }
  ↓
Sauvegarde tokens + redirection dashboard
```

---

## 🎯 Best Practices

### 1. Gestion des Erreurs

```typescript
const handleAction = async () => {
  try {
    await someAction();
    toast.success('Action réussie');
  } catch (error: any) {
    toast.error(error.message || 'Erreur inconnue');
    console.error('Error:', error);
  }
};
```

### 2. Loading States

```typescript
const { data, loading } = useHook();

if (loading) {
  return <Skeleton />;
}

return <Content data={data} />;
```

### 3. CSRF Protection (OAuth)

```typescript
// Toujours vérifier le state token
const savedState = sessionStorage.getItem('oauth_state');
if (state !== savedState) {
  throw new Error('CSRF attack detected');
}
```

### 4. Auto-Refresh

```typescript
// Pour les données temps réel
useEffect(() => {
  const interval = setInterval(refetch, 30000); // 30 secondes
  return () => clearInterval(interval);
}, []);
```

### 5. Nettoyage Session Storage

```typescript
// Toujours nettoyer après usage
sessionStorage.removeItem('oauth_state');
sessionStorage.removeItem('oauth_provider');
```

---

## 🧪 Tests

### Test des Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useSecurityEvents } from '@/lib/hooks/use-security';

test('should fetch security events', async () => {
  const { result } = renderHook(() => useSecurityEvents());

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.events).toBeDefined();
  expect(result.current.events.length).toBeGreaterThan(0);
});
```

### Test des Composants

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { SecurityEventsTable } from '@/components/security';

test('should filter events by severity', () => {
  const mockEvents = [
    { id: '1', severity: 'high', description: 'Test 1' },
    { id: '2', severity: 'low', description: 'Test 2' },
  ];

  render(
    <SecurityEventsTable
      events={mockEvents}
      loading={false}
      filters={{}}
      onFiltersChange={jest.fn()}
    />
  );

  const severityFilter = screen.getByLabelText('Sévérité');
  fireEvent.change(severityFilter, { target: { value: 'high' } });

  expect(screen.getByText('Test 1')).toBeInTheDocument();
  expect(screen.queryByText('Test 2')).not.toBeInTheDocument();
});
```

---

## 📝 Checklist d'Implémentation

- ✅ Hooks React créés (`use-security.ts`, `use-2fa.ts`, `use-oauth.ts`)
- ✅ Composants UI créés (5 composants principaux)
- ✅ Page principale `/superadmin/security` créée
- ✅ Intégration avec API backend
- ✅ Gestion des erreurs et loading states
- ✅ CSRF protection pour OAuth
- ✅ Auto-refresh pour résumé des menaces
- ✅ Filtres et recherche pour événements
- ✅ Codes de secours 2FA avec copie
- ✅ Design responsive avec Tailwind CSS

---

## 🚀 Prochaines Étapes

1. **Tests E2E** - Tester le flow complet OAuth et 2FA
2. **Notifications en Temps Réel** - WebSocket pour alertes instantanées
3. **Export de Données** - Export CSV/PDF des événements de sécurité
4. **Graphiques** - Charts pour visualisation des tendances
5. **Audit Trail** - Traçabilité complète des actions admin

---

**Version**: 1.0
**Date**: Octobre 2025
**Auteur**: Équipe SmartQueue
