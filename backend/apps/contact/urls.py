"""URLs pour l'app contact."""

from __future__ import annotations

from django.urls import path

from .views import ContactMessageCreateView, TrialRequestCreateView

app_name = "contact"

urlpatterns = [
    path("messages/", ContactMessageCreateView.as_view(), name="contact-message-create"),
    path("trial/", TrialRequestCreateView.as_view(), name="trial-request-create"),
]