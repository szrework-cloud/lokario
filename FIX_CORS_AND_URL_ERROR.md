# 🔧 Fix : Erreur CORS + URL incorrecte

## ⚠️ Deux problèmes détectés

### Problème 1 : URL incorrecte

L'URL utilisée est :
```
https://lokario-production.up.railway.app/docs/auth/register
```

**C'est INCORRECT** - il y a `/docs/` en trop !

L'URL correcte devrait être :
```
https://lokario-production.up.railway.app/auth/register
```

### Problème 2 : Erreur CORS

Le backend n'autorise pas `https://www.lokario.fr` dans les origines CORS.

## ✅ Solutions

### Solution 1 : Vérifier l'URL dans le code frontend

Le problème vient probablement de `NEXT_PUBLIC_API_URL` qui contient `/docs` ou d'une construction d'URL incorrecte.

**Dans Vercel → Environment Variables :**

Assurez-vous que `NEXT_PUBLIC_API_URL` est :
```
https://lokario-production.up.railway.app
```

**⚠️ IMPORTANT :**
- ✅ PAS de slash `/` à la fin
- ✅ PAS de `/docs` dans l'URL
- ✅ Juste l'URL de base : `https://lokario-production.up.railway.app`

### Solution 2 : Vérifier la configuration CORS dans le backend

Le backend doit autoriser `https://www.lokario.fr` dans les origines.

Vérifiez dans `backend/app/main.py` que `www.lokario.fr` est dans la liste des origines autorisées :

```python
if settings.ENVIRONMENT.lower() in ["production", "prod"]:
    origins = [
        "https://lokario.fr",
        "https://www.lokario.fr",  # ✅ Doit être présent
    ]
```

Si ce n'est pas le cas, ajoutez-le et redéployez le backend.

## 🔍 Vérification

### Test 1 : Vérifier l'URL backend

Ouvrez dans votre navigateur :
```
https://lokario-production.up.railway.app/docs
```
→ Doit afficher la documentation Swagger (sans `/auth/register`)

### Test 2 : Vérifier que l'endpoint existe

Ouvrez :
```
https://lokario-production.up.railway.app/auth/register
```
→ Devrait retourner une erreur de méthode (405 ou 422), mais PAS d'erreur CORS si vous testez depuis le navigateur

### Test 3 : Vérifier CORS

Ouvrez la console du navigateur (F12) sur `https://www.lokario.fr` et vérifiez :
- Si l'erreur persiste après avoir corrigé l'URL, c'est un problème CORS
- Si l'erreur disparaît, c'était juste le problème d'URL

## 📋 Actions à faire

1. ✅ **Vérifier `NEXT_PUBLIC_API_URL` dans Vercel**
   - Value : `https://lokario-production.up.railway.app` (sans slash, sans /docs)

2. ✅ **Vérifier CORS dans le backend**
   - Vérifier que `https://www.lokario.fr` est dans les origines autorisées
   - Si ce n'est pas le cas, l'ajouter et redéployer

3. ✅ **Redéployer Vercel**
   - Après avoir corrigé `NEXT_PUBLIC_API_URL`

4. ✅ **Redéployer Railway backend**
   - Si vous avez modifié la configuration CORS

## 🎯 Résumé

**Problème 1 : URL incorrecte**
- L'URL contient `/docs/auth/register` au lieu de `/auth/register`
- Solution : Vérifier que `NEXT_PUBLIC_API_URL` ne contient pas `/docs`

**Problème 2 : CORS**
- `https://www.lokario.fr` n'est pas autorisé
- Solution : Ajouter `https://www.lokario.fr` dans les origines CORS du backend

Une fois les deux corrigés, ça devrait fonctionner ! 🎯
