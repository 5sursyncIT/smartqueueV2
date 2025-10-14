"""
Serializers for subscription and billing APIs.
"""

from rest_framework import serializers

from apps.subscriptions.models import Invoice, Payment, Subscription, SubscriptionPlan


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for subscription plans."""

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


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscriptions."""

    plan = SubscriptionPlanSerializer(read_only=True)
    plan_id = serializers.UUIDField(write_only=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "tenant_slug",
            "plan",
            "plan_id",
            "status",
            "billing_period",
            "start_date",
            "end_date",
            "trial_end_date",
            "cancelled_at",
            "is_active",
            "price",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tenant",
            "is_active",
            "price",
            "created_at",
            "updated_at",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payments."""

    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "tenant",
            "tenant_name",
            "tenant_slug",
            "subscription",
            "amount",
            "currency",
            "payment_method",
            "transaction_id",
            "status",
            "failure_reason",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tenant", "created_at", "updated_at"]


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for invoices."""

    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    tenant_slug = serializers.CharField(source="tenant.slug", read_only=True)
    payment_status = serializers.CharField(source="payment.status", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "tenant",
            "tenant_name",
            "tenant_slug",
            "subscription",
            "payment",
            "payment_status",
            "subtotal",
            "tax_amount",
            "total",
            "currency",
            "status",
            "issue_date",
            "due_date",
            "paid_at",
            "notes",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "invoice_number",
            "tenant",
            "payment_status",
            "created_at",
            "updated_at",
        ]
