from __future__ import annotations

from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "email", "tenant", "is_active", "created_at")
    list_filter = ("is_active", "notify_sms", "notify_email", "notify_whatsapp")
    search_fields = ("first_name", "last_name", "phone", "email")
    readonly_fields = ("created_at", "updated_at")
