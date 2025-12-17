# ✅ Vérification : Tout est prêt pour lokario.fr ?

## 📋 Checklist avant de tester lokario.fr

### 1. ✅ Backend Railway configuré
- ✅ DATABASE_URL configurée
- ✅ JWT_SECRET_KEY configurée
- ✅ SMTP configuré
- ✅ OPENAI_API_KEY configurée (optionnel)
- ✅ Backend déployé et fonctionne

### 2. ⚠️ Frontend Vercel - Vérifications importantes

#### A. Backend URL configurée dans Vercel

Le frontend doit connaître l'URL du backend Railway.

1. **Vercel Dashboard** → Votre projet → Settings → Environment Variables
2. Cherchez `NEXT_PUBLIC_API_URL`
3. Vérifiez qu'elle pointe vers votre backend Railway

**Format :**
```
https://votre-backend-railway.railway.app
```

**Comment trouver l'URL de votre backend Railway :**
1. Railway Dashboard → Votre service backend
2. Onglet "Settings" → "Networking"
3. Cherchez "Public Domain" ou "Generate Domain"
4. Copiez l'URL (ex: `votre-backend-production.up.railway.app`)

#### B. Domain lokario.fr configuré dans Vercel

1. **Vercel Dashboard** → Votre projet → Settings → Domains
2. Vérifiez que `lokario.fr` (et `www.lokario.fr`) est configuré
3. Vérifiez les DNS si nécessaire

### 3. ⚠️ Configuration DNS

Si vous utilisez un domaine personnalisé (`lokario.fr`) :

1. Vérifiez que les DNS pointent vers Vercel
2. Types de DNS à configurer :
   - `A` record → IP Vercel
   - `CNAME` record → `cname.vercel-dns.com`
   - Ou suivre les instructions Vercel

## 🔍 Comment tester

### Étape 1 : Tester le backend directement

1. Ouvrez votre URL Railway backend dans le navigateur :
   ```
   https://votre-backend-railway.railway.app/docs
   ```
2. Si vous voyez la documentation Swagger FastAPI → ✅ Backend fonctionne

### Étape 2 : Tester le frontend

1. Allez sur `https://lokario.fr`
2. Vérifiez que :
   - ✅ La page se charge
   - ✅ Vous pouvez vous connecter
   - ✅ Les appels API fonctionnent (ouvrez la console du navigateur pour voir les erreurs)

### Étape 3 : Vérifier les erreurs

**Console du navigateur (F12) :**

Si vous voyez des erreurs comme :
- ❌ `Failed to fetch` ou `Network error`
  → Problème : `NEXT_PUBLIC_API_URL` mal configurée dans Vercel

- ❌ `CORS error`
  → Problème : Backend Railway doit autoriser le domaine lokario.fr dans CORS

- ❌ `401 Unauthorized` ou problèmes d'authentification
  → Problème : JWT_SECRET_KEY ou configuration auth

## 🔧 Si ça ne fonctionne pas

### Problème : Frontend ne peut pas se connecter au backend

**Solution :**
1. Vérifiez `NEXT_PUBLIC_API_URL` dans Vercel
2. Vérifiez que l'URL Railway backend est correcte
3. Vérifiez que le backend Railway est bien déployé et fonctionne

### Problème : Erreur CORS

**Solution :** Vérifiez dans `backend/app/main.py` que `lokario.fr` est dans les origines autorisées :

```python
if settings.ENVIRONMENT.lower() in ["production", "prod"]:
    origins = [
        "https://lokario.fr",
        "https://www.lokario.fr",
    ]
```

### Problème : Domain not found

**Solution :** Vérifiez la configuration DNS et le domaine dans Vercel

## ✅ Résumé

Pour que lokario.fr fonctionne, il faut :

1. ✅ Backend Railway déployé et fonctionnel
2. ✅ Frontend Vercel déployé
3. ✅ `NEXT_PUBLIC_API_URL` dans Vercel pointe vers Railway backend
4. ✅ Domain `lokario.fr` configuré dans Vercel
5. ✅ DNS configurés correctement
6. ✅ CORS autorise `lokario.fr` dans le backend

## 🎯 Test rapide

**Testez d'abord :**
1. Ouvrez `https://votre-backend.railway.app/docs` → Doit afficher Swagger
2. Ouvrez `https://lokario.fr` → Doit afficher le site
3. Essayez de vous connecter → Doit fonctionner

Si ces 3 étapes fonctionnent, c'est bon ! 🎉
