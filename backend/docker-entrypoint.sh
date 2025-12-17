#!/bin/sh
set -e

# Script d'entrée Docker pour Railway
# Railway injecte automatiquement $PORT

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
