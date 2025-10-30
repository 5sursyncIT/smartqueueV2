# Rapport de Cohérence des Plans d'Abonnement

**Date:** 2025-01-29
**Status:** ✅ CORRIGÉ

---

## 📊 Résumé Exécutif

### Problèmes Identifiés

1. **Incohérence de nommage des plans**
   - Interface: STARTER
   - Base de données (ancien): trial, starter, standard, business
   - Base de données (nouveau): Essential, Professional, Enterprise

2. **Quotas changés avec les nouveaux plans**
   - Ancien "starter": Files=10
   - Nouveau "Essential": Files=3
   - Impact: Clinique Madeleine affiche 2/10 mais devrait afficher 2/3

3. **Comptage d'agents différent**
   - Interface: 2 agents
   - Base de données: 3 agents (TenantMembership)

---

## 🔍 Analyse Détaillée

### Plans Disponibles

| Plan | Prix/Mois | Sites | Agents | Queues | Tickets/Mois |
|------|-----------|-------|--------|--------|--------------|
| **Essential** | 15,000 F CFA | 1 | 5 | 3 | 500 |
| **Professional** | 45,000 F CFA | 3 | 20 | 10 | 2,000 |
| **Enterprise** | 120,000 F CFA | 999 | 999 | 999 | 999,999 |

### État des Organisations

#### ✅ Demo Bank
- **Plan:** Professional
- **Souscription:** Active
- **Utilisation:** Sites=2/3, Agents=6/20, Queues=4/10
- **Status:** Tout est cohérent ✓

#### ⚠️ Clinique Madeleine (INCOHÉRENCES DÉTECTÉES)
- **Plan Interface:** STARTER
- **Plan Base de Données:** Essential
- **Souscription:** Active

**Comparaison Interface vs Base de Données:**

| Ressource | Interface | Base de Données | Status |
|-----------|-----------|-----------------|--------|
| **Sites** | 1/1 | 1/1 | ✅ OK |
| **Agents** | 2/5 | 3/5 | ❌ INCOHÉRENT |
| **Files** | 2/10 | 2/3 | ⚠️ QUOTA CHANGÉ |

**Problèmes:**
1. L'interface affiche "STARTER" mais le plan n'existe plus (remplacé par "Essential")
2. L'interface affiche 2 agents mais la DB en compte 3
3. L'interface affiche quota de 10 files mais Essential permet seulement 3

#### ✅ Banque Atlantique
- **Plan:** Essential (migré depuis "trial")
- **Utilisation:** Sites=0/1, Agents=0/5, Queues=0/3
- **Status:** Cohérent ✓

#### ✅ Restaurant Le Lagon
- **Plan:** Essential (migré depuis "business" → Professional → corrigé vers Essential)
- **Utilisation:** Sites=0/1, Agents=0/5, Queues=0/3
- **Status:** Cohérent ✓

---

## 🔧 Corrections Appliquées

### 1. Migration du Schéma de Base de Données

**Problème:** Colonnes nommées `price_monthly`/`price_yearly` au lieu de `monthly_price`/`yearly_price`

**Solution:**
```sql
ALTER TABLE subscription_plans RENAME COLUMN price_monthly TO monthly_price;
ALTER TABLE subscription_plans RENAME COLUMN price_yearly TO yearly_price;
ALTER TABLE subscription_plans ADD COLUMN display_order INTEGER DEFAULT 0;
-- Suppression de is_featured (non utilisée)
```

### 2. Conversion des Souscriptions (plan CharField → FK)

**Problème:** `subscriptions.plan` était un varchar contenant des strings ("professional", "essential") au lieu d'une FK vers SubscriptionPlan

**Solution:**
```sql
-- Créé nouvelle table avec plan_id (FK)
CREATE TABLE subscriptions_new (..., plan_id char(32) REFERENCES subscription_plans(id), ...)

-- Mapping des anciennes valeurs:
trial → essential
starter → essential
standard → professional
business → professional
professional → professional
enterprise → enterprise
```

### 3. Mise à Jour des Tenants

**Migration 0008 appliquée:**
- Demo Bank: standard → Professional (quotas: 3 sites, 20 agents, 10 queues)
- Banque Atlantique: trial → Essential (quotas: 1 site, 5 agents, 3 queues)
- Clinique Madeleine: starter → Essential (quotas: 1 site, 5 agents, 3 queues)
- Restaurant Le Lagon: business → Professional → Essential (souscription créée)

