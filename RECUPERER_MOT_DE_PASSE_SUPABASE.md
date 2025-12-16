# 🔑 Comment Récupérer le Mot de Passe PostgreSQL Supabase

## ❓ Quel mot de passe ?

Vous avez besoin du **mot de passe de la base de données PostgreSQL** dans Supabase (pas votre mot de passe de compte Supabase).

## 🔍 Où le trouver ?

### Option 1 : Si vous l'avez déjà sauvegardé

Si vous avez créé le projet Supabase récemment, vous avez peut-être sauvegardé le mot de passe lors de la création du projet. Cherchez-le dans vos notes.

### Option 2 : Le réinitialiser (Recommandé si vous ne l'avez pas)

1. **Aller dans Supabase Dashboard** :
   - Ouvrir : https://supabase.com/dashboard/project/ufnncdjjzkbsemtrxjep
   - Ou : https://supabase.com/dashboard → Sélectionner votre projet

2. **Aller dans Settings → Database** :
   - Menu latéral gauche → **Settings** (⚙️)
   - Cliquer sur **Database**

3. **Trouver "Database password"** :
   - Descendre jusqu'à la section **"Database password"**
   - Vous verrez un bouton **"Reset database password"** (🔑)

4. **Réinitialiser le mot de passe** :
   - Cliquer sur **"Reset database password"**
   - Supabase va générer un nouveau mot de passe
   - ⚠️ **COPIEZ CE MOT DE PASSE IMMÉDIATEMENT** (il ne sera pas affiché à nouveau)
   - Sauvegardez-le dans un endroit sûr (gestionnaire de mots de passe, note sécurisée, etc.)

## ✅ Une fois que vous avez le mot de passe

Vous pourrez construire la connection string :

```
postgresql://postgres:[VOTRE-MOT-DE-PASSE-ICI]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres
```

**Exemple** (avec un mot de passe fictif) :
```
postgresql://postgres:MonSuperMotDePasse123@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres
```

## 🔒 Sécurité

⚠️ **IMPORTANT** :
- Ne partagez JAMAIS ce mot de passe publiquement
- Ne le commitez JAMAIS dans Git
- Utilisez-le uniquement dans les variables d'environnement (Railway, etc.)

## 🎯 Prochaine étape

Une fois que vous avez le mot de passe :
1. Construisez la connection string (comme dans l'exemple ci-dessus)
2. Testez-la avec :
   ```bash
   export DATABASE_URL="postgresql://postgres:[VOTRE-MDP]@db.ufnncdjjzkbsemtrxjep.supabase.co:5432/postgres"
   ./scripts/run_migrations_supabase.sh
   ```

---

**En résumé** : Vous devez réinitialiser le mot de passe dans Supabase Dashboard → Settings → Database → Reset database password, puis utiliser ce mot de passe dans la connection string.

