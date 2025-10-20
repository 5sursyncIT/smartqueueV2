"""Views for Display management."""
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404

from apps.displays.models import Display
from apps.tickets.models import Ticket
from apps.queues.models import Queue


class PublicDisplayTicketsView(APIView):
    """Public API view for display screen tickets."""

    permission_classes = [AllowAny]

    def get(self, request, tenant_slug: str, pk: str):
        """Get tickets to display on screen."""
        # Get display filtered by tenant_slug
        display = get_object_or_404(
            Display.objects.filter(is_active=True).select_related('site', 'tenant'),
            pk=pk,
            tenant__slug=tenant_slug
        )

        # Get all queues for this display
        queue_ids = list(display.queues.values_list('id', flat=True))

        # Get recently called tickets (last 10 called in the last 30 minutes)
        recent_called = Ticket.objects.filter(
            queue_id__in=queue_ids,
            status__in=[Ticket.STATUS_CALLED, Ticket.STATUS_IN_SERVICE],
            called_at__gte=timezone.now() - timezone.timedelta(minutes=30)
        ).select_related(
            'queue', 'agent', 'agent__user'
        ).order_by('-called_at')[:10]

        # Get waiting count per queue
        waiting_stats = {}
        for queue_id in queue_ids:
            waiting_count = Ticket.objects.filter(
                queue_id=queue_id,
                status=Ticket.STATUS_WAITING
            ).count()
            waiting_stats[str(queue_id)] = waiting_count

        # Format response
        tickets_data = []
        for ticket in recent_called:
            tickets_data.append({
                'id': str(ticket.id),
                'number': ticket.number,
                'queue_name': ticket.queue.name,
                'queue_id': str(ticket.queue_id),
                'status': ticket.status,
                'called_at': ticket.called_at,
                'counter': ticket.agent.counter_number if ticket.agent and hasattr(ticket.agent, 'counter_number') else None,
                'agent_name': f"{ticket.agent.user.first_name} {ticket.agent.user.last_name}" if ticket.agent else None,
            })

        return Response({
            'display': {
                'id': str(display.id),
                'name': display.name,
                'type': display.display_type,
                'layout': display.layout,
                'theme': display.theme,
                'auto_refresh_seconds': display.auto_refresh_seconds,
                # Nouveaux champs de personnalisation
                'show_video': display.show_video,
                'video_url': display.video_url,
                'background_image': display.background_image,
                'custom_message': display.custom_message,
                'secondary_message': display.secondary_message,
                'message_position': display.message_position,
                'ticket_colors': display.ticket_colors,
            },
            'tickets': tickets_data,
            'waiting_stats': waiting_stats,
            'timestamp': timezone.now().isoformat(),
        })


class PublicDisplayPingView(APIView):
    """Public API view for display heartbeat."""

    permission_classes = [AllowAny]

    def post(self, request, tenant_slug: str, pk: str):
        """Update last ping time for display heartbeat."""
        # Get display filtered by tenant_slug
        display = get_object_or_404(
            Display.objects.filter(is_active=True),
            pk=pk,
            tenant__slug=tenant_slug
        )
        display.last_ping = timezone.now()
        display.save(update_fields=['last_ping'])
        return Response({'status': 'ok', 'timestamp': timezone.now().isoformat()})
