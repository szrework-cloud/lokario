# 🚂 ÉTAPE 2 : Déployer le Backend sur Railway

## ✅ Prérequis terminés

- ✅ Code déployé sur GitHub
- ✅ Base de données Supabase configurée
- ✅ Tables créées (40 tables)

---

## 🎯 Déployer le Backend FastAPI sur Railway

### 1. Créer un compte Railway

1. Aller sur [railway.app](https://railway.app)
2. Cliquer sur **"Login"** → Se connecter avec **GitHub**
3. Autoriser Railway à accéder à vos repositories GitHub

### 2. Créer un nouveau projet

1. Dans Railway Dashboard, cliquer sur **"New Project"**
2. Sélectionner **"Deploy from GitHub repo"**
3. Sélectionner votre repository : `szrework-cloud/lokario`
4. Railway détecte automatiquement le projet

### 3. Configurer le service

1. Dans **Settings** → **Source** :
   - **Root Directory** : `backend` ⚠️ **IMPORTANT**
   - Railway devrait détecter Python automatiquement

### 4. Configurer les variables d'environnement

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
JWT_SECRET_KEY=GÉNÉRER_UNE_CLÉ_ICI
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ============================================
# FRONTEND URL
# ============================================
FRONTEND_URL=https://lokario.fr

# ============================================
# SMTP (Gmail)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application-gmail

# ============================================
# OPENAI (si utilisé)
# ============================================
OPENAI_API_KEY=sk-...

# ============================================
# STRIPE (si utilisé)
# ============================================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ============================================
# VONAGE/SMS (si utilisé)
# ============================================
VONAGE_API_KEY=...
VONAGE_API_SECRET=...
```

**⚠️ IMPORTANT** :
- **Générer JWT_SECRET_KEY** : Exécuter dans le terminal :
  ```bash
  openssl rand -hex 32
  ```
  Copier le résultat et l'utiliser pour `JWT_SECRET_KEY`

- **DATABASE_URL** : Utiliser votre connection string Supabase (déjà configurée ci-dessus)

- **SMTP_PASSWORD** : Utiliser un **mot de passe d'application Gmail**, pas votre mot de passe normal

### 5. Vérifier le Procfile

Le fichier `backend/Procfile` doit exister avec :
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

✅ Ce fichier existe déjà dans votre repo.

### 6. Déployer

1. Railway commence automatiquement le déploiement après avoir ajouté les variables
2. Aller dans l'onglet **"Deployments"** pour voir la progression
3. Attendre que le build termine (peut prendre 2-5 minutes la première fois)

### 7. Obtenir l'URL du backend

1. Dans Railway, aller dans **Settings** → **Networking**
2. Cliquer sur **"Generate Domain"** pour obtenir une URL publique
3. Ou utiliser le domaine fourni automatiquement
4. **Copier cette URL** (ex: `https://backend-production-xxxx.up.railway.app`)
5. ⚠️ **SAUVEGARDER cette URL** (vous en aurez besoin pour Vercel)

### 8. Tester le backend

1. Ouvrir dans le navigateur : `https://votre-backend.railway.app/docs`
2. Vous devriez voir la documentation Swagger de FastAPI
3. Tester un endpoint pour vérifier que tout fonctionne

---

## 🔧 Dépannage

### Build échoue

- Vérifier que **Root Directory** est bien `backend`
- Vérifier que toutes les variables d'environnement sont définies
- Vérifier les logs dans Railway → Deployments → View Logs

### Erreur de connexion à la base de données

- Vérifier que `DATABASE_URL` est correcte
- Vérifier que le mot de passe est bien encodé (%2A pour *)
- Vérifier que Supabase autorise les connexions depuis Railway

### 502 Bad Gateway

- Vérifier que le Procfile est correct
- Vérifier que le port est bien `$PORT` (variable d'environnement Railway)

---

## ✅ Prochaine étape

Une fois le backend déployé et fonctionnel :
→ **ÉTAPE 3 : Déployer le frontend sur Vercel**
