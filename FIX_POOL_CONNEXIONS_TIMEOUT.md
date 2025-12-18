# 🔧 Correction : Timeout du pool de connexions SQLAlchemy

## 🔴 Problème

Vous avez rencontré cette erreur :
```
sqlalchemy.exc.TimeoutError: QueuePool limit of size 5 overflow 10 reached, 
connection timed out, timeout 30.00
```

## 🔍 Cause

Le pool de connexions SQLAlchemy avait une configuration par défaut trop petite :
- **pool_size** : 5 connexions permanentes (par défaut)
- **max_overflow** : 10 connexions supplémentaires (par défaut)
- **Total maximum** : 15 connexions simultanées

Quand toutes les connexions sont occupées (15 requêtes simultanées), les nouvelles requêtes attendent 30 secondes puis échouent avec un timeout.

## ✅ Solution appliquée

J'ai configuré le pool de connexions pour PostgreSQL/Supabase avec des paramètres optimisés :

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,           # 10 connexions permanentes (au lieu de 5)
    max_overflow=20,        # 20 connexions supplémentaires (au lieu de 10)
    pool_timeout=30,        # 30 secondes d'attente
    pool_recycle=3600,      # Recycler les connexions après 1h (important pour Supabase)
    pool_pre_ping=True,     # Vérifier que les connexions sont vivantes avant utilisation
)
```

**Nouveau total** : **30 connexions maximum** (10 + 20) au lieu de 15.

## 📊 Paramètres expliqués

### `pool_size=10`
- Nombre de connexions **permanentes** maintenues ouvertes
- Augmenté de 5 à 10 pour supporter plus de requêtes simultanées

### `max_overflow=20`
- Nombre de connexions **supplémentaires** autorisées au-delà de `pool_size`
- Augmenté de 10 à 20
- Total maximum : 10 + 20 = **30 connexions simultanées**

### `pool_recycle=3600` (1 heure)
- **Crucial pour Supabase**
- Recycler les connexions après 1 heure
- Supabase ferme les connexions inactives après 1h, ce paramètre évite d'utiliser des connexions mortes

### `pool_pre_ping=True`
- Vérifier que la connexion est vivante avant de l'utiliser
- Si la connexion est morte, SQLAlchemy la recrée automatiquement
- **Important pour Supabase** qui peut fermer des connexions inactives

### `pool_timeout=30`
- Temps d'attente (en secondes) avant d'abandonner si toutes les connexions sont occupées
- 30 secondes est raisonnable (par défaut)

## ⚠️ Limites Supabase

### Transaction Pooler (recommandé)
- **Limite** : 100 connexions simultanées
- **Utilisé** : Pooler sur le port **6543**
- ✅ Notre configuration (30 max) est bien en dessous de la limite

### Direct Connection
- **Limite** : Variable selon le plan Supabase
- **Utilisé** : Port **5432**
- ⚠️ Plus restrictif

**Assurez-vous d'utiliser le Transaction Pooler** (`:6543`) dans votre `DATABASE_URL` :
```
postgresql://postgres.xxx:password@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
```

## 🔄 Si le problème persiste

### 1. Vérifier les connexions actives dans Supabase

Dans le dashboard Supabase :
- Allez dans **Database** → **Connection Pooling**
- Vérifiez le nombre de connexions actives

### 2. Augmenter encore le pool (si nécessaire)

Si vous avez vraiment beaucoup de trafic simultané :

```python
pool_size=15,        # Au lieu de 10
max_overflow=30,     # Au lieu de 20
# Total = 45 connexions (toujours en dessous de 100 pour Supabase)
```

### 3. Identifier les requêtes longues

Les requêtes qui prennent du temps gardent les connexions occupées. Vérifiez :
- Les endpoints qui font beaucoup de calculs
- Les requêtes SQL complexes
- Les boucles qui font plusieurs requêtes

### 4. Optimiser les requêtes

- Utiliser `.limit()` pour limiter les résultats
- Utiliser des index sur les colonnes fréquemment recherchées
- Éviter les `N+1 queries` (utiliser `.joinedload()` ou `.select_related()`)

## 📝 Monitoring

Pour surveiller l'utilisation du pool, vous pouvez ajouter ce logging :

```python
import logging
logger = logging.getLogger(__name__)

# Dans votre code, après une requête importante
logger.info(f"Pool stats: {engine.pool.size()} connections, {engine.pool.checkedout()} in use")
```

## ✅ Résultat attendu

Après cette correction :
- ✅ Plus de timeout sur les connexions
- ✅ Support jusqu'à **30 requêtes simultanées**
- ✅ Connexions recyclées automatiquement (évite les connexions mortes)
- ✅ Vérification automatique de la santé des connexions

---

**Date de correction** : Décembre 2024  
**Fichier modifié** : `backend/app/db/session.py`
