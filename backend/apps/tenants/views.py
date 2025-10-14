from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.db import transaction

from .models import Tenant, TenantMembership, Coupon, CouponUsage
from .permissions import IsTenantAdmin
from .serializers import (
    InviteMemberSerializer,
    TenantMembershipSerializer,
    TenantSerializer,
    CouponSerializer,
    CouponUsageSerializer,
    ValidateCouponSerializer,
    ApplyCouponSerializer,
)

User = get_user_model()


class TenantViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Expose les informations du tenant courant."""

    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]
    queryset = Tenant.objects.all()
    lookup_field = "slug"

    def get_object(self) -> Tenant:
        return self.request.tenant  # type: ignore[return-value]

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def current(self, request) -> Response:
        serializer = self.get_serializer(self.request.tenant)  # type: ignore[arg-type]
        return Response(serializer.data)


class TenantMembershipViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Gestion des membres d'un tenant."""

    serializer_class = TenantMembershipSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def get_queryset(self):  # type: ignore[override]
        return TenantMembership.objects.filter(
            tenant=self.request.tenant
        ).select_related("user", "tenant").order_by("user__email")

    def get_serializer_class(self):  # type: ignore[override]
        """Utilise InviteMemberSerializer pour la création."""
        if self.action == "create":
            return InviteMemberSerializer
        return TenantMembershipSerializer

    def create(self, request, *args, **kwargs):
        """Invite un utilisateur à rejoindre le tenant."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        role = serializer.validated_data.get("role", "agent")
        first_name = serializer.validated_data.get("first_name", "")
        last_name = serializer.validated_data.get("last_name", "")
        tenant = request.tenant

        # Créer ou récupérer l'utilisateur
        user, user_created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "is_active": True,
            },
        )

        # Si l'utilisateur existe et que first_name/last_name sont fournis, les mettre à jour
        if not user_created and (first_name or last_name):
            if first_name:
                user.first_name = first_name
            if last_name:
                user.last_name = last_name
            user.save(update_fields=["first_name", "last_name"])

        # Vérifier si le membership existe déjà
        membership, created = TenantMembership.objects.get_or_create(
            tenant=tenant,
            user=user,
            defaults={"role": role, "is_active": True},
        )

        if not created:
            # Membership existe déjà
            if membership.is_active:
                return Response(
                    {"detail": "Cet utilisateur est déjà membre du tenant"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                # Réactiver le membership
                membership.is_active = True
                membership.role = role
                membership.save()

        response_serializer = TenantMembershipSerializer(membership)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsTenantAdmin])
    def activate(self, request, pk=None):  # type: ignore[override]
        membership = self.get_object()
        membership.is_active = True
        membership.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsTenantAdmin])
    def deactivate(self, request, pk=None):  # type: ignore[override]
        membership = self.get_object()
        membership.is_active = False
        membership.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class CouponViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des coupons de réduction.
    Accessible uniquement par les super-admins.
    """

    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticated]
    queryset = Coupon.objects.all().prefetch_related('applicable_plans')
    filterset_fields = ['is_active', 'discount_type', 'customer_eligibility']
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['created_at', 'valid_from', 'valid_to', 'current_uses']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filtre les coupons selon les paramètres."""
        queryset = super().get_queryset()

        # Filtrer par statut de validité
        is_valid = self.request.query_params.get('is_valid')
        if is_valid == 'true':
            from django.utils import timezone
            now = timezone.now()
            queryset = queryset.filter(
                is_active=True,
                valid_from__lte=now,
                valid_to__gte=now
            )

        return queryset

    def perform_create(self, serializer):
        """Convertit le code en majuscules à la création."""
        code = serializer.validated_data.get('code', '')
        serializer.save(code=code.upper())

    def perform_update(self, serializer):
        """Convertit le code en majuscules à la mise à jour."""
        code = serializer.validated_data.get('code', '')
        if code:
            serializer.save(code=code.upper())
        else:
            serializer.save()

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def validate(self, request):
        """
        Valide un code promo sans l'appliquer.

        POST /api/v1/coupons/validate/
        {
            "code": "PROMO20",
            "plan": "premium",
            "amount": 50000
        }
        """
        serializer = ValidateCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        coupon = serializer.validated_data['coupon']
        amount = serializer.validated_data['amount']

        # Calculer la réduction
        if coupon.discount_type == Coupon.DISCOUNT_PERCENTAGE:
            discount_amount = int(amount * coupon.discount_value / 100)
        else:  # DISCOUNT_FIXED_AMOUNT
            discount_amount = int(coupon.discount_value)

        final_amount = max(0, amount - discount_amount)

        return Response({
            'valid': True,
            'coupon': CouponSerializer(coupon).data,
            'calculation': {
                'original_amount': amount,
                'discount_amount': discount_amount,
                'final_amount': final_amount,
                'currency': coupon.currency,
                'discount_percentage': round((discount_amount / amount) * 100, 2) if amount > 0 else 0
            }
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def apply(self, request):
        """
        Applique un code promo à une facture.

        POST /api/v1/coupons/apply/
        {
            "code": "PROMO20",
            "invoice_id": "uuid"
        }
        """
        serializer = ApplyCouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        coupon = serializer.validated_data['coupon']
        invoice = serializer.validated_data['invoice']

        # Calculer la réduction
        original_amount = invoice.total
        if coupon.discount_type == Coupon.DISCOUNT_PERCENTAGE:
            discount_amount = int(original_amount * coupon.discount_value / 100)
        else:  # DISCOUNT_FIXED_AMOUNT
            discount_amount = int(coupon.discount_value)

        final_amount = max(0, original_amount - discount_amount)

        # Appliquer le coupon avec transaction atomique
        with transaction.atomic():
            # Créer l'enregistrement d'utilisation
            usage = CouponUsage.objects.create(
                coupon=coupon,
                tenant=invoice.tenant,
                invoice=invoice,
                original_amount=original_amount,
                discount_amount=discount_amount,
                final_amount=final_amount
            )

            # Mettre à jour le compteur d'utilisation du coupon
            coupon.current_uses += 1
            coupon.save(update_fields=['current_uses'])

            # Mettre à jour le montant de la facture
            invoice.total = final_amount
            invoice.save(update_fields=['total'])

        return Response({
            'success': True,
            'message': 'Code promo appliqué avec succès',
            'usage': CouponUsageSerializer(usage).data,
            'updated_invoice': {
                'id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'original_total': original_amount,
                'discount': discount_amount,
                'new_total': final_amount,
                'currency': invoice.currency
            }
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def usage_stats(self, request, pk=None):
        """Retourne les statistiques d'utilisation d'un coupon."""
        coupon = self.get_object()
        usages = CouponUsage.objects.filter(coupon=coupon).select_related('tenant', 'invoice')

        total_discount = sum(usage.discount_amount for usage in usages)
        total_revenue_impact = sum(usage.original_amount - usage.final_amount for usage in usages)

        return Response({
            'coupon_code': coupon.code,
            'total_uses': coupon.current_uses,
            'max_uses': coupon.max_uses,
            'usage_percentage': (coupon.current_uses / coupon.max_uses * 100) if coupon.max_uses > 0 else 0,
            'total_discount_given': total_discount,
            'total_revenue_impact': total_revenue_impact,
            'average_discount_per_use': total_discount // coupon.current_uses if coupon.current_uses > 0 else 0,
            'currency': coupon.currency,
            'recent_usages': CouponUsageSerializer(usages[:10], many=True).data
        })


class CouponUsageViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    ViewSet pour consulter l'historique d'utilisation des coupons.
    """

    serializer_class = CouponUsageSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['coupon', 'tenant', 'invoice']
    ordering = ['-created_at']

    def get_queryset(self):
        """Retourne l'historique filtré selon l'utilisateur."""
        queryset = CouponUsage.objects.all().select_related('coupon', 'tenant', 'invoice')

        # Filtrer par coupon spécifique si fourni
        coupon_id = self.request.query_params.get('coupon_id')
        if coupon_id:
            queryset = queryset.filter(coupon_id=coupon_id)

        return queryset
