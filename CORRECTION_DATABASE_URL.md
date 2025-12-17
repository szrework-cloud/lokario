# 🔧 Correction : DATABASE_URL incorrecte

## ⚠️ Problème détecté

Vous avez utilisé :
```
https://ufnncdjjzkbsemtrxjep.supabase.co
```

**Ce n'est pas le bon format !** C'est l'URL API Supabase, pas la DATABASE_URL PostgreSQL.

## ✅ Solution : Format correct de DATABASE_URL

La DATABASE_URL doit être au format PostgreSQL :
```
postgresql://postgres.XXX:mot_de_passe@aws-0-REGION.pooler.supabase.com:6543/postgres
```

## 📝 Comment obtenir la bonne DATABASE_URL

### Dans Supabase Dashboard :

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Votre projet → **Settings** (⚙️) → **Database**
3. Section **"Connection string"**
4. Onglet **"URI"** (pas "Connection pooling" !)
5. Copiez l'URL complète qui ressemble à :
   ```
   postgresql://postgres.abcdefghijklmnop:VOTRE_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```

## 🚀 Commandes correctes

```bash
# 1. Sortir de l'état quote actuel (appuyez sur Ctrl+C)

# 2. Vous êtes déjà dans backend/, c'est bon

# 3. Exportez la VRAIE DATABASE_URL (remplacez par celle de Supabase)
export DATABASE_URL="postgresql://postgres.XXX:mot_de_passe@aws-0-REGION.pooler.supabase.com:6543/postgres"

# 4. Test d'abord
python scripts/enable_rls_supabase.py --dry-run

# 5. Puis application réelle
python scripts/enable_rls_supabase.py
```

## ⚠️ Différence importante

- ❌ **URL API** : `https://xxx.supabase.co` → Pour les appels API
- ✅ **DATABASE_URL** : `postgresql://postgres.XXX:...` → Pour se connecter à PostgreSQL directement

Le script RLS a besoin de la DATABASE_URL PostgreSQL, pas de l'URL API !
