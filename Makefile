.PHONY: help install-backend migrate run-backend test-backend lint-backend format-backend docker-up docker-down celery beat

help:
	@echo "Cibles disponibles :"
	@grep -E '^[a-zA-Z_-]+:' Makefile | cut -d: -f1

install-backend:
	python -m venv backend/.venv
	. backend/.venv/bin/activate && pip install --upgrade pip
	. backend/.venv/bin/activate && pip install -e ./backend[dev]

migrate:
	. backend/.venv/bin/activate && DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python backend/manage.py migrate

run-backend:
	. backend/.venv/bin/activate && DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python backend/manage.py runserver 0.0.0.0:8000

celery:
	. backend/.venv/bin/activate && DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev celery -A smartqueue_backend worker -l info

beat:
	. backend/.venv/bin/activate && DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev celery -A smartqueue_backend beat -l info

lint-backend:
	. backend/.venv/bin/activate && ruff check backend

format-backend:
	. backend/.venv/bin/activate && ruff check backend --fix
	. backend/.venv/bin/activate && black backend

mypy:
	. backend/.venv/bin/activate && mypy backend

test-backend:
	. backend/.venv/bin/activate && pytest backend

docker-up:
	docker compose -f docker-compose.dev.yml up -d

docker-down:
	docker compose -f docker-compose.dev.yml down
