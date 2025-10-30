"""Tâches Celery pour l'envoi de notifications."""

from __future__ import annotations

from typing import TYPE_CHECKING

from celery import shared_task
from django.template import Context, Template
from django.utils import timezone

if TYPE_CHECKING:
    from .models import Notification


@shared_task
def send_notification(notification_id: str) -> bool:
    """Envoie une notification selon le canal configuré."""
    from .models import Notification

    try:
        notification = Notification.objects.select_related("template", "tenant").get(
            id=notification_id
        )
    except Notification.DoesNotExist:
        return False

    try:
        if notification.channel == "sms":
            return _send_sms(notification)
        elif notification.channel == "email":
            return _send_email(notification)
        elif notification.channel == "whatsapp":
            return _send_whatsapp(notification)
        elif notification.channel == "push":
            return _send_push(notification)
        else:
            notification.status = "failed"
            notification.error_message = f"Canal non supporté: {notification.channel}"
            notification.save()
            return False
    except Exception as e:
        notification.status = "failed"
        notification.error_message = str(e)
        notification.save()
        return False


def _send_sms(notification: Notification) -> bool:
    """Envoie un SMS via Twilio."""
    from django.conf import settings

    # Vérifier que les credentials Twilio sont configurés
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        # Fallback en mode développement sans credentials
        notification.status = "sent"
        notification.sent_at = timezone.now()
        notification.save()
        return True

    try:
        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=notification.body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=notification.recipient
        )

        notification.status = "sent"
        notification.sent_at = timezone.now()
        notification.provider_id = message.sid
        notification.save()
        return True
    except Exception as e:
        notification.status = "failed"
        notification.error_message = f"Erreur Twilio: {str(e)}"
        notification.save()
        raise


def _send_email(notification: Notification) -> bool:
    """Envoie un email via SendGrid ou SMTP Django."""
    from django.conf import settings

    # Vérifier que SendGrid est configuré
    if not settings.SENDGRID_API_KEY:
        # Fallback: utiliser le backend email Django (SMTP)
        from django.core.mail import send_mail

        try:
            send_mail(
                subject=notification.subject or "Notification SmartQueue",
                message=notification.body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification.recipient],
                html_message=notification.body,
                fail_silently=False,
            )
            notification.status = "sent"
            notification.sent_at = timezone.now()
            notification.save()
            return True
        except Exception as e:
            notification.status = "failed"
            notification.error_message = f"Erreur SMTP: {str(e)}"
            notification.save()
            raise

    # Utiliser SendGrid
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=settings.DEFAULT_FROM_EMAIL,
            to_emails=notification.recipient,
            subject=notification.subject or "Notification SmartQueue",
            html_content=notification.body
        )

        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)

        notification.status = "sent"
        notification.sent_at = timezone.now()
        notification.provider_id = response.headers.get('X-Message-Id', '')
        notification.save()
        return True
    except Exception as e:
        notification.status = "failed"
        notification.error_message = f"Erreur SendGrid: {str(e)}"
        notification.save()
        raise


def _send_whatsapp(notification: Notification) -> bool:
    """Envoie un message WhatsApp via Twilio WhatsApp API."""
    from django.conf import settings

    # Vérifier que les credentials Twilio sont configurés
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        # Fallback en mode développement
        notification.status = "sent"
        notification.sent_at = timezone.now()
        notification.save()
        return True

    try:
        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        # Format WhatsApp avec préfixe
        whatsapp_from = f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}"
        whatsapp_to = notification.recipient
        if not whatsapp_to.startswith("whatsapp:"):
            whatsapp_to = f"whatsapp:{whatsapp_to}"

        message = client.messages.create(
            body=notification.body,
            from_=whatsapp_from,
            to=whatsapp_to
        )

        notification.status = "sent"
        notification.sent_at = timezone.now()
        notification.provider_id = message.sid
        notification.save()
        return True
    except Exception as e:
        notification.status = "failed"
        notification.error_message = f"Erreur Twilio WhatsApp: {str(e)}"
        notification.save()
        raise


def _send_push(notification: Notification) -> bool:
    """Envoie une notification push via FCM."""
    from django.conf import settings

    # Vérifier que Firebase est configuré
    if not settings.FIREBASE_CREDENTIALS_PATH and not settings.FCM_SERVER_KEY:
        # Fallback en mode développement
        notification.status = "sent"
        notification.sent_at = timezone.now()
        notification.save()
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials, messaging

        # Initialiser Firebase Admin SDK si pas déjà fait
        if not firebase_admin._apps:
            if settings.FIREBASE_CREDENTIALS_PATH:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                firebase_admin.initialize_app(cred)
            else:
                # Utiliser les credentials par défaut
                firebase_admin.initialize_app()

        # Créer le message
        message = messaging.Message(
            notification=messaging.Notification(
                title=notification.subject or "SmartQueue",
                body=notification.body,
            ),
            token=notification.recipient,  # FCM device token
        )

        # Envoyer
        response = messaging.send(message)

        notification.status = "sent"
        notification.sent_at = timezone.now()
        notification.provider_id = response
        notification.save()
        return True
    except Exception as e:
        notification.status = "failed"
        notification.error_message = f"Erreur FCM: {str(e)}"
        notification.save()
        raise


