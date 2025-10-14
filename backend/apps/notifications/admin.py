from __future__ import annotations

from django.contrib import admin

from .models import Notification, NotificationTemplate


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "event", "channel", "tenant", "is_active")
    list_filter = ("event", "channel", "is_active")
    search_fields = ("name", "body")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("recipient", "channel", "status", "sent_at", "tenant")
    list_filter = ("status", "channel", "created_at")
    search_fields = ("recipient", "body")
    readonly_fields = ("created_at", "updated_at", "sent_at", "delivered_at")
