# Configuration Environnement Staging (Préproduction)

## 🎯 Objectif
Configurer un environnement de staging identique à la production pour tester avant déploiement.

## 📋 Étapes de Configuration

### 1. Backend - Railway

#### Créer le service staging
1. Aller sur [Railway](https://railway.app)
2. Créer un **nouveau service** : `lokario-backend-staging`
3. Connecter le dépôt GitHub
4. Sélectionner la branche **`staging`** (pas `main`)

#### Configurer les variables d'environnement
Dans Railway, ajouter ces variables :

```bash
# Environnement
ENVIRONMENT=staging

# Base de données (peut être la même que prod ou une DB séparée)
DATABASE_URL=postgresql://...  # URL de votre DB (même ou séparée)

# JWT
JWT_SECRET_KEY=<clé-différente-de-prod>  # IMPORTANT: Clé différente de prod

# Email (peut utiliser les mêmes credentials)
SENDGRID_API_KEY=<votre-clé-sendgrid>
SMTP_FROM_EMAIL=noreply@lokario.fr
FRONTEND_URL=https://lokario-staging.vercel.app  # URL du frontend staging

# Autres variables (copier depuis production)
OPENAI_API_KEY=<votre-clé>
STRIPE_SECRET_KEY=<votre-clé>
# ... etc
```

#### Configurer le déploiement automatique
- Railway déploiera automatiquement à chaque push sur `staging`
- URL générée : `lokario-backend-staging.up.railway.app`

---

### 2. Frontend - Vercel

#### Créer le projet staging
1. Aller sur [Vercel](https://vercel.com)
2. Cliquer sur **"Add New Project"**
3. Importer le dépôt GitHub
4. Configurer :
   - **Framework Preset** : Next.js
   - **Root Directory** : `/` (ou le dossier frontend si séparé)
   - **Branch** : `staging` ⚠️ IMPORTANT

#### Configurer les variables d'environnement
Dans Vercel, Settings → Environment Variables :

```bash
# URL du backend staging
NEXT_PUBLIC_API_URL=https://lokario-backend-staging.up.railway.app

# Autres variables si nécessaire
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<votre-clé>
# ... etc
```

#### Configurer le domaine
- Vercel génère automatiquement : `lokario-staging.vercel.app`
- Ou configurer un domaine custom : `staging.lokario.fr`

---

### 3. Base de Données (Optionnel mais Recommandé)

#### Option A : Même DB que Production
- ✅ Simple à configurer
- ❌ Risque de modifier les données de prod
- ⚠️ **Déconseillé** sauf pour tests très limités

#### Option B : DB Séparée (Recommandé)
1. Créer une nouvelle DB Supabase/PostgreSQL
2. Copier le schéma depuis production :
   ```bash
   # Exporter le schéma depuis prod
   pg_dump -s DATABASE_URL_PROD > schema.sql
   
   # Importer dans staging
   psql DATABASE_URL_STAGING < schema.sql
   ```
3. Utiliser cette DB dans `DATABASE_URL` du staging

---

## 🔄 Workflow d'Utilisation

### Développer une feature
```bash
# 1. Créer une branche feature
git checkout -b feature/ma-feature

# 2. Développer
# ... code ...

# 3. Commit
git add .
git commit -m "feat: Ma nouvelle feature"
git push origin feature/ma-feature
```

### Tester en Staging
```bash
# 1. Merger dans staging
git checkout staging
git merge feature/ma-feature
git push origin staging

# 2. Railway et Vercel déploient automatiquement
# 3. Tester sur https://lokario-staging.vercel.app
```

### Déployer en Production
```bash
# Si tout est OK en staging
git checkout main
git merge staging
git push origin main

# Production déploie automatiquement
```

---

## ✅ Checklist de Vérification

Avant de merger staging → main, vérifier :

- [ ] Les tests passent en staging
- [ ] Pas d'erreurs dans les logs Railway/Vercel
- [ ] Les fonctionnalités critiques fonctionnent
- [ ] Les migrations DB sont testées (si applicable)
- [ ] Les emails fonctionnent (si modifié)
- [ ] Les intégrations externes fonctionnent (Stripe, etc.)

---

## 🆘 En Cas de Problème

### Rollback Staging
```bash
git checkout staging
git revert HEAD
git push origin staging
```

### Rollback Production
```bash
git checkout main
git revert HEAD
git push origin main
```

---

## 📊 Avantages

1. **Sécurité** : Tester avant production
2. **Confiance** : Moins de stress
3. **Qualité** : Détecter les bugs tôt
4. **Formation** : Apprendre les bonnes pratiques

---

## 🔐 Sécurité

⚠️ **IMPORTANT** :
- Utiliser des clés JWT **différentes** entre staging et prod
- Ne pas exposer les credentials de production en staging
- Staging peut être accessible publiquement (utiliser des données de test)

---

## 📝 Notes

- Staging peut être réinitialisé sans impact
- Les données de staging peuvent être perdues (normal)
- Staging sert uniquement aux tests avant production