---

## 📋 Actions Recommandées pour l'Interface

### 1. Mettre à jour l'affichage du plan

**Clinique Madeleine:**
- ❌ Actuel: "STARTER"
- ✅ Correct: "Essential"

**Code à modifier (back_office):**
```typescript
// Au lieu d'afficher tenant.plan directement
<Badge>{tenant.plan}</Badge>

// Afficher le nom du plan de souscription
<Badge>{subscription?.plan?.name}</Badge>
```

### 2. Mettre à jour les quotas affichés

**Clinique Madeleine - Files d'attente:**
- ❌ Actuel: "2/10"
- ✅ Correct: "2/3"

**Code à modifier:**
```typescript
// Utiliser subscription.plan.max_queues au lieu de tenant.max_queues
const maxQueues = subscription?.plan?.max_queues || tenant.max_queues;
```

### 3. Corriger le comptage des agents

**Clinique Madeleine:**
- ❌ Interface: 2 agents
- ✅ DB: 3 agents

**Vérification requise:**
```sql
SELECT user_id, role, is_active
FROM tenant_memberships
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'clinique-madeleine');
```

Vérifier si un agent est marqué inactif ou si c'est un problème de cache frontend.

---

## 🎯 Plan d'Action Frontend

### Priorité 1: Corriger l'affichage du plan

**Fichier:** `back_office/app/(admin)/organizations/[slug]/page.tsx`

**Modification:**
```typescript
// AVANT
<div className="text-sm text-muted-foreground">Plan actuel</div>
<Badge>{tenant.plan}</Badge>

// APRÈS
<div className="text-sm text-muted-foreground">Plan actuel</div>
<Badge>{subscription?.plan?.name || 'Aucun'}</Badge>
```

### Priorité 2: Utiliser les quotas du plan de souscription

**Fichier:** `back_office/app/(admin)/organizations/[slug]/page.tsx`

**Modification:**
```typescript
// Au lieu de
const maxSites = tenant.max_sites;
const maxAgents = tenant.max_agents;
const maxQueues = tenant.max_queues;

// Utiliser
const maxSites = subscription?.plan?.max_sites || tenant.max_sites;
const maxAgents = subscription?.plan?.max_agents || tenant.max_agents;
const maxQueues = subscription?.plan?.max_queues || tenant.max_queues;
const maxTickets = subscription?.plan?.max_tickets_per_month;
```

### Priorité 3: Ajouter l'endpoint `/usage`

**Hook à créer:** `back_office/lib/hooks/use-subscription.ts`

```typescript
export function useSubscriptionUsage(tenantSlug: string) {
  return useQuery({
    queryKey: ['subscription-usage', tenantSlug],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/current/usage/`, {
        headers: { 'X-Tenant': tenantSlug }
      });
      return data;
    }
  });
}
```

**Interface à créer:**
```typescript
interface SubscriptionUsage {
  sites: {
    current: number;
    max: number;
    percentage: number;
    available: number;
  };
  agents: { ... };
  queues: { ... };
  tickets_this_month: { ... };
}
```

---

## 🧪 Tests de Validation

### Checklist Backend

- [x] Plans créés avec les bons quotas
- [x] Souscriptions converties (FK vers SubscriptionPlan)
- [x] Tenants mis à jour avec les nouveaux quotas
- [x] Migration 0007 et 0008 appliquées
- [x] Endpoint `/usage` créé

### Checklist Frontend (À FAIRE)

- [ ] Affichage du nom du plan correct ("Essential" au lieu de "starter")
- [ ] Quotas affichés correspondent au plan de souscription
- [ ] Comptage correct des agents (3 au lieu de 2 pour Clinique Madeleine)
- [ ] Endpoint `/usage` intégré dans le dashboard
- [ ] Badge de plan avec couleur appropriée

### Tests Manuels

**Test 1: Vérifier l'affichage pour Clinique Madeleine**
```
URL: http://localhost:3000/admin/organizations/clinique-madeleine
Vérifier:
- Plan affiché: "Essential" (pas "STARTER")
- Sites: 1/1 ✓
- Agents: 3/5 (mettre à jour si affiche 2/5)
- Files d'attente: 2/3 (mettre à jour si affiche 2/10)
```

**Test 2: Vérifier l'API /usage**
```bash
curl -X GET "http://localhost:8000/api/v1/tenants/current/usage/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant: clinique-madeleine"

