from __future__ import annotations

from django.contrib import admin

from .models import Appointment, Ticket


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("number", "queue", "status", "priority", "created_at")
    list_filter = ("status", "queue__tenant")
    search_fields = ("number", "queue__name", "customer_name", "customer_phone")


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("customer_name", "service", "starts_at", "status")
    list_filter = ("status", "service__tenant")
    search_fields = ("customer_name", "customer_email", "customer_phone")
