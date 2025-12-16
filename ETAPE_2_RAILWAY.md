# 🚂 ÉTAPE 2 : Déployer le Backend sur Railway

## ✅ Étape 1 terminée !

- ✅ Connexion à Supabase établie
- ✅ 40 tables créées dans la base de données

## 🎯 ÉTAPE 2 : Déployer le Backend FastAPI sur Railway

### 2.1 Créer un compte Railway

1. Aller sur [railway.app](https://railway.app)
2. Cliquer sur **"Login"** → **"Start a New Project"**
3. Se connecter avec **GitHub** (recommandé pour déploiement automatique)

### 2.2 Créer un nouveau projet

1. Dans Railway, cliquer sur **"New Project"**
2. Sélectionner **"Deploy from GitHub repo"**
3. Autoriser Railway à accéder à votre repository GitHub
4. Sélectionner votre repository `B2B SAAS`

### 2.3 Configurer le service

1. Railway devrait détecter automatiquement le projet
2. Dans **Settings** → **Source** :
   - **Root Directory** : `backend`
   - Railway devrait détecter que c'est un projet Python

### 2.4 Configurer les variables d'environnement

Dans Railway, aller dans **Variables** et ajouter **TOUTES** ces variables :

```env
# ============================================
# ENVIRONNEMENT
# ============================================
ENVIRONMENT=production

# ============================================
# BASE DE DONNÉES (Supabase)
# ============================================
DATABASE_URL=postgresql://postgres:ADEM-2006%2Agurler@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres

# ============================================
# JWT (Générer avec: openssl rand -hex 32)
# ============================================
JWT_SECRET_KEY=[GÉNÉRER UNE CLÉ SÉCURISÉE - voir ci-dessous]
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ============================================
# FRONTEND
# ============================================
FRONTEND_URL=https://lokario.fr

# ============================================
# SMTP (Gmail)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=True
SMTP_USERNAME=lokario.saas@gmail.com
SMTP_PASSWORD=[VOTRE MOT DE PASSE D'APPLICATION GMAIL]
SMTP_FROM_EMAIL=noreply@lokario.fr

# ============================================
# OpenAI (si utilisé)
# ============================================
OPENAI_API_KEY=[VOTRE CLÉ OPENAI]

# ============================================
# Stripe (si utilisé)
# ============================================
STRIPE_SECRET_KEY=[VOTRE CLÉ STRIPE]
STRIPE_PUBLISHABLE_KEY=[VOTRE CLÉ PUBLIQUE STRIPE]
```

#### ⚠️ Actions importantes :

1. **Générer JWT_SECRET_KEY** :
   ```bash
   openssl rand -hex 32
   ```
   Copiez la clé générée et utilisez-la pour `JWT_SECRET_KEY`

2. **SMTP_PASSWORD** : Utiliser votre mot de passe d'application Gmail (pas votre mot de passe normal)

### 2.5 Vérifier le Procfile

Le fichier `backend/Procfile` devrait exister avec :
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

✅ Déjà créé dans votre projet.

### 2.6 Déployer

1. Railway devrait commencer le déploiement automatiquement
2. Attendre que le build termine (2-5 minutes)
3. Railway génère automatiquement une URL (ex: `https://your-app.up.railway.app`)

### 2.7 Obtenir l'URL du backend

1. Dans Railway, aller dans **Settings** → **Networking**
2. Copier l'URL générée (ex: `https://backend-production.up.railway.app`)
3. ⚠️ **SAUVEgarder cette URL** (vous en aurez besoin pour Vercel)

### 2.8 Tester le backend

Ouvrir dans le navigateur : `https://votre-backend.railway.app/docs`

Vous devriez voir la documentation Swagger de FastAPI.

---

## ✅ Vérification

- [ ] Backend déployé sur Railway
- [ ] URL du backend obtenue
- [ ] Documentation Swagger accessible sur `/docs`
- [ ] Variables d'environnement configurées
- [ ] JWT_SECRET_KEY généré et configuré

---

## 🚀 Étape suivante

Une fois que le backend est déployé et accessible, dites-moi **"backend déployé"** ou **"étape 2 terminée"** et je passerai à l'**ÉTAPE 3 : Déployer le frontend sur Vercel** !

---

## 🚨 En cas de problème

### Le backend ne démarre pas
- Vérifier les **logs dans Railway** : Dashboard → Deployments → Logs
- Vérifier que toutes les **variables d'environnement** sont configurées
- Vérifier que `DATABASE_URL` est correct

### Erreur de connexion à la base de données
- Vérifier que la connection string Supabase est correcte
- Vérifier que les tables existent bien dans Supabase
