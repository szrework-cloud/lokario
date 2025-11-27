# Local Assistant Backend

Backend FastAPI pour le SaaS Local Assistant.

## Installation

```bash
# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement
# Sur macOS/Linux:
source venv/bin/activate
# Sur Windows:
venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt
```

## Configuration

Copier `.env.example` vers `.env` et modifier les valeurs si nécessaire :

```bash
cp .env.example .env
```

## Démarrage

### 1. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 2. Initialiser la base de données et créer un super admin

```bash
python scripts/init_db.py
```

Cela créera :
- La base de données SQLite (`app.db`)
- Un super admin de test :
  - Email: `admin@localassistant.fr`
  - Password: `admin123`

### 3. Démarrer le serveur

```bash
uvicorn app.main:app --reload --port 8000
```

L'API sera accessible sur `http://localhost:8000`

Documentation interactive : `http://localhost:8000/docs`

## Structure

```
backend/
  app/
    core/          # Configuration et sécurité
    db/            # Base de données et modèles
    api/           # Routes et schémas API
      routes/      # Endpoints
      schemas/     # Schémas Pydantic
```

## Endpoints principaux

- `POST /auth/register` - Inscription
- `POST /auth/login` - Connexion
- `GET /auth/me` - Informations utilisateur courant
- `GET /users/me` - Informations utilisateur courant
- `GET /users` - Liste tous les users (super_admin)
- `GET /users/company` - Liste users de la company
- `GET /companies/me` - Company de l'utilisateur
- `GET /companies` - Liste toutes les companies (super_admin)
- `GET /health` - Vérification santé API

## Rôles

- `super_admin` : Accès complet à toutes les entreprises
- `owner` : Propriétaire d'une entreprise
- `user` : Employé d'une entreprise

