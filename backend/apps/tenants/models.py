from __future__ import annotations

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel


class Tenant(TimeStampedModel):
    """Représente un client SmartQueue (organisation)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)

    # Informations organisation
    company_name = models.CharField(max_length=255, blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)

    # Abonnement
    plan = models.CharField(max_length=50, default="trial")  # trial, starter, business, enterprise
    max_sites = models.PositiveIntegerField(default=1)
    max_agents = models.PositiveIntegerField(default=5)
    max_queues = models.PositiveIntegerField(default=10)

    # Configuration
    locale = models.CharField(max_length=10, default="fr")
    timezone = models.CharField(max_length=50, default="UTC")
    data_retention_days = models.PositiveIntegerField(default=365)

    # État
    is_active = models.BooleanField(default=True)
    trial_ends_at = models.DateField(null=True, blank=True)
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspension_reason = models.TextField(blank=True)

    class Meta:
        db_table = "tenants"
        verbose_name = "Tenant"
        verbose_name_plural = "Tenants"

    def __str__(self) -> str:  # pragma: no cover - affichage admin
        return self.name


class TenantMembership(TimeStampedModel):
    """Lien entre un utilisateur et un tenant."""

    ROLE_ADMIN = "admin"
    ROLE_MANAGER = "manager"
    ROLE_AGENT = "agent"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Admin"),
        (ROLE_MANAGER, "Manager"),
        (ROLE_AGENT, "Agent"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tenant_memberships",
    )
    role = models.CharField(max_length=32, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "tenant_memberships"
        unique_together = ("tenant", "user")
        verbose_name = "Tenant membership"
        verbose_name_plural = "Tenant memberships"

    def __str__(self) -> str:  # pragma: no cover - affichage admin
        return f"{self.user} @ {self.tenant}"


# NOTE: Subscription models are defined below in this file
# apps/subscriptions is not in INSTALLED_APPS and should not be imported
# The duplication will be resolved in a future phase (Phase 1 of subscription audit)


class SubscriptionPlan(TimeStampedModel):
    """Plan de souscription avec quotas."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)

    # Quotas
    max_sites = models.PositiveIntegerField(default=1)
    max_agents = models.PositiveIntegerField(default=5)
    max_queues = models.PositiveIntegerField(default=3)
    max_tickets_per_month = models.PositiveIntegerField(default=500)

    # Tarification
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2)
    yearly_price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="XOF")

    # Features (JSON)
    features = models.JSONField(default=list)

    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "subscription_plans"
        ordering = ["display_order", "name"]
        verbose_name = "Plan de souscription"
        verbose_name_plural = "Plans de souscription"

    def __str__(self) -> str:
        return self.name


class Subscription(TimeStampedModel):
    """Abonnement d'un tenant à un plan."""

    STATUS_TRIAL = "trial"
    STATUS_ACTIVE = "active"
    STATUS_PAST_DUE = "past_due"
    STATUS_SUSPENDED = "suspended"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_TRIAL, "Essai gratuit"),
        (STATUS_ACTIVE, "Actif"),
        (STATUS_PAST_DUE, "Paiement en retard"),
        (STATUS_SUSPENDED, "Suspendu"),
        (STATUS_CANCELLED, "Annulé"),
    ]

    BILLING_CYCLE_MONTHLY = "monthly"
    BILLING_CYCLE_YEARLY = "yearly"

    BILLING_CYCLE_CHOICES = [
        (BILLING_CYCLE_MONTHLY, "Mensuel"),
        (BILLING_CYCLE_YEARLY, "Annuel"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name="subscription")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TRIAL)
    billing_cycle = models.CharField(
        max_length=20, choices=BILLING_CYCLE_CHOICES, default=BILLING_CYCLE_MONTHLY
    )

    # Montants (en centimes pour EUR/USD, en francs pour XOF)
    monthly_price = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=3, default="XOF")  # Franc CFA par défaut

    # Dates
    starts_at = models.DateField(default=timezone.now)
    current_period_start = models.DateField(default=timezone.now)
    current_period_end = models.DateField(null=True, blank=True)
    trial_ends_at = models.DateField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateField(null=True, blank=True)  # Date de fin effective après annulation

    # Métadonnées
    external_subscription_id = models.CharField(
        max_length=255, blank=True
    )  # ID Stripe/autre gateway
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "subscriptions"
        verbose_name = "Abonnement"
        verbose_name_plural = "Abonnements"

    def __str__(self) -> str:
        return f"{self.tenant.name} - {self.plan} ({self.status})"

    @property
    def is_trial(self) -> bool:
        return self.status == self.STATUS_TRIAL

    @property
    def is_active(self) -> bool:
        return self.status in [self.STATUS_TRIAL, self.STATUS_ACTIVE]


