from __future__ import annotations

from django.contrib import admin

from .models import Queue, QueueAssignment, Service, Site


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "city", "country", "is_active")
    search_fields = ("name", "tenant__name", "city", "country")
    list_filter = ("tenant", "is_active")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "site", "sla_seconds", "is_active")
    list_filter = ("tenant", "site", "is_active")
    search_fields = ("name", "tenant__name", "site__name")


@admin.register(Queue)
class QueueAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "site", "service", "algorithm", "status")
    list_filter = ("tenant", "site", "status", "algorithm")
    search_fields = ("name", "tenant__name", "service__name", "site__name")


@admin.register(QueueAssignment)
class QueueAssignmentAdmin(admin.ModelAdmin):
    list_display = ("queue", "agent", "is_active")
    list_filter = ("queue", "is_active")
    search_fields = ("queue__name", "agent__user__email")
