from __future__ import annotations

import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import TenantAwareModel


class Feedback(TenantAwareModel):
    """Retour client après une visite ou RDV."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relations
    ticket = models.OneToOneField(
        "tickets.Ticket",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="feedback",
    )
    appointment = models.OneToOneField(
        "tickets.Appointment",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="feedback",
    )
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedbacks",
    )
    agent = models.ForeignKey(
        "users.AgentProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedbacks",
    )
    queue = models.ForeignKey(
        "queues.Queue",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedbacks",
    )

    # Scores
    csat_score = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text="Customer Satisfaction Score (1-5)",
    )
    nps_score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        null=True,
        blank=True,
        help_text="Net Promoter Score (0-10)",
    )
    wait_time_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text="Évaluation du temps d'attente",
    )
    service_quality_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text="Qualité du service",
    )

    # Commentaires
    comment = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True, help_text="Tags prédéfinis sélectionnés")

    # Métadonnées
    submitted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "feedbacks"
        ordering = ("-submitted_at",)
        indexes = [
            models.Index(fields=["tenant", "submitted_at"]),
            models.Index(fields=["csat_score"]),
            models.Index(fields=["nps_score"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"Feedback {self.id}"

    @property
    def nps_category(self) -> str | None:
        """Catégorise le NPS: Détracteur/Passif/Promoteur."""
        if self.nps_score is None:
            return None
        if self.nps_score <= 6:
            return "detractor"
        if self.nps_score <= 8:
            return "passive"
        return "promoter"
