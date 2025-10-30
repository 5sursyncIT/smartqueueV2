"""
Tâches Celery pour la gestion automatique de la facturation.
"""
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task
def check_overdue_invoices():
    """
    Vérifie les factures impayées et envoie des rappels automatiques.
    Exécution: Tous les jours à 9h00 (configuré dans Celery Beat)

    Logique de relance:
    - J+3: Premier rappel amical
    - J+7: Deuxième rappel
    - J+15: Avertissement de suspension
    - J+30: Suspension automatique du service
    """
    from apps.tenants.models import Invoice, Tenant

    today = timezone.now().date()
    logger.info(f"[DUNNING] Vérification des factures impayées pour le {today}")

    # Récupérer toutes les factures ouvertes en retard
    overdue_invoices = Invoice.objects.filter(
        status=Invoice.STATUS_OPEN,
        due_date__lt=today
    ).select_related('tenant', 'subscription')

    stats = {
        'total_overdue': overdue_invoices.count(),
        'reminder_day_3': 0,
        'reminder_day_7': 0,
        'warning_day_15': 0,
        'suspended_day_30': 0,
    }

    for invoice in overdue_invoices:
        days_overdue = (today - invoice.due_date).days
        tenant = invoice.tenant

        try:
            if days_overdue == 3:
                # Premier rappel amical
                send_reminder_email(
                    tenant=tenant,
                    invoice=invoice,
                    reminder_type='day_3',
                    days_overdue=days_overdue
                )
                stats['reminder_day_3'] += 1
                logger.info(f"[DUNNING] Rappel J+3 envoyé pour {invoice.invoice_number}")

            elif days_overdue == 7:
                # Deuxième rappel
                send_reminder_email(
                    tenant=tenant,
                    invoice=invoice,
                    reminder_type='day_7',
                    days_overdue=days_overdue
                )
                stats['reminder_day_7'] += 1
                logger.info(f"[DUNNING] Rappel J+7 envoyé pour {invoice.invoice_number}")

            elif days_overdue == 15:
                # Avertissement de suspension
                send_reminder_email(
                    tenant=tenant,
                    invoice=invoice,
                    reminder_type='day_15',
                    days_overdue=days_overdue
                )
                stats['warning_day_15'] += 1
                logger.warning(f"[DUNNING] Avertissement J+15 envoyé pour {invoice.invoice_number}")

            elif days_overdue >= 30 and tenant.is_active:
                # Suspension automatique du service
                from apps.tenants.dunning_services import suspend_tenant_service

                with transaction.atomic():
                    reason = f"Facture {invoice.invoice_number} impayée depuis {days_overdue} jours"
                    suspend_tenant_service(tenant, reason)

                    send_suspension_email(tenant, invoice, days_overdue)
                    stats['suspended_day_30'] += 1
                    logger.error(f"[DUNNING] Suspension J+30 appliquée pour {tenant.name}")

        except Exception as e:
            logger.error(f"[DUNNING] Erreur pour facture {invoice.invoice_number}: {str(e)}")
            continue

    logger.info(f"[DUNNING] Résumé: {stats}")
    return stats


def send_reminder_email(tenant, invoice, reminder_type, days_overdue):
    """
    Envoie un email de rappel selon le type.
    """
    from apps.tenants.dunning_services import send_dunning_email

    template_map = {
        'day_3': 'first_reminder',
        'day_7': 'second_reminder',
        'day_15': 'final_notice',
    }

    template = template_map.get(reminder_type, 'default')

    try:
        # Utiliser le service de dunning pour envoyer l'email
        action = send_dunning_email(invoice, days_overdue, template)
        logger.info(f"[EMAIL] Rappel envoyé via dunning service: {action.email_subject} -> {tenant.email}")
    except Exception as e:
        logger.error(f"[EMAIL] Erreur lors de l'envoi du rappel: {str(e)}")
        raise


def send_suspension_email(tenant, invoice, days_overdue):
    """
    Envoie un email de notification de suspension.
    """
    subject = f"🚨 SERVICE SUSPENDU - Facture {invoice.invoice_number}"

    context = {
        'tenant_name': tenant.name,
        'invoice_number': invoice.invoice_number,
        'amount': invoice.total / 100,
        'currency': invoice.currency,
        'days_overdue': days_overdue,
        'support_email': 'support@smartqueue.com',
        'support_phone': '+221 XX XXX XX XX',
    }

    logger.error(f"[EMAIL SUSPENSION] {subject} -> {tenant.email}")
    logger.error(f"[EMAIL SUSPENSION] Contexte: {context}")

    # TODO: Intégrer avec SendGrid
    # send_email_notification.delay(
    #     to_email=tenant.email,
    #     subject=subject,
    #     template='service_suspended',
    #     context=context
    # )


