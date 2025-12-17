# 🔄 Correction : Container qui redémarre en boucle sur Railway

## ⚠️ Problème observé

Votre container démarre puis s'arrête rapidement, puis redémarre. Cela indique que Railway pense que l'application n'est pas en bonne santé.

## 🔍 Causes possibles

### 1. Health Check configuré incorrectement

Railway vérifie si votre application est "en vie" via un health check. Si le health check échoue, Railway redémarre le container.

### 2. Pas d'endpoint /health ou /ready

Railway cherche probablement un endpoint de health check qui n'existe pas ou qui ne répond pas correctement.

## ✅ Solutions

### Solution 1 : Vérifier/corriger le health check dans Railway

1. **Railway Dashboard → Service backend → Settings → Deploy**
2. Cherchez **"Health Check Path"**
3. Vérifiez qu'il pointe vers un endpoint qui existe :
   - `/docs` (documentation FastAPI - devrait fonctionner)
   - `/` (root - si vous avez un endpoint root)
   - `/health` (si vous avez créé cet endpoint)

### Solution 2 : Créer un endpoint /health dans FastAPI

Si vous n'avez pas d'endpoint health check, créez-en un dans `backend/app/main.py` :

```python
@app.get("/health")
async def health_check():
    """Health check endpoint for Railway"""
    return {"status": "ok", "service": "lokario-api"}
```

### Solution 3 : Désactiver le health check (temporaire)

Si vous voulez tester sans health check :

1. Railway Dashboard → Settings → Deploy
2. Laissez **"Health Check Path"** vide ou supprimez-le

## 📝 Actions à faire

### Immédiatement

1. **Vérifier le health check dans Railway**
   - Settings → Deploy → Health Check Path
   - Si c'est `/docs`, ça devrait fonctionner
   - Si c'est `/health`, créez cet endpoint (voir ci-dessus)

2. **Vérifier les logs pour des erreurs**
   - Si vous voyez des erreurs spécifiques, notez-les

### Recommandations

1. **Créer un endpoint /health** (bonne pratique)
2. **Configurer JWT_SECRET_KEY** en production (actuellement en valeur par défaut)
3. **Configurer SMTP** si vous envoyez des emails
4. **Configurer OPENAI_API_KEY** si vous utilisez les fonctionnalités IA

## ⚠️ Warnings observés (non critiques mais à corriger)

1. **JWT_SECRET_KEY en valeur par défaut**
   - ⚠️ **Important pour la production**
   - Ajoutez `JWT_SECRET_KEY` dans Railway Variables avec une clé sécurisée

2. **OPENAI_API_KEY non configurée**
   - OK si vous n'utilisez pas les fonctionnalités IA
   - Sinon, ajoutez-la dans Railway Variables

3. **SMTP non configuré**
   - OK si vous n'envoyez pas d'emails
   - Sinon, configurez les variables SMTP dans Railway

## 🎯 Prochaines étapes

1. ✅ Vérifier le health check dans Railway
2. ⏳ Créer un endpoint `/health` si nécessaire
3. ⏳ Configurer `JWT_SECRET_KEY` pour la production
4. ⏳ Activer RLS sur Supabase (optionnel mais recommandé)
