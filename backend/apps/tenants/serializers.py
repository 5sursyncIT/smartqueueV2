from __future__ import annotations

from rest_framework import serializers

from .models import Tenant, TenantMembership, Coupon, CouponUsage, SubscriptionPlan, Invoice


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = (
            "id",
            "name",
            "slug",
            "plan",
            "locale",
            "timezone",
            "data_retention_days",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "created_at", "updated_at")


class TenantMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_first_name = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name = serializers.CharField(source="user.last_name", read_only=True)

    class Meta:
        model = TenantMembership
        fields = (
            "id",
            "tenant",
            "user",
            "user_email",
            "user_first_name",
            "user_last_name",
            "role",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "tenant", "created_at", "updated_at", "user_email", "user_first_name", "user_last_name")


class InviteMemberSerializer(serializers.Serializer):
    """Serializer pour inviter un nouveau membre au tenant."""
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=["admin", "manager", "agent"],
        default="agent",
        required=False
    )


class CouponSerializer(serializers.ModelSerializer):
    """Serializer pour les coupons de réduction."""

    applicable_plan_names = serializers.SerializerMethodField()
    usage_percentage = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = (
            "id",
            "code",
            "name",
            "description",
            "discount_type",
            "discount_value",
            "currency",
            "valid_from",
            "valid_to",
            "max_uses",
            "max_uses_per_customer",
            "current_uses",
            "applicable_plans",
            "applicable_plan_names",
            "customer_eligibility",
            "minimum_purchase_amount",
            "first_payment_only",
            "is_active",
            "usage_percentage",
            "is_valid",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "current_uses", "created_at", "updated_at")

    def get_applicable_plan_names(self, obj):
        """Retourne les noms des plans applicables."""
        return [plan.name for plan in obj.applicable_plans.all()]

    def get_usage_percentage(self, obj):
        """Calcule le pourcentage d'utilisation."""
        if obj.max_uses == 0:
            return 0
        return round((obj.current_uses / obj.max_uses) * 100, 2)

    def get_is_valid(self, obj):
        """Vérifie si le coupon est actuellement valide."""
        from django.utils import timezone
        now = timezone.now()
        return (
            obj.is_active
            and obj.valid_from <= now <= obj.valid_to
            and (obj.max_uses == 0 or obj.current_uses < obj.max_uses)
        )


class CouponUsageSerializer(serializers.ModelSerializer):
    """Serializer pour l'historique d'utilisation des coupons."""

    coupon_code = serializers.CharField(source="coupon.code", read_only=True)
    coupon_name = serializers.CharField(source="coupon.name", read_only=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)

    class Meta:
        model = CouponUsage
        fields = (
            "id",
            "coupon",
            "coupon_code",
            "coupon_name",
            "tenant",
            "tenant_name",
            "invoice",
            "invoice_number",
            "original_amount",
            "discount_amount",
            "final_amount",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class ValidateCouponSerializer(serializers.Serializer):
    """Serializer pour valider un code promo."""

    code = serializers.CharField(required=True, max_length=50)
    plan = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.IntegerField(required=True, min_value=0)

    def validate(self, attrs):
        """Valide le coupon et calcule la réduction."""
        from django.utils import timezone

        code = attrs.get('code')
        plan = attrs.get('plan')
        amount = attrs.get('amount')

        # Vérifier que le coupon existe
        try:
            coupon = Coupon.objects.get(code=code.upper())
        except Coupon.DoesNotExist:
            raise serializers.ValidationError({"code": "Code promo invalide"})

        # Vérifier que le coupon est actif
        if not coupon.is_active:
            raise serializers.ValidationError({"code": "Ce code promo n'est plus actif"})

        # Vérifier la période de validité
        now = timezone.now()
        if now < coupon.valid_from:
            raise serializers.ValidationError(
                {"code": f"Ce code promo sera valide à partir du {coupon.valid_from.strftime('%d/%m/%Y')}"}
            )
        if now > coupon.valid_to:
            raise serializers.ValidationError(
                {"code": f"Ce code promo a expiré le {coupon.valid_to.strftime('%d/%m/%Y')}"}
            )

        # Vérifier le nombre d'utilisations
        if coupon.max_uses > 0 and coupon.current_uses >= coupon.max_uses:
            raise serializers.ValidationError({"code": "Ce code promo a atteint sa limite d'utilisation"})

        # Vérifier le montant minimum
        if amount < coupon.minimum_purchase_amount:
            raise serializers.ValidationError({
                "amount": f"Montant minimum requis: {coupon.minimum_purchase_amount} {coupon.currency}"
            })

        # Vérifier l'applicabilité au plan
        if plan and coupon.applicable_plans.exists():
            if not coupon.applicable_plans.filter(slug=plan).exists():
                raise serializers.ValidationError({
                    "plan": "Ce code promo n'est pas applicable à ce plan"
                })

        attrs['coupon'] = coupon
        return attrs


class ApplyCouponSerializer(serializers.Serializer):
    """Serializer pour appliquer un code promo à une facture."""

    code = serializers.CharField(required=True, max_length=50)
    invoice_id = serializers.UUIDField(required=True)

    def validate(self, attrs):
        """Valide et applique le coupon à la facture."""
        from django.utils import timezone

        code = attrs.get('code')
        invoice_id = attrs.get('invoice_id')

        # Vérifier que la facture existe
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            raise serializers.ValidationError({"invoice_id": "Facture introuvable"})

        # Vérifier que la facture n'est pas déjà payée
        if invoice.status == Invoice.STATUS_PAID:
            raise serializers.ValidationError({"invoice_id": "Cette facture est déjà payée"})

        # Vérifier qu'un coupon n'a pas déjà été appliqué
        if CouponUsage.objects.filter(invoice=invoice).exists():
            raise serializers.ValidationError({"invoice_id": "Un code promo a déjà été appliqué à cette facture"})

        # Vérifier que le coupon existe et est valide
        try:
            coupon = Coupon.objects.get(code=code.upper())
        except Coupon.DoesNotExist:
            raise serializers.ValidationError({"code": "Code promo invalide"})

        if not coupon.is_active:
            raise serializers.ValidationError({"code": "Ce code promo n'est plus actif"})

        now = timezone.now()
        if now < coupon.valid_from or now > coupon.valid_to:
            raise serializers.ValidationError({"code": "Ce code promo n'est pas valide actuellement"})

        if coupon.max_uses > 0 and coupon.current_uses >= coupon.max_uses:
            raise serializers.ValidationError({"code": "Ce code promo a atteint sa limite d'utilisation"})

        # Vérifier le montant minimum
        if invoice.total < coupon.minimum_purchase_amount:
            raise serializers.ValidationError({
                "amount": f"Montant minimum requis: {coupon.minimum_purchase_amount} {coupon.currency}"
            })

        # Vérifier l'utilisation par client
        if coupon.max_uses_per_customer > 0:
            usage_count = CouponUsage.objects.filter(
                coupon=coupon,
                tenant=invoice.tenant
            ).count()
            if usage_count >= coupon.max_uses_per_customer:
                raise serializers.ValidationError({
                    "code": "Vous avez déjà utilisé ce code promo le nombre maximum de fois"
                })

        attrs['coupon'] = coupon
        attrs['invoice'] = invoice
        return attrs
