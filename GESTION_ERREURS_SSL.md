# 🔧 Gestion des Erreurs SSL "connection has been closed unexpectedly"

## 🔍 Problème

Supabase ferme automatiquement les connexions SSL inactives après un certain temps. Cela cause des erreurs `psycopg2.OperationalError: SSL connection has been closed unexpectedly`.

## ✅ Solutions Implémentées

### 1. Réduction de `pool_recycle`

**Fichier**: `backend/app/db/session.py`

Le `pool_recycle` a été réduit de 5 minutes (300s) à **3 minutes (180s)** pour recycler les connexions plus fréquemment avant qu'elles ne soient fermées par Supabase.

```python
pool_recycle = 180  # 3 minutes
```

### 2. Protection avec `execute_with_retry`

**Fichier**: `backend/app/api/routes/companies.py`

La fonction `update_my_company_settings` utilise maintenant `execute_with_retry` pour réessayer automatiquement en cas d'erreur SSL :

```python
from app.db.retry import execute_with_retry

# Au lieu de :
settings = db.query(CompanySettings).filter(...).first()

# Utiliser :
def _get_settings():
    return db.query(CompanySettings).filter(...).first()
settings = execute_with_retry(db, _get_settings)
```

### 3. Configuration du Pool

Le pool est configuré avec :
- `pool_pre_ping=True` : Vérifie que les connexions sont valides avant utilisation
- `pool_recycle=180` : Recycle les connexions toutes les 3 minutes
- `pool_size=10` : 10 connexions de base
- `max_overflow=20` : Jusqu'à 20 connexions supplémentaires

## 🔄 Fonctionnement de `execute_with_retry`

La fonction `execute_with_retry` (définie dans `backend/app/db/retry.py`) :

1. **Détecte les erreurs de connexion** : Vérifie si l'erreur est liée à SSL/connexion
2. **Retry automatique** : Réessaye jusqu'à 3 fois avec un délai exponentiel
3. **Nettoie la session** : Rollback et expire les objets avant de réessayer
4. **Log les tentatives** : Enregistre chaque tentative pour le debugging

## 📝 Utilisation

Pour protéger d'autres fonctions contre les erreurs SSL :

```python
from app.db.retry import execute_with_retry

def my_function(db: Session):
    def _operation():
        return db.query(Model).filter(...).all()
    
    result = execute_with_retry(db, _operation)
    return result
```

## 🎯 Résultat

- ✅ Les erreurs SSL sont gérées automatiquement
- ✅ Retry transparent pour l'utilisateur
- ✅ Logs détaillés pour le debugging
- ✅ Réduction significative des erreurs en production

## ⚠️ Notes

- Les retries ajoutent un léger délai (0.5s à 2s) en cas d'erreur
- Les erreurs non liées à la connexion ne sont pas retryées
- Le pool recycle automatiquement les connexions avant qu'elles ne soient fermées