@shared_task
def retry_failed_payments():
    """
    Retente automatiquement les paiements échoués.
    Exécution: Tous les jours à 2h00

    Logique:
    - Réessaie les paiements échoués depuis moins de 7 jours
    - Maximum 3 tentatives par paiement
    """
    from apps.tenants.models import Transaction

    today = timezone.now()
    seven_days_ago = today - timedelta(days=7)

    logger.info(f"[RETRY] Tentative de retry des paiements échoués")

    # Transactions échouées à retenter
    failed_transactions = Transaction.objects.filter(
        status=Transaction.STATUS_FAILED,
        created_at__gte=seven_days_ago,
    ).select_related('tenant', 'invoice')

    stats = {'retried': 0, 'success': 0, 'failed': 0}

    for transaction in failed_transactions:
        # Vérifier le nombre de tentatives dans metadata
        retry_count = transaction.metadata.get('retry_count', 0)

        if retry_count >= 3:
            logger.info(f"[RETRY] Transaction {transaction.transaction_id} a déjà 3 tentatives")
            continue

        try:
            # TODO: Implémenter retry réel avec provider
            logger.info(f"[RETRY] Retry transaction {transaction.transaction_id} (tentative {retry_count + 1}/3)")

            # Mettre à jour le compteur de retry
            transaction.metadata['retry_count'] = retry_count + 1
            transaction.metadata['last_retry_at'] = timezone.now().isoformat()
            transaction.save()

            stats['retried'] += 1

            # TODO: Appeler le provider de paiement pour retenter
            # success = retry_payment_with_provider(transaction)
            # if success:
            #     transaction.status = Transaction.STATUS_SUCCESS
            #     stats['success'] += 1
            # else:
            #     stats['failed'] += 1

        except Exception as e:
            logger.error(f"[RETRY] Erreur retry {transaction.transaction_id}: {str(e)}")
            stats['failed'] += 1
            continue

    logger.info(f"[RETRY] Résumé: {stats}")
    return stats


@shared_task
def generate_recurring_invoices():
    """
    Génère automatiquement les factures récurrentes mensuelles/annuelles.
    Exécution: Le 1er de chaque mois à minuit

    Logique:
    - Vérifie les abonnements actifs dont la période se termine
    - Génère une nouvelle facture
    - Envoie un email avec le PDF
    """
    from apps.tenants.models import Subscription, Invoice

    today = timezone.now().date()
    logger.info(f"[RECURRING] Génération des factures récurrentes pour le {today}")

    # Abonnements à renouveler (période se termine aujourd'hui ou avant)
    subscriptions_to_renew = Subscription.objects.filter(
        status__in=[Subscription.STATUS_ACTIVE, Subscription.STATUS_TRIAL],
        current_period_end__lte=today
    ).select_related('tenant')

    stats = {'generated': 0, 'errors': 0}

    for subscription in subscriptions_to_renew:
        try:
            with transaction.atomic():
                # Créer la nouvelle facture
                invoice = create_invoice_for_subscription(subscription)
                stats['generated'] += 1

                logger.info(f"[RECURRING] Facture {invoice.invoice_number} créée pour {subscription.tenant.name}")

                # Mettre à jour la période de l'abonnement
                if subscription.billing_cycle == Subscription.BILLING_CYCLE_MONTHLY:
                    subscription.current_period_start = today
                    subscription.current_period_end = today + timedelta(days=30)
                else:  # yearly
                    subscription.current_period_start = today
                    subscription.current_period_end = today + timedelta(days=365)

                subscription.save()

                # Envoyer l'email avec la facture
                send_invoice_email(subscription.tenant, invoice)

        except Exception as e:
            logger.error(f"[RECURRING] Erreur pour subscription {subscription.id}: {str(e)}")
            stats['errors'] += 1
            continue

    logger.info(f"[RECURRING] Résumé: {stats}")
    return stats


