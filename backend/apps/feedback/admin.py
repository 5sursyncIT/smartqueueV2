from __future__ import annotations

from django.contrib import admin

from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("id", "csat_score", "nps_score", "customer", "tenant", "submitted_at")
    list_filter = ("csat_score", "nps_score", "submitted_at")
    search_fields = ("comment",)
    readonly_fields = ("submitted_at", "created_at", "updated_at")
