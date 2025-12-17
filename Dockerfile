# Dockerfile pour le backend FastAPI
# Ce fichier est à la racine pour que Railway le trouve facilement

FROM python:3.12-slim

WORKDIR /app

# Installer les dépendances système si nécessaire
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer les dépendances Python depuis backend/
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le code backend
COPY backend/ .

# Exposer le port (Railway définit $PORT automatiquement)
EXPOSE $PORT

# Commande de démarrage (utiliser shell form pour que $PORT soit évalué)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
