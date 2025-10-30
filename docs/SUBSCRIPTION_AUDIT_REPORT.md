# RAPPORT D'AUDIT - SYSTÈME DE SOUSCRIPTION SMARTQUEUE

**Date**: 26 Octobre 2025
**Scope**: Vérification de la conformité des restrictions d'accès basées sur les plans

---

## 🚨 RÉSUMÉ EXÉCUTIF

### Verdict: 🔴 SYSTÈME NON FONCTIONNEL

**Le système de souscription existe dans les modèles, mais AUCUNE restriction n'est appliquée.**

### Impact Critique

❌ **Aucune limitation appliquée aux tenants**
❌ **Perte de revenus potentielle importante**
❌ **Pas de différenciation entre plans**
❌ **Tenants peuvent utiliser indéfiniment après expiration du trial**

---

## 📊 PROBLÈMES IDENTIFIÉS

### 🔴 CRITIQUE #1: Aucune Vérification des Quotas

**Recherche exhaustive** dans le code:
- ✅ Recherche de `can_create_*`, `check_quota`: **0 résultat**
- ✅ Analyse des `perform_create`: **Aucune vérification**

**Exemples concrets**:

```python
# apps/queues/views.py (ligne 64-65)
def perform_create(self, serializer):
    serializer.save(tenant=self.request.tenant)
    # ❌ Pas de vérification de tenant.max_queues
```

**Impact**: Un tenant sur plan "Essential" (3 queues max) peut créer 100 queues.

### 🔴 CRITIQUE #2: Duplication de Modèles

**Deux SubscriptionPlan existent**:
- `apps/subscriptions/models.py`
- `apps/tenants/models.py`

**Deux Subscription existent**:
- `apps/subscriptions/models.py`
- `apps/tenants/models.py`

**Risque**: Incohérences, bugs de migration

### 🔴 CRITIQUE #3: Pas de Vérification d'État

**TenantMiddleware** (apps/core/middleware.py):
- ❌ Ne vérifie pas `tenant.is_active`
- ❌ Ne vérifie pas `subscription.status`
- ❌ Ne bloque pas si trial expiré

**Résultat**: Tenants suspendus peuvent continuer à utiliser le système

### 🟠 MAJEUR #4: Incohérence des Plans

**Trois nomenclatures différentes**:
- Management command: `essential`, `professional`, `enterprise`
- Admin views: `trial`, `starter`, `business`, `enterprise`
- Impossible de mapper correctement

### 🟠 MAJEUR #5: Limites Hardcodées

```python
# apps/tenants/admin_views.py
limits = {
    "trial": {"sites": 1, "agents": 3, "queues": 5},
    # ...
}
```

**Problème**: Modification nécessite redéploiement

### 🟡 MOYEN #6: Tasks Celery Non Implémentées

**Déclarées mais absentes**:
- `check-overdue-invoices`
- `cleanup-expired-trials`
- `retry-failed-payments`
- `generate-recurring-invoices`

**Impact**: Aucune automatisation du billing

---

## 🎯 SCÉNARIOS DE CONTOURNEMENT

### Scénario 1: Utilisation Illimitée

**Plan Essential** (limite: 5 agents, 3 queues, 500 tickets/mois)

**Réalité**:
1. Créer 50 agents → ✅ Accepté
2. Créer 100 queues → ✅ Accepté
3. Générer 10,000 tickets/mois → ✅ Accepté

**Perte revenue**: Paye 15,000 XOF/mois, utilise comme Enterprise (120,000 XOF/mois)

### Scénario 2: Trial Gratuit Infini

1. Trial de 14 jours expire → Aucune action
2. Status reste "trial" → Aucune vérification
3. Tenant continue → ✅ Accès complet
4. Aucune facture → ❌ Perte de revenu

### Scénario 3: Accès Après Suspension

1. Admin suspend (`is_active = False`)
2. Tenant tente connexion → ✅ Accepté
3. Utilisation complète → ✅ Aucune restriction

---

## 📋 PLAN DE CORRECTION (5.5 jours minimum)

