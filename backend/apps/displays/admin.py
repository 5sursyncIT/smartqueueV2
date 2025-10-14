from __future__ import annotations

from django.contrib import admin

from .models import Display, Kiosk


@admin.register(Display)
class DisplayAdmin(admin.ModelAdmin):
    list_display = ("name", "site", "display_type", "is_active", "last_ping")
    list_filter = ("display_type", "is_active", "site")
    search_fields = ("name", "device_id")
    filter_horizontal = ("queues",)


@admin.register(Kiosk)
class KioskAdmin(admin.ModelAdmin):
    list_display = ("name", "site", "is_online", "is_active", "last_ping")
    list_filter = ("is_online", "is_active", "site")
    search_fields = ("name", "device_id")
    filter_horizontal = ("available_queues",)
