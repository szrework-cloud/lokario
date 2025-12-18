# ✅ Vérifier les données créées dans Supabase

## 🎯 Où voir les données après création d'un compte

Quand vous créez un compte, les données suivantes sont sauvegardées dans Supabase :

### 1. Table `companies`

**Ce que vous devriez voir :**
- `id` : ID de l'entreprise (ex: 1)
- `name` : Nom de l'entreprise (ex: "S-rework")
- `code` : Code à 6 chiffres (ex: 163294)
- `slug` : Slug de l'entreprise (ex: "s-rework")
- `sector` : Secteur d'activité
- `created_at` : Date de création
- `is_active` : true

**Où regarder dans Supabase :**
1. Supabase Dashboard → **Table Editor**
2. Sélectionnez la table **`companies`**
3. Vous devriez voir votre entreprise créée

### 2. Table `users`

**Ce que vous devriez voir :**
- `id` : ID de l'utilisateur
- `email` : Email de l'utilisateur (ex: adem.gurler47@gmail.com)
- `full_name` : Nom complet
- `hashed_password` : Mot de passe hashé
- `role` : Rôle (ex: "owner")
- `company_id` : ID de l'entreprise (doit correspondre à l'ID dans `companies`)
- `email_verified` : false (pas encore vérifié)
- `email_verification_token` : Token de vérification
- `email_verification_token_expires_at` : Date d'expiration
- `created_at` : Date de création
- `is_active` : true

**Où regarder dans Supabase :**
1. Supabase Dashboard → **Table Editor**
2. Sélectionnez la table **`users`**
3. Vous devriez voir votre utilisateur créé

### 3. Table `company_settings`

**Ce que vous devriez voir :**
- `id` : ID des settings
- `company_id` : ID de l'entreprise (doit correspondre)
- `settings` : JSON avec les settings par défaut

**Où regarder dans Supabase :**
1. Supabase Dashboard → **Table Editor**
2. Sélectionnez la table **`company_settings`**
3. Vous devriez voir les settings par défaut créés

## 🔍 Comment vérifier dans Supabase Dashboard

### Étape 1 : Accéder à Supabase

1. Allez sur https://supabase.com/dashboard
2. Connectez-vous
3. Sélectionnez votre projet

### Étape 2 : Table Editor

1. Dans le menu de gauche, cliquez sur **"Table Editor"**
2. Sélectionnez la table que vous voulez voir :
   - `companies` → Votre entreprise
   - `users` → Votre utilisateur
   - `company_settings` → Les settings

### Étape 3 : Vérifier les données

- Regardez les dernières lignes (les plus récentes en bas)
- Vérifiez que :
  - L'email correspond à celui que vous avez utilisé
  - Le nom de l'entreprise correspond
  - `company_id` dans `users` correspond à `id` dans `companies`

## ✅ Ce que vous devriez voir après création

Après avoir créé un compte avec :
- Email : `adem.gurler47@gmail.com`
- Entreprise : `S-rework`

Vous devriez voir :

**Table `companies` :**
```
id | name    | code   | slug     | created_at          | is_active
1  | S-rework| 163294 | s-rework | 2025-12-18 11:39:09 | true
```

**Table `users` :**
```
id | email                    | full_name | role | company_id | email_verified | created_at
1  | adem.gurler47@gmail.com  | ...       | owner| 1          | false          | 2025-12-18 11:39:09
```

## 🔍 Si vous ne voyez pas les données

1. **Vérifiez les logs Railway** pour voir si l'inscription a réussi (code 201)
2. **Attendez quelques secondes** (parfois il y a un léger délai)
3. **Rafraîchissez** la page Supabase Table Editor
4. **Vérifiez que vous êtes sur le bon projet** Supabase (celui lié à votre DATABASE_URL)

## 📝 Note importante

Si vous voyez les données dans Supabase, c'est que :
- ✅ L'inscription fonctionne
- ✅ La base de données est bien connectée
- ✅ Les données sont sauvegardées correctement

Si vous ne voyez **pas** les données, vérifiez les logs Railway pour voir s'il y a eu une erreur lors de la création.
