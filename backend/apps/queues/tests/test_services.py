"""Tests pour les services de gestion des files."""

import pytest
from django.utils import timezone
from freezegun import freeze_time
from model_bakery import baker

from apps.queues.models import Queue
from apps.queues.services import QueueService
from apps.tickets.models import Ticket
from apps.users.models import AgentProfile


@pytest.mark.django_db
class TestGetNextTicket:
    """Tests pour la méthode get_next_ticket."""

    def test_fifo_algorithm_returns_oldest_ticket(self, queue, tenant):
        """Test que l'algorithme FIFO retourne le ticket le plus ancien."""
        queue.algorithm = Queue.ALGO_FIFO
        queue.save()

        # Créer 3 tickets avec des timestamps différents
        with freeze_time("2025-01-01 10:00:00"):
            ticket1 = baker.make(
                Ticket,
                tenant=tenant,
                queue=queue,
                status=Ticket.STATUS_WAITING,
                priority=0,
            )

        with freeze_time("2025-01-01 10:05:00"):
            ticket2 = baker.make(
                Ticket,
                tenant=tenant,
                queue=queue,
                status=Ticket.STATUS_WAITING,
                priority=0,
            )

        with freeze_time("2025-01-01 10:10:00"):
            ticket3 = baker.make(
                Ticket,
                tenant=tenant,
                queue=queue,
                status=Ticket.STATUS_WAITING,
                priority=0,
            )

        # Le plus ancien devrait être retourné
        next_ticket = QueueService.get_next_ticket(queue, Queue.ALGO_FIFO)
        assert next_ticket == ticket1

    def test_priority_algorithm_returns_highest_priority(self, queue, tenant):
        """Test que l'algorithme Priority retourne le ticket avec la plus haute priorité."""
        queue.algorithm = Queue.ALGO_PRIORITY
        queue.save()

        # Créer des tickets avec différentes priorités
        normal_ticket = baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            status=Ticket.STATUS_WAITING,
            priority=0,
        )

        high_ticket = baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            status=Ticket.STATUS_WAITING,
            priority=5,
        )

        urgent_ticket = baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            status=Ticket.STATUS_WAITING,
            priority=10,
        )

        # Le ticket urgent devrait être retourné
        next_ticket = QueueService.get_next_ticket(queue, Queue.ALGO_PRIORITY)
        assert next_ticket == urgent_ticket

    def test_priority_algorithm_fifo_within_same_priority(self, queue, tenant):
        """Test que FIFO est appliqué pour les tickets de même priorité."""
        queue.algorithm = Queue.ALGO_PRIORITY
        queue.save()

        # Créer 3 tickets avec la même priorité mais timestamps différents
        with freeze_time("2025-01-01 10:00:00"):
            ticket1 = baker.make(
                Ticket,
                tenant=tenant,
                queue=queue,
                status=Ticket.STATUS_WAITING,
                priority=5,
            )

        with freeze_time("2025-01-01 10:05:00"):
            ticket2 = baker.make(
                Ticket,
                tenant=tenant,
                queue=queue,
                status=Ticket.STATUS_WAITING,
                priority=5,
            )

        # Le plus ancien avec la même priorité devrait être retourné
        next_ticket = QueueService.get_next_ticket(queue, Queue.ALGO_PRIORITY)
        assert next_ticket == ticket1

    def test_returns_none_when_no_waiting_tickets(self, queue):
        """Test que None est retourné quand il n'y a pas de tickets en attente."""
        next_ticket = QueueService.get_next_ticket(queue, Queue.ALGO_FIFO)
        assert next_ticket is None

    def test_ignores_non_waiting_tickets(self, queue, tenant):
        """Test que les tickets non-waiting sont ignorés."""
        # Créer des tickets dans différents états
        baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            status=Ticket.STATUS_CALLED,
        )

        baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            status=Ticket.STATUS_CLOSED,
        )

        waiting_ticket = baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            status=Ticket.STATUS_WAITING,
        )

        next_ticket = QueueService.get_next_ticket(queue, Queue.ALGO_FIFO)
        assert next_ticket == waiting_ticket


