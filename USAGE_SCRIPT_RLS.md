# 🔐 Utiliser le script RLS avec vos identifiants

## ⚠️ SÉCURITÉ IMPORTANTE

**Ne partagez JAMAIS vos identifiants publiquement !**

Si vous avez partagé vos identifiants par erreur :
1. Changez immédiatement votre mot de passe dans Supabase
2. Régénérez vos clés d'API si nécessaire

## 📝 Construire votre DATABASE_URL

Votre DATABASE_URL doit avoir ce format :

```
postgresql://postgres.XXX:VOTRE_MOT_DE_PASSE@aws-0-REGION.pooler.supabase.com:6543/postgres
```

### Exemple avec vos informations :

1. **Identifiant** : `ADEM-2006*gurler` → C'est probablement votre projet/ref
2. **Mot de passe** : `ufnncdjjzkbsemtrxjep` → C'est votre mot de passe

### Pour obtenir la DATABASE_URL complète :

Vous devez aller dans Supabase Dashboard :
1. Settings → Database
2. Connection string → URI
3. Vous verrez l'URL complète avec l'hôte

**L'URL ressemblera à :**
```
postgresql://postgres.abcdefghijklmnop:ufnncdjjzkbsemtrxjep@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

## 🚀 Exécuter le script

### Option 1 : Depuis votre machine locale

```bash
cd backend

# Définir la variable d'environnement (remplacez par votre URL complète)
export DATABASE_URL="postgresql://postgres.XXX:ufnncdjjzkbsemtrxjep@aws-0-REGION.pooler.supabase.com:6543/postgres"

# Test d'abord (recommandé)
python scripts/enable_rls_supabase.py --dry-run

# Puis application réelle
python scripts/enable_rls_supabase.py
```

### Option 2 : Depuis Railway (si vous avez déjà configuré DATABASE_URL)

Si vous avez déjà `DATABASE_URL` dans Railway :

1. Railway Dashboard → Votre service backend → Variables
2. La DATABASE_URL devrait déjà être là
3. Connectez-vous au terminal Railway
4. Exécutez :
   ```bash
   cd /app
   python scripts/enable_rls_supabase.py --dry-run  # Test
   python scripts/enable_rls_supabase.py            # Application
   ```

## 🔍 Vérifier que ça fonctionne

Après l'exécution, vérifiez dans Supabase Dashboard :
- Authentication → Policies
- Toutes vos tables devraient avoir RLS activé
- Chaque table devrait avoir une politique `service_role_all_access_<table_name>`

## ⚠️ Action de sécurité recommandée

Comme vous avez partagé vos identifiants ici, je recommande de :

1. **Changer votre mot de passe Supabase** :
   - Settings → Database → Reset database password
   - Notez le nouveau mot de passe
   - Mettez à jour DATABASE_URL partout où vous l'utilisez

2. **Ne plus partager vos identifiants** dans les conversations
