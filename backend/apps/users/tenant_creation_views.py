"""Views pour la création automatique de tenant après inscription."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils.text import slugify
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tenants.models import Subscription, SubscriptionPlan, Tenant, TenantMembership

from .models import User


class CreateTenantAfterVerificationView(APIView):
    """
    Crée automatiquement un tenant pour un utilisateur après vérification de son email.

    L'utilisateur doit être authentifié et avoir un pending_company_name.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Crée le tenant et le membership pour l'utilisateur connecté."""
        user = request.user

        # Vérifier que l'utilisateur a un nom d'entreprise en attente
        if not user.pending_company_name:
            return Response(
                {'error': 'Aucun nom d\'entreprise en attente de création.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifier que l'utilisateur n'a pas déjà un tenant
        existing_membership = TenantMembership.objects.filter(user=user).first()
        if existing_membership:
            return Response(
                {
                    'error': 'Vous avez déjà une organisation.',
                    'tenant_slug': existing_membership.tenant.slug,
                    'tenant_name': existing_membership.tenant.name,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Générer un slug unique à partir du nom d'entreprise
        base_slug = slugify(user.pending_company_name)
        slug = base_slug
        counter = 1

        # S'assurer que le slug est unique
        while Tenant.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        try:
            with transaction.atomic():
                # Récupérer ou créer le plan trial
                trial_plan, _ = SubscriptionPlan.objects.get_or_create(
                    slug='trial',
                    defaults={
                        'name': 'Trial',
                        'description': 'Plan d\'essai gratuit de 14 jours',
                        'max_sites': 1,
                        'max_agents': 3,
                        'max_queues': 5,
                        'max_tickets_per_month': 500,
                        'monthly_price': Decimal("0"),
                        'yearly_price': Decimal("0"),
                        'is_active': True,
                    }
                )

                # 1. Créer le tenant avec plan trial
                tenant = Tenant.objects.create(
                    name=user.pending_company_name,
                    slug=slug,
                    company_name=user.pending_company_name,
                    email=user.email,
                    plan='trial',
                    max_sites=trial_plan.max_sites,
                    max_agents=trial_plan.max_agents,
                    max_queues=trial_plan.max_queues,
                    is_active=True,
                )

                # 2. Créer le membership admin pour l'utilisateur
                membership = TenantMembership.objects.create(
                    tenant=tenant,
                    user=user,
                    role='admin',
                    is_active=True
                )

                # 3. Créer l'abonnement trial (14 jours)
                subscription = Subscription.objects.create(
                    tenant=tenant,
                    plan=trial_plan,  # Instance de SubscriptionPlan, pas une chaîne
                    status=Subscription.STATUS_TRIAL,
                    billing_cycle=Subscription.BILLING_CYCLE_MONTHLY,
                    monthly_price=0,
                    starts_at=date.today(),
                    current_period_start=date.today(),
                    current_period_end=date.today() + timedelta(days=30),
                    trial_ends_at=date.today() + timedelta(days=14),
                )

                # 4. Nettoyer le pending_company_name
                user.pending_company_name = None
                user.save(update_fields=['pending_company_name'])

                return Response({
                    'success': True,
                    'message': f'Organisation "{tenant.name}" créée avec succès!',
                    'tenant': {
                        'id': str(tenant.id),
                        'name': tenant.name,
                        'slug': tenant.slug,
                        'plan': tenant.plan,
                    },
                    'subscription': {
                        'plan': subscription.plan.slug,  # Retourner le slug, pas l'instance
                        'status': subscription.status,
                        'trial_ends_at': subscription.trial_ends_at.isoformat() if subscription.trial_ends_at else None,
                    },
                    'membership': {
                        'role': membership.role,
                    }
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la création du tenant: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
