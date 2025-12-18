# 🔧 Fix : Erreur 405 sur /auth/register

## ⚠️ Problème

Vous voyez cette erreur :
```
lokario.railway.internal/auth/register:1  Failed to load resource: the server responded with a status of 405
```

## 🔍 Analyse

L'erreur **405 (Method Not Allowed)** signifie que :
1. L'endpoint existe mais n'accepte pas la méthode HTTP utilisée (GET vs POST)
2. **OU** l'URL est incorrecte (dans votre cas, c'est probablement ça)

### Problème détecté

L'URL utilisée est : `lokario.railway.internal`

**C'est une URL INTERNE Railway**, pas une URL publique ! Les URLs `.railway.internal` ne sont accessibles QUE depuis d'autres services Railway, pas depuis internet.

## ✅ Solution

### Étape 1 : Vérifier l'URL Railway publique

1. **Railway Dashboard** → Votre service backend
2. Onglet **"Settings"** → **"Networking"**
3. Cherchez **"Public Domain"** ou **"Generate Domain"**
4. Vous devriez voir une URL comme :
   ```
   votre-backend-production.up.railway.app
   ```
   ou
   ```
   votre-backend-production.railway.app
   ```

### Étape 2 : Configurer dans Vercel

1. **Vercel Dashboard** → Votre projet → Settings → Environment Variables
2. Cherchez `NEXT_PUBLIC_API_URL`
3. Si elle existe, modifiez-la
4. Si elle n'existe pas, créez-la
5. **Value** : Mettez l'URL publique Railway (avec `https://`)
   ```
   https://votre-backend-production.up.railway.app
   ```
6. ⚠️ **IMPORTANT** : L'URL doit commencer par `https://` et ne PAS contenir `.internal`
7. Sauvegardez

### Étape 3 : Redéployer Vercel

Après avoir modifié la variable d'environnement :
1. Vercel devrait redéployer automatiquement
2. Ou déclenchez un redéploiement manuel
3. Attendez que le déploiement se termine

## 🔍 Vérification

### Test 1 : Vérifier l'URL backend directement

Ouvrez dans votre navigateur :
```
https://votre-backend-production.up.railway.app/docs
```

Vous devriez voir la documentation Swagger FastAPI. Si ça fonctionne, votre backend est accessible publiquement.

### Test 2 : Vérifier dans les logs du navigateur

1. Ouvrez `https://lokario.fr`
2. Ouvrez la console du navigateur (F12)
3. Essayez de créer un compte
4. Regardez la requête dans l'onglet "Network"
5. L'URL devrait être :
   ```
   https://votre-backend-production.up.railway.app/auth/register
   ```
   **PAS** `lokario.railway.internal`

## 📋 Format correct de NEXT_PUBLIC_API_URL

**✅ Correct :**
```
https://votre-backend-production.up.railway.app
```

**❌ Incorrect :**
```
lokario.railway.internal
http://localhost:8000
votre-backend.railway.internal
```

## ⚠️ Si vous n'avez pas de domaine public Railway

Si vous ne voyez pas de domaine public dans Railway :

1. Railway Dashboard → Service backend → Settings → Networking
2. Cherchez **"Generate Domain"** ou **"Public Domain"**
3. Cliquez pour générer un domaine public
4. Copiez l'URL générée
5. Utilisez-la dans `NEXT_PUBLIC_API_URL` dans Vercel

## 🎯 Résumé

Le problème vient de `NEXT_PUBLIC_API_URL` qui pointe vers une URL interne Railway (`.railway.internal`) au lieu de l'URL publique.

**Solution :**
1. Trouvez l'URL publique Railway (dans Settings → Networking)
2. Mettez-la dans `NEXT_PUBLIC_API_URL` dans Vercel (avec `https://`)
3. Redéployez Vercel
4. Testez à nouveau

Une fois corrigé, l'erreur 405 devrait disparaître ! 🎯