class Invoice(TimeStampedModel):
    """Facture d'un abonnement."""

    STATUS_DRAFT = "draft"
    STATUS_OPEN = "open"
    STATUS_PAID = "paid"
    STATUS_VOID = "void"
    STATUS_UNCOLLECTIBLE = "uncollectible"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Brouillon"),
        (STATUS_OPEN, "En attente"),
        (STATUS_PAID, "Payée"),
        (STATUS_VOID, "Annulée"),
        (STATUS_UNCOLLECTIBLE, "Impayée"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="invoices")
    subscription = models.ForeignKey(
        Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices"
    )

    # Numérotation
    invoice_number = models.CharField(max_length=100, unique=True)

    # Montants (en centimes pour EUR/USD, en francs pour XOF)
    subtotal = models.PositiveIntegerField(default=0)
    tax = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    amount_paid = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=3, default="XOF")  # Franc CFA par défaut

    # Dates
    invoice_date = models.DateField(default=timezone.now)
    due_date = models.DateField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # État
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)

    # Détails
    description = models.TextField(blank=True)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)

    # Intégration paiement
    external_invoice_id = models.CharField(max_length=255, blank=True)  # ID Stripe/autre
    payment_method = models.CharField(max_length=50, blank=True)  # card, transfer, etc.
    payment_reference = models.CharField(max_length=255, blank=True)

    # Fichier PDF
    pdf_url = models.URLField(blank=True)

    class Meta:
        db_table = "invoices"
        ordering = ["-invoice_date"]
        verbose_name = "Facture"
        verbose_name_plural = "Factures"

    def __str__(self) -> str:
        return f"{self.invoice_number} - {self.tenant.name}"

    @property
    def is_paid(self) -> bool:
        return self.status == self.STATUS_PAID

    @property
    def amount_due(self) -> int:
        return self.total - self.amount_paid