@pytest.mark.django_db
class TestCallNext:
    """Tests pour la méthode call_next."""

    def test_call_next_success(self, queue, agent_profile, tenant):
        """Test l'appel réussi du prochain ticket."""
        # Créer un ticket en attente
        ticket = baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            status=Ticket.STATUS_WAITING,
        )

        # Appeler le prochain ticket
        called_ticket = QueueService.call_next(agent_profile, queue)

        # Vérifications
        assert called_ticket == ticket
        ticket.refresh_from_db()
        assert ticket.status == Ticket.STATUS_CALLED
        assert ticket.agent == agent_profile
        assert ticket.called_at is not None

        # Vérifier que l'agent est maintenant occupé
        agent_profile.refresh_from_db()
        assert agent_profile.current_status == AgentProfile.STATUS_BUSY

    def test_call_next_returns_none_when_no_tickets(self, queue, agent_profile):
        """Test que None est retourné quand il n'y a pas de tickets."""
        result = QueueService.call_next(agent_profile, queue)
        assert result is None

    def test_call_next_raises_error_when_agent_busy(self, queue, agent_profile, tenant):
        """Test qu'une erreur est levée si l'agent a déjà un ticket actif."""
        # Créer un ticket déjà assigné à l'agent
        baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            agent=agent_profile,
            status=Ticket.STATUS_IN_SERVICE,
        )

        # Créer un autre ticket en attente
        baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            status=Ticket.STATUS_WAITING,
        )

        # Essayer d'appeler devrait lever une erreur
        with pytest.raises(ValueError, match="a déjà un ticket actif"):
            QueueService.call_next(agent_profile, queue)


@pytest.mark.django_db
class TestStartService:
    """Tests pour la méthode start_service."""

    def test_start_service_success(self, ticket, agent_profile):
        """Test le démarrage réussi du service."""
        # Mettre le ticket en état CALLED
        ticket.status = Ticket.STATUS_CALLED
        ticket.agent = agent_profile
        ticket.called_at = timezone.now()
        ticket.save()

        # Démarrer le service
        QueueService.start_service(ticket)

        # Vérifications
        ticket.refresh_from_db()
        assert ticket.status == Ticket.STATUS_IN_SERVICE
        assert ticket.started_at is not None

    def test_start_service_raises_error_for_wrong_status(self, ticket):
        """Test qu'une erreur est levée si le ticket n'est pas CALLED."""
        ticket.status = Ticket.STATUS_WAITING
        ticket.save()

        with pytest.raises(ValueError, match="doit être en statut 'appelé'"):
            QueueService.start_service(ticket)


@pytest.mark.django_db
class TestCloseTicket:
    """Tests pour la méthode close_ticket."""

    def test_close_ticket_success(self, ticket, agent_profile):
        """Test la clôture réussie d'un ticket."""
        # Mettre le ticket en service
        ticket.status = Ticket.STATUS_IN_SERVICE
        ticket.agent = agent_profile
        ticket.started_at = timezone.now()
        ticket.save()

        # Mettre l'agent en busy
        agent_profile.current_status = AgentProfile.STATUS_BUSY
        agent_profile.save()

        # Clôturer le ticket
        QueueService.close_ticket(ticket, agent_profile)

        # Vérifications
        ticket.refresh_from_db()
        assert ticket.status == Ticket.STATUS_CLOSED
        assert ticket.ended_at is not None

        # L'agent devrait être de nouveau disponible
        agent_profile.refresh_from_db()
        assert agent_profile.current_status == AgentProfile.STATUS_AVAILABLE

    def test_close_ticket_raises_error_for_wrong_status(self, ticket, agent_profile):
        """Test qu'une erreur est levée pour un mauvais statut."""
        ticket.status = Ticket.STATUS_WAITING
        ticket.save()

        with pytest.raises(ValueError, match="Impossible de clôturer"):
            QueueService.close_ticket(ticket, agent_profile)