### Phase 1: Stabilisation (2 jours) - CRITIQUE

**1.1 Résoudre duplication de modèles**
- Choisir `apps/subscriptions/` comme source unique
- Supprimer duplicatas dans `apps/tenants/`
- Créer migrations

**1.2 Standardiser noms de plans**
- Choisir nomenclature unique
- Mettre à jour partout

**1.3 Supprimer limites hardcodées**
- Retirer dict de admin_views.py
- Lire depuis `subscription.plan.max_*`

### Phase 2: Enforcement des Quotas (2.5 jours) - CRITIQUE

**2.1 Créer service de vérification**

Fichier: `apps/core/subscription_enforcement.py`

```python
class SubscriptionEnforcement:
    @staticmethod
    def can_create_queue(tenant) -> bool:
        current = Queue.objects.filter(tenant=tenant).count()
        max_allowed = tenant.subscription.plan.max_queues
        return current < max_allowed

    # Idem pour sites, agents, tickets
```

**2.2 Créer permission DRF**

```python
class HasQuotaForResource(BasePermission):
    def has_permission(self, request, view):
        if request.method != 'POST':
            return True

        resource_type = getattr(view, 'subscription_resource_type', None)
        # Vérifier quota selon resource_type
```

**2.3 Appliquer aux ViewSets**

```python
class QueueViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasQuotaForResource]
    subscription_resource_type = 'queue'

    def perform_create(self, serializer):
        if not SubscriptionEnforcement.can_create_queue(self.request.tenant):
            raise PermissionDenied("Limite atteinte")
        serializer.save(tenant=self.request.tenant)
```

### Phase 3: Middleware de Vérification (1 jour) - CRITIQUE

**Fichier**: `apps/core/middleware.py` (ajouter)

```python
class SubscriptionStatusMiddleware:
    def __call__(self, request):
        tenant = getattr(request, 'tenant', None)

        if tenant and not self._is_exempt_path(request.path):
            # Vérifier tenant.is_active
            if not tenant.is_active:
                return JsonResponse({'error': 'Tenant suspendu'}, status=403)

            # Vérifier subscription.status
            if tenant.subscription.status == 'cancelled':
                return JsonResponse({'error': 'Souscription annulée'}, status=403)

            # Vérifier trial expiré
            if tenant.subscription.status == 'trial':
                if timezone.now().date() > tenant.subscription.trial_ends_at:
                    return JsonResponse({'error': 'Trial expiré'}, status=403)

        return self.get_response(request)
```

---

## ⏱️ ESTIMATION

| Phase | Durée | Priorité |
|-------|-------|----------|
| Phase 1 - Stabilisation | 2 jours | 🔥 CRITIQUE |
| Phase 2 - Enforcement | 2.5 jours | 🔥 CRITIQUE |
| Phase 3 - Middleware | 1 jour | 🔥 CRITIQUE |
| **TOTAL MINIMUM** | **5.5 jours** | |

**Recommandation**: Implémenter avant mise en production

---

## ✅ CHECKLIST POST-IMPLÉMENTATION

### Tests Obligatoires

- [ ] Créer 3 queues sur plan Essential → OK
- [ ] Créer 4ème queue → ❌ Bloqué avec message
- [ ] Expirer un trial → Accès bloqué
- [ ] Suspendre un tenant → API retourne 403
- [ ] Upgrade de plan → Nouvelles limites appliquées

---

## 🚀 CONCLUSION

### État Actuel

🔴 **NON CONFORME - NE PAS METTRE EN PRODUCTION**

### Perte de Revenus Estimée

Si 10 tenants "Essential" utilisent comme "Enterprise":
- Différentiel: 105,000 XOF/tenant/mois
- **Manque à gagner**: 1,050,000 XOF/mois (~1,575 EUR/mois)

### Action Immédiate

🚨 **Implémenter Phases 1-3 AVANT production** (5.5 jours minimum)

Le système actuel représente un risque business majeur.

---

**Rapport généré le**: 26 Octobre 2025
