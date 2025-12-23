# Vérifier la migration via l'API (Sans Railway CLI)

## ✅ Solution la plus simple

Vous pouvez maintenant vérifier l'état de la migration directement via l'API, sans avoir besoin de Railway CLI ou d'accès à la base de données.

## 🌐 Endpoint API

### URL
```
GET /quotes/migration-status
```

### Exemples

#### Sur staging
```
https://lokario-staging.up.railway.app/quotes/migration-status
```

#### Sur production
```
https://votre-domaine.com/quotes/migration-status
```

#### Localement
```
http://localhost:8000/quotes/migration-status
```

## 📊 Réponses possibles

### ✅ Migration appliquée correctement
```json
{
  "status": "ok",
  "message": "La migration est appliquée correctement.",
  "action": null,
  "constraints": {
    "global_index_exists": false,
    "composite_constraint_exists": true
  }
}
```

### ❌ Migration non appliquée
```json
{
  "status": "error",
  "message": "La migration n'a PAS été appliquée. La contrainte globale existe encore.",
  "action": "Exécutez: alembic upgrade head",
  "constraints": {
    "global_index_exists": true,
    "composite_constraint_exists": false
  }
}
```

### ⚠️ État intermédiaire
```json
{
  "status": "warning",
  "message": "Les deux contraintes existent. La contrainte globale doit être supprimée.",
  "action": "Supprimez la contrainte globale manuellement",
  "constraints": {
    "global_index_exists": true,
    "composite_constraint_exists": true
  }
}
```

## 🚀 Comment utiliser

### Option 1 : Navigateur
Ouvrez simplement l'URL dans votre navigateur :
```
https://lokario-staging.up.railway.app/quotes/migration-status
```

### Option 2 : curl
```bash
curl https://lokario-staging.up.railway.app/quotes/migration-status
```

### Option 3 : JavaScript (dans la console du navigateur)
```javascript
fetch('https://lokario-staging.up.railway.app/quotes/migration-status')
  .then(r => r.json())
  .then(data => console.log(data))
```

### Option 4 : Postman / Insomnia
1. Créez une nouvelle requête GET
2. URL : `https://lokario-staging.up.railway.app/quotes/migration-status`
3. Envoyez la requête

## ✅ Avantages

- ✅ Pas besoin de Railway CLI
- ✅ Pas besoin d'accès à la base de données
- ✅ Accessible depuis n'importe où
- ✅ Fonctionne depuis le navigateur
- ✅ Pas d'authentification requise (pour faciliter la vérification)

## 📝 Note

Cet endpoint est accessible sans authentification pour faciliter la vérification. Si vous souhaitez le sécuriser, vous pouvez ajouter `Depends(get_current_active_user)` à la fonction.

