# 🚀 Instructions de déploiement - Lokario

## ✅ État actuel

- ✅ Code compilé avec succès (`npm run build` passe)
- ✅ Code poussé sur GitHub (repository: `szrework-cloud/lokario`)
- ✅ Backend prêt (Procfile configuré)

## 📋 Étapes de déploiement

### OPTION 1 : Déploiement automatique via GitHub (Recommandé)

#### Frontend (Vercel) - 5 minutes

1. **Aller sur https://vercel.com**
2. **Se connecter avec GitHub**
3. **Cliquer sur "Add New Project"**
4. **Sélectionner le repository** : `szrework-cloud/lokario`
5. **Configuration :**
   - Framework Preset: **Next.js** (détecté automatiquement)
   - Root Directory: `./` (laisser par défaut)
   - Build Command: `npm run build` (par défaut)
   - Output Directory: `.next` (par défaut)

6. **Variables d'environnement :**
   - Ajouter : `NEXT_PUBLIC_API_URL` = URL de votre backend Railway (à ajouter après déploiement du backend)

7. **Cliquer sur "Deploy"**

⚠️ **Note** : Pour l'instant, vous pouvez laisser `NEXT_PUBLIC_API_URL` vide ou mettre une URL temporaire. Vous pourrez la mettre à jour après le déploiement du backend.

#### Backend (Railway) - 10 minutes

1. **Aller sur https://railway.app**
2. **Se connecter avec GitHub**
3. **Cliquer sur "New Project" → "Deploy from GitHub repo"**
4. **Sélectionner le repository** : `szrework-cloud/lokario`
5. **Configuration :**
   - Root Directory: `backend`
   - Railway détectera automatiquement que c'est Python

6. **Variables d'environnement** (dans Railway → Variables) :
   ```env
   ENVIRONMENT=production
   DATABASE_URL=postgresql://postgres:ADEM-2006%2Agurler@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres
   JWT_SECRET_KEY=[GÉNÉRER avec: openssl rand -hex 32]
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   FRONTEND_URL=https://lokario.fr
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USE_TLS=True
   SMTP_USERNAME=lokario.saas@gmail.com
   SMTP_PASSWORD=[VOTRE MOT DE PASSE D'APPLICATION GMAIL]
   SMTP_FROM_EMAIL=noreply@lokario.fr
   OPENAI_API_KEY=[VOTRE CLÉ OPENAI]
   ```

7. **Déploiement automatique** : Railway va déployer automatiquement

8. **Obtenir l'URL du backend** : Settings → Networking → Copier l'URL

9. **Mettre à jour Vercel** : Ajouter l'URL du backend dans `NEXT_PUBLIC_API_URL`

### OPTION 2 : Déploiement via CLI

#### Frontend (Vercel CLI)

```bash
npm i -g vercel
vercel login
vercel --prod
```

#### Backend (Railway CLI)

```bash
npm i -g @railway/cli
railway login
railway link
railway up
```

## 🔗 Configuration du domaine lokario.fr

Une fois Vercel déployé :

1. **Dans Vercel Dashboard** → Settings → Domains
2. **Ajouter** : `lokario.fr` et `www.lokario.fr`
3. **Configurer DNS** chez votre registrar (instructions fournies par Vercel)
4. **Attendre la propagation DNS** (5-30 minutes)

## ✅ Checklist finale

- [ ] Frontend déployé sur Vercel
- [ ] Backend déployé sur Railway
- [ ] URL du backend obtenue
- [ ] `NEXT_PUBLIC_API_URL` configuré dans Vercel
- [ ] Variables d'environnement configurées dans Railway
- [ ] Domaine `lokario.fr` configuré
- [ ] SSL/HTTPS actif (automatique avec Vercel)
- [ ] Test : https://lokario.fr fonctionne
- [ ] Test : https://votre-backend.railway.app/docs fonctionne

## 🚨 En cas de problème

### Build échoue sur Vercel
- Vérifier les logs dans Vercel Dashboard
- Tester `npm run build` en local
- Vérifier que toutes les dépendances sont dans `package.json`

### Backend ne démarre pas sur Railway
- Vérifier les logs dans Railway Dashboard
- Vérifier que toutes les variables d'environnement sont configurées
- Vérifier que `DATABASE_URL` est correct

### Erreur CORS
- Vérifier que `FRONTEND_URL` dans Railway correspond à l'URL Vercel
- Vérifier la configuration CORS dans le backend

## 📞 Support

En cas de problème, vérifier :
1. Les logs dans Vercel/Railway
2. La configuration des variables d'environnement
3. La connexion à la base de données Supabase
