"""
ViewSets for subscription and billing APIs.
"""

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsSuperAdmin
from apps.subscriptions.models import Invoice, Payment, Subscription, SubscriptionPlan
from apps.subscriptions.serializers import (
    InvoiceSerializer,
    PaymentSerializer,
    SubscriptionPlanSerializer,
    SubscriptionSerializer,
)


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    """ViewSet for managing subscription plans (super-admin only)."""

    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    lookup_field = "slug"

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get subscription plan statistics."""
        plans = self.get_queryset()

        # Count active subscriptions per plan
        plan_stats = []
        for plan in plans:
            active_count = plan.subscriptions.filter(status="active").count()
            trial_count = plan.subscriptions.filter(status="trial").count()
            plan_stats.append({
                "plan_id": str(plan.id),
                "plan_name": plan.name,
                "plan_slug": plan.slug,
                "active_subscriptions": active_count,
                "trial_subscriptions": trial_count,
                "total_subscriptions": active_count + trial_count,
                "monthly_revenue": float(plan.price_monthly) * active_count,
            })

        return Response({
            "total_plans": plans.count(),
            "active_plans": plans.filter(is_active=True).count(),
            "plan_statistics": plan_stats,
        })


class SubscriptionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing subscriptions (super-admin only)."""

    queryset = Subscription.objects.select_related("tenant", "plan").all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get_queryset(self):
        """Filter subscriptions with optional query params."""
        queryset = super().get_queryset()

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by plan
        plan_slug = self.request.query_params.get("plan")
        if plan_slug:
            queryset = queryset.filter(plan__slug=plan_slug)

        return queryset

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get subscription statistics."""
        queryset = self.get_queryset()

        total = queryset.count()
        active = queryset.filter(status="active").count()
        trial = queryset.filter(status="trial").count()
        cancelled = queryset.filter(status="cancelled").count()
        expired = queryset.filter(status="expired").count()

        # Calculate MRR (Monthly Recurring Revenue)
        active_subs = queryset.filter(status="active").select_related("plan")
        mrr = sum(
            float(sub.plan.price_monthly if sub.billing_period == "monthly"
                  else sub.plan.price_yearly / 12)
            for sub in active_subs
        )

        # Churn rate (cancelled in last 30 days / total active at start of period)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        recent_cancellations = queryset.filter(
            cancelled_at__gte=thirty_days_ago
        ).count()
        churn_rate = (recent_cancellations / active * 100) if active > 0 else 0

        return Response({
            "total_subscriptions": total,
            "active_subscriptions": active,
            "trial_subscriptions": trial,
            "cancelled_subscriptions": cancelled,
            "expired_subscriptions": expired,
            "mrr": mrr,
            "churn_rate": round(churn_rate, 2),
        })


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payments (super-admin only)."""

    queryset = Payment.objects.select_related("tenant", "subscription").all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get_queryset(self):
        """Filter payments with optional query params."""
        queryset = super().get_queryset()

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by payment method
        method_filter = self.request.query_params.get("payment_method")
        if method_filter:
            queryset = queryset.filter(payment_method=method_filter)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        return queryset

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get payment statistics."""
        queryset = self.get_queryset()

        total_revenue = queryset.filter(status="succeeded").aggregate(
            total=Sum("amount")
        )["total"] or 0

        pending_amount = queryset.filter(status="pending").aggregate(
            total=Sum("amount")
        )["total"] or 0

        failed_amount = queryset.filter(status="failed").aggregate(
            total=Sum("amount")
        )["total"] or 0

        # Count by status
        status_counts = queryset.values("status").annotate(count=Count("id"))

        # Count by payment method
        method_counts = queryset.filter(status="succeeded").values(
            "payment_method"
        ).annotate(count=Count("id"))

        # Calculate success rate
        total_payments = queryset.count()
        successful_payments = queryset.filter(status="succeeded").count()
        success_rate = (successful_payments / total_payments * 100) if total_payments > 0 else 0

        return Response({
            "total_revenue": float(total_revenue),
            "pending_amount": float(pending_amount),
            "failed_amount": float(failed_amount),
            "total_payments": total_payments,
            "successful_payments": successful_payments,
            "success_rate": round(success_rate, 2),
            "status_breakdown": list(status_counts),
            "payment_method_breakdown": list(method_counts),
        })


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoices (super-admin only)."""

    queryset = Invoice.objects.select_related(
        "tenant", "subscription", "payment"
    ).all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get_queryset(self):
        """Filter invoices with optional query params."""
        queryset = super().get_queryset()

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by tenant
        tenant_slug = self.request.query_params.get("tenant")
        if tenant_slug:
            queryset = queryset.filter(tenant__slug=tenant_slug)

        return queryset

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get invoice statistics."""
        queryset = self.get_queryset()

        total = queryset.count()
        paid = queryset.filter(status="paid").count()
        overdue = queryset.filter(status="overdue").count()
        pending = queryset.filter(status__in=["draft", "sent"]).count()

        total_amount = queryset.aggregate(total=Sum("total"))["total"] or 0
        paid_amount = queryset.filter(status="paid").aggregate(
            total=Sum("total")
        )["total"] or 0
        outstanding_amount = total_amount - paid_amount

        return Response({
            "total_invoices": total,
            "paid_invoices": paid,
            "overdue_invoices": overdue,
            "pending_invoices": pending,
            "total_amount": float(total_amount),
            "paid_amount": float(paid_amount),
            "outstanding_amount": float(outstanding_amount),
        })
