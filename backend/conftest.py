"""Configuration pytest et fixtures communes."""

import pytest
from model_bakery import baker


@pytest.fixture
def tenant():
    """Crée un tenant de test."""
    from apps.tenants.models import Tenant

    return baker.make(Tenant, name="Test Tenant", slug="test-tenant")


@pytest.fixture
def user():
    """Crée un utilisateur de test."""
    from apps.users.models import User

    return baker.make(
        User,
        email="test@example.com",
        first_name="Test",
        last_name="User",
        is_active=True,
    )


@pytest.fixture
def admin_membership(tenant, user):
    """Crée un membership admin."""
    from apps.tenants.models import TenantMembership

    return baker.make(
        TenantMembership,
        tenant=tenant,
        user=user,
        role=TenantMembership.ROLE_ADMIN,
        is_active=True,
    )


@pytest.fixture
def manager_membership(tenant):
    """Crée un membership manager avec un nouvel utilisateur."""
    from apps.tenants.models import TenantMembership
    from apps.users.models import User

    user = baker.make(User, email="manager@example.com")
    return baker.make(
        TenantMembership,
        tenant=tenant,
        user=user,
        role=TenantMembership.ROLE_MANAGER,
        is_active=True,
    )


@pytest.fixture
def agent_membership(tenant):
    """Crée un membership agent avec un nouvel utilisateur."""
    from apps.tenants.models import TenantMembership
    from apps.users.models import User

    user = baker.make(User, email="agent@example.com")
    return baker.make(
        TenantMembership,
        tenant=tenant,
        user=user,
        role=TenantMembership.ROLE_AGENT,
        is_active=True,
    )


@pytest.fixture
def agent_profile(agent_membership):
    """Crée un profil agent."""
    from apps.users.models import AgentProfile

    return baker.make(
        AgentProfile,
        user=agent_membership.user,
        current_status=AgentProfile.STATUS_AVAILABLE,
    )


@pytest.fixture
def site(tenant):
    """Crée un site de test."""
    from apps.queues.models import Site

    return baker.make(
        Site,
        tenant=tenant,
        name="Test Site",
        address="123 Test St",
        city="Test City",
    )


@pytest.fixture
def service(tenant, site):
    """Crée un service de test."""
    from apps.queues.models import Service

    return Service.objects.create(
        tenant=tenant,
        site=site,
        name="Test Service",
        sla_seconds=600,
    )


@pytest.fixture
def queue(tenant, site, service):
    """Crée une file de test."""
    from apps.queues.models import Queue

    return baker.make(
        Queue,
        tenant=tenant,
        site=site,
        service=service,
        name="Test Queue",
        algorithm=Queue.ALGO_FIFO,
        max_capacity=50,
    )


@pytest.fixture
def customer(tenant):
    """Crée un client de test."""
    from apps.customers.models import Customer

    return baker.make(
        Customer,
        tenant=tenant,
        first_name="John",
        last_name="Doe",
        phone="+221771234567",
        email="john.doe@example.com",
    )


@pytest.fixture
def ticket(tenant, queue, customer):
    """Crée un ticket de test."""
    from apps.tickets.models import Ticket

    return baker.make(
        Ticket,
        tenant=tenant,
        queue=queue,
        customer=customer,
        status=Ticket.STATUS_WAITING,
        priority=0,
    )
