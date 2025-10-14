#!/usr/bin/env python3
"""Entrypoint Django pour les opérations en ligne de commande."""

import os
import sys
from pathlib import Path


def main() -> None:
    """Configure l'environnement Django et délègue à la CLI."""
    project_root = Path(__file__).resolve().parent
    sys.path.append(str(project_root))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartqueue_backend.settings.dev")

    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