@shared_task
def render_and_send_notification(
    template_id: str,
    recipient: str,
    context: dict,
    tenant_id: str,
) -> bool:
    """Rend un template de notification et l'envoie."""
    from .models import Notification, NotificationTemplate

    try:
        template = NotificationTemplate.objects.get(id=template_id, is_active=True)
    except NotificationTemplate.DoesNotExist:
        return False

    # Rendre le template avec le contexte
    body_template = Template(template.body)
    rendered_body = body_template.render(Context(context))

    subject = ""
    if template.subject:
        subject_template = Template(template.subject)
        subject = subject_template.render(Context(context))

    # Créer la notification
    notification = Notification.objects.create(
        tenant_id=tenant_id,
        template=template,
        channel=template.channel,
        recipient=recipient,
        subject=subject,
        body=rendered_body,
        metadata=context,
    )

    # Envoyer
    return send_notification(str(notification.id))


@shared_task
def send_ticket_created_notification(ticket_id: str) -> None:
    """Envoie une notification quand un ticket est créé."""
    from apps.tickets.models import Ticket

    try:
        ticket = Ticket.objects.select_related(
            "queue", "queue__service", "customer", "tenant"
        ).get(id=ticket_id)
    except Ticket.DoesNotExist:
        return

    if not ticket.customer:
        return

    # Trouver le template
    from .models import NotificationTemplate

    template = NotificationTemplate.objects.filter(
        tenant=ticket.tenant,
        event=NotificationTemplate.EVENT_TICKET_CREATED,
        is_active=True,
    ).first()

    if not template:
        return

    context = {
        "ticket_number": ticket.number,
        "queue_name": ticket.queue.name,
        "service_name": ticket.queue.service.name,
        "customer_name": ticket.customer.full_name if ticket.customer else "",
        "eta_minutes": ticket.eta_seconds // 60 if ticket.eta_seconds else "N/A",
    }

    # Choisir le destinataire selon le canal et les préférences
    recipient = None
    if template.channel == "sms" and ticket.customer.notify_sms:
        recipient = ticket.customer.phone
    elif template.channel == "email" and ticket.customer.notify_email:
        recipient = ticket.customer.email
    elif template.channel == "whatsapp" and ticket.customer.notify_whatsapp:
        recipient = ticket.customer.phone

    if recipient:
        render_and_send_notification.delay(
            str(template.id), recipient, context, str(ticket.tenant_id)
        )


@shared_task
def send_ticket_called_notification(ticket_id: str) -> None:
    """Envoie une notification quand un ticket est appelé."""
    from apps.tickets.models import Ticket

    try:
        ticket = Ticket.objects.select_related(
            "queue", "agent", "agent__user", "customer", "tenant"
        ).get(id=ticket_id)
    except Ticket.DoesNotExist:
        return

    if not ticket.customer:
        return

    from .models import NotificationTemplate

    template = NotificationTemplate.objects.filter(
        tenant=ticket.tenant,
        event=NotificationTemplate.EVENT_TICKET_CALLED,
        is_active=True,
    ).first()

    if not template:
        return

    context = {
        "ticket_number": ticket.number,
        "queue_name": ticket.queue.name,
        "agent_name": (
            f"{ticket.agent.user.first_name} {ticket.agent.user.last_name}"
            if ticket.agent
            else "Agent"
        ),
        "customer_name": ticket.customer.full_name if ticket.customer else "",
    }

    recipient = None
    if template.channel == "sms" and ticket.customer.notify_sms:
        recipient = ticket.customer.phone
    elif template.channel == "email" and ticket.customer.notify_email:
        recipient = ticket.customer.email
    elif template.channel == "whatsapp" and ticket.customer.notify_whatsapp:
        recipient = ticket.customer.phone

    if recipient:
        render_and_send_notification.delay(
            str(template.id), recipient, context, str(ticket.tenant_id)
        )


@shared_task
def cleanup_old_notifications(days: int = 90) -> int:
    """Supprime les notifications de plus de X jours."""
    from datetime import timedelta

    from .models import Notification

    cutoff_date = timezone.now() - timedelta(days=days)
    deleted_count, _ = Notification.objects.filter(created_at__lt=cutoff_date).delete()
    return deleted_count
