"""Configuration Django commune à tous les environnements."""

from __future__ import annotations

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Chargement des variables d'environnement depuis .env si présent
ENV_FILE = BASE_DIR / ".env"

env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, "unsafe-secret-key"),
    ALLOWED_HOSTS=(list[str], ["localhost", "127.0.0.1"]),
    DATABASE_URL=(str, "postgres://postgres:postgres@localhost:5432/smartqueue"),
    DATABASE_REPLICA_URL=(str, ""),
    REDIS_URL=(str, "redis://localhost:6379/0"),
    # Twilio
    TWILIO_ACCOUNT_SID=(str, ""),
    TWILIO_AUTH_TOKEN=(str, ""),
    TWILIO_PHONE_NUMBER=(str, ""),
    TWILIO_WHATSAPP_NUMBER=(str, ""),
    # SendGrid
    SENDGRID_API_KEY=(str, ""),
    DEFAULT_FROM_EMAIL=(str, "noreply@smartqueue.app"),
    # Firebase
    FIREBASE_CREDENTIALS_PATH=(str, ""),
    FCM_SERVER_KEY=(str, ""),
)

if ENV_FILE.exists():
    environ.Env.read_env(ENV_FILE)

DEBUG = env("DEBUG")
SECRET_KEY = env("SECRET_KEY")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

INSTALLED_APPS = [
    # Django core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Tiers
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "channels",
    "drf_spectacular",
    # Apps SmartQueue
    "apps.core",
    "apps.tenants",
    "apps.users",
    "apps.customers",
    "apps.queues",
    "apps.tickets",
    "apps.notifications",
    "apps.feedback",
    "apps.displays",
]

AUTH_USER_MODEL = "users.User"

# Authentication backends
AUTHENTICATION_BACKENDS = [
    "apps.users.backends.EmailBackend",  # Our custom email backend
    "django.contrib.auth.backends.ModelBackend",  # Fallback to default
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.TenantMiddleware",
]

ROOT_URLCONF = "smartqueue_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "smartqueue_backend.wsgi.application"
ASGI_APPLICATION = "smartqueue_backend.asgi.application"

DATABASES: dict[str, dict] = {
    "default": env.db("DATABASE_URL"),
}

if replica_url := env("DATABASE_REPLICA_URL"):
    DATABASES["replica"] = env.db("DATABASE_REPLICA_URL")
    DATABASES["default"]["OPTIONS"] = {"options": "-c default_transaction_isolation=read committed"}
    DATABASES["replica"]["ROLE"] = "replica"

for db_config in DATABASES.values():
    db_config.setdefault("ATOMIC_REQUESTS", True)

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL"),
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",  # Pour admin Django
        "rest_framework.authentication.TokenAuthentication",  # Backward compatibility
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "SmartQueue API",
    "DESCRIPTION": "API REST multi-tenant pour la gestion des files d'attente et des rendez-vous.",
    "VERSION": "0.1.0",
    "SERVE_PERMISSIONS": ["rest_framework.permissions.IsAuthenticated"],
}

# JWT Configuration
from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
    # Claims personnalisés
    "TOKEN_OBTAIN_SERIALIZER": "apps.users.serializers.CustomTokenObtainPairSerializer",
}

# Twilio Configuration
TWILIO_ACCOUNT_SID = env("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = env("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = env("TWILIO_PHONE_NUMBER")
TWILIO_WHATSAPP_NUMBER = env("TWILIO_WHATSAPP_NUMBER")

# SendGrid Configuration
SENDGRID_API_KEY = env("SENDGRID_API_KEY")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL")

# Firebase Configuration
FIREBASE_CREDENTIALS_PATH = env("FIREBASE_CREDENTIALS_PATH")
FCM_SERVER_KEY = env("FCM_SERVER_KEY")

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [env("REDIS_URL")],
        },
    }
}

CELERY_BROKER_URL = env("REDIS_URL")
CELERY_RESULT_BACKEND = env("REDIS_URL")
CELERY_TASK_DEFAULT_QUEUE = "smartqueue.default"
CELERY_TASK_TIME_LIMIT = 60 * 5
CELERY_TASK_SOFT_TIME_LIMIT = 60 * 4

# Celery Beat Schedule - Tâches planifiées
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE: dict[str, dict] = {
    # Vérification quotidienne des factures impayées à 9h00
    'check-overdue-invoices': {
        'task': 'apps.tenants.tasks.check_overdue_invoices',
        'schedule': crontab(hour=9, minute=0),
        'options': {'expires': 3600},  # Expire après 1h si non exécuté
    },
    # Retry des paiements échoués à 2h00
    'retry-failed-payments': {
        'task': 'apps.tenants.tasks.retry_failed_payments',
        'schedule': crontab(hour=2, minute=0),
        'options': {'expires': 3600},
    },
    # Génération des factures récurrentes le 1er du mois à minuit
    'generate-recurring-invoices': {
        'task': 'apps.tenants.tasks.generate_recurring_invoices',
        'schedule': crontab(hour=0, minute=0, day_of_month=1),
        'options': {'expires': 7200},  # Expire après 2h
    },
    # Nettoyage des essais gratuits expirés à 3h00
    'cleanup-expired-trials': {
        'task': 'apps.tenants.tasks.cleanup_expired_trials',
        'schedule': crontab(hour=3, minute=0),
        'options': {'expires': 3600},
    },
}

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"])
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-tenant',
]
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["http://localhost:3000", "http://localhost:3001"])

TENANT_HEADER = "HTTP_X_TENANT"
