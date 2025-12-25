# 🔍 Vérifier pourquoi Vercel ne déploie pas en production

## ✅ Ce qui fonctionne
- ✅ Staging déploie correctement
- ✅ Railway (backend) déploie correctement
- ✅ `vercel.json` a `"main": true`

## 🔍 Diagnostic : Problèmes possibles

### 1. Vérifier que vous avez 2 projets Vercel séparés

**Staging et Production doivent être des projets SEPARÉS dans Vercel :**

1. **Aller sur [vercel.com](https://vercel.com)**
2. **Vérifier vos projets :**
   - Vous devriez avoir **2 projets** :
     - `lokario-staging` (ou similaire) → branche `staging`
     - `lokario-production` (ou similaire) → branche `main`

### 2. Si vous n'avez qu'UN SEUL projet

**C'est le problème !** Vous devez créer un projet séparé pour la production :

1. **Dans Vercel Dashboard** :
   - Cliquer sur **"Add New Project"**
   - Sélectionner le même repository GitHub
   - **Nom du projet** : `lokario-production` (ou `lokario` pour production)

2. **Configuration du projet production** :
   - **Branch** : `main` ⚠️ IMPORTANT
   - **Framework Preset** : Next.js
   - **Root Directory** : `./`
   - **Build Command** : `npm run build`
   - **Output Directory** : `.next`

3. **Variables d'environnement** :
   - `NEXT_PUBLIC_API_URL` = URL du backend de production (Railway)

4. **Déployer**

### 3. Si vous avez 2 projets mais que production ne déploie pas

**Vérifier la configuration Git du projet production :**

1. **Dans Vercel** → Projet de production
2. **Settings** → **Git**
3. **Vérifier** :
   - **Production Branch** : Doit être `main`
   - **Connected Repository** : Doit être connecté au bon repo
   - **Auto-deploy** : Doit être activé ✅

### 4. Vérifier les déploiements

1. **Dans Vercel** → Projet de production
2. **Deployments**
3. **Vérifier** :
   - Y a-t-il des déploiements récents ?
   - Y a-t-il des erreurs de build ?
   - Le dernier déploiement vient-il de quelle branche ?

### 5. Forcer un nouveau déploiement

**Option A : Via l'interface Vercel**
1. Aller dans le projet de production
2. **Deployments**
3. Cliquer sur **"..."** du dernier deployment
4. **Redeploy**

**Option B : Via Git**
```bash
cd "/Users/glr_adem/Documents/B2B SAAS"
git checkout main
git commit --allow-empty -m "chore: Trigger Vercel production deploy"
git push origin main
```

### 6. Vérifier les limites Vercel

**Si vous voyez une erreur "Resource is limited"** :
- Plan gratuit : 100 déploiements/jour
- Attendre quelques heures
- Ou passer au plan Pro ($20/mois)

## 📋 Checklist de vérification

- [ ] J'ai **2 projets Vercel séparés** (staging + production)
- [ ] Le projet de production est connecté à la branche `main`
- [ ] `Production Branch` = `main` dans Settings → Git
- [ ] `Auto-deploy` est activé pour la branche `main`
- [ ] Les variables d'environnement sont configurées
- [ ] Pas de limite de déploiements atteinte

## 🚀 Solution rapide : Créer un projet production séparé

Si vous n'avez qu'un seul projet Vercel :

1. **Aller sur [vercel.com](https://vercel.com)**
2. **Add New Project**
3. **Sélectionner le repository** : `szrework-cloud/lokario`
4. **Configuration** :
   - **Project Name** : `lokario-production`
   - **Framework** : Next.js
   - **Root Directory** : `./`
   - **Branch** : `main` ⚠️
5. **Environment Variables** :
   - `NEXT_PUBLIC_API_URL` = URL backend production Railway
6. **Deploy**

Ensuite, dans votre projet staging existant :
- **Settings** → **Git** → **Production Branch** : `staging` (ou laisser vide si c'est juste staging)

## 💡 Note importante

Le fichier `vercel.json` avec `"main": true` est bien, mais **Vercel utilise principalement la configuration dans son interface web**. Le fichier `vercel.json` est secondaire.

**La configuration dans Vercel Dashboard (Settings → Git) est prioritaire.**

