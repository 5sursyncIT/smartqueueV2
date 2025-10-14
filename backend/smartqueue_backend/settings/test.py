"""Paramètres de tests (pytest)."""

from __future__ import annotations

from .base import *  # noqa: F401,F403

# Utiliser SQLite en mémoire pour les tests (plus rapide)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Désactiver le channel layer pour les tests
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}