@pytest.mark.django_db
class TestTransferTicket:
    """Tests pour la méthode transfer_ticket."""

    def test_transfer_ticket_success(self, ticket, queue, tenant, site, service):
        """Test le transfert réussi d'un ticket vers une autre file."""
        # Créer une file de destination
        target_queue = baker.make(
            Queue,
            tenant=tenant,
            site=site,
            service=service,
            name="Target Queue",
        )

        # Transférer
        QueueService.transfer_ticket(ticket, target_queue, "Mauvaise file")

        # Vérifications
        ticket.refresh_from_db()
        assert ticket.queue == target_queue
        assert ticket.status == Ticket.STATUS_TRANSFERRED
        assert ticket.agent is None

    def test_transfer_to_different_tenant_raises_error(self, ticket, site, service):
        """Test qu'on ne peut pas transférer vers un autre tenant."""
        from apps.tenants.models import Tenant

        # Créer un autre tenant
        other_tenant = baker.make(Tenant, name="Other Tenant", slug="other")

        target_queue = baker.make(
            Queue,
            tenant=other_tenant,
            site=site,
            service=service,
        )

        with pytest.raises(ValueError, match="Impossible de transférer vers un autre tenant"):
            QueueService.transfer_ticket(ticket, target_queue, "Test")


@pytest.mark.django_db
class TestPauseResumeTicket:
    """Tests pour les méthodes pause et resume."""

    def test_pause_ticket_success(self, ticket, agent_profile):
        """Test la mise en pause d'un ticket."""
        ticket.status = Ticket.STATUS_IN_SERVICE
        ticket.agent = agent_profile
        ticket.save()

        QueueService.pause_ticket(ticket, "Pause déjeuner")

        ticket.refresh_from_db()
        assert ticket.status == Ticket.STATUS_PAUSED

    def test_resume_ticket_success(self, ticket):
        """Test la reprise d'un ticket en pause."""
        ticket.status = Ticket.STATUS_PAUSED
        ticket.save()

        QueueService.resume_ticket(ticket)

        ticket.refresh_from_db()
        assert ticket.status == Ticket.STATUS_IN_SERVICE


@pytest.mark.django_db
class TestMarkNoShow:
    """Tests pour la méthode mark_no_show."""

    def test_mark_no_show_success(self, ticket, agent_profile):
        """Test le marquage d'un ticket comme no-show."""
        ticket.status = Ticket.STATUS_CALLED
        ticket.agent = agent_profile
        ticket.called_at = timezone.now()
        ticket.save()

        agent_profile.current_status = AgentProfile.STATUS_BUSY
        agent_profile.save()

        QueueService.mark_no_show(ticket, agent_profile)

        ticket.refresh_from_db()
        assert ticket.status == Ticket.STATUS_NO_SHOW
        assert ticket.ended_at is not None

        # L'agent devrait être disponible
        agent_profile.refresh_from_db()
        assert agent_profile.current_status == AgentProfile.STATUS_AVAILABLE


@pytest.mark.django_db
class TestGetQueueStats:
    """Tests pour la méthode get_queue_stats."""

    def test_get_queue_stats_returns_correct_counts(self, queue, tenant):
        """Test que les statistiques retournent les bons comptages."""
        # Créer des tickets dans différents états
        baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            status=Ticket.STATUS_WAITING,
            _quantity=5,
        )

        baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            status=Ticket.STATUS_CALLED,
            _quantity=2,
        )

        baker.make(
            Ticket,
            tenant=tenant,
            queue=queue,
            status=Ticket.STATUS_CLOSED,
            _quantity=10,
        )

        stats = QueueService.get_queue_stats(queue)

        assert stats["waiting_count"] == 5
        assert stats["called_count"] == 2
        assert stats["in_service_count"] == 0
        assert stats["avg_wait_seconds"] is None

    def test_get_queue_stats_empty_queue(self, queue):
        """Test les stats d'une file vide."""
        stats = QueueService.get_queue_stats(queue)

        assert stats["waiting_count"] == 0
        assert stats["called_count"] == 0
        assert stats["in_service_count"] == 0
        assert stats["avg_wait_seconds"] is None