# Doit retourner:
{
  "sites": {"current": 1, "max": 1, "percentage": 100, "available": 0},
  "agents": {"current": 3, "max": 5, "percentage": 60, "available": 2},
  "queues": {"current": 2, "max": 3, "percentage": 66.67, "available": 1},
  "tickets_this_month": {"current": X, "max": 500, ...}
}
```

---

## 📈 Impact Business

### Avant Correction
- ❌ Plans incohérents entre interface et DB
- ❌ Quotas incorrects affichés
- ❌ Risque de confusion pour les clients
- ❌ Système d'enforcement non fonctionnel

### Après Correction
- ✅ Plans standardisés (Essential/Professional/Enterprise)
- ✅ Quotas enforcement actif (3 couches de protection)
- ✅ Base de données cohérente
- ⚠️ Frontend nécessite mise à jour pour refléter les changements

### Revenue Impact

**Clinique Madeleine:**
- Ancien quota: 10 files d'attente (plan "starter" custom)
- Nouveau quota: 3 files d'attente (plan Essential standard)
- Utilisation actuelle: 2 files

**Recommandation:**
Si Clinique Madeleine a besoin de plus de 3 files:
1. Option A: Upgrade vers Professional (45,000 F CFA/mois) → 10 files
2. Option B: Créer un plan custom "Essential Plus" avec 10 files
3. Option C: Augmenter le quota Essential à 10 files pour tous

---

## 🔄 Migration Prochaines Étapes

### Court Terme (Cette Semaine)

1. **Frontend Update (2h)**
   - Modifier affichage du plan
   - Utiliser quotas de subscription.plan
   - Intégrer endpoint `/usage`

2. **Testing (1h)**
   - Vérifier tous les tenants
   - Valider comptage agents
   - Tester quota enforcement

3. **Documentation (30min)**
   - Mettre à jour docs API
   - Guide migration pour clients existants

### Moyen Terme (Semaine Prochaine)

1. **Review Quotas**
   - Analyser utilisation réelle
   - Ajuster quotas si nécessaire
   - Communiquer changements aux clients

2. **Frontend Dashboard**
   - Visualisation de l'utilisation en temps réel
   - Alertes quand proche de la limite
   - Suggestions d'upgrade

---

## 📝 Notes Techniques

### Structure des Modèles

```python
class SubscriptionPlan(TimeStampedModel):
    name = CharField(max_length=100, unique=True)
    slug = SlugField(unique=True)
    monthly_price = DecimalField(...)  # ✓ Corrigé (était price_monthly)
    yearly_price = DecimalField(...)   # ✓ Corrigé (était price_yearly)
    max_sites = PositiveIntegerField(default=1)
    max_agents = PositiveIntegerField(default=5)
    max_queues = PositiveIntegerField(default=3)
    max_tickets_per_month = PositiveIntegerField(default=500)

class Subscription(TimeStampedModel):
    tenant = OneToOneField(Tenant, related_name='subscription')
    plan = ForeignKey(SubscriptionPlan)  # ✓ Corrigé (était CharField)
    status = CharField(choices=[...])
    # ...

class Tenant(TimeStampedModel):
    plan = CharField(...)  # Gardé pour compatibilité, utiliser subscription.plan
    max_sites = PositiveIntegerField(...)  # Synchronisé avec plan
    max_agents = PositiveIntegerField(...)
    max_queues = PositiveIntegerField(...)
```

### Endpoints API

```
GET /api/v1/tenants/current/             # Info tenant
GET /api/v1/tenants/current/usage/       # Stats utilisation vs quotas ✓ NOUVEAU
GET /api/v1/admin/subscription-plans/    # Liste des plans (super-admin)
```

---

## ✅ Conclusion

**Status Final:** ✅ Backend corrigé, Frontend nécessite mise à jour

**Résumé:**
- ✅ Base de données cohérente
- ✅ Plans standardisés
- ✅ Quota enforcement actif
- ⚠️ Interface à mettre à jour

**Temps Estimé pour Compléter:**
- Frontend fixes: 2-3 heures
- Testing: 1 heure
- **Total: 3-4 heures**

---

**Responsable:** Claude Code
**Date de Correction:** 2025-01-29
**Prochaine Revue:** Après mise à jour frontend
