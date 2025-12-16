# 🔗 ÉTAPE 1 : Récupérer la Connection String PostgreSQL

## 📋 Vos Informations Supabase

- **URL du projet** : https://ufnncdjjzkbsemtrxjep.supabase.co
- **Project Reference** : `ufnncdjjzkbsemtrxjep`

## 🔑 Récupérer la Connection String

### Méthode 1 : Via le Dashboard Supabase (Recommandé)

1. **Aller dans Supabase Dashboard** :
   - Ouvrir : https://supabase.com/dashboard/project/ufnncdjjzkbsemtrxjep
   - Ou aller sur https://supabase.com/dashboard et sélectionner votre projet

2. **Aller dans Settings → Database** :
   - Menu latéral gauche → **Settings** (⚙️)
   - Cliquer sur **Database**

3. **Trouver "Connection string"** :
   - Descendre jusqu'à la section **"Connection string"**
   - Sélectionner l'onglet **"URI"** (pour connexion directe)
   - Vous verrez quelque chose comme :
     ```
     postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
     ```
   
   ⚠️ **Mais pour notre backend FastAPI, on utilise le format DIRECT** :
   - Chercher **"Direct connection"** ou utiliser le format :
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres
     ```

4. **Récupérer le mot de passe** :
   - Dans Settings → Database
   - Section **"Database password"**
   - Soit vous le voyez (si vous l'avez sauvegardé)
   - Soit vous devez le **réinitialiser** :
     - Cliquer sur **"Reset database password"** (🔑)
     - Générer un nouveau mot de passe
     - ⚠️ **SAUVEgarder ce mot de passe dans un endroit sûr**

5. **Construire la connection string complète** :
   
   Format pour notre backend :
   ```
   postgresql://postgres:[VOTRE-MOT-DE-PASSE]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres
   ```
   
   Remplacez `[VOTRE-MOT-DE-PASSE]` par votre vrai mot de passe.

### Exemple de connection string finale :

```
postgresql://postgres:MonMotDePasse123@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres
```

## ✅ Tester la Connection

Une fois que vous avez la connection string, testez-la avec le script :

```bash
cd "/Users/glr_adem/Documents/B2B SAAS"
python3 scripts/test_supabase_connection.py "postgresql://postgres:[PASSWORD]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres"
```

## 📝 Note Importante

⚠️ **Ne partagez JAMAIS votre mot de passe de base de données publiquement !**

Une fois que vous avez votre connection string complète, envoyez-moi juste un message comme "J'ai la connection string" et je passerai à l'étape suivante (exécution des migrations).

