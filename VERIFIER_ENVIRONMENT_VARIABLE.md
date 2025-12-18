# ⚠️ Vérifier la variable ENVIRONMENT dans Railway

## 🔍 Problème potentiel

Pour que CORS fonctionne correctement, le backend doit savoir qu'il est en production.

## ✅ Vérification

Dans Railway → Variables, cherchez :

**Name :** `ENVIRONMENT`
**Value :** `production` ou `prod`

Si cette variable n'existe pas ou a une autre valeur :
1. Railway → Variables → New Variable
2. Name : `ENVIRONMENT`
3. Value : `production`
4. Save

## 🎯 Pourquoi c'est important

Le code backend vérifie `ENVIRONMENT` pour décider quelles origines CORS autoriser :

```python
if settings.ENVIRONMENT.lower() in ["production", "prod"]:
    origins = [
        "https://lokario.fr",
        "https://www.lokario.fr",
    ]
```

Si `ENVIRONMENT` n'est pas `production` ou `prod`, le backend n'autorisera pas `lokario.fr` !

## 📋 Checklist complète

Pour que CORS fonctionne :
1. ✅ Variable `ENVIRONMENT` = `production` dans Railway
2. ✅ Backend redéployé après avoir ajouté la variable
3. ✅ `NEXT_PUBLIC_API_URL` ne contient PAS `/docs` dans Vercel
