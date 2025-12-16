# ÉTAPE 1 : Récupérer la Connection String PostgreSQL

## 📋 Informations Supabase

- **URL du projet** : https://ufnncdjjzkbsemtrxjep.supabase.co
- **Project Reference** : ufnncdjjzkbsemtrxjep

## 🔑 Récupérer la Connection String

1. **Aller dans Supabase Dashboard** :
   - Ouvrir : https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Aller dans Settings → Database** :
   - Menu latéral gauche → **Settings** (⚙️)
   - Cliquer sur **Database**

3. **Trouver "Connection string"** :
   - Descendre jusqu'à la section **"Connection string"**
   - Sélectionner l'onglet **"URI"** (pas "Connection pooling")
   - Vous verrez quelque chose comme :
     ```
     postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
     ```
   
   ⚠️ **ATTENTION** : Il y a un placeholder `[YOUR-PASSWORD]` qu'il faut remplacer par votre **vrai mot de passe de base de données**.

4. **Si vous ne connaissez pas le mot de passe** :
   - Dans la même page Settings → Database
   - Section **"Database password"**
   - Soit vous le voyez (si vous l'avez sauvegardé)
   - Soit vous devez le **réinitialiser** :
     - Cliquer sur **"Reset database password"**
     - Générer un nouveau mot de passe
     - ⚠️ **SAUVEgarder ce mot de passe**

5. **Construire la connection string complète** :
   
   Format standard Supabase :
   ```
   postgresql://postgres.ufnncdjjzkbsemtrxjep:[VOTRE-MOT-DE-PASSE]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   
   Mais pour SQLAlchemy (notre backend), il faut utiliser le port **5432** (pas 6543) :
   ```
   postgresql://postgres:[VOTRE-MOT-DE-PASSE]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres
   ```

## ✅ Résultat attendu

Une connection string complète qui ressemble à :
```
postgresql://postgres:VotreMotDePasse123@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres
```

---

**Une fois que vous avez cette connection string, envoyez-la moi et je passe à l'étape suivante !**

