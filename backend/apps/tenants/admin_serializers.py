"""Serializers pour le super-admin (gestion plateforme)."""

from __future__ import annotations

from rest_framework import serializers

from .models import (
    Invoice,
    PaymentMethod,
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
                "plan": sub.plan,
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
        """Convertit les centimes en euros."""
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
        return f"{obj.total / 100:.2f} {obj.currency}"

    def get_amount_due_display(self, obj):
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
            "price_monthly",
            "price_yearly",
            "currency",
            "features",
            "max_sites",
            "max_agents",
            "max_queues",
            "max_tickets_per_month",
            "is_active",
            "is_featured",
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
        return f"{obj.amount / 100:.2f} {obj.currency}"

    def get_payment_method_name(self, obj):
        """Get payment method display name."""
        if obj.payment_method:
            return obj.payment_method.get_payment_type_display()
        return None
