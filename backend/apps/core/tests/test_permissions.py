"""Tests pour le système de permissions RBAC."""

import pytest
from django.test import RequestFactory

from apps.core.permissions import (
    ROLE_SCOPES,
    HasAnyScope,
    HasScope,
    IsAgent,
    IsManager,
    IsTenantMember,
    Scopes,
)
from apps.tenants.models import TenantMembership


@pytest.mark.django_db
class TestIsTenantMember:
    """Tests pour la permission IsTenantMember."""

    def test_allows_active_member(self, admin_membership):
        """Test qu'un membre actif est autorisé."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = admin_membership.user
        request.tenant = admin_membership.tenant

        permission = IsTenantMember()
        assert permission.has_permission(request, None) is True

    def test_denies_non_member(self, tenant, user):
        """Test qu'un non-membre est refusé."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = user
        request.tenant = tenant

        permission = IsTenantMember()
        assert permission.has_permission(request, None) is False

    def test_denies_inactive_member(self, admin_membership):
        """Test qu'un membre inactif est refusé."""
        admin_membership.is_active = False
        admin_membership.save()

        factory = RequestFactory()
        request = factory.get("/")
        request.user = admin_membership.user
        request.tenant = admin_membership.tenant

        permission = IsTenantMember()
        assert permission.has_permission(request, None) is False

    def test_denies_unauthenticated_user(self, tenant):
        """Test qu'un utilisateur non authentifié est refusé."""
        from django.contrib.auth.models import AnonymousUser

        factory = RequestFactory()
        request = factory.get("/")
        request.user = AnonymousUser()
        request.tenant = tenant

        permission = IsTenantMember()
        assert permission.has_permission(request, None) is False


@pytest.mark.django_db
class TestHasScope:
    """Tests pour la permission HasScope."""

    def test_admin_has_all_scopes(self, admin_membership):
        """Test que l'admin a tous les scopes."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = admin_membership.user
        request.tenant = admin_membership.tenant

        # Tester plusieurs scopes
        for scope in Scopes.ALL:
            permission_class = HasScope(scope)
            permission = permission_class()
            assert permission.has_permission(request, None) is True, f"Admin should have {scope}"

    def test_manager_has_expected_scopes(self, manager_membership):
        """Test que le manager a les scopes attendus."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = manager_membership.user
        request.tenant = manager_membership.tenant

        # Manager devrait avoir ces scopes
        allowed_scopes = [
            Scopes.READ_QUEUE,
            Scopes.WRITE_QUEUE,
            Scopes.MANAGE_QUEUE,
            Scopes.READ_TICKET,
            Scopes.WRITE_TICKET,
            Scopes.READ_REPORTS,
        ]

        for scope in allowed_scopes:
            permission_class = HasScope(scope)
            permission = permission_class()
            assert permission.has_permission(request, None) is True, f"Manager should have {scope}"

        # Manager NE devrait PAS avoir manage:settings
        permission_class = HasScope(Scopes.MANAGE_SETTINGS)
        permission = permission_class()
        assert permission.has_permission(request, None) is False

    def test_agent_has_limited_scopes(self, agent_membership):
        """Test que l'agent a des scopes limités."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = agent_membership.user
        request.tenant = agent_membership.tenant

        # Agent devrait avoir ces scopes
        allowed_scopes = [
            Scopes.READ_QUEUE,
            Scopes.READ_TICKET,
            Scopes.WRITE_TICKET,
            Scopes.READ_CUSTOMER,
        ]

        for scope in allowed_scopes:
            permission_class = HasScope(scope)
            permission = permission_class()
            assert permission.has_permission(request, None) is True, f"Agent should have {scope}"

        # Agent NE devrait PAS avoir manage:queue
        permission_class = HasScope(Scopes.MANAGE_QUEUE)
        permission = permission_class()
        assert permission.has_permission(request, None) is False

    def test_denies_unauthenticated_user(self, tenant):
        """Test qu'un utilisateur non authentifié est refusé."""
        from django.contrib.auth.models import AnonymousUser

        factory = RequestFactory()
        request = factory.get("/")
        request.user = AnonymousUser()
        request.tenant = tenant

        permission_class = HasScope(Scopes.READ_QUEUE)
        permission = permission_class()
        assert permission.has_permission(request, None) is False