class PaymentMethod(TimeStampedModel):
    """Méthodes de paiement disponibles."""

    # Types de paiement
    TYPE_CARD = "card"
    TYPE_BANK_TRANSFER = "bank_transfer"
    TYPE_MOBILE_MONEY = "mobile_money"
    TYPE_CASH = "cash"
    TYPE_CHECK = "check"

    TYPE_CHOICES = [
        (TYPE_CARD, "Carte bancaire"),
        (TYPE_BANK_TRANSFER, "Virement bancaire"),
        (TYPE_MOBILE_MONEY, "Mobile Money"),
        (TYPE_CASH, "Espèces"),
        (TYPE_CHECK, "Chèque"),
    ]

    # Providers Mobile Money (Sénégal et Afrique de l'Ouest)
    PROVIDER_ORANGE_MONEY = "orange_money"
    PROVIDER_WAVE = "wave"
    PROVIDER_FREE_MONEY = "free_money"
    PROVIDER_E_MONEY = "e_money"
    PROVIDER_YOOMEE_MONEY = "yoomee_money"
    PROVIDER_MTN_MONEY = "mtn_money"
    PROVIDER_MOOV_MONEY = "moov_money"
    PROVIDER_STRIPE = "stripe"
    PROVIDER_PAYPAL = "paypal"
    PROVIDER_OTHER = "other"

    PROVIDER_CHOICES = [
        (PROVIDER_ORANGE_MONEY, "Orange Money"),
        (PROVIDER_WAVE, "Wave"),
        (PROVIDER_FREE_MONEY, "Free Money"),
        (PROVIDER_E_MONEY, "e-Money (Ecobank)"),
        (PROVIDER_YOOMEE_MONEY, "YooMee Money"),
        (PROVIDER_MTN_MONEY, "MTN Mobile Money"),
        (PROVIDER_MOOV_MONEY, "Moov Money"),
        (PROVIDER_STRIPE, "Stripe"),
        (PROVIDER_PAYPAL, "PayPal"),
        (PROVIDER_OTHER, "Autre"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payment_methods")

    # Type et provider
    payment_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES, blank=True)

    # Informations
    account_name = models.CharField(max_length=255, blank=True)  # Nom du compte
    account_number = models.CharField(max_length=100, blank=True)  # N° carte, téléphone, IBAN
    last_four = models.CharField(max_length=4, blank=True)  # 4 derniers chiffres

    # Statut
    is_default = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    # Métadonnées
    external_id = models.CharField(max_length=255, blank=True)  # ID du provider
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "payment_methods"
        verbose_name = "Méthode de paiement"
        verbose_name_plural = "Méthodes de paiement"

    def __str__(self) -> str:
        return f"{self.get_payment_type_display()} - {self.tenant.name}"


class Transaction(TimeStampedModel):
    """Historique des transactions."""

    STATUS_PENDING = "pending"
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"
    STATUS_CANCELLED = "cancelled"
    STATUS_REFUNDED = "refunded"

    STATUS_CHOICES = [
        (STATUS_PENDING, "En attente"),
        (STATUS_SUCCESS, "Réussie"),
        (STATUS_FAILED, "Échouée"),
        (STATUS_CANCELLED, "Annulée"),
        (STATUS_REFUNDED, "Remboursée"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="transactions")
    invoice = models.ForeignKey(
        Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )

    # Montant
    amount = models.PositiveIntegerField()  # En centimes
    currency = models.CharField(max_length=3, default="XOF")  # Franc CFA par défaut

    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)

    # Références
    transaction_id = models.CharField(max_length=255, unique=True)  # ID interne
    external_transaction_id = models.CharField(max_length=255, blank=True)  # ID provider
    payment_reference = models.CharField(max_length=255, blank=True)  # Référence client

    # Informations paiement
    payment_phone = models.CharField(max_length=20, blank=True)  # Pour Mobile Money
    payer_name = models.CharField(max_length=255, blank=True)

    # Détails
    description = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "transactions"
        ordering = ["-created_at"]
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"

    def __str__(self) -> str:
        return f"{self.transaction_id} - {self.get_status_display()}"


class Coupon(TimeStampedModel):
    """Code promo pour réductions et offres promotionnelles."""

    # Types de réduction
    DISCOUNT_PERCENTAGE = "percentage"
    DISCOUNT_FIXED_AMOUNT = "fixed_amount"

    DISCOUNT_TYPE_CHOICES = [
        (DISCOUNT_PERCENTAGE, "Pourcentage"),
        (DISCOUNT_FIXED_AMOUNT, "Montant fixe"),
    ]

    # Éligibilité client
    ELIGIBILITY_ALL = "all"
    ELIGIBILITY_NEW = "new_customers"
    ELIGIBILITY_EXISTING = "existing_customers"

    ELIGIBILITY_CHOICES = [
        (ELIGIBILITY_ALL, "Tous les clients"),
        (ELIGIBILITY_NEW, "Nouveaux clients uniquement"),
        (ELIGIBILITY_EXISTING, "Clients existants uniquement"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Informations de base
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=200)  # Nom interne
    description = models.TextField(blank=True)

    # Configuration de la réduction
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="XOF")

    # Validité
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()

    # Limites d'utilisation
    max_uses = models.IntegerField(default=0, help_text="0 = illimité")
    max_uses_per_customer = models.IntegerField(default=1)
    current_uses = models.IntegerField(default=0)

    # Applicabilité
    applicable_plans = models.ManyToManyField(
        SubscriptionPlan,
        blank=True,
        related_name="coupons"
    )
    customer_eligibility = models.CharField(
        max_length=20,
        choices=ELIGIBILITY_CHOICES,
        default=ELIGIBILITY_ALL
    )

    # Restrictions
    minimum_purchase_amount = models.IntegerField(default=0)
    first_payment_only = models.BooleanField(default=False)

    # Statut
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "coupons"
        ordering = ["-created_at"]
        verbose_name = "Code promo"
        verbose_name_plural = "Codes promo"

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class CouponUsage(TimeStampedModel):
    """Historique d'utilisation des coupons."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="usages")
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="coupon_usages")
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True)
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True, blank=True)

    # Montants
    original_amount = models.IntegerField()
    discount_amount = models.IntegerField()
    final_amount = models.IntegerField()
    currency = models.CharField(max_length=3, default="XOF")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "coupon_usages"
        ordering = ["-created_at"]
        verbose_name = "Utilisation de coupon"
        verbose_name_plural = "Utilisations de coupons"

    def __str__(self) -> str:
        return f"{self.coupon.code} utilisé par {self.tenant.name}"


class PaymentPlan(TimeStampedModel):
    """Plan de paiement échelonné pour factures impayées."""

    STATUS_PROPOSED = "proposed"
    STATUS_ACCEPTED = "accepted"
    STATUS_ACTIVE = "active"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_DEFAULTED = "defaulted"

    STATUS_CHOICES = [
        (STATUS_PROPOSED, "Proposé"),
        (STATUS_ACCEPTED, "Accepté"),
        (STATUS_ACTIVE, "En cours"),
        (STATUS_COMPLETED, "Complété"),
        (STATUS_CANCELLED, "Annulé"),
        (STATUS_DEFAULTED, "En défaut"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="payment_plans")
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payment_plans")

    # Montants
    total_amount = models.PositiveIntegerField()  # Montant total à payer
    amount_paid = models.PositiveIntegerField(default=0)  # Montant déjà payé
    currency = models.CharField(max_length=3, default="XOF")

    # Configuration
    number_of_installments = models.PositiveIntegerField()  # Nombre d'échéances
    installment_amount = models.PositiveIntegerField()  # Montant par échéance
    frequency_days = models.PositiveIntegerField(default=30)  # Fréquence en jours (ex: 30 = mensuel)

    # Dates
    start_date = models.DateField()  # Date de début du plan
    proposed_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # État
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PROPOSED)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "payment_plans"
        ordering = ["-created_at"]
        verbose_name = "Plan de paiement"
        verbose_name_plural = "Plans de paiement"

    def __str__(self) -> str:
        return f"Plan {self.invoice.invoice_number} - {self.number_of_installments} échéances"

    @property
    def amount_due(self) -> int:
        return self.total_amount - self.amount_paid


class PaymentPlanInstallment(TimeStampedModel):
    """Échéance d'un plan de paiement."""

    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_OVERDUE = "overdue"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_PENDING, "En attente"),
        (STATUS_PAID, "Payée"),
        (STATUS_OVERDUE, "En retard"),
        (STATUS_CANCELLED, "Annulée"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment_plan = models.ForeignKey(
        PaymentPlan, on_delete=models.CASCADE, related_name="installments"
    )

    # Informations de l'échéance
    installment_number = models.PositiveIntegerField()  # Numéro de l'échéance (1, 2, 3...)
    amount = models.PositiveIntegerField()  # Montant de cette échéance
    due_date = models.DateField()  # Date d'échéance

    # Paiement
    paid_at = models.DateTimeField(null=True, blank=True)
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installment_payments",
    )

    # État
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)

    class Meta:
        db_table = "payment_plan_installments"
        ordering = ["installment_number"]
        unique_together = ("payment_plan", "installment_number")
        verbose_name = "Échéance de plan"
        verbose_name_plural = "Échéances de plan"

    def __str__(self) -> str:
        return f"Échéance {self.installment_number}/{self.payment_plan.number_of_installments}"


