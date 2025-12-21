# Tester la Connexion Staging

## 🔍 Vérifier la Connexion

### Méthode 1 : Test Simple
```bash
/opt/homebrew/opt/postgresql@17/bin/psql "postgresql://postgres.hobsxwtqnxrdrpmnuoga:AZERTY1234azert-@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" \
  -c "SELECT version();"
```

### Méthode 2 : Si le mot de passe contient des caractères spéciaux

Si votre mot de passe contient des caractères spéciaux, encodez-les :
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `/` → `%2F`
- `:` → `%3A`
- `-` → `%2D` (si nécessaire)

### Méthode 3 : Utiliser une variable d'environnement

```bash
export STAGING_PASSWORD="AZERTY1234azert-"
/opt/homebrew/opt/postgresql@17/bin/psql "postgresql://postgres.hobsxwtqnxrdrpmnuoga:${STAGING_PASSWORD}@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" \
  -c "SELECT version();"
```

### Méthode 4 : Utiliser la connexion directe (port 5432)

Si le pooler ne fonctionne pas, essayez la connexion directe :

```bash
# Obtenez l'URL de connexion directe depuis Supabase Dashboard
# Settings → Database → Connection string → Direct connection
/opt/homebrew/opt/postgresql@17/bin/psql "postgresql://postgres.hobsxwtqnxrdrpmnuoga:AZERTY1234azert-@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
  -c "SELECT version();"
```

## ⚠️ Vérifications

1. **Le mot de passe est-il correct ?**
   - Vérifiez dans Supabase Dashboard → Settings → Database
   - Le mot de passe affiché dans l'URL de connexion est-il le bon ?

2. **Le project_ref est-il correct ?**
   - `hobsxwtqnxrdrpmnuoga` correspond-il au projet staging ?

3. **La région est-elle correcte ?**
   - `aws-1-eu-west-1` correspond-il à votre projet staging ?

## 🔧 Solution Alternative : Via Supabase Dashboard

Si `psql` ne fonctionne pas, vous pouvez importer via Supabase Dashboard :

1. Allez dans Supabase Dashboard → SQL Editor
2. Ouvrez le fichier `schema_public_only.sql`
3. Copiez-collez le contenu dans l'éditeur SQL
4. Exécutez
