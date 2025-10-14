# 1) Objectifs & périmètre

* **But** : Orchestrer l’expérience d’accueil en agence : files d’attente virtuelles, prise de rendez-vous, bornes, affichage dynamique, notifications (SMS/WhatsApp/e-mail/push), feedback (NPS/CSAT), analytics & CRM léger.
* **Cible** : banques, télécoms, santé, administrations, retail, transport.
* **Forme** : **SaaS multi-tenant** (un seul déploiement, isolation stricte des données), web + mobile + kiosques + écrans d’affichage.
* **KPI** : temps d’attente moyen/médian, temps de service, no-show, taux d’utilisation des guichets, NPS/CSAT, SLA de la plateforme.

# 2) Rôles & permissions (RBAC)

* **Super-admin (plateforme)** : gestion globale (tenants, facturation, plans, quotas).
* **Admin tenant** : paramètres d’agence(s), services, ressources, horaires, intégrations.
* **Manager** : supervision temps réel, reporting, exports, gestion d’équipe.
* **Agent/guichet** : console d’appel, transfert, mise en pause, clôture de ticket.
* **Opérateur kiosque/affichage** : accès appareil limité (device keys).
* **Client final** : prise de ticket/rdv, suivi, notifications, feedback.
* **Scopes API** : `read:queue`, `write:queue`, `manage:tenant`, etc.

# 3) Parcours & fonctionnalités

## 3.1 Files d’attente (virtuel & sur site)

* Entrée omnicanale : **QR**, **web/mobile**, **WhatsApp**, **USSD** (via agrégateur), **borne**.
* Ticket avec **position** + **ETA** (prévision par modèle statistique).
* Statuts : `en_attente`, `appelé`, `en_service`, `pause`, `transféré`, `clôturé`, `no_show`.
* Règles d’ordonnancement : FIFO, par service, **priorité** (VIP/Senior), **SLA-aware** (remonter ceux proches de l’objectif).
* **Transfert inter-files**, multi-file, multi-site optionnel (hub/cluster).
* **Notifications** : confirmation, rappel avant passage, “c’est votre tour”, post-service.

## 3.2 Rendez-vous

* Créneaux par service/ressource, capacité, buffers, double booking optionnel.
* Rappels automatiques (J-1, H-1), conversion no-show → replanification.
* Lien avec files (file dédiée “RDV”, priorité à l’heure dite).

## 3.3 Bornes & affichage dynamique

* **Borne** : check-in RDV, prise de ticket (sélection service), impression (option), accessibilité (large police, voix).
* **Affichage** : mur d’écrans avec WebSocket (numéro appelé, guichet, annonces).
* **Console agent** : appel, rappel, transfert, mise en pause, durée de service visible.

## 3.4 Feedback & CRM léger

* Enquête **CSAT/NPS** post-service (SMS/WhatsApp/web), étiquetage motifs.
* Fiche client minimale : identifiants, historique des passages, consentements, tags.
* Export/interop (CSV, Webhooks, API).

## 3.5 Analytics & supervision

* Temps réel (occupancy, WIP, temps d’attente estimé, taux d’occupation par agent).
* Rapports : jour/semaine/mois, distribution par service/site/agent, heatmaps d’affluence.
* **Alertes** (seuils) vers e-mail/Slack/Teams/Webhook.

# 4) Architecture technique

## 4.1 Vue d’ensemble

* **Back-end** : **Django** + **Django REST Framework** (DRF) pour API + **Django Channels** (WebSockets) + **Celery** (jobs asynchrones) + **Redis** (cache, broker) + **PostgreSQL** (base principale).
* **Front-end Web** : **Next.js 14** (App Router, RSC), **TypeScript**, **Tailwind** + **shadcn/ui**, **TanStack Query** (data), **Zod/React-Hook-Form**.
* **Mobile** : **React Native/Expo** (partage de logique TypeScript), **FCM** pour push. Alternative PWA si cible restreinte.
* **Affichage & Borne** : clients web en **kiosk mode** (Chrome/Android TV) ou **Electron** si besoin offline léger.
* **Temps réel** : WebSockets (Django Channels) pour files/affichage/console agent.
* **Recherche & logs** : OpenSearch/Elasticsearch (optionnel) pour audit et requêtes plein texte.
* **Analytics volumineux** : entrepôt (BigQuery/ClickHouse) via pipelines ETL (Celery + batch).

## 4.2 Multi-tenancy

* **Isolation** par `tenant_id` sur toutes les tables + **Row Level Security** (RLS) Postgres.
* Alternative (si exigence très forte d’iso) : `django-tenants` (schéma par tenant).
* **Namespaces** Redis par tenant, secrets par tenant, séparations de clés d’API.
* **Théming**/domaines personnalisés : `tenant.slug.smartqueue.app` + marque blanche.

## 4.3 Intégrations externes

