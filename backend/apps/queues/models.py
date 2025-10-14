from __future__ import annotations

import uuid

from django.db import models

from apps.core.models import TenantAwareModel


class Site(TenantAwareModel):
    """Site physique (agence, boutique, etc.)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=50, blank=True)
    timezone = models.CharField(max_length=50, default="UTC")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "sites"
        unique_together = ("tenant", "slug")
        ordering = ("name",)

    def __str__(self) -> str:  # pragma: no cover - affichage admin
        return f"{self.name} ({self.tenant.name})"


class Service(TenantAwareModel):
    """Service proposé par un tenant (ex: ouverture de compte)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    site = models.ForeignKey(
        Site,
        on_delete=models.CASCADE,
        related_name="services",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    sla_seconds = models.PositiveIntegerField(default=600)
    priority_rules = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "services"
        unique_together = (
            "tenant",
            "name",
            "site",
        )
        ordering = ("name",)

    def __str__(self) -> str:  # pragma: no cover - affichage admin
        return f"{self.name} ({self.tenant.name})"


class Queue(TenantAwareModel):
    """File d'attente associée à un service et potentiellement un site."""

    ALGO_FIFO = "fifo"
    ALGO_PRIORITY = "priority"
    ALGO_SLA = "sla"
    ALGO_CHOICES = [
        (ALGO_FIFO, "FIFO"),
        (ALGO_PRIORITY, "Priorité"),
        (ALGO_SLA, "SLA aware"),
    ]

    STATUS_ACTIVE = "active"
    STATUS_PAUSED = "paused"
    STATUS_CLOSED = "closed"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_PAUSED, "En pause"),
        (STATUS_CLOSED, "Fermée"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField()
    site = models.ForeignKey(
        Site,
        on_delete=models.CASCADE,
        related_name="queues",
        null=True,
        blank=True,
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.PROTECT,
        related_name="queues",
    )
    algorithm = models.CharField(max_length=32, choices=ALGO_CHOICES, default=ALGO_FIFO)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    max_capacity = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        db_table = "queues"
        unique_together = ("tenant", "slug")
        ordering = ("name",)

    def __str__(self) -> str:  # pragma: no cover - affichage admin
        return f"{self.name} ({self.tenant.name})"


class QueueAssignment(TenantAwareModel):
    """Association entre une queue et un agent."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    queue = models.ForeignKey(Queue, on_delete=models.CASCADE, related_name="assignments")
    agent = models.ForeignKey("users.AgentProfile", on_delete=models.CASCADE, related_name="queue_assignments")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "queue_assignments"
        unique_together = ("queue", "agent")

    def __str__(self) -> str:  # pragma: no cover - affichage admin
        return f"{self.queue} - {self.agent}"
