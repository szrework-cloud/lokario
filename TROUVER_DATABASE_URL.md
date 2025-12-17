# 🔍 Comment trouver votre DATABASE_URL et mot de passe Supabase

## 📍 Méthode 1 : Dans Supabase Dashboard (Recommandé)

### Étape 1 : Accéder à Supabase
1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet

### Étape 2 : Aller dans Settings → Database
1. Dans le menu de gauche, cliquez sur **Settings** (⚙️)
2. Cliquez sur **Database** dans le sous-menu

### Étape 3 : Récupérer la Connection String
1. Descendez jusqu'à la section **Connection string**
2. Vous verrez plusieurs onglets : **URI**, **JDBC**, etc.
3. Cliquez sur l'onglet **URI**
4. Vous verrez quelque chose comme :
   ```
   postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```

### Étape 4 : Récupérer le mot de passe
1. Dans la même page **Settings → Database**
2. Cherchez la section **Database password**
3. Si vous ne le connaissez pas, cliquez sur **Reset database password**
4. **⚠️ Important** : Notez le nouveau mot de passe, il ne sera affiché qu'une fois !

### Étape 5 : Construire la DATABASE_URL complète
Remplacez `[YOUR-PASSWORD]` dans l'URI par votre vrai mot de passe :

**Format complet :**
```
postgresql://postgres.xxx:VOTRE_MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

## 📍 Méthode 2 : Dans Railway (si vous l'avez déjà configurée)

### Si vous avez déjà configuré DATABASE_URL dans Railway :

1. Allez sur [https://railway.app](https://railway.app)
2. Sélectionnez votre projet
3. Sélectionnez votre service backend
4. Allez dans **Variables**
5. Cherchez la variable `DATABASE_URL`
6. Cliquez sur l'icône 👁️ pour voir la valeur (elle est masquée par défaut)

**Note** : Dans Railway, le mot de passe est déjà inclus dans la DATABASE_URL.

---

## 📍 Méthode 3 : Vérifier dans votre code local

Si vous avez un fichier `.env` local :

```bash
cd backend
cat .env | grep DATABASE_URL
```

**⚠️ Attention** : Ne partagez JAMAIS votre `.env` ou votre DATABASE_URL publiquement !

---

## 🔐 Sécurité

### ✅ Bonnes pratiques :
- ✅ Stockez DATABASE_URL dans les variables d'environnement
- ✅ Utilisez des secrets sécurisés (Railway, Vercel, etc.)
- ✅ Ne commitez JAMAIS `.env` dans Git
- ✅ Ne partagez JAMAIS votre DATABASE_URL publiquement

### ❌ À ne jamais faire :
- ❌ Commiter `.env` dans Git
- ❌ Partager DATABASE_URL sur Slack/Discord/Email
- ❌ Laisser DATABASE_URL dans le code source

---

## 📝 Exemple de DATABASE_URL

Votre DATABASE_URL devrait ressembler à :

```
postgresql://postgres.abcdefghijklmnop:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

Où :
- `postgres.abcdefghijklmnop` = votre identifiant utilisateur
- `[PASSWORD]` = votre mot de passe (à remplacer par le vrai)
- `aws-0-eu-central-1.pooler.supabase.com:6543` = l'hôte Supabase
- `postgres` = le nom de la base de données

---

## 🚀 Utilisation avec le script RLS

Une fois que vous avez votre DATABASE_URL :

```bash
cd backend
export DATABASE_URL="postgresql://postgres.xxx:VOTRE_MOT_DE_PASSE@..."
python scripts/enable_rls_supabase.py --dry-run  # Test d'abord
python scripts/enable_rls_supabase.py            # Puis application réelle
```

---

## ❓ Si vous avez perdu votre mot de passe

Si vous ne vous souvenez plus de votre mot de passe :

1. Allez sur Supabase Dashboard → Settings → Database
2. Cliquez sur **Reset database password**
3. **⚠️ IMPORTANT** : Notez le nouveau mot de passe immédiatement !
4. Il ne sera affiché qu'une seule fois
5. Mettez à jour votre DATABASE_URL partout où vous l'utilisez (Railway, .env, etc.)
