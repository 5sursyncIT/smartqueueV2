#!/bin/bash
cd "$(dirname "$0")"
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev
python manage.py runserver
