# Applier la migration sur Railway

## 🚀 Méthode 1 : Via Railway Dashboard (La plus simple)

### Étape 1 : Ouvrir Railway Dashboard
1. Allez sur [railway.app](https://railway.app)
2. Connectez-vous avec votre compte
3. Ouvrez votre projet **"lokario"**
4. Cliquez sur votre service **backend**

### Étape 2 : Ouvrir le Shell
1. Dans le service backend, cliquez sur l'onglet **"Deployments"**
2. Cliquez sur le dernier déploiement (le plus récent)
3. Cliquez sur le bouton **"Shell"** (ou **"Open Shell"**)

### Étape 3 : Exécuter la migration
Dans le shell qui s'ouvre, tapez :

```bash
cd backend
alembic upgrade head
```

**OU** si vous êtes déjà dans le bon répertoire :

```bash
alembic upgrade head
```

### Étape 4 : Vérifier le résultat
Vous devriez voir quelque chose comme :
```
INFO  [alembic.runtime.migration] Running upgrade ... -> fix_quotes_number_unique, fix_quotes_number_unique_constraint
✅ Index unique global ix_quotes_number supprimé
✅ Contrainte unique composite (company_id, number) créée
```

## 🚀 Méthode 2 : Via Railway CLI

### Étape 1 : Lier le projet (si pas déjà fait)
```bash
cd "/Users/glr_adem/Documents/B2B SAAS"
railway link
```
Sélectionnez votre projet "lokario" dans la liste.

### Étape 2 : Exécuter la migration
```bash
railway run alembic upgrade head
```

**OU** si vous devez aller dans le dossier backend :

```bash
railway run sh -c "cd backend && alembic upgrade head"
```

## ✅ Vérifier que ça a fonctionné

### Option 1 : Via l'API (Le plus simple)
Ouvrez dans votre navigateur :
```
https://lokario-staging.up.railway.app/quotes/migration-status
```

Vous devriez voir :
```json
{
  "status": "ok",
  "message": "La migration est appliquée correctement."
}
```

### Option 2 : Via le Shell Railway
Dans le shell Railway, exécutez :
```bash
alembic current
```

Vous devriez voir la version de migration actuelle, qui devrait inclure `fix_quotes_number_unique`.

## 🔍 En cas de problème

### Si la commande `alembic` n'est pas trouvée
```bash
# Vérifier que vous êtes dans le bon répertoire
pwd
# Devrait afficher quelque chose comme /app ou /app/backend

# Si vous êtes à la racine, allez dans backend
cd backend

# Réessayer
alembic upgrade head
```

### Si la migration échoue
1. **Vérifier les logs** dans Railway Dashboard
2. **Vérifier l'état actuel** :
   ```bash
   alembic current
   ```
3. **Voir l'historique** :
   ```bash
   alembic history
   ```

### Si vous voyez "Multiple head revisions"
Cela signifie qu'il y a plusieurs branches de migration. Exécutez :
```bash
alembic merge heads -m "merge heads"
alembic upgrade head
```

## 📝 Notes importantes

- ⚠️ **Sauvegarde** : Railway fait automatiquement des sauvegardes, mais vous pouvez aussi en faire une manuelle depuis Supabase Dashboard
- ⏱️ **Durée** : La migration prend généralement moins de 10 secondes
- ✅ **Pas de downtime** : La migration est rapide et ne bloque pas l'application
- 🔄 **Rétrocompatibilité** : Les devis existants ne sont pas affectés

## 🎯 Après la migration

Une fois la migration appliquée :
1. ✅ Vérifiez avec l'endpoint API : `/quotes/migration-status`
2. ✅ Testez la création d'un devis dans l'application
3. ✅ Vérifiez que vous pouvez créer des devis avec le même numéro pour différentes entreprises
