"""ViewSets pour le super-admin (gestion plateforme)."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from calendar import monthrange

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .admin_serializers import (
    CreateTenantSerializer,
    InvoiceAdminSerializer,
    SubscriptionAdminSerializer,
    SubscriptionPlanSerializer,
    TenantAdminSerializer,
    TenantMembershipAdminSerializer,
    TransactionAdminSerializer,
)
from .models import Invoice, Subscription, SubscriptionPlan, Tenant, TenantMembership, Transaction

User = get_user_model()


class IsSuperAdmin(IsAdminUser):
    """Permission pour les super-admins uniquement."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class TenantAdminViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des tenants (super-admin)."""

    queryset = Tenant.objects.all().order_by("-created_at")
    serializer_class = TenantAdminSerializer
    permission_classes = [IsSuperAdmin]
    lookup_field = "slug"

    @action(detail=False, methods=["post"], serializer_class=CreateTenantSerializer)
    def create_with_admin(self, request):
        """Crée un tenant avec son admin et son abonnement initial."""
        serializer = CreateTenantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            # 1. Créer le tenant
            plan = data.get("plan", "trial")
            tenant = Tenant.objects.create(
                name=data["name"],
                slug=data["slug"],
                company_name=data.get("company_name", ""),
                email=data.get("email", ""),
                phone=data.get("phone", ""),
                plan=plan,
                max_sites=self._get_plan_limit(plan, "sites"),
                max_agents=self._get_plan_limit(plan, "agents"),
                max_queues=self._get_plan_limit(plan, "queues"),
                is_active=True,
            )

            # 2. Créer ou récupérer l'utilisateur admin
            admin_email = data["admin_email"]
            user, created = User.objects.get_or_create(
                email=admin_email,
                defaults={
                    "first_name": data.get("admin_first_name", ""),
                    "last_name": data.get("admin_last_name", ""),
                    "is_active": True,
                },
            )

            if created and data.get("admin_password"):
                user.set_password(data["admin_password"])
                user.save()

            # 3. Créer le membership admin
            TenantMembership.objects.create(tenant=tenant, user=user, role="admin", is_active=True)

            # 4. Créer l'abonnement initial
            trial_days = 14 if plan == "trial" else 0
            
            # Récupérer ou créer le plan d'abonnement
            subscription_plan, _ = SubscriptionPlan.objects.get_or_create(
                slug=plan,
                defaults={
                    "name": plan.capitalize(),
                    "monthly_price": self._get_plan_price(plan) / 100,
                    "yearly_price": (self._get_plan_price(plan) * 12) / 100,
                    "max_sites": self._get_plan_limit(plan, "sites"),
                    "max_agents": self._get_plan_limit(plan, "agents"),
                    "max_queues": self._get_plan_limit(plan, "queues"),
                }
            )

            subscription = Subscription.objects.create(
                tenant=tenant,
                plan=subscription_plan,
                status=Subscription.STATUS_TRIAL if plan == "trial" else Subscription.STATUS_ACTIVE,
                billing_cycle=Subscription.BILLING_CYCLE_MONTHLY,
                monthly_price=self._get_plan_price(plan),
                starts_at=date.today(),
                current_period_start=date.today(),
                current_period_end=date.today() + timedelta(days=30),
                trial_ends_at=date.today() + timedelta(days=trial_days) if trial_days else None,
            )

            return Response(
                {
                    "tenant": TenantAdminSerializer(tenant).data,
                    "subscription": SubscriptionAdminSerializer(subscription).data,
                    "admin_created": created,
                },
                status=status.HTTP_201_CREATED,
            )

    @action(detail=True, methods=["post"])
    def suspend(self, request, slug=None):
        """Suspend un tenant."""
        tenant = self.get_object()
        reason = request.data.get("reason", "")

        tenant.is_active = False
        tenant.suspended_at = date.today()
        tenant.suspension_reason = reason
        tenant.save()

        # Suspendre l'abonnement aussi
        if hasattr(tenant, "subscription"):
            tenant.subscription.status = Subscription.STATUS_SUSPENDED
            tenant.subscription.save()

        return Response(TenantAdminSerializer(tenant).data)

    @action(detail=True, methods=["post"])
    def activate(self, request, slug=None):
        """Réactive un tenant suspendu."""
        tenant = self.get_object()

        tenant.is_active = True
        tenant.suspended_at = None
        tenant.suspension_reason = ""
        tenant.save()

        # Réactiver l'abonnement
        if hasattr(tenant, "subscription"):
            tenant.subscription.status = Subscription.STATUS_ACTIVE
            tenant.subscription.save()

        return Response(TenantAdminSerializer(tenant).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Statistiques globales de tous les tenants."""
        tenants = Tenant.objects.all()
        active_tenants = tenants.filter(is_active=True)

        # Importer ici pour éviter les imports circulaires
        from apps.queues.models import Queue, QueueAssignment
        from apps.tickets.models import Ticket

        return Response(
            {
                "total_organizations": tenants.count(),
                "active_organizations": active_tenants.count(),
                "trial_organizations": Subscription.objects.filter(status=Subscription.STATUS_TRIAL).count(),
                "suspended_organizations": tenants.filter(is_active=False).count(),
                "total_agents": QueueAssignment.objects.filter(is_active=True)
                .values("agent")
                .distinct()
                .count(),
                "total_sites": 0,  # TODO: compter les sites quand le modèle Site sera lié au tenant
                "total_tickets_this_month": Ticket.objects.filter(
                    created_at__month=date.today().month, created_at__year=date.today().year
                ).count(),
            }
        )

    @action(detail=True, methods=["get"], url_path="stats")
    def tenant_stats(self, request, slug=None):
        """Statistiques détaillées d'un tenant spécifique."""
        tenant = self.get_object()

        # Importer ici pour éviter les imports circulaires
        from apps.queues.models import Queue, QueueAssignment
        from apps.tickets.models import Ticket

        return Response(
            {
                "members": tenant.memberships.filter(is_active=True).count(),
                "sites": tenant.sites.count() if hasattr(tenant, "sites") else 0,
                "queues": Queue.objects.filter(tenant=tenant).count(),
                "agents": QueueAssignment.objects.filter(
                    queue__tenant=tenant, is_active=True
                )
                .values("agent")
                .distinct()
                .count(),
                "tickets_total": Ticket.objects.filter(queue__tenant=tenant).count(),
                "tickets_pending": Ticket.objects.filter(
                    queue__tenant=tenant, status=Ticket.STATUS_WAITING
                ).count(),
                "tickets_completed_today": Ticket.objects.filter(
                    queue__tenant=tenant,
                    status=Ticket.STATUS_CLOSED,
                    updated_at__date=date.today(),
                ).count(),
            }
        )

    @action(detail=False, methods=["get"], url_path="analytics")
    def analytics(self, request):
        """Analytics détaillées de la plateforme pour le super-admin."""
        # Importer ici pour éviter les imports circulaires
        from apps.queues.models import Queue, QueueAssignment
        from apps.tickets.models import Ticket

        # Récupérer les paramètres de filtre
        time_range = request.query_params.get("time_range", "30d")
        
        # Calculer la date de début selon le time_range
        if time_range == "7d":
            start_date = date.today() - timedelta(days=7)
        elif time_range == "90d":
            start_date = date.today() - timedelta(days=90)
        elif time_range == "1y":
            start_date = date.today() - timedelta(days=365)
        else:  # 30d par défaut
            start_date = date.today() - timedelta(days=30)

        tenants = Tenant.objects.all()
        active_tenants = tenants.filter(is_active=True)
        total_orgs = tenants.count()
        active_orgs = active_tenants.count()

        # Statistiques principales
        total_users = User.objects.filter(tenant_memberships__tenant__isnull=False).distinct().count()
        total_agents = QueueAssignment.objects.filter(is_active=True).values("agent").distinct().count()
        
        # Compter les sites (si la relation existe)
        total_sites = 0
        try:
            from apps.sites.models import Site
            total_sites = Site.objects.count()
        except (ImportError, Exception):
            # Modèle Site pas encore implémenté
            total_sites = 0
        
        # Tickets
        tickets_today = Ticket.objects.filter(created_at__date=date.today()).count()
        tickets_month = Ticket.objects.filter(
            created_at__month=date.today().month,
            created_at__year=date.today().year
        ).count()
        
        # Temps d'attente moyen (en minutes)
        # On prend les tickets appelés, en service ou clos
        completed_tickets = Ticket.objects.filter(
            status__in=[Ticket.STATUS_CALLED, Ticket.STATUS_IN_SERVICE, Ticket.STATUS_CLOSED],
            called_at__isnull=False,
            created_at__gte=start_date
        )
        
        wait_times = []
        for ticket in completed_tickets:
            if ticket.called_at and ticket.created_at:
                wait_time = (ticket.called_at - ticket.created_at).total_seconds() / 60
                wait_times.append(wait_time)
        
        avg_wait_time_minutes = sum(wait_times) / len(wait_times) if wait_times else 0

        # Revenus
        active_subscriptions = Subscription.objects.filter(status=Subscription.STATUS_ACTIVE)
        revenue_month = sum(
            float(sub.monthly_price / 100) for sub in active_subscriptions
        )
        
        # Calculer la croissance (mois précédent)
        today = date.today()
        # Soustraire environ 30 jours pour le mois précédent
        if today.month == 1:
            previous_month_date = date(today.year - 1, 12, 1)
        else:
            previous_month_date = date(today.year, today.month - 1, 1)
        
        previous_month_subs = Subscription.objects.filter(
            status=Subscription.STATUS_ACTIVE,
            starts_at__lte=previous_month_date
        )
        previous_revenue = sum(
            float(sub.monthly_price / 100) for sub in previous_month_subs
        )
        revenue_growth = (
            ((revenue_month - previous_revenue) / previous_revenue * 100)
            if previous_revenue > 0 else 0
        )

        # Croissance des organisations (7 derniers mois)
        organization_growth = []
        for i in range(6, -1, -1):
            # Calculer le mois
            months_ago = i
            year = today.year
            month = today.month - months_ago
            
            while month <= 0:
                month += 12
                year -= 1
            
            # Dernier jour du mois
            last_day = monthrange(year, month)[1]
            month_date = date(year, month, min(today.day, last_day))
            
            count = tenants.filter(created_at__lte=month_date).count()
            month_name = month_date.strftime("%b")
            organization_growth.append({
                "month": month_name,
                "count": count
            })

        # Top 5 organisations par tickets
        top_organizations = []
        for tenant in tenants[:20]:  # Limiter pour la performance
            tickets_count = Ticket.objects.filter(queue__tenant=tenant).count()
            if tickets_count > 0:
                # Calculer le revenu
                subscription = Subscription.objects.filter(tenant=tenant).first()
                revenue = float(subscription.monthly_price / 100) if subscription else 0
                
                # Calculer la croissance (simulée)
                previous_tickets = Ticket.objects.filter(
                    queue__tenant=tenant,
                    created_at__month=previous_month_date.month,
                    created_at__year=previous_month_date.year
                ).count()
                current_tickets = Ticket.objects.filter(
                    queue__tenant=tenant,
                    created_at__month=date.today().month,
                    created_at__year=date.today().year
                ).count()
                growth = (
                    ((current_tickets - previous_tickets) / previous_tickets * 100)
                    if previous_tickets > 0 else 0
                )
                
                top_organizations.append({
                    "name": tenant.name,
                    "tickets_count": tickets_count,
                    "revenue": revenue,
                    "growth": round(growth, 1)
                })
        
        # Trier et prendre le top 5
        top_organizations.sort(key=lambda x: x["tickets_count"], reverse=True)
        top_organizations = top_organizations[:5]

        return Response({
            # Stats principales
            "total_organizations": total_orgs,
            "active_organizations": active_orgs,
            "total_users": total_users,
            "total_agents": total_agents,
            "total_sites": total_sites,
            "total_tickets_today": tickets_today,
            "total_tickets_month": tickets_month,
            "avg_wait_time_minutes": round(avg_wait_time_minutes, 1),
            "revenue_month": revenue_month,
            "revenue_growth": round(revenue_growth, 1),
            
            # Données pour les graphiques
            "organization_growth": organization_growth,
            "top_organizations": top_organizations,
        })

    def _get_plan_limit(self, plan: str, resource: str) -> int:
        """Retourne les limites par plan."""
        limits = {
            "trial": {"sites": 1, "agents": 3, "queues": 5},
            "starter": {"sites": 1, "agents": 10, "queues": 20},
            "business": {"sites": 5, "agents": 50, "queues": 100},
            "enterprise": {"sites": 999, "agents": 999, "queues": 999},
        }
        return limits.get(plan, limits["trial"]).get(resource, 1)

    def _get_plan_price(self, plan: str) -> int:
        """Retourne le prix mensuel en centimes."""
        prices = {
            "trial": 0,
            "starter": 4900,  # 49€
            "business": 9900,  # 99€
            "enterprise": 0,  # Sur devis
        }
        return prices.get(plan, 0)

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """Dashboard complet pour le super-admin."""
        from apps.queues.models import QueueAssignment
        from apps.tickets.models import Ticket
        
        today = date.today()
        tenants = Tenant.objects.all()
        active_tenants = tenants.filter(is_active=True)
        
        # MRR et growth
        active_subscriptions = Subscription.objects.filter(status=Subscription.STATUS_ACTIVE)
        mrr = sum(float(sub.monthly_price / 100) for sub in active_subscriptions)
        
        # Croissance MRR
        if today.month == 1:
            previous_month_date = date(today.year - 1, 12, 1)
        else:
            previous_month_date = date(today.year, today.month - 1, 1)
            
        previous_month_subs = Subscription.objects.filter(
            status=Subscription.STATUS_ACTIVE,
            starts_at__lte=previous_month_date
        )
        previous_mrr = sum(float(sub.monthly_price / 100) for sub in previous_month_subs)
        mrr_growth = ((mrr - previous_mrr) / previous_mrr * 100) if previous_mrr > 0 else 0
        
        # Organisations
        total_orgs = tenants.count()
        active_orgs = active_tenants.count()
        orgs_this_month = tenants.filter(
            created_at__month=today.month,
            created_at__year=today.year
        ).count()
        
        # Utilisateurs
        total_users = User.objects.filter(tenant_memberships__tenant__isnull=False).distinct().count()
        total_agents = QueueAssignment.objects.filter(is_active=True).values("agent").distinct().count()
        
        # Churn rate (organisations désactivées ce mois)
        churned_this_month = tenants.filter(
            is_active=False,
            suspended_at__month=today.month,
            suspended_at__year=today.year
        ).count()
        churn_rate = (churned_this_month / total_orgs * 100) if total_orgs > 0 else 0
        
        # Churn mois précédent
        previous_churned = tenants.filter(
            is_active=False,
            suspended_at__month=previous_month_date.month,
            suspended_at__year=previous_month_date.year
        ).count()
        previous_churn_rate = (previous_churned / total_orgs * 100) if total_orgs > 0 else 0
        churn_growth = churn_rate - previous_churn_rate
        
        # Tickets
        tickets_today = Ticket.objects.filter(created_at__date=today).count()
        tickets_month = Ticket.objects.filter(
            created_at__month=today.month,
            created_at__year=today.year
        ).count()
        
        # Temps d'attente moyen
        start_date = today - timedelta(days=30)
        completed_tickets = Ticket.objects.filter(
            status__in=[Ticket.STATUS_CALLED, Ticket.STATUS_IN_SERVICE, Ticket.STATUS_CLOSED],
            called_at__isnull=False,
            created_at__gte=start_date
        )
        
        wait_times = []
        for ticket in completed_tickets:
            if ticket.called_at and ticket.created_at:
                wait_time = (ticket.called_at - ticket.created_at).total_seconds() / 60
                wait_times.append(wait_time)
        
        avg_wait_time = sum(wait_times) / len(wait_times) if wait_times else 0
        
        # Alertes
        alerts = []
        
        # Trials expirant bientôt
        trial_expiring = Subscription.objects.filter(
            status=Subscription.STATUS_TRIAL,
            trial_ends_at__lte=today + timedelta(days=7),
            trial_ends_at__gte=today
        ).count()
        if trial_expiring > 0:
            alerts.append({
                "id": "trial_expiring",
                "title": f"{trial_expiring} Trials expirent dans 7 jours",
                "description": "Contacter pour conversion",
                "severity": "urgent",
                "action": "Voir les organisations",
                "link": "/superadmin/organizations?filter=trial_expiring"
            })
        
        # Organisations proches des limites
        # Compter les sites pour chaque tenant si le modèle Site existe
        orgs_near_limits = []
        try:
            from apps.sites.models import Site
            for tenant in tenants:
                sites_count = Site.objects.filter(tenant=tenant).count()
                if sites_count >= tenant.max_sites * 0.8:
                    orgs_near_limits.append(tenant)
        except (ImportError, Exception):
            # Site model pas encore implémenté, skip cette alerte
            pass
        
        if len(orgs_near_limits) > 0:
            alerts.append({
                "id": "near_limits",
                "title": f"{len(orgs_near_limits)} Orgs approchent des limites",
                "description": "Upgrade suggéré vers plan supérieur",
                "severity": "warning",
                "action": "Voir détails",
                "link": "/superadmin/organizations?filter=near_limits"
            })
        
        return Response({
            "mrr": round(mrr, 2),
            "mrr_growth": round(mrr_growth, 1),
            "total_organizations": total_orgs,
            "active_organizations": active_orgs,
            "orgs_this_month": orgs_this_month,
            "total_users": total_users,
            "total_agents": total_agents,
            "churn_rate": round(churn_rate, 1),
            "churn_growth": round(churn_growth, 1),
            "tickets_today": tickets_today,
            "tickets_month": tickets_month,
            "avg_wait_time_minutes": round(avg_wait_time, 1),
            "satisfaction_rate": 92.0,  # TODO: calculer depuis les feedbacks réels
            "satisfaction_count": 0,  # TODO: compter les feedbacks
            "uptime_percentage": 99.97,  # TODO: calculer depuis monitoring
            "alerts": alerts,
        })
    
    @action(detail=False, methods=["get"], url_path="monitoring")
    def monitoring(self, request):
        """Monitoring système pour le super-admin."""
        try:
            # Métriques système
            if HAS_PSUTIL:
                cpu_percent = psutil.cpu_percent(interval=1)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                network = psutil.net_io_counters()
                boot_time = datetime.fromtimestamp(psutil.boot_time())
                uptime = datetime.now() - boot_time
                
                metrics = {
                    "cpu_usage": round(cpu_percent, 1),
                    "memory_used": round(memory.used / (1024 ** 3), 1),  # GB
                    "memory_total": round(memory.total / (1024 ** 3), 1),  # GB
                    "disk_used": round(disk.used / (1024 ** 3), 1),  # GB
                    "disk_total": round(disk.total / (1024 ** 3), 1),  # GB
                    "network_in": round(network.bytes_recv / (1024 ** 2), 1),  # MB
                    "network_out": round(network.bytes_sent / (1024 ** 2), 1),  # MB
                    "uptime_days": uptime.days,
                }
            else:
                # Valeurs par défaut si psutil n'est pas installé
                metrics = {
                    "cpu_usage": 25.0,
                    "memory_used": 8.0,
                    "memory_total": 16.0,
                    "disk_used": 150.0,
                    "disk_total": 500.0,
                    "network_in": 100.0,
                    "network_out": 75.0,
                    "uptime_days": 30,
                }

            # Connexions base de données
            try:
                # PostgreSQL
                with connection.cursor() as cursor:
                    cursor.execute("SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
                    active_connections = cursor.fetchone()[0]
                    cursor.execute("SELECT count(*) FROM pg_stat_activity;")
                    total_connections = cursor.fetchone()[0]
            except Exception:
                # SQLite ou autre DB - valeurs par défaut
                active_connections = 5
                total_connections = 10

            # Services status
            services = [
                {
                    "name": "API Backend",
                    "status": "healthy",
                    "response_time": 45,  # Mock - à calculer réellement
                    "uptime": 99.98,
                    "last_check": timezone.now().isoformat(),
                },
                {
                    "name": "PostgreSQL",
                    "status": "healthy" if active_connections < 90 else "degraded",
                    "response_time": 12,
                    "uptime": 99.99,
                    "last_check": timezone.now().isoformat(),
                },
            ]

            # Vérifier Redis si disponible
            try:
                from django.core.cache import cache
                cache.set('monitoring_test', 'ok', 10)
                redis_status = "healthy" if cache.get('monitoring_test') == 'ok' else "down"
                services.append({
                    "name": "Redis Cache",
                    "status": redis_status,
                    "response_time": 3,
                    "uptime": 99.99,
                    "last_check": timezone.now().isoformat(),
                })
            except Exception:
                services.append({
                    "name": "Redis Cache",
                    "status": "down",
                    "response_time": 0,
                    "uptime": 0,
                    "last_check": timezone.now().isoformat(),
                })

            return Response({
                "metrics": metrics,
                "services": services,
                "database": {
                    "active_connections": active_connections,
                    "total_connections": total_connections,
                    "max_connections": 100,  # Configurable
                },
            })
        except Exception as e:
            # En cas d'erreur, retourner des données par défaut
            return Response({
                "metrics": {
                    "cpu_usage": 0,
                    "memory_used": 0,
                    "memory_total": 0,
                    "disk_used": 0,
                    "disk_total": 0,
                    "network_in": 0,
                    "network_out": 0,
                    "uptime_days": 0,
                },
                "services": [],
                "database": {
                    "active_connections": 0,
                    "total_connections": 0,
                    "max_connections": 100,
                },
                "error": str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionAdminViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des abonnements (super-admin)."""

    queryset = Subscription.objects.all().select_related("tenant").order_by("-created_at")
    serializer_class = SubscriptionAdminSerializer
    permission_classes = [IsSuperAdmin]

    @action(detail=True, methods=["post"])
    def change_plan(self, request, pk=None):
        """Change le plan d'un abonnement."""
        subscription = self.get_object()
        new_plan = request.data.get("plan")

        if new_plan not in ["trial", "starter", "business", "enterprise"]:
            return Response({"error": "Plan invalide"}, status=status.HTTP_400_BAD_REQUEST)

        subscription.plan = new_plan
        subscription.monthly_price = self._get_plan_price(new_plan)
        subscription.save()

        # Mettre à jour les limites du tenant
        tenant = subscription.tenant
        tenant.plan = new_plan
        tenant.max_sites = self._get_plan_limit(new_plan, "sites")
        tenant.max_agents = self._get_plan_limit(new_plan, "agents")
        tenant.max_queues = self._get_plan_limit(new_plan, "queues")
        tenant.save()

        return Response(SubscriptionAdminSerializer(subscription).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Annule un abonnement."""
        subscription = self.get_object()
        subscription.status = Subscription.STATUS_CANCELLED
        subscription.cancelled_at = date.today()
        subscription.save()

        return Response(SubscriptionAdminSerializer(subscription).data)

    def _get_plan_limit(self, plan: str, resource: str) -> int:
        limits = {
            "trial": {"sites": 1, "agents": 3, "queues": 5},
            "starter": {"sites": 1, "agents": 10, "queues": 20},
            "business": {"sites": 5, "agents": 50, "queues": 100},
            "enterprise": {"sites": 999, "agents": 999, "queues": 999},
        }
        return limits.get(plan, limits["trial"]).get(resource, 1)

    def _get_plan_price(self, plan: str) -> int:
        prices = {
            "trial": 0,
            "starter": 4900,
            "business": 9900,
            "enterprise": 0,
        }
        return prices.get(plan, 0)


class InvoiceAdminViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des factures (super-admin)."""

    queryset = (
        Invoice.objects.all()
        .select_related("tenant", "subscription")
        .order_by("-invoice_date")
    )
    serializer_class = InvoiceAdminSerializer
    permission_classes = [IsSuperAdmin]
    filterset_fields = ["status", "tenant", "currency"]

    def get_queryset(self):
        """Filter invoices by status, date range, and tenant."""
        queryset = super().get_queryset()

        # Filter by status type (past, upcoming, pending)
        status_type = self.request.query_params.get("status_type")
        if status_type == "past":
            # Paid or void invoices
            queryset = queryset.filter(status__in=[Invoice.STATUS_PAID, Invoice.STATUS_VOID])
        elif status_type == "upcoming":
            # Draft invoices or future invoices
            from django.utils import timezone
            today = timezone.now().date()
            queryset = queryset.filter(
                status=Invoice.STATUS_DRAFT
            ) | queryset.filter(
                invoice_date__gt=today
            )
        elif status_type == "pending":
            # Open or uncollectible invoices
            queryset = queryset.filter(
                status__in=[Invoice.STATUS_OPEN, Invoice.STATUS_UNCOLLECTIBLE]
            )

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(invoice_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(invoice_date__lte=end_date)

        return queryset

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Statistiques sur les factures."""
        from django.db.models import Sum, Count, Q
        from django.utils import timezone

        today = timezone.now().date()
        queryset = self.get_queryset()

        # Total counts by status
        total_invoices = queryset.count()
        paid_invoices = queryset.filter(status=Invoice.STATUS_PAID).count()
        pending_invoices = queryset.filter(status=Invoice.STATUS_OPEN).count()
        overdue_invoices = queryset.filter(
            status=Invoice.STATUS_OPEN,
            due_date__lt=today
        ).count()

        # Revenue calculations
        total_revenue = queryset.filter(status=Invoice.STATUS_PAID).aggregate(
            total=Sum("total")
        )["total"] or 0

        pending_amount = queryset.filter(status=Invoice.STATUS_OPEN).aggregate(
            total=Sum("total")
        )["total"] or 0

        overdue_amount = queryset.filter(
            status=Invoice.STATUS_OPEN,
            due_date__lt=today
        ).aggregate(
            total=Sum("total")
        )["total"] or 0

        return Response({
            "total_invoices": total_invoices,
            "paid_invoices": paid_invoices,
            "pending_invoices": pending_invoices,
            "overdue_invoices": overdue_invoices,
            "total_revenue": total_revenue,
            "pending_amount": pending_amount,
            "overdue_amount": overdue_amount,
        })

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        """Marque une facture comme payée."""
        invoice = self.get_object()
        invoice.status = Invoice.STATUS_PAID
        invoice.paid_at = date.today()
        invoice.amount_paid = invoice.total
        invoice.payment_method = request.data.get("payment_method", "")
        invoice.payment_reference = request.data.get("payment_reference", "")
        invoice.save()

        return Response(InvoiceAdminSerializer(invoice).data)

    @action(detail=True, methods=["post"])
    def send_reminder(self, request, pk=None):
        """Envoie un rappel par email pour une facture impayée."""
        from apps.tenants.dunning_services import send_dunning_email

        invoice = self.get_object()

        # Calculer les jours de retard
        days_overdue = 0
        if invoice.due_date:
            from django.utils import timezone
            days_overdue = max(0, (timezone.now().date() - invoice.due_date).days)

        template = request.data.get("template", "default")

        try:
            action = send_dunning_email(invoice, days_overdue, template)
            return Response({
                "success": True,
                "message": "Rappel envoyé avec succès",
                "action_id": str(action.id),
            })
        except Exception as e:
            return Response({
                "success": False,
                "message": f"Erreur lors de l'envoi: {str(e)}",
            }, status=400)

    @action(detail=True, methods=["post"])
    def create_payment_plan(self, request, pk=None):
        """Crée un plan de paiement pour une facture impayée."""
        from apps.tenants.dunning_services import create_payment_plan, send_payment_plan_proposal

        invoice = self.get_object()

        number_of_installments = request.data.get("number_of_installments", 3)
        frequency_days = request.data.get("frequency_days", 30)
        notes = request.data.get("notes", "")
        send_email = request.data.get("send_email", True)

        try:
            plan = create_payment_plan(
                invoice=invoice,
                number_of_installments=number_of_installments,
                frequency_days=frequency_days,
                notes=notes,
            )

            if send_email:
                send_payment_plan_proposal(plan)

            # Retourner le plan avec ses échéances
            from apps.tenants.admin_serializers import PaymentPlanSerializer
            return Response(PaymentPlanSerializer(plan).data)

        except Exception as e:
            return Response({
                "success": False,
                "message": f"Erreur: {str(e)}",
            }, status=400)

    @action(detail=True, methods=["post"])
    def suspend_tenant(self, request, pk=None):
        """Suspend le service d'un tenant pour non-paiement."""
        from apps.tenants.dunning_services import suspend_tenant_service

        invoice = self.get_object()
        reason = request.data.get("reason", "Factures impayées")

        try:
            suspend_tenant_service(invoice.tenant, reason)
            return Response({
                "success": True,
                "message": f"Service suspendu pour {invoice.tenant.name}",
            })
        except Exception as e:
            return Response({
                "success": False,
                "message": f"Erreur: {str(e)}",
            }, status=400)

    @action(detail=True, methods=["get"])
    def download_pdf(self, request, pk=None):
        """Génère et télécharge le PDF de la facture."""
        from django.http import HttpResponse
        from apps.tenants.pdf_generator import InvoicePDFGenerator

        invoice = self.get_object()

        try:
            # Générer le PDF
            generator = InvoicePDFGenerator(invoice)
            pdf_bytes = generator.generate()

            # Créer la réponse HTTP
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'

            return response

        except Exception as e:
            return Response({
                "success": False,
                "message": f"Erreur lors de la génération du PDF: {str(e)}",
            }, status=400)


class TenantMembershipAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour voir tous les membres (super-admin)."""

    queryset = (
        TenantMembership.objects.all().select_related("tenant", "user").order_by("-created_at")
    )
    serializer_class = TenantMembershipAdminSerializer
    permission_classes = [IsSuperAdmin]


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des plans d'abonnement (super-admin)."""

    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsSuperAdmin]
    lookup_field = "slug"

    def get_queryset(self):
        """Annotate queryset with organizations count."""
        from django.db.models import Count
        return SubscriptionPlan.objects.annotate(
            organizations_count=Count('subscriptions', distinct=True)
        ).order_by("monthly_price")

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Statistiques sur les plans d'abonnement."""
        plans = self.get_queryset()

        # Stats par plan
        plan_stats = []
        total_monthly_revenue = 0

        for plan in plans:
            active_subs = Subscription.objects.filter(plan=plan, status="active")
            active_count = active_subs.count()
            trial_count = Subscription.objects.filter(plan=plan, status="trial").count()

            # Calculer le revenu mensuel récurrent (MRR)
            mrr = sum(
                float(sub.monthly_price / 100)
                if sub.billing_cycle == "monthly"
                else float(sub.monthly_price / 100 / 12)
                for sub in active_subs
            )
            total_monthly_revenue += mrr

            plan_stats.append(
                {
                    "plan_id": str(plan.id),
                    "plan_name": plan.name,
                    "plan_slug": plan.slug,
                    "active_subscriptions": active_count,
                    "trial_subscriptions": trial_count,
                    "total_subscriptions": active_count + trial_count,
                    "monthly_revenue": mrr,
                    "price_monthly": float(plan.monthly_price),
                    "price_yearly": float(plan.yearly_price),
                }
            )

        return Response(
            {
                "total_plans": plans.count(),
                "active_plans": plans.filter(is_active=True).count(),
                "total_monthly_revenue": total_monthly_revenue,
                "plan_statistics": plan_stats,
            }
        )


class TransactionViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des transactions (super-admin)."""

    queryset = (
        Transaction.objects.all()
        .select_related("tenant", "invoice", "payment_method")
        .order_by("-created_at")
    )
    serializer_class = TransactionAdminSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        """Filtrer les transactions avec query params."""
        queryset = super().get_queryset()

        # Filtrer par statut
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filtrer par tenant
        tenant_slug = self.request.query_params.get("tenant")
        if tenant_slug:
            queryset = queryset.filter(tenant__slug=tenant_slug)

        # Filtrer par période
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        return queryset

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Statistiques sur les transactions."""
        queryset = self.get_queryset()

        # Revenus par statut
        from django.db.models import Count, Sum

        total_revenue = (
            queryset.filter(status=Transaction.STATUS_SUCCESS).aggregate(total=Sum("amount"))[
                "total"
            ]
            or 0
        )

        pending_amount = (
            queryset.filter(status=Transaction.STATUS_PENDING).aggregate(total=Sum("amount"))[
                "total"
            ]
            or 0
        )

        failed_amount = (
            queryset.filter(status=Transaction.STATUS_FAILED).aggregate(total=Sum("amount"))[
                "total"
            ]
            or 0
        )

        # Compter par statut
        status_counts = list(queryset.values("status").annotate(count=Count("id")))

        # Compter par méthode de paiement
        payment_method_counts = list(
            queryset.filter(status=Transaction.STATUS_SUCCESS)
            .values("payment_method__provider")
            .annotate(count=Count("id"))
        )

        # Calculer le taux de réussite
        total_transactions = queryset.count()
        successful_transactions = queryset.filter(status=Transaction.STATUS_SUCCESS).count()
        success_rate = (
            (successful_transactions / total_transactions * 100) if total_transactions > 0 else 0
        )

        return Response(
            {
                "total_revenue": float(total_revenue / 100),  # Convertir centimes en unités
                "pending_amount": float(pending_amount / 100),
                "failed_amount": float(failed_amount / 100),
                "total_transactions": total_transactions,
                "successful_transactions": successful_transactions,
                "success_rate": round(success_rate, 2),
                "status_breakdown": status_counts,
                "payment_method_breakdown": payment_method_counts,
            }
        )


class SystemConfigViewSet(viewsets.ViewSet):
    """ViewSet pour la configuration système (singleton)."""

    permission_classes = [IsSuperAdmin]

    def list(self, request):
        """Récupérer la configuration système."""
        from apps.core.models import SystemConfig
        from apps.core.serializers import SystemConfigSerializer

        config = SystemConfig.load()
        serializer = SystemConfigSerializer(config)
        return Response(serializer.data)

    def update(self, request, pk=None):
        """Mettre à jour la configuration système."""
        from apps.core.models import SystemConfig
        from apps.core.serializers import SystemConfigSerializer

        config = SystemConfig.load()
        serializer = SystemConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class FeatureFlagViewSet(viewsets.ModelViewSet):
    """ViewSet pour les feature flags."""

    permission_classes = [IsSuperAdmin]
    serializer_class = None  # Will be imported dynamically

    def get_queryset(self):
        from apps.core.models import FeatureFlag
        return FeatureFlag.objects.all()

    def get_serializer_class(self):
        from apps.core.serializers import FeatureFlagSerializer
        return FeatureFlagSerializer

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        """Toggle un feature flag."""
        feature = self.get_object()
        feature.enabled = not feature.enabled
        feature.save()

        from apps.core.serializers import FeatureFlagSerializer
        serializer = FeatureFlagSerializer(feature)
        return Response(serializer.data)
