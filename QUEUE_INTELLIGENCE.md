# 🧠 SmartQueue - Gestion Intelligente des Files d'Attente

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Phase 1 : Intelligence Prédictive](#phase-1--intelligence-prédictive)
- [Phase 2 : Optimisation Automatique](#phase-2--optimisation-automatique)
- [Phase 3 : Analytics Avancés](#phase-3--analytics-avancés)
- [API Reference](#api-reference)
- [Intégration Frontend](#intégration-frontend)
- [Configuration Celery](#configuration-celery)

---

## 🎯 Vue d'ensemble

SmartQueue implémente un système de gestion intelligente des files d'attente avec 3 niveaux d'intelligence :

| Phase | Fonctionnalités | Status |
|-------|----------------|--------|
| **Phase 1** | ETA dynamique, Alertes, Analytics temps réel | ✅ Complète |
| **Phase 2** | Load Balancing, Optimisation, ML-based recommendations | ✅ Complète |
| **Phase 3** | Analytics avancés, A/B Testing, KPIs avancés | ✅ Complète |

---

## 🔮 Phase 1 : Intelligence Prédictive

### 1.1 Calcul d'ETA Dynamique

**Fichier:** `apps/queues/analytics.py` → `QueueAnalytics.calculate_eta()`

Calcule le temps d'attente estimé pour chaque ticket basé sur :
- Position dans la file selon l'algorithme (FIFO, Priority, SLA)
- Temps de service moyen des 50 derniers tickets
- Nombre d'agents disponibles
- Charge actuelle de la file

**Formule:**
```python
ETA = (tickets_ahead / agents_disponibles) * temps_moyen_service
```

**Exemple d'utilisation:**
```python
from apps.queues.analytics import QueueAnalytics

ticket = Ticket.objects.get(id=ticket_id)
eta_seconds = QueueAnalytics.calculate_eta(ticket)
eta_minutes = eta_seconds / 60 if eta_seconds else None
```

**Tâche Celery:** `apps.queues.tasks.update_tickets_eta` (toutes les 2 minutes)

---

### 1.2 Système d'Alertes Intelligentes

**Fichier:** `apps/queues/analytics.py` → `QueueAnalytics.get_queue_health()`

Évalue la santé d'une file avec un score 0-100 et génère des alertes automatiques.

**Types d'alertes:**

| Type | Sévérité | Condition |
|------|----------|-----------|
| `capacity` | High | File ≥ 90% de la capacité max |
| `sla_breach` | High/Medium | Tickets en retard (SLA dépassé) |
| `no_agents` | Critical | Aucun agent disponible |
| `high_wait_time` | Medium | Temps d'attente > 2x SLA |

**Score de santé:**
- **100-80** : 🟢 Bon (optimal)
- **79-50** : 🟡 Attention (needs_balancing)
- **<50** : 🔴 Critique (critical)

**Exemple:**
```python
health = QueueAnalytics.get_queue_health(queue)
print(f"Score: {health['health_score']}/100")
print(f"Alertes: {len(health['alerts'])}")
```

**Tâche Celery:** `apps.queues.tasks.check_queue_health` (toutes les 5 minutes)

---

### 1.3 Prédictions d'Affluence

**Fichier:** `apps/queues/analytics.py` → `QueueAnalytics.get_queue_predictions()`

Prédit le nombre de tickets dans la prochaine heure basé sur l'historique des 4 dernières semaines.

**Analyse:**
- Patterns horaires (même heure, même jour de semaine)
- Calcul de la capacité horaire des agents
- Recommandation de renfort si nécessaire

**Exemple:**
```python
predictions = QueueAnalytics.get_queue_predictions(queue)
print(f"Prévision: {predictions['predicted_tickets_next_hour']} tickets")
if predictions['reinforcement_needed']:
    print(f"Renfort nécessaire: {predictions['recommended_agents']} agents")
```

---

## ⚡ Phase 2 : Optimisation Automatique

### 2.1 Load Balancing Intelligent

**Fichier:** `apps/queues/optimizer.py` → `QueueOptimizer.analyze_load_balance()`

Analyse l'équilibre de charge entre toutes les files d'un tenant.

**Métrique clé:** Load Ratio = `tickets_en_attente / agents_disponibles`

**Classification:**
- **Surchargée** : ratio > 3.0
- **Équilibrée** : ratio 1.5 - 3.0
- **Sous-chargée** : ratio < 1.5

**Exemple:**
```python
from apps.queues.optimizer import QueueOptimizer

balance = QueueOptimizer.analyze_load_balance(tenant)
print(f"Score d'équilibre: {balance['balance_score']}/100")
```

---

### 2.2 Suggestions de Transfert

**Fichier:** `apps/queues/optimizer.py` → `QueueOptimizer.suggest_transfers()`

Suggère des transferts de tickets des files surchargées vers les sous-chargées.

**Dataclass:** `TransferSuggestion`
```python
@dataclass
class TransferSuggestion:
    ticket_id: str
    ticket_number: str
    from_queue_id: str
    from_queue_name: str
    to_queue_id: str
    to_queue_name: str
    reason: str
    priority: str  # 'high', 'medium', 'low'
    estimated_time_saved: int  # en secondes
```

**Critères:**
- Source : files avec ratio > 3
- Destination : files avec ratio < 1.5 et agents disponibles
- Temps économisé : minimum 60 secondes

**Priorisation:**
- **High** : > 5 min économisées
- **Medium** : 2-5 min économisées
- **Low** : 1-2 min économisées

---

### 2.3 Réallocation d'Agents

**Fichier:** `apps/queues/optimizer.py` → `QueueOptimizer.suggest_agent_reallocation()`

Suggère des déplacements d'agents entre files pour optimiser la capacité.

**Dataclass:** `AgentReallocationSuggestion`
```python
@dataclass
class AgentReallocationSuggestion:
    agent_id: str
    agent_name: str
    from_queue_id: str | None
    from_queue_name: str | None
    to_queue_id: str
    to_queue_name: str
    reason: str
    impact_score: float  # 0-100
```

**Logique:**
- Identifier les files avec ratio > 3 et > 5 tickets (besoin de renfort)
- Identifier les files avec agents disponibles et < 2 tickets (capacité excédentaire)
- Impact = min(100, load_ratio * 10)

---

### 2.4 Recommandations d'Algorithme ML-Based

**Fichier:** `apps/queues/optimizer.py` → `QueueOptimizer.recommend_algorithm()`

Analyse l'historique des 7 derniers jours et recommande l'algorithme optimal.

**Algorithmes disponibles:**

| Algorithme | Cas d'usage | Recommandé si |
|------------|-------------|---------------|
| **FIFO** | Distribution uniforme | Taux priorité < 30%, SLA OK |
| **Priority** | Gestion des urgences | Taux priorité > 30% |
| **SLA** | Respect des délais | Taux dépassement SLA > 20% |

**Métriques analysées:**
- Taux de tickets haute priorité (priority ≥ 5)
- Taux de dépassement SLA
- Distribution temporelle

**Niveau de confiance:**
- **High** : > 100 tickets dans l'historique
- **Medium** : 10-100 tickets
- **Low** : < 10 tickets

---

## 📊 Phase 3 : Analytics Avancés

**Status:** ✅ **COMPLÈTE**

**Fichier:** `apps/queues/analytics_advanced.py`

Cette phase fournit des KPIs avancés, des visualisations et un framework de test A/B pour optimiser les algorithmes de file d'attente.

### 3.1 KPIs & Métriques Avancées

#### 3.1.1 Taux d'Abandon (Abandonment Rate)

**Méthode:** `AdvancedAnalytics.calculate_abandonment_rate(queue, period_days=7)`

Calcule le pourcentage de tickets abandonnés (no-show ou dépassant 2x SLA).

**Utilisation:**
```python
from apps.queues.analytics_advanced import AdvancedAnalytics

queue = Queue.objects.get(id=queue_id)
abandonment = AdvancedAnalytics.calculate_abandonment_rate(queue, period_days=7)
# {
#   "abandonment_rate": 12.5,
#   "total_tickets": 120,
#   "abandoned_count": 15,
#   "period_days": 7
# }
```

**Formule:**
```python
abandonment_rate = (abandoned_tickets / total_tickets) * 100
# Abandoned = STATUS_NO_SHOW OR (STATUS_WAITING AND created > 2x SLA)
```

#### 3.1.2 Utilisation des Agents (Agent Utilization)

**Méthode:** `AdvancedAnalytics.calculate_agent_utilization(queue, period_days=7)`

Calcule le taux d'occupation de chaque agent et la moyenne de la file.

**Utilisation:**
```python
utilization = AdvancedAnalytics.calculate_agent_utilization(queue, period_days=7)
# {
#   "overall_utilization_rate": 67.5,
#   "agents_data": [
#     {
#       "agent_id": "uuid",
#       "agent_name": "John Doe",
#       "tickets_served": 45,
#       "total_service_seconds": 27000,
#       "available_seconds": 40000,
#       "utilization_rate": 67.5
#     }
#   ],
#   "average_service_seconds": 600,
#   "period_days": 7
# }
```

**Formule:**
```python
utilization_rate = (total_service_time / available_time) * 100
# available_time = period_days * 8 hours * 3600 seconds
```

#### 3.1.3 Conformité SLA (SLA Compliance)

**Méthode:** `AdvancedAnalytics.calculate_sla_compliance_rate(queue, period_days=7)`

Pourcentage de tickets traités dans les délais SLA.

**Utilisation:**
```python
sla = AdvancedAnalytics.calculate_sla_compliance_rate(queue, period_days=7)
# {
#   "compliance_rate": 85.0,
#   "compliant_count": 102,
#   "non_compliant_count": 18,
#   "total_count": 120,
#   "sla_seconds": 1800,
#   "period_days": 7
# }
```

**Formule:**
```python
compliance_rate = (tickets_within_sla / total_closed_tickets) * 100
# within_sla = (started_at - created_at) <= sla_seconds
```

#### 3.1.4 Satisfaction Client (CSAT/NPS)

**Méthode:** `AdvancedAnalytics.get_csat_by_queue(queue, period_days=30)`

Calcule le score CSAT moyen et le NPS (Net Promoter Score).

**Utilisation:**
```python
csat = AdvancedAnalytics.get_csat_by_queue(queue, period_days=30)
# {
#   "average_csat": 4.2,
#   "nps_score": 35.5,
#   "total_feedback": 100,
#   "promoters_count": 60,  # rating 4-5
#   "passives_count": 25,   # rating 3
#   "detractors_count": 15, # rating 1-2
#   "rating_distribution": {"1": 5, "2": 10, "3": 25, "4": 30, "5": 30},
#   "period_days": 30
# }
```

**Formule NPS:**
```python
nps_score = ((promoters - detractors) / total_feedback) * 100
```

### 3.2 Heatmaps & Tendances

#### 3.2.1 Heatmap Horaire

**Méthode:** `AdvancedAnalytics.generate_hourly_heatmap(queue, period_days=7)`

Génère le volume moyen de tickets par heure de la journée.

**Utilisation:**
```python
heatmap = AdvancedAnalytics.generate_hourly_heatmap(queue, period_days=7)
# {
#   "heatmap": {
#     0: 2.3, 1: 1.1, 2: 0.5, ..., 23: 3.2
#   },
#   "peak_hour": 14,
#   "peak_volume": 15.7,
#   "period_days": 7
# }
```

**Application:** Identifier les heures de pointe pour planifier les ressources.

#### 3.2.2 Tendances Quotidiennes

**Méthode:** `AdvancedAnalytics.generate_daily_trends(queue, period_days=30)`

Génère les tendances quotidiennes pour tickets, temps d'attente et temps de service.

**Utilisation:**
```python
trends = AdvancedAnalytics.generate_daily_trends(queue, period_days=30)
# {
#   "tickets_trend": [
#     {"date": "2025-01-01", "count": 45},
#     {"date": "2025-01-02", "count": 52},
#     ...
#   ],
#   "wait_time_trend": [
#     {"date": "2025-01-01", "avg_wait_seconds": 420},
#     ...
#   ],
#   "service_time_trend": [
#     {"date": "2025-01-01", "avg_service_seconds": 600},
#     ...
#   ],
#   "period_days": 30
# }
```

**Application:** Visualisation graphique pour détecter anomalies et tendances.

### 3.3 A/B Testing des Algorithmes

**Fichier:** `apps/queues/analytics_advanced.py` → `ABTestingFramework`

Framework pour comparer l'efficacité de différents algorithmes.

#### 3.3.1 Créer une Configuration de Test

**Méthode:** `ABTestingFramework.create_ab_test(queue, algorithm_a, algorithm_b, duration_days=7)`

**Utilisation:**
```python
from apps.queues.analytics_advanced import ABTestingFramework

test_config = ABTestingFramework.create_ab_test(
    queue=queue,
    algorithm_a="fifo",
    algorithm_b="priority",
    duration_days=7
)
# {
#   "queue_id": "uuid",
#   "queue_name": "File Principale",
#   "algorithm_a": "fifo",
#   "algorithm_b": "priority",
#   "current_algorithm": "fifo",
#   "start_date": "2025-01-15",
#   "end_date": "2025-01-22",
#   "duration_days": 7,
#   "status": "ready"
# }
```

#### 3.3.2 Comparer les Performances

**Méthode:** `ABTestingFramework.compare_algorithms(...)`

Compare les métriques de deux algorithmes sur des périodes différentes.

**Utilisation:**
```python
from datetime import datetime

comparison = ABTestingFramework.compare_algorithms(
    queue=queue,
    algorithm_a="fifo",
    period_a_start=datetime(2025, 1, 1),
    period_a_end=datetime(2025, 1, 7),
    algorithm_b="priority",
    period_b_start=datetime(2025, 1, 8),
    period_b_end=datetime(2025, 1, 14)
)
# {
#   "algorithm_a": {
#     "name": "fifo",
#     "period_start": "2025-01-01",
#     "period_end": "2025-01-07",
#     "metrics": {
#       "total_tickets": 120,
#       "closed_tickets": 115,
#       "avg_wait_seconds": 600,
#       "avg_service_seconds": 420,
#       "abandonment_rate": 4.2
#     }
#   },
#   "algorithm_b": { ... },
#   "improvements": {
#     "wait_time_improvement_percent": 15.5,
#     "abandonment_improvement_percent": 25.3
#   },
#   "winner": "priority",
#   "recommendation": "Algorithm 'priority' shows better performance"
# }
```

**Critères de sélection du gagnant:**
- Amélioration > 5% sur temps d'attente ET abandon → Gagnant B
- Dégradation > 5% sur les deux → Gagnant A
- Sinon → Tie (ex-aequo)

---

## 🔌 API Reference

### Endpoints Phase 1 - Analytics

#### `GET /api/v1/tenants/{slug}/queues/overview/`
Vue d'ensemble de toutes les files avec santé et métriques.

**Response:**
```json
{
  "queues": [
    {
      "id": "uuid",
      "name": "File Example",
      "status": "active",
      "algorithm": "fifo",
      "health_score": 85,
      "health_status": "good",
      "alerts_count": 0,
      "critical_alerts": 0,
      "waiting_count": 5,
      "in_service_count": 2
    }
  ],
  "total_queues": 3,
  "queues_with_alerts": 0
}
```

#### `GET /api/v1/tenants/{slug}/queues/{id}/health/`
Santé et alertes d'une file spécifique.

**Response:**
```json
{
  "health_score": 85,
  "status": "good",
  "alerts": [
    {
      "type": "sla_breach",
      "severity": "medium",
      "message": "2 ticket(s) en retard (SLA dépassé)",
      "details": {"rate": 15.5}
    }
  ],
  "metrics": {
    "waiting_count": 12,
    "available_agents": 3,
    "late_tickets_count": 2,
    "sla_breach_rate": 15.5,
    "avg_eta_seconds": 420
  }
}
```

#### `GET /api/v1/tenants/{slug}/queues/{id}/predictions/`
Prédictions d'affluence pour la prochaine heure.

**Response:**
```json
{
  "predicted_tickets_next_hour": 15,
  "current_waiting": 8,
  "confidence": "medium",
  "reinforcement_needed": true,
  "recommended_agents": 2
}
```

#### `GET /api/v1/tenants/{slug}/queues/{id}/stats/`
Statistiques détaillées en temps réel.

**Response:**
```json
{
  "id": "uuid",
  "name": "File Example",
  "status": "active",
  "algorithm": "fifo",
  "waiting_count": 8,
  "called_count": 2,
  "in_service_count": 3,
  "avg_wait_seconds": 450
}
```

---

### Endpoints Phase 2 - Optimisation

#### `GET /api/v1/tenants/{slug}/queues/load_balance/`
Analyse de l'équilibre de charge.

**Response:**
```json
{
  "balance_score": 75.5,
  "status": "needs_balancing",
  "total_waiting_tickets": 25,
  "queues_data": [
    {
      "queue_id": "uuid",
      "queue_name": "File Surchargée",
      "waiting_count": 15,
      "available_agents": 2,
      "load_ratio": 7.5
    }
  ],
  "max_load_ratio": 7.5,
  "min_load_ratio": 1.2
}
```

#### `GET /api/v1/tenants/{slug}/queues/optimization_report/`
Rapport complet d'optimisation avec toutes les suggestions.

**Response:**
```json
{
  "load_balance": { /* ... */ },
  "transfer_suggestions": [
    {
      "ticket_id": "uuid",
      "ticket_number": "A001",
      "from_queue": {"id": "uuid", "name": "File 1"},
      "to_queue": {"id": "uuid", "name": "File 2"},
      "reason": "Équilibrage de charge (15 tickets en attente)",
      "priority": "high",
      "estimated_time_saved_minutes": 5.5
    }
  ],
  "agent_reallocation_suggestions": [
    {
      "agent_id": "uuid",
      "agent_name": "Jean Dupont",
      "from_queue": {"id": "uuid", "name": "File A"},
      "to_queue": {"id": "uuid", "name": "File B"},
      "reason": "File surchargée (20 tickets, ratio 10.0)",
      "impact_score": 85.0
    }
  ],
  "algorithm_recommendations": [
    {
      "queue_id": "uuid",
      "queue_name": "File Example",
      "current_algorithm": "fifo",
      "recommended_algorithm": "sla",
      "reason": "Taux de dépassement SLA élevé (25.5%)",
      "confidence": "high",
      "expected_improvement": "Réduction de 30-40% des dépassements SLA"
    }
  ],
  "summary": {
    "total_transfer_suggestions": 5,
    "total_agent_suggestions": 2,
    "total_algorithm_changes": 1,
    "optimization_priority": "high"
  }
}
```

#### `GET /api/v1/tenants/{slug}/queues/{id}/algorithm_recommendation/`
Recommandation d'algorithme pour une file spécifique.

**Response:**
```json
{
  "recommended_algorithm": "priority",
  "current_algorithm": "fifo",
  "reason": "Haute proportion de tickets prioritaires (35.2%)",
  "confidence": "high",
  "expected_improvement": "Meilleure gestion des urgences"
}
```

### Endpoints Phase 3 - Advanced Analytics

#### `GET /api/v1/tenants/{slug}/queues/{id}/abandonment_rate/`
Taux d'abandon des tickets pour une file.

**Query Parameters:**
- `period_days` (int, optionnel): Période en jours (défaut: 7)

**Response:**
```json
{
  "abandonment_rate": 12.5,
  "total_tickets": 120,
  "abandoned_count": 15,
  "period_days": 7
}
```

#### `GET /api/v1/tenants/{slug}/queues/{id}/agent_utilization/`
Taux d'utilisation des agents d'une file.

**Query Parameters:**
- `period_days` (int, optionnel): Période en jours (défaut: 7)

**Response:**
```json
{
  "overall_utilization_rate": 67.5,
  "agents_data": [
    {
      "agent_id": "uuid",
      "agent_name": "John Doe",
      "tickets_served": 45,
      "total_service_seconds": 27000,
      "available_seconds": 40000,
      "utilization_rate": 67.5
    }
  ],
  "average_service_seconds": 600,
  "period_days": 7
}
```

#### `GET /api/v1/tenants/{slug}/queues/{id}/sla_compliance/`
Taux de conformité SLA d'une file.

**Query Parameters:**
- `period_days` (int, optionnel): Période en jours (défaut: 7)

**Response:**
```json
{
  "compliance_rate": 85.0,
  "compliant_count": 102,
  "non_compliant_count": 18,
  "total_count": 120,
  "sla_seconds": 1800,
  "period_days": 7
}
```

#### `GET /api/v1/tenants/{slug}/queues/{id}/csat/`
Métriques de satisfaction client (CSAT/NPS).

**Query Parameters:**
- `period_days` (int, optionnel): Période en jours (défaut: 30)

**Response:**
```json
{
  "average_csat": 4.2,
  "nps_score": 35.5,
  "total_feedback": 100,
  "promoters_count": 60,
  "passives_count": 25,
  "detractors_count": 15,
  "rating_distribution": {
    "1": 5,
    "2": 10,
    "3": 25,
    "4": 30,
    "5": 30
  },
  "period_days": 30
}
```

#### `GET /api/v1/tenants/{slug}/queues/{id}/hourly_heatmap/`
Heatmap horaire du volume de tickets.

**Query Parameters:**
- `period_days` (int, optionnel): Période en jours (défaut: 7)

**Response:**
```json
{
  "heatmap": {
    "0": 2.3,
    "1": 1.1,
    "2": 0.5,
    "14": 15.7,
    "23": 3.2
  },
  "peak_hour": 14,
  "peak_volume": 15.7,
  "period_days": 7
}
```

#### `GET /api/v1/tenants/{slug}/queues/{id}/daily_trends/`
Tendances quotidiennes (tickets, temps d'attente, temps de service).

**Query Parameters:**
- `period_days` (int, optionnel): Période en jours (défaut: 30)

**Response:**
```json
{
  "tickets_trend": [
    {"date": "2025-01-01", "count": 45},
    {"date": "2025-01-02", "count": 52}
  ],
  "wait_time_trend": [
    {"date": "2025-01-01", "avg_wait_seconds": 420}
  ],
  "service_time_trend": [
    {"date": "2025-01-01", "avg_service_seconds": 600}
  ],
  "period_days": 30
}
```

#### `POST /api/v1/tenants/{slug}/queues/{id}/create_ab_test/`
Créer une configuration de test A/B pour comparer des algorithmes.

**Permission:** Tenant Admin uniquement

**Request Body:**
```json
{
  "algorithm_a": "fifo",
  "algorithm_b": "priority",
  "duration_days": 7
}
```

**Response:**
```json
{
  "queue_id": "uuid",
  "queue_name": "File Principale",
  "algorithm_a": "fifo",
  "algorithm_b": "priority",
  "current_algorithm": "fifo",
  "start_date": "2025-01-15",
  "end_date": "2025-01-22",
  "duration_days": 7,
  "status": "ready"
}
```

#### `POST /api/v1/tenants/{slug}/queues/{id}/compare_algorithms/`
Comparer les performances de deux algorithmes sur des périodes différentes.

**Request Body:**
```json
{
  "algorithm_a": "fifo",
  "period_a_start": "2025-01-01",
  "period_a_end": "2025-01-07",
  "algorithm_b": "priority",
  "period_b_start": "2025-01-08",
  "period_b_end": "2025-01-14"
}
```

**Response:**
```json
{
  "algorithm_a": {
    "name": "fifo",
    "period_start": "2025-01-01",
    "period_end": "2025-01-07",
    "metrics": {
      "total_tickets": 120,
      "closed_tickets": 115,
      "avg_wait_seconds": 600,
      "avg_service_seconds": 420,
      "abandonment_rate": 4.2
    }
  },
  "algorithm_b": {
    "name": "priority",
    "period_start": "2025-01-08",
    "period_end": "2025-01-14",
    "metrics": {
      "total_tickets": 125,
      "closed_tickets": 122,
      "avg_wait_seconds": 510,
      "avg_service_seconds": 400,
      "abandonment_rate": 2.4
    }
  },
  "improvements": {
    "wait_time_improvement_percent": 15.0,
    "abandonment_improvement_percent": 42.9
  },
  "winner": "priority",
  "recommendation": "Algorithm 'priority' shows better performance"
}
```

---

## 🖥️ Intégration Frontend

### Hooks React Query

**Fichier:** `back_office/lib/hooks/use-queue-intelligence.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';

export function useQueuesOverview() {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: ['queues', 'overview', currentTenant?.slug],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/overview/`
      );
      return response.data;
    },
    enabled: !!currentTenant,
    refetchInterval: 30000, // Refresh toutes les 30s
  });
}

export function useQueueHealth(queueId: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: ['queue', queueId, 'health'],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/${queueId}/health/`
      );
      return response.data;
    },
    enabled: !!currentTenant && !!queueId,
    refetchInterval: 60000, // Refresh toutes les 60s
  });
}

export function useOptimizationReport() {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: ['optimization', 'report', currentTenant?.slug],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/optimization_report/`
      );
      return response.data;
    },
    enabled: !!currentTenant,
  });
}
```

---

## ⏰ Configuration Celery

### Tâches Périodiques

**Fichier:** `smartqueue_backend/settings/base.py`

```python
CELERY_BEAT_SCHEDULE = {
    # Mise à jour ETA toutes les 2 minutes
    'update-tickets-eta': {
        'task': 'apps.queues.tasks.update_tickets_eta',
        'schedule': 120.0,
        'options': {'expires': 60},
    },

    # Vérification santé des files toutes les 5 minutes
    'check-queue-health': {
        'task': 'apps.queues.tasks.check_queue_health',
        'schedule': 300.0,
        'options': {'expires': 120},
    },

    # Nettoyage des vieux tickets quotidiennement à 4h00
    'cleanup-old-tickets': {
        'task': 'apps.queues.tasks.cleanup_old_tickets',
        'schedule': crontab(hour=4, minute=0),
        'options': {'expires': 3600},
    },
}
```

### Lancement des Workers

```bash
# Worker Celery
make celery
# ou
. backend/.venv/bin/activate && \
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev \
celery -A smartqueue_backend worker -l info

