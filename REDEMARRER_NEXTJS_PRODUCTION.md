# 🔄 Redémarrer Next.js en production (Railway)

## Méthode 1 : Déploiement automatique (Recommandé)

Quand vous poussez vos modifications avec `git push`, Railway redéploie automatiquement :

```bash
git add .
git commit -m "Vos modifications"
git push origin main
```

Railway détecte le push et :
1. ✅ Arrête l'ancien serveur
2. ✅ Rebuild l'application
3. ✅ Redémarre avec le nouveau code

**C'est la méthode la plus simple et recommandée.**

---

## Méthode 2 : Via l'interface Railway

1. Allez sur https://railway.app
2. Connectez-vous à votre compte
3. Sélectionnez votre projet
4. Cliquez sur le service Next.js
5. Cliquez sur les **3 points (⋯)** → **Restart**

Le service redémarrera avec le code actuel.

---

## Méthode 3 : Via Railway CLI (si installé)

```bash
# Installer Railway CLI (si pas déjà fait)
npm i -g @railway/cli

# Se connecter
railway login

# Lister vos projets
railway list

# Redémarrer un service
railway restart
```

---

## Méthode 4 : Forcer un redéploiement

Si vous voulez forcer un redéploiement sans modification de code :

```bash
# Faire un commit vide qui déclenche un redéploiement
git commit --allow-empty -m "Force redeploy"
git push origin main
```

---

## Vérifier que c'est bien redémarré

1. **Dans Railway** : Regardez les logs du service
   - Vous devriez voir les logs de démarrage de Next.js
   - "Ready in XXXms"

2. **Dans votre application** :
   - Ouvrez votre URL de production
   - Rechargez la page (Ctrl+Shift+R ou Cmd+Shift+R)
   - Les nouvelles modifications devraient être visibles

---

## Important : Build vs Dev

En production, Next.js :
- ✅ Fait un **build** (`next build`) avant de démarrer
- ✅ Lance le serveur optimisé (`next start`)
- ✅ Met en cache les pages statiques

Contrairement au dev (`next dev`) qui :
- ✅ Recompile à chaque requête
- ✅ Hot reload automatique
- ✅ Pas de cache

**En production, le cache peut prendre quelques minutes à se vider. Si les modifications ne s'affichent pas immédiatement, c'est normal.**

---

## Configuration Railway

Railway détecte automatiquement Next.js et utilise généralement :

```json
{
  "buildCommand": "npm run build",
  "startCommand": "npm start",
  "watchPatterns": []
}
```

Vous n'avez généralement **rien à configurer** - Railway détecte automatiquement Next.js dans votre `package.json`.

---

## Logs en production

Pour voir les logs en temps réel :

1. **Via l'interface Railway** :
   - Cliquez sur votre service Next.js
   - Onglet "Deployments" ou "Logs"

2. **Via Railway CLI** :
   ```bash
   railway logs --follow
   ```

---

## Résumé

Pour redémarrer en production :
1. ✅ **Le plus simple** : `git push` (déploiement automatique)
2. ✅ **Via interface** : Railway → Service → Restart
3. ✅ **Forcer** : Commit vide + push

**Les modifications sont maintenant déployées sur Railway avec votre dernier `git push`.**


