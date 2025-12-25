# ✅ Migrations appliquées manuellement en production

## 📋 Migrations appliquées le 25/12/2025

### 1. Colonnes `users` - Account deletion grace period
**Migration** : `8647e85819cb_add_account_deletion_grace_period.py`

Colonnes ajoutées :
- ✅ `deletion_requested_at` (TIMESTAMP WITH TIME ZONE)
- ✅ `deletion_scheduled_at` (TIMESTAMP WITH TIME ZONE)
- ✅ Index `ix_users_deletion_scheduled_at`

### 2. Colonnes `clients` - Adresse géographique
**Migration** : `add_city_postal_code_country_siret_to_clients.py`

Colonnes ajoutées :
- ✅ `city` (VARCHAR(100))
- ✅ `postal_code` (VARCHAR(20))
- ✅ `country` (VARCHAR(100))
- ✅ `siret` (VARCHAR(14))

## ⚠️ Note importante

Ces migrations ont été appliquées **manuellement** car la base de données de production avait été "stampée" à `add_onboarding_fields` sans que toutes les migrations intermédiaires soient réellement exécutées.

## 🔍 Vérification

Pour vérifier que tout est correct :

```bash
cd backend
export DATABASE_URL="postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

# Vérifier les colonnes users
python3 -c "
import psycopg2
from urllib.parse import urlparse, unquote
import os

db_url = os.environ['DATABASE_URL']
parsed = urlparse(db_url)
conn = psycopg2.connect(
    host=parsed.hostname, port=parsed.port,
    database=parsed.path[1:], user=parsed.username,
    password=unquote(parsed.password)
)
conn.set_session(autocommit=True)
cur = conn.cursor()

# Users
cur.execute(\"\"\"
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name IN ('deletion_requested_at', 'deletion_scheduled_at')
\"\"\")
print('Users:', [r[0] for r in cur.fetchall()])

# Clients
cur.execute(\"\"\"
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'clients' 
    AND column_name IN ('city', 'postal_code', 'country', 'siret')
\"\"\")
print('Clients:', [r[0] for r in cur.fetchall()])

cur.close()
conn.close()
"
```

## 🚀 Prochaines étapes

1. **Redémarrer le service Railway** pour que les changements prennent effet
2. **Vérifier les logs** pour s'assurer qu'il n'y a plus d'erreurs
3. **Tester l'application** pour confirmer que tout fonctionne

## 📝 Historique

- **25/12/2025 18:XX** : Ajout des colonnes `users.deletion_requested_at` et `users.deletion_scheduled_at`
- **25/12/2025 18:XX** : Ajout des colonnes `clients.city`, `clients.postal_code`, `clients.country`, `clients.siret`

