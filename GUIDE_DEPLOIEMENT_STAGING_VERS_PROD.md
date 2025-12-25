# 🚀 Guide de Déploiement : Staging → Production

## 📋 Vue d'ensemble

Ce guide vous explique comment déployer en production lorsque :
- ✅ La base de données du staging a été modifiée
- ✅ De nouvelles variables d'environnement ont été ajoutées en staging

---

## 🔍 ÉTAPE 1 : Identifier les différences

### 1.1 Vérifier les migrations de base de données

```bash
cd "/Users/glr_adem/Documents/B2B SAAS/backend"

# Voir toutes les migrations disponibles
ls -la alembic/versions/

# Vérifier l'état actuel des migrations en staging
# (Connectez-vous à votre DB staging et vérifiez)
```

**Action** : Notez toutes les migrations qui ont été appliquées en staging mais pas encore en production.

### 1.2 Identifier les nouvelles variables d'environnement

**Dans Railway (staging)** :
1. Aller sur [Railway](https://railway.app)
2. Ouvrir votre service `lokario-backend-staging`
3. Aller dans **Variables**
4. **Copier toutes les variables** dans un fichier temporaire

**Variables à vérifier** (comparer avec production) :
- `ENVIRONMENT` (doit être `production` en prod)
- `DATABASE_URL` (URL de la DB de production)
- `JWT_SECRET_KEY` (⚠️ DOIT être différent de staging)
- `SENDGRID_API_KEY` (ou `SMTP_*`)
- `SUPABASE_URL` (si ajouté)
- `SUPABASE_SERVICE_ROLE_KEY` (si ajouté)
- `SUPABASE_STORAGE_BUCKET` (si ajouté)
- `CRON_SECRET` (si ajouté)
- `VONAGE_API_KEY` / `VONAGE_API_SECRET` (si ajouté)
- Toutes autres variables spécifiques

---

## 🗄️ ÉTAPE 2 : Synchroniser la base de données

### 2.1 Appliquer les migrations en production

**Option A : Via Alembic (Recommandé)**

```bash
cd "/Users/glr_adem/Documents/B2B SAAS/backend"

# 1. Définir la DATABASE_URL de PRODUCTION
export DATABASE_URL="postgresql://postgres:[MOT_DE_PASSE_PROD]@db.xxx.supabase.co:5432/postgres"

# 2. Vérifier l'état actuel
alembic current

# 3. Voir les migrations en attente
alembic heads

# 4. Appliquer toutes les migrations
alembic upgrade head

# 5. Vérifier que tout est à jour
alembic current
```

**Option B : Via Supabase SQL Editor**

1. Aller sur [Supabase Dashboard](https://supabase.com)
2. Ouvrir votre projet **PRODUCTION**
3. Aller dans **SQL Editor**
4. Pour chaque migration manquante :
   - Ouvrir le fichier de migration : `backend/alembic/versions/[nom_migration].py`
   - Copier le contenu de la fonction `upgrade()`
   - L'adapter si nécessaire (certaines migrations vérifient l'existence)
   - Exécuter dans SQL Editor

### 2.2 Vérifier les migrations appliquées

```bash
# Se connecter à la DB de production
psql "postgresql://postgres:[MOT_DE_PASSE]@db.xxx.supabase.co:5432/postgres"

# Vérifier la table alembic_version
SELECT * FROM alembic_version;

# Vérifier que les nouvelles tables/colonnes existent
\dt  # Liste des tables
\d table_name  # Structure d'une table
```

---

## ⚙️ ÉTAPE 3 : Configurer les variables d'environnement en production

### 3.1 Backend (Railway)

1. **Aller sur Railway** : [railway.app](https://railway.app)
2. **Ouvrir votre service de production** (ex: `lokario-backend-production`)
3. **Aller dans Variables**
4. **Ajouter/Modifier les variables** :

```bash
# ⚠️ IMPORTANT : Copier depuis staging MAIS adapter les valeurs

# Environnement (DOIT être production)
ENVIRONMENT=production

# Base de données (URL de PRODUCTION, pas staging)
DATABASE_URL=postgresql://postgres:[MOT_DE_PASSE_PROD]@db.xxx.supabase.co:5432/postgres

# JWT (⚠️ DOIT être différent de staging)
JWT_SECRET_KEY=[Générer une nouvelle clé pour prod]
# Générer avec: python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Frontend URL (URL de production)
FRONTEND_URL=https://lokario.fr

# Email (peut être identique à staging)
SENDGRID_API_KEY=[votre-clé-sendgrid]
# OU
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe

# Supabase Storage (si ajouté en staging)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[votre-service-role-key]
SUPABASE_STORAGE_BUCKET=company-assets

# Cron Secret (si ajouté)
CRON_SECRET=[générer-une-clé-sécurisée]

# OpenAI
OPENAI_API_KEY=sk-proj-[votre-clé]

# Stripe (MODE PRODUCTION - clés LIVE)
STRIPE_SECRET_KEY=sk_live_[votre-clé]
STRIPE_PUBLISHABLE_KEY=pk_live_[votre-clé]
STRIPE_WEBHOOK_SECRET=whsec_[votre-secret]

# Vonage/SMS (si ajouté)
VONAGE_API_KEY=[votre-clé]
VONAGE_API_SECRET=[votre-secret]

# Autres variables spécifiques...
```

**⚠️ Points importants** :
- `ENVIRONMENT` doit être `production` (pas `staging`)
- `DATABASE_URL` doit pointer vers la DB de **production**
- `JWT_SECRET_KEY` doit être **différent** de staging
- `FRONTEND_URL` doit être `https://lokario.fr` (pas staging)
- Utiliser les clés **LIVE** pour Stripe (pas test)

### 3.2 Frontend (Vercel)

1. **Aller sur Vercel** : [vercel.com](https://vercel.com)
2. **Ouvrir votre projet de production**
3. **Aller dans Settings → Environment Variables**
4. **Ajouter/Modifier** :

```bash
# URL du backend de PRODUCTION
NEXT_PUBLIC_API_URL=https://votre-backend-production.up.railway.app

# Stripe (clés LIVE)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[votre-clé]

# Autres variables publiques si nécessaire
```

---

## 🔄 ÉTAPE 4 : Déployer le code

### 4.1 Vérifier que staging est à jour

```bash
cd "/Users/glr_adem/Documents/B2B SAAS"

# Voir les différences entre staging et main
git checkout staging
git status

# Vérifier que tout est commité
git log --oneline -5
```

### 4.2 Merger staging dans main

```bash
# 1. Basculer sur main
git checkout main

# 2. Mettre à jour main
git pull origin main

# 3. Merger staging dans main
git merge staging

# 4. Résoudre les conflits si nécessaire
# (git status pour voir les conflits)

# 5. Push vers main (déploie automatiquement)
git push origin main
```

**⚠️ Si vous avez des conflits** :
```bash
# Voir les fichiers en conflit
git status

# Éditer les fichiers pour résoudre les conflits
# Puis :
git add .
git commit -m "Merge staging into main: resolve conflicts"
git push origin main
```

---

## ✅ ÉTAPE 5 : Vérifier le déploiement

### 5.1 Vérifier le backend

1. **Railway** :
   - Aller dans votre service de production
   - Vérifier les **Logs** (pas d'erreurs)
   - Vérifier que le service est **Running**

2. **Tester l'API** :
   ```bash
   # Ouvrir dans le navigateur
   https://votre-backend-production.up.railway.app/docs
   
   # Devrait afficher la documentation Swagger
   ```

3. **Tester un endpoint** :
   ```bash
   curl https://votre-backend-production.up.railway.app/
   ```

### 5.2 Vérifier le frontend

1. **Vercel** :
   - Aller dans votre projet de production
   - Vérifier le dernier **Deployment** (statut : Ready)
   - Vérifier les **Logs** (pas d'erreurs)

2. **Tester le site** :
   - Ouvrir `https://lokario.fr`
   - Vérifier que la page se charge
   - Tester la connexion
   - Tester une fonctionnalité principale

### 5.3 Vérifier la base de données

```bash
# Se connecter à la DB de production
psql "postgresql://postgres:[MOT_DE_PASSE]@db.xxx.supabase.co:5432/postgres"

# Vérifier les nouvelles tables/colonnes
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

# Vérifier une table spécifique
SELECT * FROM alembic_version;
```

---

## 🚨 En cas de problème

### Rollback du code

```bash
# Revenir au commit précédent
git checkout main
git revert HEAD
git push origin main
```

### Rollback des migrations (si nécessaire)

```bash
cd backend

# Définir DATABASE_URL de production
export DATABASE_URL="postgresql://..."

# Revenir à une migration précédente
alembic downgrade -1  # Revenir d'une version
# OU
alembic downgrade [revision_id]  # Revenir à une version spécifique
```

**⚠️ Attention** : Le rollback de migrations peut supprimer des données. Faire une sauvegarde avant.

### Vérifier les logs

**Railway** :
- Dashboard → Service → Logs
- Chercher les erreurs en rouge

**Vercel** :
- Dashboard → Project → Deployments → [Dernier] → Logs

---

## 📋 Checklist finale

Avant de considérer le déploiement terminé :

- [ ] Toutes les migrations appliquées en production
- [ ] Toutes les variables d'environnement configurées en production
- [ ] `ENVIRONMENT=production` dans Railway
- [ ] `DATABASE_URL` pointe vers la DB de production
- [ ] `JWT_SECRET_KEY` différent de staging
- [ ] `FRONTEND_URL=https://lokario.fr` en production
- [ ] Code mergé de staging vers main
- [ ] Code poussé sur GitHub (main)
- [ ] Backend déployé et accessible
- [ ] Frontend déployé et accessible
- [ ] Tests fonctionnels passés
- [ ] Pas d'erreurs dans les logs

---

## 🔐 Sécurité - Points critiques

1. **JWT_SECRET_KEY** :
   - ⚠️ DOIT être différent entre staging et production
   - ⚠️ DOIT être généré avec une clé sécurisée (32+ caractères)
   - ⚠️ NE JAMAIS commiter dans le code

2. **Clés API** :
   - Utiliser les clés **LIVE** en production (Stripe, etc.)
   - Ne pas utiliser les clés de test en production

3. **Base de données** :
   - ⚠️ Vérifier que `DATABASE_URL` pointe vers la DB de **production**
   - Ne pas mélanger staging et production

4. **Variables sensibles** :
   - Ne jamais les exposer dans les logs
   - Ne jamais les commiter dans Git

---

## 📝 Notes importantes

- **Temps de déploiement** : Railway et Vercel déploient automatiquement en 2-5 minutes
- **Propagation DNS** : Si vous changez de domaine, attendre 5-30 minutes
- **Cache** : Vercel peut mettre quelques minutes à mettre à jour le cache
- **Migrations** : Toujours tester les migrations en staging d'abord

---

## 🎉 C'est terminé !

Votre application est maintenant en production avec :
- ✅ Base de données synchronisée
- ✅ Nouvelles variables d'environnement configurées
- ✅ Code déployé

**Prochaines mises à jour** : Suivre le même processus (staging → main)

