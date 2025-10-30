"""Paramètres de développement."""

from __future__ import annotations

from pathlib import Path
from .base import *  # noqa: F401,F403

DEBUG = True

# EMAIL_BACKEND is configured in base.py from .env
# Comment out the console backend override to use SMTP from .env
# EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Override database to use absolute path for SQLite
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(Path(__file__).resolve().parent.parent.parent / "smartqueue.db"),
        "ATOMIC_REQUESTS": True,
    }
}

INSTALLED_APPS += [  # type: ignore[name-defined]
    "django_extensions",
]

# Override CORS settings for development
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://localhost:19006",
]
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
]
