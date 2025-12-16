#!/bin/bash

# Script pour démarrer le backend FastAPI

cd "$(dirname "$0")"

echo "🚀 Démarrage du backend FastAPI..."
echo "📍 URL: http://localhost:8000"
echo "📚 Docs: http://localhost:8000/docs"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

# Activer l'environnement virtuel si présent
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Démarrer uvicorn avec les logs activés
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level info