def create_invoice_for_subscription(subscription):
    """
    Crée une facture pour un abonnement.
    """
    from apps.tenants.models import Invoice
    import random

    today = timezone.now().date()

    # Calculer les montants
    if subscription.billing_cycle == 'monthly':
        amount = subscription.monthly_price
    else:
        amount = subscription.monthly_price * 12  # Approximation

    subtotal = int(amount / 1.18)  # Hors TVA (18%)
    tax = amount - subtotal

    # Générer numéro de facture unique
    invoice_number = f"INV-{subscription.tenant.slug.upper()[:4]}-{today.year}-{random.randint(1000, 9999)}"

    invoice = Invoice.objects.create(
        tenant=subscription.tenant,
        subscription=subscription,
        invoice_number=invoice_number,
        subtotal=subtotal,
        tax=tax,
        total=amount,
        currency=subscription.currency,
        status=Invoice.STATUS_OPEN,
        invoice_date=today,
        due_date=today + timedelta(days=15),
        description=f"Abonnement {subscription.plan} - {subscription.billing_cycle}"
    )

    return invoice


def send_invoice_email(tenant, invoice):
    """
    Envoie un email avec la facture en pièce jointe.
    """
    subject = f"Nouvelle facture {invoice.invoice_number} - SmartQueue"

    context = {
        'tenant_name': tenant.name,
        'invoice_number': invoice.invoice_number,
        'amount': invoice.total / 100,
        'currency': invoice.currency,
        'due_date': invoice.due_date.strftime('%d/%m/%Y'),
        'payment_link': f"https://app.smartqueue.com/portal/billing/{invoice.id}",
    }

    logger.info(f"[EMAIL INVOICE] {subject} -> {tenant.email}")
    logger.info(f"[EMAIL INVOICE] Contexte: {context}")

    # TODO: Intégrer avec SendGrid + PDF en pièce jointe
    # send_email_notification.delay(
    #     to_email=tenant.email,
    #     subject=subject,
    #     template='new_invoice',
    #     context=context,
    #     attachments=[generate_invoice_pdf(invoice)]
    # )


@shared_task
def cleanup_expired_trials():
    """
    Nettoie les abonnements en période d'essai expirée.
    Exécution: Tous les jours à 3h00
    """
    from apps.tenants.models import Subscription

    today = timezone.now().date()
    logger.info(f"[CLEANUP] Nettoyage des essais gratuits expirés pour le {today}")

    expired_trials = Subscription.objects.filter(
        status=Subscription.STATUS_TRIAL,
        trial_ends_at__lt=today
    )

    stats = {'expired': 0, 'suspended': 0}

    for subscription in expired_trials:
        try:
            # Passer en suspendu si pas de paiement
            subscription.status = Subscription.STATUS_SUSPENDED
            subscription.save()

            # Suspendre le tenant
            subscription.tenant.is_active = False
            subscription.tenant.suspended_at = timezone.now()
            subscription.tenant.suspension_reason = "Période d'essai expirée sans paiement"
            subscription.tenant.save()

            stats['expired'] += 1
            stats['suspended'] += 1

            logger.warning(f"[CLEANUP] Trial expiré pour {subscription.tenant.name}")

        except Exception as e:
            logger.error(f"[CLEANUP] Erreur pour subscription {subscription.id}: {str(e)}")
            continue

    logger.info(f"[CLEANUP] Résumé: {stats}")
    return stats


@shared_task
def update_payment_plan_installments():
    """
    Met à jour le statut des échéances de plan de paiement.
    Exécution: Tous les jours à 4h00
    """
    from apps.tenants.models import PaymentPlanInstallment

    today = timezone.now().date()
    logger.info(f"[PAYMENT_PLANS] Mise à jour des échéances pour le {today}")

    # Échéances en attente dont la date est passée
    overdue_installments = PaymentPlanInstallment.objects.filter(
        status=PaymentPlanInstallment.STATUS_PENDING,
        due_date__lt=today
    ).select_related('payment_plan__tenant')

    stats = {'updated_to_overdue': 0}

    for installment in overdue_installments:
        try:
            installment.status = PaymentPlanInstallment.STATUS_OVERDUE
            installment.save()
            stats['updated_to_overdue'] += 1

            logger.warning(
                f"[PAYMENT_PLANS] Échéance {installment.installment_number} "
                f"du plan {installment.payment_plan.id} marquée en retard"
            )

        except Exception as e:
            logger.error(f"[PAYMENT_PLANS] Erreur mise à jour échéance {installment.id}: {str(e)}")
            continue

    logger.info(f"[PAYMENT_PLANS] Résumé: {stats}")
    return stats
