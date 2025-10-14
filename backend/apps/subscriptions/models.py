"""
Models for subscription plans and billing.
"""

import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone

from apps.tenants.models import Tenant


class SubscriptionPlan(models.Model):
    """Subscription plan with pricing and features."""

    BILLING_PERIOD_CHOICES = [
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)

    # Pricing
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="XOF")  # ISO 4217

    # Features
    features = models.JSONField(default=list)  # List of feature strings

    # Limits
    max_sites = models.IntegerField(default=1)
    max_agents = models.IntegerField(default=5)
    max_queues = models.IntegerField(default=3)
    max_tickets_per_month = models.IntegerField(default=500)

    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["price_monthly"]
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"

    def __str__(self):
        return f"{self.name} - {self.price_monthly} {self.currency}/month"

    @property
    def organizations_count(self):
        """Count of organizations subscribed to this plan."""
        return self.subscriptions.filter(status="active").count()


class Subscription(models.Model):
    """Organization subscription to a plan."""

    STATUS_CHOICES = [
        ("trial", "Trial"),
        ("active", "Active"),
        ("past_due", "Past Due"),
        ("cancelled", "Cancelled"),
        ("expired", "Expired"),
    ]

    BILLING_PERIOD_CHOICES = [
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(
        Tenant, on_delete=models.CASCADE, related_name="subscription"
    )
    plan = models.ForeignKey(
        SubscriptionPlan, on_delete=models.PROTECT, related_name="subscriptions"
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="trial")
    billing_period = models.CharField(
        max_length=10, choices=BILLING_PERIOD_CHOICES, default="monthly"
    )

    # Dates
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    trial_end_date = models.DateField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"

    def __str__(self):
        return f"{self.tenant.name} - {self.plan.name} ({self.status})"

    @property
    def is_active(self):
        """Check if subscription is currently active."""
        return self.status in ["trial", "active"]

    @property
    def price(self):
        """Get current price based on billing period."""
        if self.billing_period == "yearly":
            return self.plan.price_yearly
        return self.plan.price_monthly


class Payment(models.Model):
    """Payment transaction record."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("succeeded", "Succeeded"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("orange_money", "Orange Money"),
        ("wave", "Wave"),
        ("free_money", "Free Money"),
        ("emoney", "e-Money"),
        ("yoomee", "YooMee"),
        ("mtn", "MTN Mobile Money"),
        ("moov", "Moov Money"),
        ("card", "Credit/Debit Card"),
        ("bank_transfer", "Bank Transfer"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="payments"
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )

    # Payment details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="XOF")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    transaction_id = models.CharField(max_length=255, unique=True)

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    failure_reason = models.TextField(blank=True)

    # Metadata
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        indexes = [
            models.Index(fields=["tenant", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.tenant.name} - {self.amount} {self.currency} ({self.status})"


class Invoice(models.Model):
    """Invoice for subscription billing."""

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("sent", "Sent"),
        ("paid", "Paid"),
        ("overdue", "Overdue"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True)
    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="invoices"
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    payment = models.OneToOneField(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice",
    )

    # Amount
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="XOF")

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Dates
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"
        indexes = [
            models.Index(fields=["tenant", "-created_at"]),
            models.Index(fields=["status", "-due_date"]),
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.tenant.name} ({self.status})"

    def save(self, *args, **kwargs):
        """Auto-generate invoice number if not set."""
        if not self.invoice_number:
            # Format: INV-YYYY-NNNN
            year = timezone.now().year
            last_invoice = Invoice.objects.filter(
                invoice_number__startswith=f"INV-{year}-"
            ).order_by("-invoice_number").first()

            if last_invoice:
                last_num = int(last_invoice.invoice_number.split("-")[-1])
                new_num = last_num + 1
            else:
                new_num = 1

            self.invoice_number = f"INV-{year}-{new_num:04d}"

        super().save(*args, **kwargs)
