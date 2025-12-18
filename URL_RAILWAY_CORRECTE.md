# ❌ URL Incorrecte : railway.internal

## ⚠️ Problème

Vous utilisez :
```
https://lokario.railway.internal
```

**Cette URL ne fonctionnera PAS** car :
- `.railway.internal` = URL **interne** Railway
- Accessible UNIQUEMENT depuis d'autres services Railway
- **PAS accessible** depuis internet (donc pas depuis votre navigateur ou Vercel)

## ✅ URL Correcte

Vous devez utiliser une URL qui se termine par :
- `.railway.app` 
- ou `.up.railway.app`

**Exemples d'URLs correctes :**
```
https://lokario-production.up.railway.app
https://lokario-backend.railway.app
https://lokario-production-eu.railway.app
```

**Format typique :**
```
https://[nom-projet]-[branche].up.railway.app
```

## 🔍 Comment trouver la bonne URL

### Dans Railway Dashboard :

1. **Railway Dashboard** → Votre service backend
2. Onglet **"Settings"** → **"Networking"** ou **"Domains"**
3. Cherchez **"Public Domain"** ou **"Generate Domain"**
4. Vous verrez une URL qui ressemble à :
   ```
   lokario-production.up.railway.app
   ```
   (SANS le `.internal`, avec `.railway.app` à la fin)

### Si vous ne voyez pas de domaine public :

1. Railway Dashboard → Service backend → Settings → Networking
2. Cherchez le bouton **"Generate Domain"** ou **"Create Public Domain"**
3. Cliquez dessus
4. Railway générera une URL publique
5. Copiez cette URL

## 📋 Ce qu'il faut mettre dans Vercel

### Dans Vercel → Environment Variables :

**Name :**
```
NEXT_PUBLIC_API_URL
```

**Value :**
```
https://votre-url-publique.railway.app
```

**Exemple :**
```
https://lokario-production.up.railway.app
```

**⚠️ Important :**
- ✅ Commence par `https://`
- ✅ Se termine par `.railway.app` (ou `.up.railway.app`)
- ❌ **PAS** `.railway.internal`

## 🔍 Comment vérifier

### Test 1 : Ouvrir l'URL dans votre navigateur

Essayez d'ouvrir cette URL dans votre navigateur :
```
https://lokario.railway.internal/docs
```
→ **Ça ne fonctionnera PAS** (erreur de connexion)

Maintenant essayez :
```
https://lokario-production.up.railway.app/docs
```
→ **Ça devrait fonctionner** (affiche la documentation Swagger)

### Test 2 : Vérifier dans Railway

Dans Railway Dashboard → Service backend → Settings → Networking :
- Si vous voyez une URL qui se termine par `.railway.app` → C'est la bonne
- Si vous voyez seulement `.railway.internal` → Vous devez générer un domaine public

## 🎯 Résumé

**❌ Incorrect :**
```
https://lokario.railway.internal
```

**✅ Correct :**
```
https://lokario-production.up.railway.app
(ou une autre URL qui se termine par .railway.app)
```

Allez dans Railway → Settings → Networking et cherchez l'URL qui se termine par `.railway.app`, pas `.internal` ! 🎯
