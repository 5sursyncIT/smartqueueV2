"""Services pour la gestion des relances de paiement (dunning)."""

from datetime import datetime, timedelta
from typing import Optional

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from apps.tenants.models import DunningAction, Invoice, PaymentPlan, PaymentPlanInstallment, Tenant


def send_dunning_email(
    invoice: Invoice,
    days_overdue: int,
    template_name: str = "default",
) -> DunningAction:
    """
    Envoie un email de relance pour une facture impayée.

    Args:
        invoice: La facture impayée
        days_overdue: Nombre de jours de retard
        template_name: Nom du template à utiliser (default, first_reminder, final_notice)

    Returns:
        DunningAction créée
    """
    tenant = invoice.tenant

    # Déterminer le sujet et le corps selon le template
    templates = {
        "default": {
            "subject": f"Rappel de paiement - Facture {invoice.invoice_number}",
            "body": f"""Bonjour {tenant.name},

Nous vous rappelons que votre facture {invoice.invoice_number} d'un montant de {invoice.total:,} {invoice.currency} est en retard de paiement.

Date d'échéance : {invoice.due_date}
Jours de retard : {days_overdue}

Merci de régulariser votre situation dans les plus brefs délais.

Cordialement,
L'équipe SmartQueue
""",
        },
        "first_reminder": {
            "subject": f"Premier rappel - Facture {invoice.invoice_number}",
            "body": f"""Bonjour {tenant.name},

Nous avons remarqué que votre facture {invoice.invoice_number} d'un montant de {invoice.total:,} {invoice.currency} n'a pas encore été réglée.

Date d'échéance : {invoice.due_date}
Montant dû : {invoice.amount_due:,} {invoice.currency}

Si vous avez des difficultés de paiement, n'hésitez pas à nous contacter pour établir un plan de paiement.

Cordialement,
L'équipe SmartQueue
""",
        },
        "final_notice": {
            "subject": f"Dernier rappel - Facture {invoice.invoice_number}",
            "body": f"""Bonjour {tenant.name},

Ceci est un dernier rappel concernant votre facture {invoice.invoice_number} d'un montant de {invoice.total:,} {invoice.currency}.

Cette facture est en retard depuis {days_overdue} jours. Sans régularisation sous 7 jours, nous serons contraints de suspendre votre service.

Montant dû : {invoice.amount_due:,} {invoice.currency}

Pour éviter toute interruption de service, merci de régulariser votre situation immédiatement.

Cordialement,
L'équipe SmartQueue
""",
        },
    }

    template = templates.get(template_name, templates["default"])
    subject = template["subject"]
    body = template["body"]

    # Créer l'action de dunning
    action = DunningAction.objects.create(
        tenant=tenant,
        invoice=invoice,
        action_type=DunningAction.ACTION_EMAIL,
        days_overdue=days_overdue,
        scheduled_for=timezone.now(),
        email_subject=subject,
        email_body=body,
    )

    try:
        # Envoyer l'email
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[tenant.email] if tenant.email else [],
            fail_silently=False,
        )

        # Marquer comme envoyé
        action.status = DunningAction.STATUS_SENT
        action.executed_at = timezone.now()
        action.result_message = "Email envoyé avec succès"
        action.save()

    except Exception as e:
        # Marquer comme échoué
        action.status = DunningAction.STATUS_FAILED
        action.result_message = f"Erreur lors de l'envoi : {str(e)}"
        action.save()
        raise

    return action


def create_payment_plan(
    invoice: Invoice,
    number_of_installments: int,
    start_date: Optional[datetime] = None,
    frequency_days: int = 30,
    notes: str = "",
) -> PaymentPlan:
    """
    Crée un plan de paiement échelonné pour une facture impayée.

    Args:
        invoice: La facture à échelonner
        number_of_installments: Nombre d'échéances
        start_date: Date de début (par défaut: aujourd'hui)
        frequency_days: Fréquence entre les échéances en jours
        notes: Notes internes

    Returns:
        PaymentPlan créé avec ses échéances
    """
    if start_date is None:
        start_date = timezone.now().date()

    # Calculer le montant par échéance
    amount_due = invoice.amount_due
    installment_amount = amount_due // number_of_installments
    remainder = amount_due % number_of_installments

    # Créer le plan de paiement
    plan = PaymentPlan.objects.create(
        tenant=invoice.tenant,
        invoice=invoice,
        total_amount=amount_due,
        number_of_installments=number_of_installments,
        installment_amount=installment_amount,
        frequency_days=frequency_days,
        start_date=start_date,
        status=PaymentPlan.STATUS_PROPOSED,
        notes=notes,
    )

    # Créer les échéances
    current_date = start_date
    for i in range(1, number_of_installments + 1):
        # La dernière échéance récupère le reste
        amount = installment_amount + (remainder if i == number_of_installments else 0)

        PaymentPlanInstallment.objects.create(
            payment_plan=plan,
            installment_number=i,
            amount=amount,
            due_date=current_date,
            status=PaymentPlanInstallment.STATUS_PENDING,
        )

        # Avancer à la prochaine échéance
        current_date += timedelta(days=frequency_days)

    return plan


