"""Serializers pour le super-admin (gestion plateforme)."""

from __future__ import annotations

from rest_framework import serializers

from .models import (
    DunningAction,
    Invoice,
    PaymentMethod,
    PaymentPlan,
    PaymentPlanInstallment,
    Subscription,
    SubscriptionPlan,
    Tenant,
    TenantMembership,
    Transaction,
)


class TenantAdminSerializer(serializers.ModelSerializer):
    """Serializer complet pour le super-admin (avec métriques)."""

    members_count = serializers.SerializerMethodField()
    sites_count = serializers.SerializerMethodField()
    agents_count = serializers.SerializerMethodField()
    queues_count = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            "id",
            "name",
            "slug",
            "company_name",
            "address",
            "phone",
            "email",
            "website",
            "plan",
            "max_sites",
            "max_agents",
            "max_queues",
            "locale",
            "timezone",
            "data_retention_days",
            "is_active",
            "trial_ends_at",
            "suspended_at",
            "suspension_reason",
            "created_at",
            "updated_at",
            # Métriques
            "members_count",
            "sites_count",
            "agents_count",
            "queues_count",
            "subscription_status",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_members_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_sites_count(self, obj):
        return obj.sites.count() if hasattr(obj, "sites") else 0

    def get_agents_count(self, obj):
        # Compter les agents via QueueAssignment
        from apps.queues.models import QueueAssignment

        return (
            QueueAssignment.objects.filter(queue__tenant=obj, is_active=True)
            .values("agent")
            .distinct()
            .count()
        )

    def get_queues_count(self, obj):
        return obj.queues.count() if hasattr(obj, "queues") else 0

    def get_subscription_status(self, obj):
        try:
            sub = obj.subscription
            return {
                "status": sub.status,
                "plan": {
                    "id": str(sub.plan.id),
                    "name": sub.plan.name,
                    "slug": sub.plan.slug,
                },
                "is_trial": sub.is_trial,
                "current_period_end": sub.current_period_end,
            }
        except Subscription.DoesNotExist:
            return None


class SubscriptionAdminSerializer(serializers.ModelSerializer):
    """Serializer pour les abonnements (super-admin)."""

    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    monthly_price_display = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "tenant_slug",
            "plan",
            "status",
            "billing_cycle",
            "monthly_price",
            "monthly_price_display",
            "currency",
            "starts_at",
            "current_period_start",
            "current_period_end",
            "trial_ends_at",
            "cancelled_at",
            "ends_at",
            "external_subscription_id",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_monthly_price_display(self, obj):
        """Format monthly price with currency."""
        # XOF is stored as full francs, EUR/USD as centimes
        if obj.currency == "XOF":
            return f"{obj.monthly_price:,} {obj.currency}".replace(',', ' ')
        return f"{obj.monthly_price / 100:.2f} {obj.currency}"


class InvoiceAdminSerializer(serializers.ModelSerializer):
    """Serializer pour les factures (super-admin)."""

    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    total_display = serializers.SerializerMethodField()
    amount_due_display = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "tenant_slug",
            "subscription",
            "invoice_number",
            "subtotal",
            "tax",
            "total",
            "total_display",
            "amount_paid",
            "amount_due_display",
            "currency",
            "invoice_date",
            "due_date",
            "paid_at",
            "status",
            "description",
            "period_start",
            "period_end",
            "external_invoice_id",
            "payment_method",
            "payment_reference",
            "pdf_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_total_display(self, obj):
        # XOF is stored as full francs, EUR/USD as centimes
        if obj.currency == "XOF":
            return f"{obj.total:,} {obj.currency}".replace(',', ' ')
        return f"{obj.total / 100:.2f} {obj.currency}"

    def get_amount_due_display(self, obj):
        # XOF is stored as full francs, EUR/USD as centimes
        if obj.currency == "XOF":
            return f"{obj.amount_due:,} {obj.currency}".replace(',', ' ')
        return f"{obj.amount_due / 100:.2f} {obj.currency}"


