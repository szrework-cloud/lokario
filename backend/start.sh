#!/bin/sh
# Script de démarrage simple pour Railway
# Lit le PORT depuis l'environnement et lance uvicorn

PORT=${PORT:-8080}
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
