# Vérifier l'état de la migration quotes.number

## Vérification rapide

Pour vérifier si la migration a été appliquée correctement, exécutez :

```bash
cd backend
python scripts/verify_quotes_constraint.py
```

Ce script vérifie :
- ✅ La version Alembic actuelle
- ✅ L'état des contraintes (globale vs composite)
- ✅ Les données existantes pour détecter d'éventuels conflits
- ✅ Fournit un résumé avec les actions à prendre

## Résultats attendus

### ✅ État correct (migration appliquée)
```
✅ ÉTAT CORRECT:
   - La contrainte globale 'ix_quotes_number' n'existe plus
   - La contrainte composite 'uq_quotes_company_number' est active

✅ Tout est correctement configuré !
```

### ❌ Problème détecté (migration non appliquée)
```
❌ PROBLÈME DÉTECTÉ:
   - La contrainte globale 'ix_quotes_number' existe encore
   - La contrainte composite 'uq_quotes_company_number' n'existe pas

💡 ACTION REQUISE:
   Exécutez: alembic upgrade head
```

## Vérification manuelle via SQL

Si vous préférez vérifier manuellement :

```sql
-- Vérifier si l'index global existe (ne devrait pas exister)
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'quotes' 
AND indexname = 'ix_quotes_number';
-- Devrait retourner 0 lignes

-- Vérifier si la contrainte composite existe (devrait exister)
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'quotes' 
AND constraint_name = 'uq_quotes_company_number';
-- Devrait retourner 1 ligne

-- Vérifier la version Alembic
SELECT version_num FROM alembic_version;
-- Devrait inclure 'fix_quotes_number_unique' ou une version plus récente
```

## Test de création de devis

Après avoir vérifié que la migration est appliquée, testez la création d'un devis :

1. Créez un devis pour l'entreprise 1 avec le numéro `DEV-2025-001`
2. Créez un devis pour l'entreprise 2 avec le numéro `DEV-2025-001`
3. Les deux devis devraient être créés sans erreur ✅

Si vous obtenez une erreur `duplicate key value violates unique constraint "ix_quotes_number"`, la migration n'a pas été appliquée.

## Sur Railway

Pour vérifier sur Railway :

```bash
railway run python backend/scripts/verify_quotes_constraint.py
```

Ou via Railway Dashboard :
1. Allez dans votre projet Railway
2. Ouvrez le service backend
3. Cliquez sur "Shell"
4. Exécutez : `python backend/scripts/verify_quotes_constraint.py`

