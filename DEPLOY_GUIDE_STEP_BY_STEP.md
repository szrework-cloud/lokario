# 🚀 Guide de Déploiement - Étape par Étape

## 📋 Vue d'ensemble

**Architecture** :
- Frontend (Next.js) → Vercel
- Backend (FastAPI) → Railway
- Database (PostgreSQL) → Supabase

---

## 📝 Prérequis

- ✅ Compte GitHub (avec votre code)
- ✅ Compte Vercel (gratuit)
- ✅ Compte Railway (gratuit pour commencer)
- ✅ Compte Supabase (gratuit)

---

## 🗄️ ÉTAPE 1 : Créer la base de données sur Supabase

### 1.1 Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Cliquer sur **"New Project"**
3. Remplir :
   - **Name** : `lokario-production`
   - **Database Password** : Générer un mot de passe fort (⚠️ **SAUVEgarder-le**)
   - **Region** : Choisir la région la plus proche (Europe)
4. Cliquer sur **"Create new project"**
5. ⏳ Attendre 2-3 minutes que le projet soit créé

### 1.2 Récupérer la connection string

1. Dans le dashboard Supabase, aller dans **Settings** → **Database**
2. Descendre jusqu'à **"Connection string"**
3. Sélectionner **"URI"** (pas "Connection pooling" pour l'instant)
4. Cliquer sur **"Copy"** pour copier la connection string
5. ⚠️ **Formater la connection string** :

La string ressemble à :
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
```

Remplacez `[YOUR-PASSWORD]` par votre mot de passe réel :
```
postgresql://postgres:VotreMotDePasse123@db.xxx.supabase.co:5432/postgres
```

⚠️ **SAUVEgarder cette string** (vous en aurez besoin pour Railway)

### 1.3 Exécuter les migrations

**Option A : En local (recommandé pour la première fois)**

```bash
# Dans votre terminal
cd backend

# Configurer temporairement la DATABASE_URL vers Supabase
export DATABASE_URL="postgresql://postgres:VotreMotDePasse@db.xxx.supabase.co:5432/postgres"

# Exécuter les migrations
alembic upgrade head
```

**Option B : Via Supabase SQL Editor**

1. Dans Supabase, aller dans **SQL Editor**
2. Créer une nouvelle requête
3. Copier le contenu des fichiers de migration dans `backend/alembic/versions/`
4. Exécuter les migrations une par une

---

## 🚂 ÉTAPE 2 : Déployer le backend sur Railway

### 2.1 Créer un compte Railway

1. Aller sur [railway.app](https://railway.app)
2. Cliquer sur **"Login"** → **"Start a New Project"**
3. Se connecter avec GitHub

### 2.2 Connecter votre repository

1. Dans Railway, cliquer sur **"New Project"**
2. Sélectionner **"Deploy from GitHub repo"**
3. Autoriser Railway à accéder à votre repository GitHub
4. Sélectionner votre repository `B2B SAAS`
5. Railway va détecter automatiquement le projet

### 2.3 Configurer le service

1. Railway devrait détecter le dossier `backend`
2. Si ce n'est pas le cas, dans **Settings** → **Source**, configurer :
   - **Root Directory** : `backend`

### 2.4 Configurer les variables d'environnement

Dans Railway, aller dans **Variables** et ajouter :

```env
# Environnement
ENVIRONMENT=production

# Base de données (remplacer par votre connection string Supabase)
DATABASE_URL=postgresql://postgres:VotreMotDePasse@db.xxx.supabase.co:5432/postgres

# JWT - Générer avec: openssl rand -hex 32
JWT_SECRET_KEY=[Générer une clé sécurisée de 32+ caractères]

# Algorithmes JWT
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Frontend URL
FRONTEND_URL=https://lokario.fr

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application-gmail

# OpenAI (si utilisé)
OPENAI_API_KEY=sk-...

# Stripe (si utilisé)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Vonage/SMS (si utilisé)
VONAGE_API_KEY=...
VONAGE_API_SECRET=...
```

**⚠️ Important** : 
- Générer `JWT_SECRET_KEY` avec : `openssl rand -hex 32`
- Utiliser votre **vraie connection string** de Supabase
- Utiliser un **mot de passe d'application Gmail** (pas votre mot de passe normal)

### 2.5 Créer le fichier Procfile (si nécessaire)

Créer `backend/Procfile` :

```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 2.6 Déployer

1. Railway devrait commencer le déploiement automatiquement
2. Attendre que le build termine
3. Railway génère automatiquement une URL (ex: `https://your-app.up.railway.app`)

### 2.7 Obtenir l'URL du backend

1. Dans Railway, aller dans **Settings** → **Networking**
2. Copier l'URL générée (ex: `https://backend-production.up.railway.app`)
3. ⚠️ **SAUVEgarder cette URL** (vous en aurez besoin pour Vercel)

### 2.8 Tester le backend

Ouvrir dans le navigateur : `https://votre-backend.railway.app/docs`

Vous devriez voir la documentation Swagger de FastAPI.

---

## 🎨 ÉTAPE 3 : Déployer le frontend sur Vercel

### 3.1 Créer un compte Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. Cliquer sur **"Sign Up"**
3. Se connecter avec GitHub

### 3.2 Importer le projet

1. Dans Vercel Dashboard, cliquer sur **"Add New Project"**
2. Sélectionner votre repository GitHub `B2B SAAS`
3. Vercel détecte automatiquement Next.js

### 3.3 Configurer le projet

1. **Framework Preset** : Next.js (automatique)
2. **Root Directory** : `./` (racine)
3. **Build Command** : `npm run build` (par défaut)
4. **Output Directory** : `.next` (par défaut)

### 3.4 Configurer les variables d'environnement

Dans **Environment Variables**, ajouter :

```env
NEXT_PUBLIC_API_URL=https://votre-backend.railway.app
```

⚠️ **Remplacer** `https://votre-backend.railway.app` par l'URL réelle de votre backend Railway.

### 3.5 Déployer

1. Cliquer sur **"Deploy"**
2. ⏳ Attendre 2-5 minutes que le build termine
3. Vercel génère une URL temporaire (ex: `https://b2b-saas.vercel.app`)

### 3.6 Configurer le domaine (optionnel mais recommandé)

1. Dans Vercel, aller dans **Settings** → **Domains**
2. Ajouter `lokario.fr` et `www.lokario.fr`
3. Vercel vous donnera des instructions DNS

**Dans votre registrar DNS** (où vous avez acheté lokario.fr) :

- **Pour lokario.fr** (sans www) :
  ```
  Type: A
  Name: @
  Value: 76.76.21.21
  ```

- **Pour www.lokario.fr** :
  ```
  Type: CNAME
  Name: www
  Value: cname.vercel-dns.com
  ```

⚠️ Utiliser les valeurs exactes fournies par Vercel dans les instructions.

4. ⏳ Attendre 5-30 minutes pour la propagation DNS
5. Vercel génère automatiquement un certificat SSL

---

## 🔧 ÉTAPE 4 : Configurer le CORS dans le backend

Le backend doit autoriser les requêtes depuis Vercel.

Vérifier dans `backend/app/main.py` que vous avez :

```python
if settings.ENVIRONMENT.lower() in ["production", "prod"]:
    origins = [
        "https://lokario.fr",
        "https://www.lokario.fr",
    ]
```

Si votre frontend est encore sur l'URL Vercel temporaire (ex: `*.vercel.app`), ajoutez-le temporairement :

```python
origins = [
    "https://lokario.fr",
    "https://www.lokario.fr",
    "https://b2b-saas.vercel.app",  # URL temporaire Vercel
]
```

Après avoir configuré le domaine `lokario.fr`, vous pouvez retirer l'URL temporaire.

---

## ✅ ÉTAPE 5 : Vérifier que tout fonctionne

### 5.1 Tester le backend

1. Ouvrir : `https://votre-backend.railway.app/docs`
2. Tester un endpoint simple (ex: GET `/`)

### 5.2 Tester le frontend

1. Ouvrir : `https://lokario.fr` (ou votre URL Vercel)
2. Vérifier que la page se charge
3. Essayer de se connecter ou s'inscrire

### 5.3 Vérifier la connexion Frontend → Backend

1. Ouvrir la console du navigateur (F12)
2. Aller dans l'onglet **Network**
3. Faire une action qui appelle l'API (ex: login)
4. Vérifier que les requêtes passent bien vers votre backend Railway

---

## 🔄 Workflow de mise à jour

Après le déploiement initial :

### Mettre à jour le code

1. **Faire vos modifications** en local
2. **Tester en local** :
   ```bash
   # Frontend
   npm run dev
   
   # Backend
   cd backend
   uvicorn app.main:app --reload
   ```
3. **Commit et push** sur GitHub :
   ```bash
   git add .
   git commit -m "Votre message"
   git push origin main
   ```
4. **Déploiement automatique** :
   - Vercel déploie automatiquement le frontend
   - Railway déploie automatiquement le backend

### Mettre à jour la base de données

1. **Créer une nouvelle migration** :
   ```bash
   cd backend
   alembic revision --autogenerate -m "Description de la migration"
   ```
2. **Appliquer la migration** :
   ```bash
   # En local avec DATABASE_URL vers Supabase
   export DATABASE_URL="postgresql://postgres:MotDePasse@db.xxx.supabase.co:5432/postgres"
   alembic upgrade head
   ```

---

## 🚨 En cas de problème

### Le backend ne démarre pas

1. Vérifier les **logs dans Railway** : Dashboard → Deployments → Logs
2. Vérifier les **variables d'environnement** sont toutes configurées
3. Vérifier que `DATABASE_URL` est correct

### Le frontend ne peut pas contacter le backend

1. Vérifier que `NEXT_PUBLIC_API_URL` dans Vercel pointe vers le bon backend
2. Vérifier les **CORS** dans `backend/app/main.py`
3. Vérifier les **logs dans Railway** pour voir les erreurs

### Erreur de connexion à la base de données

1. Vérifier que la connection string Supabase est correcte
2. Vérifier que le mot de passe est bien échappé dans l'URL (si caractères spéciaux)
3. Vérifier que les migrations ont été exécutées

---

## 📊 Checklist finale

- [ ] Base de données Supabase créée
- [ ] Migrations exécutées sur Supabase
- [ ] Backend déployé sur Railway
- [ ] Variables d'environnement backend configurées
- [ ] Backend accessible via l'URL Railway
- [ ] Frontend déployé sur Vercel
- [ ] `NEXT_PUBLIC_API_URL` configuré dans Vercel
- [ ] Domaine `lokario.fr` configuré (optionnel)
- [ ] CORS configuré dans le backend
- [ ] Test de connexion frontend → backend réussi

---

## 🎉 C'est terminé !

Votre application est maintenant déployée :
- **Frontend** : `https://lokario.fr` (Vercel)
- **Backend** : `https://votre-backend.railway.app` (Railway)
- **Database** : Supabase

Toute mise à jour sur GitHub déclenchera automatiquement un redéploiement.

