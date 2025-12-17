# 🔒 Guide : Activer RLS sur Supabase

## 📋 Ce que fait le script

Le script `backend/scripts/enable_rls_supabase.py` va :
1. ✅ Se connecter à votre base Supabase
2. ✅ Lister toutes vos tables
3. ✅ Activer RLS sur chaque table
4. ✅ Créer des politiques qui permettent au `service_role` (votre backend) de continuer à fonctionner

## 🚀 Utilisation

### Étape 1 : Test (dry-run)

**Recommandé** : Testez d'abord sans modifier la base :

```bash
cd backend
export DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@VOTRE_HOST:5432/postgres"
python scripts/enable_rls_supabase.py --dry-run
```

Cela va vous montrer ce qui serait fait **sans modifier** la base de données.

### Étape 2 : Application réelle

Une fois que vous êtes sûr, lancez sans `--dry-run` :

```bash
cd backend
export DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@VOTRE_HOST:5432/postgres"
python scripts/enable_rls_supabase.py
```

Le script va :
- ✅ Activer RLS sur toutes les tables
- ✅ Créer les politiques nécessaires
- ✅ Vous demander confirmation avant d'appliquer

### Alternative : Via Railway

Si votre DATABASE_URL est déjà dans Railway, vous pouvez l'exécuter depuis Railway :

1. Connectez-vous à votre service Railway
2. Ouvrez un terminal
3. Exécutez :
   ```bash
   cd /app
   python scripts/enable_rls_supabase.py --dry-run  # D'abord en test
   python scripts/enable_rls_supabase.py            # Puis pour de vrai
   ```

## 🔍 Récupérer votre DATABASE_URL depuis Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Database**
4. Trouvez **Connection string** → **URI**
5. Copiez l'URL (elle ressemble à : `postgresql://postgres.xxx:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`)

**⚠️ Important** : Utilisez l'URL avec le mot de passe, pas l'URL masquée.

## ✅ Vérification après activation

Après avoir exécuté le script, vérifiez dans Supabase :

1. Allez dans **Authentication** → **Policies**
2. Vous devriez voir toutes vos tables avec RLS activé
3. Chaque table devrait avoir une politique `service_role_all_access_<table_name>`

## 🛡️ Ce que ça protège

Une fois RLS activé :
- ✅ Vos tables sont protégées contre les accès non autorisés
- ✅ Si quelqu'un expose votre DATABASE_URL par erreur, il ne pourra pas accéder aux données sans service_role
- ✅ Votre backend continue de fonctionner grâce aux politiques service_role
- ✅ Protection supplémentaire même si vous n'utilisez pas Supabase client

## ⚠️ Important

- ✅ **Votre backend continuera de fonctionner** car il utilise service_role
- ✅ Les politiques créées permettent au service_role d'accéder à tout
- ✅ Si vous avez besoin de désactiver RLS plus tard, utilisez : `ALTER TABLE "table_name" DISABLE ROW LEVEL SECURITY;`

## 🔗 Scripts liés

- `backend/scripts/create_tables_supabase.py` : Crée les tables
- `backend/scripts/enable_rls_supabase.py` : Active RLS (ce script)
