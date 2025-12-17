# ➕ Ajouter DATABASE_URL dans Railway

## 📋 Prérequis

Avant d'ajouter DATABASE_URL dans Railway, vous devez avoir :
1. ✅ Un compte Supabase
2. ✅ Un projet Supabase créé
3. ✅ Votre projet backend déployé sur Railway

---

## 🔍 Étape 1 : Récupérer la DATABASE_URL depuis Supabase

### Option A : Via Supabase Dashboard (Recommandé)

1. **Allez sur Supabase**
   - Ouvrez : https://app.supabase.com
   - Connectez-vous
   - Sélectionnez votre projet

2. **Settings → Database**
   - Menu gauche → **Settings** (⚙️)
   - Cliquez sur **Database**

3. **Connection string → URI**
   - Faites défiler jusqu'à **"Connection string"**
   - Cliquez sur l'onglet **"URI"**
   - Vous verrez une URL comme :
     ```
     postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
     ```

4. **Récupérer le mot de passe**
   - Sur la même page, section **"Database password"**
   - Si vous ne le connaissez pas : **"Reset database password"**
   - ⚠️ **Notez-le immédiatement** (affiché une seule fois !)

5. **Construire l'URL complète**
   - Remplacez `[YOUR-PASSWORD]` par votre vrai mot de passe
   - Exemple final :
     ```
     postgresql://postgres.abcdefghijklmnop:monmotdepasse123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
     ```

### Option B : Si vous avez déjà une URL ailleurs

Si vous avez déjà DATABASE_URL configurée ailleurs (fichier .env local, etc.), copiez-la simplement.

---

## 🚂 Étape 2 : Ajouter dans Railway

### Méthode 1 : Via Railway Dashboard (Recommandé)

1. **Ouvrez Railway**
   - Allez sur : https://railway.app
   - Connectez-vous
   - Sélectionnez votre projet backend

2. **Sélectionnez votre service**
   - Cliquez sur le service qui contient votre backend FastAPI

3. **Onglet "Variables"**
   - En haut de la page, cliquez sur l'onglet **"Variables"**

4. **Ajouter une variable**
   - Cliquez sur le bouton **"+ New Variable"** ou **"Add Variable"**
   - Ou cliquez sur **"Raw Editor"** pour éditer directement

5. **Remplir les informations**
   - **Name** : `DATABASE_URL`
   - **Value** : Collez votre URL complète (celle de Supabase)
   - ⚠️ **Pas d'espaces** avant ou après !

6. **Sauvegarder**
   - Cliquez sur **"Add"** ou **"Save"**

7. **Vérification**
   - Vous devriez voir `DATABASE_URL` dans la liste des variables
   - La valeur sera masquée (affichée en `****`)

### Méthode 2 : Via Railway CLI

Si vous avez Railway CLI installé :

```bash
# Se connecter à Railway
railway login

# Aller dans votre projet
cd "/Users/glr_adem/Documents/B2B SAAS/backend"

# Lier le projet (si pas déjà fait)
railway link

# Ajouter la variable
railway variables set DATABASE_URL="postgresql://postgres.xxx:mot_de_passe@aws-0-REGION.pooler.supabase.com:6543/postgres"
```

---

## 🔍 Étape 3 : Vérifier que ça fonctionne

### Option 1 : Via Railway Dashboard

1. Après avoir ajouté la variable
2. Allez dans **"Deployments"** ou **"Logs"**
3. Redéployez votre service si nécessaire
4. Vérifiez les logs pour voir si la connexion à la base fonctionne

### Option 2 : Via Terminal Railway

1. Railway Dashboard → Votre service → **"View Logs"**
2. Cherchez des messages de connexion à la base de données
3. Si vous voyez des erreurs de connexion, vérifiez que l'URL est correcte

---

## ⚠️ Points importants

### Format de l'URL

✅ **Bonne URL** :
```
postgresql://postgres.xxx:mot_de_passe@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

❌ **Mauvaise URL** (URL API, pas base de données) :
```
https://xxx.supabase.co
```

### Sécurité

- ✅ **Ne commitez JAMAIS** votre DATABASE_URL dans Git
- ✅ Stockez-la uniquement dans les variables d'environnement (Railway)
- ✅ Ne la partagez JAMAIS publiquement
- ✅ Utilisez des mots de passe forts

### Caractères spéciaux dans le mot de passe

Si votre mot de passe contient des caractères spéciaux (comme `@`, `#`, `%`, etc.), vous devez les **encoder en URL** :

- `@` devient `%40`
- `#` devient `%23`
- `%` devient `%25`
- etc.

**Astuce** : Utilisez un outil d'encodage URL ou laissez Supabase gérer cela dans l'URL fournie.

---

## 🎯 Résumé rapide

```
1. Supabase → Settings → Database → Connection string (URI) → Copier URL
2. Railway → Votre service → Variables → + New Variable
3. Name: DATABASE_URL
4. Value: Coller l'URL (avec mot de passe remplacé)
5. Save
6. Redéployer si nécessaire
```

---

## ❓ Si ça ne fonctionne pas

### Erreurs communes :

1. **"Connection refused"**
   - Vérifiez que l'URL est correcte
   - Vérifiez que le mot de passe est bon
   - Vérifiez que Supabase autorise les connexions depuis Railway

2. **"Authentication failed"**
   - Le mot de passe est incorrect
   - Réinitialisez le mot de passe dans Supabase
   - Mettez à jour DATABASE_URL dans Railway

3. **"Host not found"**
   - L'URL est incorrecte
   - Vérifiez que vous avez copié toute l'URL

4. **Caractères spéciaux**
   - Encodez les caractères spéciaux dans le mot de passe
   - Utilisez l'URL fournie par Supabase (déjà encodée)

---

## ✅ Une fois configurée

Une fois DATABASE_URL ajoutée dans Railway :

1. ✅ Votre backend pourra se connecter à Supabase
2. ✅ Vous pourrez utiliser le script RLS avec cette URL
3. ✅ Tous vos déploiements utiliseront cette URL automatiquement

Pour tester le script RLS :
```bash
cd backend
export DATABASE_URL="votre_url_ici"  # Ou récupérer depuis Railway
python scripts/enable_rls_supabase.py --dry-run
```
