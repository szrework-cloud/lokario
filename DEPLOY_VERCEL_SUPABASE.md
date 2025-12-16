# 🚀 Déploiement : Frontend Vercel + Backend + Supabase

## ✅ Architecture Recommandée

- **Frontend (Next.js)** : Vercel ✅
- **Backend (FastAPI)** : Railway / Render / Fly.io
- **Base de données (PostgreSQL)** : Supabase ✅

---

## 📋 Configuration

### 1. Frontend sur Vercel ✅

**Déjà configuré** si vous utilisez Vercel.

**Variables d'environnement à configurer dans Vercel** :
```env
NEXT_PUBLIC_API_URL=https://votre-backend.railway.app
# ou
NEXT_PUBLIC_API_URL=https://votre-backend.onrender.com
```

---

### 2. Base de données sur Supabase ✅

#### Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter les informations de connexion :
   - **Database URL** (Connection string)
   - **API URL**
   - **Anon Key** (si vous utilisez l'API Supabase)

#### Récupérer la connection string

Dans Supabase Dashboard :
- Settings → Database → Connection string
- Sélectionner "Connection pooling" (recommandé)
- Copier la string (format: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`)

**⚠️ Important** : Utiliser le "Connection pooling" pour les applications avec beaucoup de connexions (comme FastAPI avec SQLAlchemy).

---

### 3. Backend FastAPI sur Railway / Render / Fly.io

Supabase ne peut **pas** héberger directement un backend FastAPI Python. Vous avez besoin d'une plateforme de déploiement.

#### Option A : Railway (Recommandé - Simple et rapide)

1. **Créer un compte** sur [railway.app](https://railway.app)

2. **Créer un nouveau projet**

3. **Connecter votre repo GitHub** :
   - Cliquer sur "New Project"
   - "Deploy from GitHub repo"
   - Sélectionner votre repo
   - Sélectionner le dossier `backend`

4. **Configurer les variables d'environnement** dans Railway :
   ```env
   ENVIRONMENT=production
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[SUPABASE_HOST]:5432/postgres
   JWT_SECRET_KEY=[Générer une clé sécurisée]
   FRONTEND_URL=https://lokario.fr
   SMTP_USERNAME=votre-email@gmail.com
   SMTP_PASSWORD=votre-mot-de-passe-application
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   OPENAI_API_KEY=votre-cle-openai
   STRIPE_SECRET_KEY=votre-cle-stripe
   ```

5. **Railway détecte automatiquement** :
   - FastAPI
   - Installe les dépendances (`requirements.txt`)
   - Lance l'application avec `uvicorn`

6. **Obtenir l'URL** : Railway génère automatiquement une URL (ex: `https://your-app.railway.app`)

**Avantages Railway** :
- ✅ Simple et rapide
- ✅ HTTPS automatique
- ✅ Déploiement automatique depuis GitHub
- ✅ Logs intégrés
- ✅ Scaling automatique

---

#### Option B : Render (Alternative gratuite)

1. **Créer un compte** sur [render.com](https://render.com)

2. **Créer un "Web Service"**

3. **Configuration** :
   - **Build Command** : `cd backend && pip install -r requirements.txt`
   - **Start Command** : `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment** : Python 3

4. **Variables d'environnement** : Même configuration que Railway

5. **⚠️ Note** : Le plan gratuit s'endort après 15 minutes d'inactivité (cold start)

**Avantages Render** :
- ✅ Plan gratuit disponible
- ✅ HTTPS automatique
- ⚠️ Cold start sur plan gratuit

---

#### Option C : Fly.io (Alternatif)

1. **Installer Fly CLI** : `curl -L https://fly.io/install.sh | sh`

2. **Se connecter** : `fly auth login`

3. **Initialiser** : `cd backend && fly launch`

4. **Configurer** : Ajouter les variables d'environnement

**Avantages Fly.io** :
- ✅ Performances globales (edge)
- ✅ Scaling flexible
- ⚠️ Plus complexe à configurer

---

## 🔧 Configuration du Backend

### Fichier `backend/Procfile` (pour Railway/Render)

Créer `backend/Procfile` :
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Fichier `backend/runtime.txt` (optionnel)

Si vous voulez spécifier la version Python :
```
python-3.11.0
```

---

## 🔐 Variables d'Environnement Complètes

### Backend (Railway/Render)

```env
# Environnement
ENVIRONMENT=production

# Base de données (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[SUPABASE_HOST]:5432/postgres

# JWT
JWT_SECRET_KEY=[Générer avec: openssl rand -hex 32]
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Frontend
FRONTEND_URL=https://lokario.fr

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application

# APIs
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Vonage (SMS)
VONAGE_API_KEY=...
VONAGE_API_SECRET=...
```

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://votre-backend.railway.app
```

---

## 📝 Checklist de Déploiement

### 1. Base de données (Supabase)

- [ ] Créer un projet Supabase
- [ ] Noter la connection string
- [ ] Tester la connexion

### 2. Backend (Railway/Render)

- [ ] Créer un compte sur Railway/Render
- [ ] Connecter le repo GitHub
- [ ] Configurer les variables d'environnement
- [ ] Créer `backend/Procfile` si nécessaire
- [ ] Déployer et tester l'API

### 3. Frontend (Vercel)

- [ ] Configurer `NEXT_PUBLIC_API_URL` dans Vercel
- [ ] Redéployer le frontend
- [ ] Tester la connexion frontend → backend

### 4. Migrations de base de données

**Dans votre machine locale** :
```bash
cd backend

# Configurer temporairement DATABASE_URL vers Supabase
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[SUPABASE_HOST]:5432/postgres"

# Exécuter les migrations
alembic upgrade head
```

**Ou dans Railway/Render** :
- Ajouter une commande de build : `cd backend && alembic upgrade head`
- Ou utiliser un one-off command dans Railway

---

## 🔄 Workflow de Déploiement

1. **Développement local** :
   - Frontend : `npm run dev` (localhost:3000)
   - Backend : `uvicorn app.main:app --reload` (localhost:8000)
   - DB : SQLite local ou Supabase (dev)

2. **Push sur GitHub** :
   - Vercel déploie automatiquement le frontend
   - Railway/Render déploie automatiquement le backend

3. **Migrations** :
   - Exécuter `alembic upgrade head` après déploiement

---

## 🌐 URLs Finales

- **Frontend** : `https://lokario.fr` (Vercel)
- **Backend** : `https://votre-backend.railway.app` (Railway)
- **Database** : Supabase (interne)

---

## 🚨 Points d'Attention

### CORS

Assurez-vous que le backend autorise les requêtes depuis Vercel. Déjà configuré dans `backend/app/main.py` :

```python
if settings.ENVIRONMENT.lower() in ["production", "prod"]:
    origins = [
        "https://lokario.fr",
        "https://www.lokario.fr",
    ]
```

### Database Connection Pooling

Supabase recommande d'utiliser le **Connection Pooling** pour les applications avec beaucoup de connexions.

Dans Supabase Dashboard :
- Settings → Database → Connection string
- Utiliser le mode "Session" ou "Transaction" selon vos besoins

### Rate Limiting

Railway et Render ont des limites de requêtes. Vérifiez les quotas de votre plan.

---

## 📚 Ressources

- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

---

## ✅ Résumé

**Oui, vous pouvez** :
- ✅ Frontend sur **Vercel**
- ✅ Base de données sur **Supabase** (PostgreSQL)
- ⚠️ Backend FastAPI sur **Railway/Render/Fly.io** (pas Supabase)

**Architecture recommandée** :
```
Frontend (Vercel) 
    ↓
Backend (Railway) 
    ↓
Database (Supabase PostgreSQL)
```