class TenantMembershipAdminSerializer(serializers.ModelSerializer):
    """Serializer pour les membres (vue super-admin)."""

    user_email = serializers.CharField(source="user.email", read_only=True)
    user_name = serializers.SerializerMethodField()
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)

    class Meta:
        model = TenantMembership
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "user",
            "user_email",
            "user_name",
            "role",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class CreateTenantSerializer(serializers.Serializer):
    """Serializer pour créer un tenant avec son abonnement initial."""

    name = serializers.CharField(max_length=255)
    slug = serializers.SlugField()
    company_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    plan = serializers.ChoiceField(
        choices=["trial", "starter", "business", "enterprise"], default="trial"
    )
    admin_email = serializers.EmailField()
    admin_first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    admin_last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    admin_password = serializers.CharField(write_only=True, required=False)


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer pour les plans d'abonnement."""

    organizations_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "monthly_price",
            "yearly_price",
            "currency",
            "features",
            "max_sites",
            "max_agents",
            "max_queues",
            "max_tickets_per_month",
            "is_active",
            "display_order",
            "organizations_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "organizations_count", "created_at", "updated_at"]


class TransactionAdminSerializer(serializers.ModelSerializer):
    """Serializer pour les transactions (super-admin)."""

    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    amount_display = serializers.SerializerMethodField()
    payment_method_name = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "tenant_slug",
            "invoice",
            "payment_method",
            "payment_method_name",
            "amount",
            "amount_display",
            "currency",
            "status",
            "transaction_id",
            "external_transaction_id",
            "payment_reference",
            "payment_phone",
            "payer_name",
            "description",
            "error_message",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_amount_display(self, obj):
        """Format amount with currency."""
        # XOF is stored as full francs, EUR/USD as centimes
        if obj.currency == "XOF":
            return f"{obj.amount:,} {obj.currency}".replace(',', ' ')
        return f"{obj.amount / 100:.2f} {obj.currency}"

    def get_payment_method_name(self, obj):
        """Get payment method display name."""
        if obj.payment_method:
            return obj.payment_method.get_payment_type_display()
        return None


class PaymentPlanInstallmentSerializer(serializers.ModelSerializer):
    """Serializer pour les échéances de plan de paiement."""

    amount_display = serializers.SerializerMethodField()

    class Meta:
        model = PaymentPlanInstallment
        fields = [
            "id",
            "installment_number",
            "amount",
            "amount_display",
            "due_date",
            "paid_at",
            "status",
        ]

    def get_amount_display(self, obj):
        """Format amount with currency."""
        currency = obj.payment_plan.currency
        if currency == "XOF":
            return f"{obj.amount:,} {currency}".replace(',', ' ')
        return f"{obj.amount / 100:.2f} {currency}"


class PaymentPlanSerializer(serializers.ModelSerializer):
    """Serializer pour les plans de paiement."""

    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    installments = PaymentPlanInstallmentSerializer(many=True, read_only=True)
    total_amount_display = serializers.SerializerMethodField()
    amount_paid_display = serializers.SerializerMethodField()
    amount_due_display = serializers.SerializerMethodField()

    class Meta:
        model = PaymentPlan
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "tenant_slug",
            "invoice",
            "invoice_number",
            "total_amount",
            "total_amount_display",
            "amount_paid",
            "amount_paid_display",
            "amount_due",
            "amount_due_display",
            "currency",
            "number_of_installments",
            "installment_amount",
            "frequency_days",
            "start_date",
            "proposed_at",
            "accepted_at",
            "completed_at",
            "cancelled_at",
            "status",
            "notes",
            "installments",
            "created_at",
            "updated_at",
        ]

    def get_total_amount_display(self, obj):
        """Format total amount with currency."""
        if obj.currency == "XOF":
            return f"{obj.total_amount:,} {obj.currency}".replace(',', ' ')
        return f"{obj.total_amount / 100:.2f} {obj.currency}"

    def get_amount_paid_display(self, obj):
        """Format amount paid with currency."""
        if obj.currency == "XOF":
            return f"{obj.amount_paid:,} {obj.currency}".replace(',', ' ')
        return f"{obj.amount_paid / 100:.2f} {obj.currency}"

    def get_amount_due_display(self, obj):
        """Format amount due with currency."""
        amount_due = obj.amount_due
        if obj.currency == "XOF":
            return f"{amount_due:,} {obj.currency}".replace(',', ' ')
        return f"{amount_due / 100:.2f} {obj.currency}"


class DunningActionSerializer(serializers.ModelSerializer):
    """Serializer pour les actions de relance."""

    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)
    action_type_display = serializers.CharField(source="get_action_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = DunningAction
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "invoice",
            "invoice_number",
            "action_type",
            "action_type_display",
            "days_overdue",
            "scheduled_for",
            "executed_at",
            "status",
            "status_display",
            "result_message",
            "email_subject",
            "email_body",
            "sms_body",
            "notes",
            "metadata",
            "created_at",
        ]
