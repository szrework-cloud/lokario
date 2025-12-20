# Comment Obtenir la DATABASE_URL depuis Supabase

## 🎯 Méthode 1 : Via Supabase Dashboard (Recommandé)

### Pour Production :
1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet **production**
3. Allez dans **Settings** → **Database**
4. Scroll jusqu'à **Connection string**
5. Sélectionnez **"URI"** (pas "Session mode" ou "Transaction mode")
6. Copiez l'URL complète

### Format de l'URL :
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
```

**⚠️ Important :**
- Remplacez `[PASSWORD]` par votre vrai mot de passe
- Si le mot de passe contient des caractères spéciaux, encodez-les en URL :
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - `&` → `%26`
  - etc.

---

## 🎯 Méthode 2 : Via Connection Pooling

### Si vous utilisez le pooler (port 6543) :
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-eu-west-3.pooler.supabase.com:6543/postgres
```

### Si vous utilisez la connexion directe (port 5432) :
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-eu-west-3.pooler.supabase.com:5432/postgres
```

**Recommandation :** Utilisez le **pooler (6543)** pour pg_dump.

---

## 🔧 Exemple avec pg_dump

### Étape 1 : Obtenir l'URL
1. Supabase Dashboard → Settings → Database
2. Copier l'URL URI complète
3. Remplacez `[YOUR-PASSWORD]` par votre vrai mot de passe

### Étape 2 : Utiliser pg_dump
```bash
# Exemple (remplacez par votre vraie URL)
pg_dump "postgresql://postgres.abcdefghijklmnop:MonMotDePasse123@aws-1-eu-west-3.pooler.supabase.com:6543/postgres" \
  --schema-only \
  --no-owner \
  --no-acl \
  -f schema_prod.sql
```

---

## ⚠️ Si le mot de passe contient des caractères spéciaux

### Encoder le mot de passe en URL :
```bash
# Exemple : mot de passe = "Mon@Pass#123"
# Encodé : "Mon%40Pass%23123"

# Dans l'URL :
postgresql://postgres.xxx:Mon%40Pass%23123@pooler.supabase.com:6543/postgres
```

### Ou utiliser une variable d'environnement :
```bash
export DB_PASSWORD="Mon@Pass#123"
pg_dump "postgresql://postgres.xxx:${DB_PASSWORD}@pooler.supabase.com:6543/postgres" \
  --schema-only \
  --no-owner \
  --no-acl \
  -f schema_prod.sql
```

---

## 🆘 Erreurs Courantes

### "Tenant or user not found"
- ❌ URL incorrecte
- ❌ Mot de passe incorrect
- ❌ Format de l'URL incorrect

**Solution :** Vérifiez l'URL dans Supabase Dashboard → Settings → Database → Connection string → URI

### "Connection refused"
- ❌ Mauvais port (utilisez 6543 pour pooler)
- ❌ Firewall bloque la connexion

**Solution :** Utilisez le port 6543 (pooler) au lieu de 5432

### "Password authentication failed"
- ❌ Mot de passe incorrect
- ❌ Caractères spéciaux non encodés

**Solution :** Encodez les caractères spéciaux ou utilisez une variable d'environnement

---

## 📝 Exemple Complet

```bash
# 1. Obtenir l'URL depuis Supabase Dashboard
# Exemple d'URL obtenue :
# postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-1-eu-west-3.pooler.supabase.com:6543/postgres

# 2. Remplacer [YOUR-PASSWORD] par votre vrai mot de passe
export PROD_DB="postgresql://postgres.abcdefghijklmnop:MonVraiMotDePasse@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

# 3. Exporter
pg_dump "$PROD_DB" --schema-only --no-owner --no-acl -f schema_prod.sql

# 4. Vérifier que le fichier a été créé
ls -lh schema_prod.sql
```