* **SMS/WhatsApp** : Twilio / MessageBird / Vonage / Meta WABA.
* **USSD** : agrégateur opérateur local (ex : Africa’s Talking, Hubtel, etc.).
* **E-mail** : SendGrid/SES.
* **Paiement** (SaaS) : Stripe/Paystack/Flutterwave (facturation mensuelle, plans).
* **SSO** : OAuth2/OIDC (Azure AD, Google), SAML si besoin.
* **Webhook** entrants/sortants (événements ticket/rdv).

# 5) Modèle de données (schéma clé)

*(champs principaux, non exhaustif)*

* **tenants**(id, name, slug, plan, locale, timezone, data_retention_days)
* **sites**(id, tenant_id, name, address, timezone)
* **services**(id, tenant_id, name, sla_seconds, priority_rules)
* **queues**(id, tenant_id, site_id, service_id, algo, status)
* **tickets**(id, tenant_id, queue_id, customer_id?, channel, priority, status, eta_seconds, created_at, called_at, started_at, ended_at, agent_id?)
* **appointments**(id, tenant_id, site_id, service_id, resource_id?, customer_id, start_at, end_at, status)
* **agents**(id, tenant_id, user_id, skills:[service_id], status)
* **displays**(id, tenant_id, site_id, device_key, layout, is_online)
* **kiosks**(id, tenant_id, site_id, device_key, capabilities)
* **customers**(id, tenant_id, external_ref?, name, phone/email, consents, tags[])
* **notifications**(id, tenant_id, customer_id, channel, template_key, payload, status, sent_at)
* **feedbacks**(id, tenant_id, ticket_id, score_type, score, comment)
* **audits**(id, tenant_id, actor, action, entity, entity_id, diff, ip, ua, at)

# 6) API (extrait de contrat REST)

* `POST /api/v1/tenants/{tenant}/tickets` → créer ticket `{service_id, channel, priority?}`
* `GET /api/v1/tenants/{tenant}/queues/{id}` → état + têtes de file
* `POST /api/v1/tenants/{tenant}/agents/{id}/call-next` → retourne ticket appelé
* `POST /api/v1/tenants/{tenant}/tickets/{id}/transfer` → `{to_queue_id}`
* `POST /api/v1/tenants/{tenant}/appointments` → création rdv
* `GET /api/v1/tenants/{tenant}/reports/wait-times?from=&to=&site=&service=`
* **Realtime** : `/ws/tenants/{tenant}/queues/{id}` (events: `ticket.created`, `ticket.called`, `display.update`, …)
* **Webhooks sortants** : `ticket.status_changed`, `appointment.created`, `feedback.created`
* **Auth** : OAuth2 (PKCE) côté front, **JWT** d’accès (scopes), refresh par rotation.

# 7) Algorithmes de file (pseudo-code)

```
candidats = tickets.where(status='en_attente').order_by(created_at)
if SLA_aware:
  candidats = boost(candidats, t => t.wait_time > service.sla_seconds)
if priorité:
  candidats = sort_by(priority DESC, created_at ASC)
si skills:
  garder ceux compatibles avec agent.skills
retourner candidats.first()
```

* **ETA** : régression simple (temps_service_moyen * positions_devant) lissée par EWMA ; améliorable par modèle ML (features: heure, jour, agent, service).

# 8) Front-end (Web/Next.js) & Mobile

* **Tech** : Next.js (App Router), **SSR/ISR** pour vitals SEO, **RSC** pour lecture rapide, **TanStack Query** pour mutations.
* **UI** : Tailwind + shadcn/ui, i18n (fr/en/ar), **RTL** support, **A11y** (WCAG AA).
* **Modules** :

  * **Client** : page d’entrée (scanner QR, rejoindre file, ETA live), suivi ticket, gestion RDV, feedback.
  * **Console agent** : tableau file, actions (appeler/rappeler/transfer/pause), stats perso.
  * **Supervision** : cartes temps réel, heatmaps, filtres (site/service).
  * **Admin** : services, horaires, règles, intégrations, templates notifications, équipe.
  * **Affichage** : composant plein écran responsive, liste numéros, annonces, audio opc.
* **Mobile** : **React Native/Expo** (mêmes endpoints), notifications push (FCM/APNs), offline cache limité (tickets/rdv).

# 9) Notifications & canaux

* **Templates** gérés par tenant (variables : {ticket_number}, {eta}, {site}…).
* **Stratégie anti-spam** (fréquence max, fenêtres calmes).
* **WhatsApp** : approbation de templates WABA.
* **USSD** : menu stateless → API “create ticket” + “ticket status”.

# 10) Sécurité & conformité

