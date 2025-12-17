# Dockerfile pour le backend FastAPI
# Configuration éprouvée pour Railway (approche entreprise)

FROM python:3.12-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer les dépendances Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le code backend
COPY backend/ .

# Copier et rendre exécutable le script d'entrée
COPY backend/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Variable d'environnement par défaut
ENV PORT=8000

# Utiliser le script d'entrée (approche entreprise)
ENTRYPOINT ["docker-entrypoint.sh"]
