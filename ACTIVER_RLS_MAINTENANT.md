# 🔒 Activer RLS maintenant

## 📋 Récapitulatif

Vous avez :
- ✅ DATABASE_URL configurée dans Railway
- ✅ Le script `enable_rls_supabase.py` prêt
- ⏳ RLS pas encore activé sur les tables Supabase

## 🚀 Comment activer RLS

### Option 1 : Depuis votre machine locale (Recommandé)

1. **Récupérer DATABASE_URL depuis Railway**

   Railway Dashboard → Service backend → Variables → `DATABASE_URL`
   - Cliquez sur l'icône 👁️ pour voir la valeur
   - **Utilisez l'URL avec pooler** (transaction pooler, port 6543)

2. **Exécuter le script**

   ```bash
   cd backend
   export DATABASE_URL="postgresql://postgres.xxx:mot_de_passe@aws-0-region.pooler.supabase.com:6543/postgres"
   python scripts/enable_rls_supabase.py --dry-run  # Test d'abord
   python scripts/enable_rls_supabase.py            # Puis application réelle
   ```

### Option 2 : Depuis Railway Terminal

Si vous préférez exécuter depuis Railway :

1. Railway Dashboard → Service backend
2. Ouvrez un terminal (si disponible)
3. Exécutez :
   ```bash
   cd /app
   python scripts/enable_rls_supabase.py --dry-run  # Test
   python scripts/enable_rls_supabase.py            # Application
   ```

## ⚠️ Important : Utiliser la bonne DATABASE_URL

Assurez-vous d'utiliser l'URL avec **transaction pooler** (port 6543) :

```
postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

**PAS** l'URL directe (port 5432).

## ✅ Après l'exécution

Le script va :
1. ✅ Activer RLS sur toutes vos tables
2. ✅ Créer des politiques qui permettent au service_role de continuer à fonctionner
3. ✅ Votre backend continuera de fonctionner normalement

## 🔍 Vérification dans Supabase

Après l'exécution, dans Supabase Dashboard :
1. Authentication → Policies
2. Vous devriez voir toutes vos tables avec RLS activé
3. Chaque table devrait avoir une politique `service_role_all_access_<table_name>`

## 📝 Exemple de commande complète

```bash
# Test d'abord (recommandé)
cd backend
export DATABASE_URL="postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
python scripts/enable_rls_supabase.py --dry-run

# Si le test est OK, appliquer pour de vrai
python scripts/enable_rls_supabase.py
```

**Note :** Remplacez par votre vraie URL avec pooler et votre région !

Une fois fait, vos tables seront protégées par RLS ! 🔒
