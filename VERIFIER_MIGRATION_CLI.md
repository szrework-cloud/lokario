# Vérifier la migration avec le script CLI

## 🚀 Utilisation

### En local (pour tester)
```bash
cd "/Users/glr_adem/Documents/B2B SAAS"
python check_migration_cli.py
```

### Sur Railway (pour vérifier la base de données de staging)
```bash
railway run python check_migration_cli.py
```

## 📊 Résultats possibles

### ✅ Tout est bon
```
✅ TOUT EST BON: La migration est appliquée correctement
```

### ❌ Problème
```
❌ PROBLÈME: La migration n'a PAS été appliquée
   → Exécutez: alembic upgrade head
```

### ⚠️ État intermédiaire
```
⚠️  ATTENTION: Les deux contraintes existent
   → Supprimez la contrainte globale manuellement
```

## 🔍 Détection automatique

Le script détecte automatiquement :
- ✅ Si vous êtes sur PostgreSQL (Railway/Supabase)
- ⚠️ Si vous êtes sur SQLite (local)

Si vous voyez "SQLite", exécutez le script sur Railway pour vérifier la vraie base de données.

