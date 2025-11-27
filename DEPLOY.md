# Guide de déploiement - lokario.fr

## 🚀 Déploiement du frontend sur Vercel

### Étape 1 : Préparer le code

1. **Vérifier que tout fonctionne en local :**
```bash
npm run build
npm run start
```

2. **Pousser le code sur GitHub :**
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### Étape 2 : Créer un compte Vercel

1. Aller sur https://vercel.com
2. Créer un compte (gratuit) avec GitHub
3. Cliquer sur "Add New Project"

### Étape 3 : Importer le projet

1. **Sélectionner votre repository GitHub**
2. **Configuration automatique :**
   - Framework Preset: **Next.js** (détecté automatiquement)
   - Root Directory: `./` (racine)
   - Build Command: `npm run build` (par défaut)
   - Output Directory: `.next` (par défaut)
   - Install Command: `npm install` (par défaut)

3. **Variables d'environnement :**
   - Cliquer sur "Environment Variables"
   - Ajouter :
     ```
     NEXT_PUBLIC_API_URL = https://votre-api-backend.com
     ```
     (Si vous n'avez pas de backend pour l'instant, vous pouvez laisser vide ou mettre une URL de placeholder)

4. **Cliquer sur "Deploy"**

### Étape 4 : Configurer le domaine lokario.fr

1. **Dans Vercel Dashboard :**
   - Aller dans votre projet
   - Cliquer sur "Settings" > "Domains"
   - Ajouter `lokario.fr` et `www.lokario.fr`

2. **Dans votre gestionnaire DNS (chez votre registrar) :**
   
   Vercel vous donnera des instructions précises, mais généralement :
   
   **Pour lokario.fr (sans www) :**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```
   
   **Pour www.lokario.fr :**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
   
   Ou utilisez les valeurs exactes fournies par Vercel.

3. **Attendre la propagation DNS (5-30 minutes)**
   - Vercel vérifiera automatiquement
   - Un certificat SSL sera généré automatiquement

### Étape 5 : Vérifier le déploiement

1. Votre site sera accessible sur :
   - `https://lokario.fr`
   - `https://www.lokario.fr`

2. Vercel redirige automatiquement HTTP vers HTTPS

## 📝 Notes importantes

- **SSL/HTTPS** : Géré automatiquement par Vercel
- **Build automatique** : À chaque push sur `main`, Vercel redéploie
- **Variables d'environnement** : Configurées dans Vercel Dashboard
- **Logs** : Disponibles dans Vercel Dashboard > Deployments

## 🔧 En cas de problème

1. **Build échoue :**
   - Vérifier les logs dans Vercel
   - Tester `npm run build` en local

2. **Domaine ne fonctionne pas :**
   - Vérifier les DNS (peut prendre jusqu'à 48h)
   - Utiliser https://dnschecker.org pour vérifier la propagation

3. **Erreurs 404 :**
   - Vérifier que `next.config.ts` est correct
   - Vérifier les routes dans `src/app`

## ✅ Checklist avant déploiement

- [ ] Code poussé sur GitHub
- [ ] `npm run build` fonctionne en local
- [ ] Variables d'environnement préparées
- [ ] Compte Vercel créé
- [ ] Domaine prêt à configurer