* **TLS 1.2+ partout**, **CSP** stricte, **HSTS**, **HTTPS only**.
* **Chiffrement** au repos (Postgres TDE ou chiffrement disque), PII minimisée.
* **RLS Postgres** + filtrage `tenant_id` au niveau ORM, tests d’iso multi-tenant.
* **Gestion secrets** : Vault/Parameter Store, rotation clés.
* **Audit log** exhaustif, **WAF**/rate-limit, **protection CSRF** (cookies `SameSite`, double-soumission).
* **GDPR/LOPD** : consentements, droit à l’oubli, durées de rétention configurables.
* **SSO** entreprises (OIDC/SAML), MFA optionnelle, politiques mots de passe.

# 11) Scalabilité & SRE

* **Conteneurs** : Docker, **Kubernetes** (HPA), Ingress Nginx.
* **DB** : Postgres HA (Patroni/GKE/Cloud SQL), **read replicas** pour reporting.
* **Cache** : Redis HA, TTL agressifs pour états de file.
* **File d’attente** : Celery + Redis/RabbitMQ.
* **Stockage objets** : S3 compatible (exports, assets).
* **Observabilité** : OpenTelemetry (traces/metrics/logs), Prometheus + Grafana, Sentry.
* **CI/CD** : GitHub Actions, migrations gérées (Alembic-like via Django `migrate`), **blue-green**/canary.
* **SLA** cible** : 99.9% (prod), RTO ≤ 1h, RPO ≤ 15min (backups automatiques + PITR).

# 12) Qualité, tests & livraison

* **Tests** : unitaires (pytest), intégration (DRF + Channels), E2E (Playwright), tests charge (k6/Locust).
* **Gate** : couverture minimale, scans SAST/DAST, SBOM.
* **Données de démo** par tenant (“sandbox”).
* **Feature flags** (Unleash/ConfigCat).

# 13) Déploiement & environnements

* **Env** : Dev, Staging, Prod (parité), secrets distincts, `Infrastructure as Code` (Terraform).
* **Régions** : possibilité de déployer par région (latence & souveraineté).
* **Domaines** : `tenant.smartqueue.app`, CNAME custom, certificats auto (Let’s Encrypt).

# 14) Accessoires matériels (si nécessaire)

* **Borne** : tablette Android 10+, imprimante thermique USB/Bluetooth, lecteur QR.
* **Affichage** : TV/monitor + Chrome en kiosk mode / Android TV, réseau stable.
* **Audio** : synthèse vocale locale ou via API (caching).

# 15) Roadmap (MVP → V2)

* **MVP (8–12 semaines, indicatif de contenu)**

  1. Multi-tenant, auth, RBAC, services/files/tickets, console agent, affichage, SMS/e-mail, analytics de base, exports.
  2. RDV + rappels, feedback CSAT, supervision temps réel, WhatsApp.
* **V2**
  3. USSD, routage “skills-based”, SLA-aware, NPS, alertes seuils, marque blanche avancée.
  4. Kiosque offline light, ML d’ETA, connecteurs SSO/ITSM, billing self-service.

# 16) Exigences non fonctionnelles

* **Perf** : p95 < 300 ms sur endpoints lecture, p95 < 700 ms sur mutations ; WS < 2s à l’update.
* **Charge** : 1 000 tickets/min crête, 5 000 sessions WS simultanées/site (scalable).
* **i18n** : FR/EN/AR, fuseaux horaires par site.
* **Accessibilité** : WCAG 2.1 AA.
* **Confidentialité** : minimisation PII, pseudonymisation optionnelle.
* **Auditabilité** : exports complets + journaux signés.

# 17) Exemples techniques (concision)

## 17.1 Endpoints DRF (extrait)

```python
# tickets/views.py
class TicketViewSet(ModelViewSet):
    permission_classes = [IsTenantUser, HasScope('write:queue')]
    def perform_create(self, serializer):
        ticket = serializer.save(tenant=self.request.tenant, status='en_attente')
        notify('ticket.created', ticket)
```

## 17.2 Canal temps réel (Channels)

```python
class QueueConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.queue_group = f"q_{self.scope['url_route']['kwargs']['queue_id']}"
        await self.channel_layer.group_add(self.queue_group, self.channel_name)
        await self.accept()
```

## 17.3 Next.js (appel d’API + WS)

```ts
const res = await fetch(`/api/v1/tenants/${tenant}/queues/${id}`, { cache: "no-store" });
const socket = new WebSocket(`${WS_URL}/ws/tenants/${tenant}/queues/${id}`);
socket.onmessage = (e) => mutateQueue(JSON.parse(e.data));
```

# 18) Critères d’acceptation (MVP)

* Créer/rejoindre une file depuis web/QR, voir ETA, recevoir SMS/e-mail.
* Agent peut **appeler/rappeler/transférer** ; affichage met à jour en <2s.
* RDV avec rappels H-24/H-1, conversion en file “RDV”.
* Dashboard temps réel (sites/services) + rapport journalier (CSV).
* RBAC solide, logs d’audit, RLS vérifiée par tests.

---