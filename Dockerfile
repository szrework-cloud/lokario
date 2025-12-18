# Dockerfile pour le backend FastAPI
# Configuration éprouvée pour Railway

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

# Variable d'environnement par défaut (Railway écrasera $PORT)
ENV PORT=8080

# Utiliser uvicorn avec syntaxe exec - Railway injectera $PORT dans l'environnement
# uvicorn lira automatiquement $PORT depuis l'environnement au démarrage
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
