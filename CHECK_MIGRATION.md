# Vérifier si la migration est appliquée

## Méthode rapide

Exécutez simplement :

```bash
cd backend
python scripts/check_quotes_migration.py
```

## Sur Railway

```bash
railway run python backend/scripts/check_quotes_migration.py
```

## Résultats possibles

### ✅ Tout est bon
```
✅ TOUT EST BON: La migration est appliquée correctement
```

### ❌ Problème détecté
```
❌ PROBLÈME: La migration n'a PAS été appliquée
   → Exécutez: alembic upgrade head
```

### ⚠️ État intermédiaire
```
⚠️  ATTENTION: Les deux contraintes existent
   → Supprimez la contrainte globale manuellement
```

## Alternative : Vérification SQL directe

Si vous préférez vérifier directement dans la base de données :

```sql
-- Vérifier si l'index global existe (ne devrait PAS exister)
SELECT indexname FROM pg_indexes 
WHERE tablename = 'quotes' AND indexname = 'ix_quotes_number';
-- Résultat attendu: 0 lignes

-- Vérifier si la contrainte composite existe (devrait exister)
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'quotes' AND constraint_name = 'uq_quotes_company_number';
-- Résultat attendu: 1 ligne
```

