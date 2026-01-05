#!/bin/bash

echo "🧹 Nettoyage du cache Next.js..."
rm -rf .next node_modules/.cache

echo "🔍 Vérification de la structure des routes..."
ls -la app/(agent)/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Route (agent) détectée"
else
    echo "❌ Route (agent) non trouvée"
    exit 1
fi

echo "🚀 Démarrage du serveur de développement..."
npm run dev
