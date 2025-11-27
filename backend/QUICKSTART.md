# Guide de démarrage rapide

## Installation et démarrage

```bash
# 1. Aller dans le dossier backend
cd backend

# 2. Créer un environnement virtuel (si pas déjà fait)
python3 -m venv venv

# 3. Activer l'environnement
source venv/bin/activate  # macOS/Linux
# ou
venv\Scripts\activate  # Windows

# 4. Installer les dépendances
pip install -r requirements.txt

# 5. Initialiser la DB et créer un super admin
python scripts/init_db.py

# 6. Démarrer le serveur
uvicorn app.main:app --reload --port 8000
```

## Tester l'API

### 1. Vérifier que l'API fonctionne

```bash
curl http://localhost:8000/health
```

Réponse attendue : `{"status": "ok"}`

### 2. Se connecter avec le super admin

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@localassistant.fr",
    "password": "admin123"
  }'
```

Réponse : Token JWT

### 3. Récupérer les infos de l'utilisateur connecté

```bash
# Remplacez <TOKEN> par le token reçu
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer <TOKEN>"
```

### 4. Créer un owner avec une entreprise

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "owner123",
    "full_name": "Propriétaire Test",
    "role": "owner",
    "company_name": "Ma Boulangerie",
    "sector": "Commerce"
  }'
```

## Documentation interactive

Ouvrir dans le navigateur : `http://localhost:8000/docs`

Vous pourrez tester tous les endpoints directement depuis l'interface Swagger.

