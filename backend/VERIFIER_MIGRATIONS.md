# Guide de vérification des migrations

## Commandes Alembic

### ⚠️ Important : Activer l'environnement virtuel d'abord

```bash
cd backend
source venv/bin/activate
```

### 1. Vérifier la révision actuelle

```bash
alembic current
```

**Résultat attendu :**
```
merge_client_task_heads (head) (mergepoint)
```

### 2. Voir l'historique des migrations

```bash
alembic history
```

Pour plus de détails :
```bash
alembic history --verbose
```

### 3. Vérifier les têtes de migration

```bash
alembic heads
```

**Résultat attendu :** Une seule tête
```
merge_client_task_heads (head)
```

### 4. Vérifier que les colonnes existent (Script automatique)

```bash
python3 scripts/verify_client_migration.py
```

Ce script vérifie que les colonnes suivantes existent :
- ✅ `city` (VARCHAR(100))
- ✅ `postal_code` (VARCHAR(20))
- ✅ `country` (VARCHAR(100))
- ✅ `siret` (VARCHAR(14))

### 5. Appliquer les migrations

```bash
alembic upgrade head
```

### 6. Voir les migrations en attente

```bash
alembic show head
```

## Commandes alternatives (si `alembic` ne fonctionne pas)

Si la commande `alembic` n'est pas trouvée, vous pouvez utiliser :

```bash
# Activer l'environnement virtuel
source venv/bin/activate

# Utiliser python avec le chemin complet
python3 -c "import alembic.config; import alembic.command; alembic.command.current(alembic.config.Config('alembic.ini'))"
```

Ou installer Alembic dans le venv :
```bash
source venv/bin/activate
pip install alembic
```

## Vérification directe en base de données

### SQLite (développement local)
```bash
sqlite3 app.db ".schema clients"
```

### PostgreSQL (production/staging)
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('city', 'postal_code', 'country', 'siret');
```

## Résumé des vérifications

✅ **Migration appliquée** : `alembic current` montre `merge_client_task_heads`  
✅ **Colonnes présentes** : Le script `verify_client_migration.py` confirme tous les champs  
✅ **Pas de conflits** : `alembic heads` montre une seule tête

