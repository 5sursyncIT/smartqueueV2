from __future__ import annotations

from django.contrib import admin

from .models import Tenant, TenantMembership


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "plan", "is_active", "created_at")
    search_fields = ("name", "slug")
    list_filter = ("plan", "is_active")


@admin.register(TenantMembership)
class TenantMembershipAdmin(admin.ModelAdmin):
    list_display = ("tenant", "user", "role", "is_active")
    search_fields = ("tenant__name", "user__email")
    list_filter = ("role", "is_active")