def send_payment_plan_proposal(plan: PaymentPlan) -> DunningAction:
    """
    Envoie un email proposant un plan de paiement au client.

    Args:
        plan: Le plan de paiement proposé

    Returns:
        DunningAction créée
    """
    tenant = plan.tenant
    invoice = plan.invoice

    # Construire le détail des échéances
    installments_detail = "\n".join(
        [
            f"Échéance {inst.installment_number}: {inst.amount:,} {plan.currency} - Date: {inst.due_date}"
            for inst in plan.installments.all()
        ]
    )

    subject = f"Proposition de plan de paiement - Facture {invoice.invoice_number}"
    body = f"""Bonjour {tenant.name},

Suite à votre facture {invoice.invoice_number} d'un montant de {plan.total_amount:,} {plan.currency}, nous vous proposons un plan de paiement échelonné en {plan.number_of_installments} échéances.

Détail des échéances :
{installments_detail}

Ce plan vous permettra de régulariser votre situation en douceur. Pour accepter ce plan, merci de nous contacter.

Cordialement,
L'équipe SmartQueue
"""

    # Calculer les jours de retard
    days_overdue = 0
    if invoice.due_date:
        days_overdue = max(0, (timezone.now().date() - invoice.due_date).days)

    # Créer l'action de dunning
    action = DunningAction.objects.create(
        tenant=tenant,
        invoice=invoice,
        action_type=DunningAction.ACTION_EMAIL,
        days_overdue=days_overdue,
        scheduled_for=timezone.now(),
        email_subject=subject,
        email_body=body,
        metadata={"payment_plan_id": str(plan.id)},
    )

    try:
        # Envoyer l'email
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[tenant.email] if tenant.email else [],
            fail_silently=False,
        )

        # Marquer comme envoyé
        action.status = DunningAction.STATUS_SENT
        action.executed_at = timezone.now()
        action.result_message = "Proposition de plan envoyée"
        action.save()

    except Exception as e:
        action.status = DunningAction.STATUS_FAILED
        action.result_message = f"Erreur: {str(e)}"
        action.save()
        raise

    return action


def suspend_tenant_service(tenant: Tenant, reason: str = "Impayés") -> None:
    """
    Suspend le service d'un tenant pour non-paiement.

    Args:
        tenant: Le tenant à suspendre
        reason: Raison de la suspension
    """
    tenant.is_active = False
    tenant.suspended_at = timezone.now()
    tenant.suspension_reason = reason
    tenant.save()

    # Créer une action de dunning pour toutes les factures impayées
    overdue_invoices = tenant.invoices.filter(
        status=Invoice.STATUS_OPEN, due_date__lt=timezone.now().date()
    )

    for invoice in overdue_invoices:
        days_overdue = (timezone.now().date() - invoice.due_date).days

        DunningAction.objects.create(
            tenant=tenant,
            invoice=invoice,
            action_type=DunningAction.ACTION_SUSPENSION,
            days_overdue=days_overdue,
            scheduled_for=timezone.now(),
            executed_at=timezone.now(),
            status=DunningAction.STATUS_SENT,
            result_message=f"Service suspendu: {reason}",
        )


def reactivate_tenant_service(tenant: Tenant) -> None:
    """
    Réactive le service d'un tenant suspendu.

    Args:
        tenant: Le tenant à réactiver
    """
    tenant.is_active = True
    tenant.suspended_at = None
    tenant.suspension_reason = ""
    tenant.save()


def schedule_automatic_reminders(invoice: Invoice) -> list[DunningAction]:
    """
    Planifie les rappels automatiques pour une facture selon un calendrier prédéfini.

    Calendrier par défaut:
    - J+7 : Premier rappel amical
    - J+15 : Deuxième rappel avec proposition de plan
    - J+30 : Dernier avertissement avant suspension

    Args:
        invoice: La facture pour laquelle planifier les rappels

    Returns:
        Liste des DunningAction créées
    """
    if not invoice.due_date:
        return []

    actions = []
    reminder_schedule = [
        (7, "first_reminder", "Premier rappel"),
        (15, "second_reminder", "Deuxième rappel"),
        (30, "final_notice", "Dernier avertissement"),
    ]

    for days, template, description in reminder_schedule:
        scheduled_date = invoice.due_date + timedelta(days=days)

        # Ne pas créer de rappel pour une date passée
        if scheduled_date < timezone.now().date():
            continue

        action = DunningAction.objects.create(
            tenant=invoice.tenant,
            invoice=invoice,
            action_type=DunningAction.ACTION_EMAIL,
            days_overdue=days,
            scheduled_for=datetime.combine(scheduled_date, datetime.min.time()),
            status=DunningAction.STATUS_SCHEDULED,
            notes=description,
            metadata={"template": template},
        )
        actions.append(action)

    return actions
