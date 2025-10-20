#!/bin/bash

# Script pour démarrer SmartQueue avec support WebSocket
# Ce script arrête runserver et démarre Daphne pour activer les WebSockets

set -e

echo "========================================="
echo "  SmartQueue - Démarrage avec WebSocket"
echo "========================================="
echo ""

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "backend/manage.py" ]; then
    echo -e "${RED}❌ Erreur: Ce script doit être exécuté depuis la racine du projet SmartQueue${NC}"
    exit 1
fi

# Vérifier que le venv existe
if [ ! -d "backend/.venv" ]; then
    echo -e "${RED}❌ Erreur: Virtual environment non trouvé dans backend/.venv${NC}"
    echo "Exécutez: make install-backend"
    exit 1
fi

# 1. Arrêter runserver s'il tourne
echo -e "${YELLOW}[1/4] Arrêt de Django runserver...${NC}"
pkill -f "manage.py runserver" 2>/dev/null && echo -e "${GREEN}✓ Runserver arrêté${NC}" || echo "  Runserver n'était pas démarré"

# 2. Vérifier que Redis est démarré
echo -e "${YELLOW}[2/4] Vérification de Redis...${NC}"
if docker exec smartqueue_redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis est démarré (Docker)${NC}"
elif redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis est démarré (local)${NC}"
else
    echo -e "${YELLOW}⚠ Redis n'est pas démarré. Tentative de démarrage...${NC}"

    # Essayer Docker Compose
    if command -v docker-compose &> /dev/null; then
        echo "  Démarrage de Redis avec Docker Compose..."
        docker-compose -f docker-compose.dev.yml up -d redis
        sleep 2
        if docker exec smartqueue_redis redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Redis démarré avec Docker Compose${NC}"
        else
            echo -e "${RED}❌ Impossible de démarrer Redis${NC}"
            echo "  Veuillez démarrer Redis manuellement:"
            echo "  - Docker: docker-compose -f docker-compose.dev.yml up -d redis"
            echo "  - Local: redis-server &"
            exit 1
        fi
    else
        echo -e "${RED}❌ Redis n'est pas disponible et Docker Compose n'est pas installé${NC}"
        echo "  Veuillez démarrer Redis manuellement: redis-server &"
        exit 1
    fi
fi

# 3. Vérifier que le port 8000 est libre
echo -e "${YELLOW}[3/4] Vérification du port 8000...${NC}"
if lsof -i:8000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Le port 8000 est déjà utilisé${NC}"
    echo "  Processus en cours:"
    lsof -i:8000 | grep LISTEN || true
    echo ""
    read -p "Voulez-vous tuer le processus et continuer? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:8000 | xargs kill -9 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓ Port 8000 libéré${NC}"
    else
        echo "Abandon."
        exit 1
    fi
else
    echo -e "${GREEN}✓ Port 8000 disponible${NC}"
fi

# 4. Démarrer Daphne
echo -e "${YELLOW}[4/4] Démarrage de Daphne (serveur ASGI)...${NC}"
echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  ✓ Configuration terminée!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Daphne va démarrer sur http://0.0.0.0:8000"
echo "WebSocket disponible sur ws://localhost:8000/ws/..."
echo ""
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter le serveur${NC}"
echo ""
sleep 2

# Démarrer Daphne
cd backend
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev \
    .venv/bin/daphne -b 0.0.0.0 -p 8000 smartqueue_backend.asgi:application