# Beat Scheduler
make beat
# ou
. backend/.venv/bin/activate && \
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev \
celery -A smartqueue_backend beat -l info
```

---

## 🎯 Cas d'Usage

### 1. Monitoring en Temps Réel

**Dashboard Manager:**
- Vue d'ensemble des files avec scores de santé
- Alertes en temps réel
- Actions rapides sur les alertes critiques

### 2. Optimisation Proactive

**Rapport d'optimisation quotidien:**
- Généré automatiquement chaque matin
- Suggestions de transferts pour la journée
- Recommandations de réallocation d'agents

### 3. Analyse de Performance

**Rapports hebdomadaires:**
- Évolution des KPIs
- Comparaison inter-files
- Identification des goulots d'étranglement

### 4. Amélioration Continue

**A/B Testing d'algorithmes:**
- Test de FIFO vs Priority sur 2 semaines
- Métriques de comparaison
- Recommandation basée sur les résultats

---

## 🚀 Prochaines Étapes

- [ ] Dashboard frontend avec visualisations temps réel
- [ ] Phase 3 : Analytics avancés et rapports exportables
- [ ] Notifications push pour les alertes critiques
- [ ] API webhooks pour intégrations externes
- [ ] Machine Learning avancé pour prédictions plus précises

---

## 📞 Support

Pour toute question ou suggestion d'amélioration, consultez la documentation principale dans [README.md](./README.md) ou [CLAUDE.md](./CLAUDE.md).
