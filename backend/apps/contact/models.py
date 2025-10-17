"""Modèles pour la gestion des messages de contact et demandes d'essai."""

from __future__ import annotations

from django.db import models


class ContactMessage(models.Model):
    """Modèle pour stocker les messages de contact du formulaire."""
    
    class SubjectChoices(models.TextChoices):
        GENERAL = "general", "Question générale"
        SUPPORT = "support", "Support technique"
        PARTNERSHIP = "partnership", "Partenariat"
        BILLING = "billing", "Facturation"
        OTHER = "other", "Autre"
    
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    email = models.EmailField(verbose_name="Adresse email")
    subject = models.CharField(
        max_length=20,
        choices=SubjectChoices.choices,
        default=SubjectChoices.GENERAL,
        verbose_name="Sujet"
    )
    message = models.TextField(verbose_name="Message")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="Adresse IP")
    user_agent = models.TextField(null=True, blank=True, verbose_name="User Agent")
    
    # Statut du message
    is_read = models.BooleanField(default=False, verbose_name="Lu")
    is_archived = models.BooleanField(default=False, verbose_name="Archivé")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Date de modification")
    
    class Meta:
        verbose_name = "Message de contact"
        verbose_name_plural = "Messages de contact"
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.get_subject_display()}"


class TrialRequest(models.Model):
    """Modèle pour stocker les demandes d'essai gratuit."""

    class StatusChoices(models.TextChoices):
        PENDING = "pending", "En attente"
        CONTACTED = "contacted", "Contacté"
        APPROVED = "approved", "Approuvé"
        REJECTED = "rejected", "Rejeté"
        CONVERTED = "converted", "Converti en client"

    # Informations entreprise
    company_name = models.CharField(max_length=200, verbose_name="Nom de l'entreprise")
    industry = models.CharField(max_length=100, verbose_name="Secteur d'activité")
    company_size = models.CharField(max_length=50, verbose_name="Taille de l'entreprise")

    # Informations contact
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    email = models.EmailField(verbose_name="Email professionnel")
    phone = models.CharField(max_length=20, verbose_name="Téléphone")

    # Message optionnel
    message = models.TextField(blank=True, null=True, verbose_name="Message")

    # Métadonnées
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="Adresse IP")
    user_agent = models.TextField(null=True, blank=True, verbose_name="User Agent")

    # Statut et suivi
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
        verbose_name="Statut"
    )
    notes = models.TextField(blank=True, null=True, verbose_name="Notes internes")

    # Dates
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de demande")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Date de modification")
    contacted_at = models.DateTimeField(null=True, blank=True, verbose_name="Date de contact")

    class Meta:
        verbose_name = "Demande d'essai"
        verbose_name_plural = "Demandes d'essai"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.company_name} - {self.first_name} {self.last_name}"