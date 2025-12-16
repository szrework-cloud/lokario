# 🔄 ÉTAPE 1.2 : Exécuter les Migrations sur Supabase

## 📋 Prérequis

Vous devez avoir :
- ✅ Votre connection string PostgreSQL Supabase complète
- ✅ Format : `postgresql://postgres:[PASSWORD]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres`

## 🚀 Exécuter les Migrations

### Méthode 1 : Avec le script (Recommandé)

1. **Ouvrir un terminal**

2. **Aller dans le dossier du projet** :
   ```bash
   cd "/Users/glr_adem/Documents/B2B SAAS"
   ```

3. **Définir la variable d'environnement DATABASE_URL** :
   ```bash
   export DATABASE_URL="postgresql://postgres:[VOTRE-MOT-DE-PASSE]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres"
   ```
   
   ⚠️ **Remplacez `[VOTRE-MOT-DE-PASSE]` par votre vrai mot de passe**

4. **Exécuter le script de migration** :
   ```bash
   ./scripts/run_migrations_supabase.sh
   ```

5. **Vérifier le résultat** :
   - Vous devriez voir : `✅ Migrations exécutées avec succès !`
   - Toutes les tables de votre application seront créées dans Supabase

### Méthode 2 : Manuellement avec Alembic

Si le script ne fonctionne pas :

```bash
cd "/Users/glr_adem/Documents/B2B SAAS/backend"

# Définir DATABASE_URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres"

# Exécuter les migrations
alembic upgrade head
```

## ✅ Vérifier que ça a fonctionné

Dans Supabase Dashboard :
1. Aller dans **Table Editor**
2. Vous devriez voir toutes les tables créées :
   - `users`
   - `companies`
   - `clients`
   - `invoices`
   - `quotes`
   - `tasks`
   - `conversations`
   - etc.

## 🎉 Étape suivante

Une fois les migrations exécutées avec succès, dites-moi "migrations terminées" et je passerai à l'**ÉTAPE 2 : Déployer le backend sur Railway** !

