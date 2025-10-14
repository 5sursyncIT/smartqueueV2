"""ViewSets pour le super-admin (gestion plateforme)."""

from __future__ import annotations

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
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
            subscription = Subscription.objects.create(
                tenant=tenant,
                plan=plan,
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
                    status=Ticket.STATUS_COMPLETED,
                    updated_at__date=date.today(),
                ).count(),
            }
        )

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


class TenantMembershipAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour voir tous les membres (super-admin)."""

    queryset = (
        TenantMembership.objects.all().select_related("tenant", "user").order_by("-created_at")
    )
    serializer_class = TenantMembershipAdminSerializer
    permission_classes = [IsSuperAdmin]


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des plans d'abonnement (super-admin)."""

    queryset = SubscriptionPlan.objects.all().order_by("price_monthly")
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsSuperAdmin]
    lookup_field = "slug"

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Statistiques sur les plans d'abonnement."""
        plans = self.get_queryset()

        # Stats par plan
        plan_stats = []
        total_monthly_revenue = 0

        for plan in plans:
            active_subs = Subscription.objects.filter(plan=plan.slug, status="active")
            active_count = active_subs.count()
            trial_count = Subscription.objects.filter(plan=plan.slug, status="trial").count()

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
                    "price_monthly": float(plan.price_monthly),
                    "price_yearly": float(plan.price_yearly),
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