@pytest.mark.django_db
class TestHasAnyScope:
    """Tests pour la permission HasAnyScope."""

    def test_allows_when_has_one_of_scopes(self, agent_membership):
        """Test qu'on est autorisé si on a au moins un des scopes."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = agent_membership.user
        request.tenant = agent_membership.tenant

        # Agent a READ_TICKET mais pas MANAGE_TICKET
        scopes = [Scopes.READ_TICKET, Scopes.MANAGE_TICKET]
        permission_class = HasAnyScope(scopes)
        permission = permission_class()
        assert permission.has_permission(request, None) is True

    def test_denies_when_has_none_of_scopes(self, agent_membership):
        """Test qu'on est refusé si on n'a aucun des scopes."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = agent_membership.user
        request.tenant = agent_membership.tenant

        # Agent n'a ni MANAGE_QUEUE ni MANAGE_SETTINGS
        scopes = [Scopes.MANAGE_QUEUE, Scopes.MANAGE_SETTINGS]
        permission_class = HasAnyScope(scopes)
        permission = permission_class()
        assert permission.has_permission(request, None) is False


@pytest.mark.django_db
class TestIsAgent:
    """Tests pour la permission IsAgent."""

    def test_allows_agent(self, agent_membership):
        """Test qu'un agent est autorisé."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = agent_membership.user
        request.tenant = agent_membership.tenant

        permission = IsAgent()
        assert permission.has_permission(request, None) is True

    def test_denies_manager(self, manager_membership):
        """Test qu'un manager n'est pas autorisé (sauf s'il est aussi agent)."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = manager_membership.user
        request.tenant = manager_membership.tenant

        permission = IsAgent()
        assert permission.has_permission(request, None) is False


@pytest.mark.django_db
class TestIsManager:
    """Tests pour la permission IsManager."""

    def test_allows_manager(self, manager_membership):
        """Test qu'un manager est autorisé."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = manager_membership.user
        request.tenant = manager_membership.tenant

        permission = IsManager()
        assert permission.has_permission(request, None) is True

    def test_allows_admin(self, admin_membership):
        """Test qu'un admin est aussi autorisé."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = admin_membership.user
        request.tenant = admin_membership.tenant

        permission = IsManager()
        assert permission.has_permission(request, None) is True

    def test_denies_agent(self, agent_membership):
        """Test qu'un agent simple n'est pas autorisé."""
        factory = RequestFactory()
        request = factory.get("/")
        request.user = agent_membership.user
        request.tenant = agent_membership.tenant

        permission = IsManager()
        assert permission.has_permission(request, None) is False


@pytest.mark.django_db
class TestRoleScopesMapping:
    """Tests pour vérifier le mapping rôles → scopes."""

    def test_admin_has_all_scopes(self):
        """Test que l'admin a tous les scopes."""
        admin_scopes = ROLE_SCOPES[TenantMembership.ROLE_ADMIN]
        assert admin_scopes == Scopes.ALL
        assert len(admin_scopes) == 14

    def test_manager_has_most_scopes(self):
        """Test que le manager a la plupart des scopes sauf manage:settings."""
        manager_scopes = ROLE_SCOPES[TenantMembership.ROLE_MANAGER]
        assert Scopes.MANAGE_SETTINGS not in manager_scopes
        assert Scopes.READ_QUEUE in manager_scopes
        assert Scopes.MANAGE_QUEUE in manager_scopes
        assert len(manager_scopes) == 13  # Tous sauf manage:settings

    def test_agent_has_limited_scopes(self):
        """Test que l'agent a des scopes limités."""
        agent_scopes = ROLE_SCOPES[TenantMembership.ROLE_AGENT]
        assert Scopes.READ_QUEUE in agent_scopes
        assert Scopes.READ_TICKET in agent_scopes
        assert Scopes.WRITE_TICKET in agent_scopes
        assert Scopes.READ_CUSTOMER in agent_scopes
        assert Scopes.WRITE_CUSTOMER in agent_scopes

        # Vérifier qu'il n'a PAS ces scopes
        assert Scopes.MANAGE_QUEUE not in agent_scopes
        assert Scopes.MANAGE_SETTINGS not in agent_scopes
        assert Scopes.READ_REPORTS not in agent_scopes
        assert len(agent_scopes) == 5
