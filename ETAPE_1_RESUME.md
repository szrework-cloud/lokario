# ✅ ÉTAPE 1 : Configuration Supabase - RÉSUMÉ

## 🎯 Objectif

Récupérer la connection string PostgreSQL et exécuter les migrations.

## 📝 Actions à faire

### 1. Récupérer la Connection String

1. Aller sur : https://supabase.com/dashboard/project/ufnncdjjzkbsemtrxjep
2. Settings → Database
3. Section "Connection string" → Onglet "URI"
4. Récupérer ou réinitialiser le mot de passe de la base de données
5. Construire la connection string au format :
   ```
   postgresql://postgres:[VOTRE-MOT-DE-PASSE]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres
   ```

📄 **Guide détaillé** : Voir `ETAPE_1_SUPABASE_CONNECTION.md`

### 2. Exécuter les Migrations

Une fois que vous avez la connection string :

```bash
cd "/Users/glr_adem/Documents/B2B SAAS"

# Définir la connection string (remplacer [PASSWORD] par votre mot de passe)
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres"

# Exécuter les migrations
./scripts/run_migrations_supabase.sh
```

📄 **Guide détaillé** : Voir `ETAPE_1_2_MIGRATIONS.md`

## ✅ Vérification

Dans Supabase Dashboard → Table Editor, vous devriez voir toutes les tables créées.

## 🚀 Étape suivante

Une fois terminé, dites-moi **"étape 1 terminée"** ou **"migrations terminées"** et je passerai à l'ÉTAPE 2 (Déploiement sur Railway) !