class DunningAction(TimeStampedModel):
    """Action de relance pour factures impayées (dunning)."""

    ACTION_EMAIL = "email"
    ACTION_SMS = "sms"
    ACTION_CALL = "call"
    ACTION_SUSPENSION = "suspension"
    ACTION_LEGAL = "legal"

    ACTION_TYPE_CHOICES = [
        (ACTION_EMAIL, "Email de relance"),
        (ACTION_SMS, "SMS de relance"),
        (ACTION_CALL, "Appel téléphonique"),
        (ACTION_SUSPENSION, "Suspension du service"),
        (ACTION_LEGAL, "Action légale"),
    ]

    STATUS_SCHEDULED = "scheduled"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Planifiée"),
        (STATUS_SENT, "Envoyée"),
        (STATUS_FAILED, "Échouée"),
        (STATUS_CANCELLED, "Annulée"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="dunning_actions")
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="dunning_actions")

    # Type et timing
    action_type = models.CharField(max_length=20, choices=ACTION_TYPE_CHOICES)
    days_overdue = models.PositiveIntegerField()  # Nombre de jours de retard lors de l'action
    scheduled_for = models.DateTimeField()  # Quand l'action doit être exécutée
    executed_at = models.DateTimeField(null=True, blank=True)  # Quand elle a été exécutée

    # État
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    result_message = models.TextField(blank=True)  # Message de résultat (succès/erreur)

    # Contenu
    email_subject = models.CharField(max_length=255, blank=True)
    email_body = models.TextField(blank=True)
    sms_body = models.TextField(blank=True)

    # Métadonnées
    metadata = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)  # Notes internes

    class Meta:
        db_table = "dunning_actions"
        ordering = ["-scheduled_for"]
        verbose_name = "Action de relance"
        verbose_name_plural = "Actions de relance"

    def __str__(self) -> str:
        return f"{self.get_action_type_display()} - {self.invoice.invoice_number} ({self.days_overdue}j)"
