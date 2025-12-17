# 🚂 Trouver DATABASE_URL dans Railway

## 📍 Guide Simple - Étape par étape

### Méthode 1 : Depuis Railway Dashboard

1. **Ouvrez Railway**
   - Allez sur : https://railway.app
   - Connectez-vous avec votre compte

2. **Sélectionnez votre projet**
   - Dans la liste des projets, cliquez sur votre projet backend

3. **Sélectionnez votre service backend**
   - Cliquez sur le service qui contient votre backend FastAPI

4. **Onglet "Variables"**
   - En haut de la page, cherchez l'onglet **"Variables"**
   - Cliquez dessus

5. **Cherchez DATABASE_URL**
   - Dans la liste des variables, cherchez `DATABASE_URL`
   - La valeur est masquée par défaut (affiche des `****`)

6. **Afficher la valeur**
   - Cliquez sur l'icône 👁️ (œil) à droite de `DATABASE_URL`
   - OU cliquez sur le bouton "Reveal" si disponible
   - La valeur complète s'affichera

7. **Copiez la valeur**
   - Sélectionnez toute l'URL
   - Copiez-la (Cmd+C sur Mac, Ctrl+C sur Windows)

### Méthode 2 : Via Railway CLI (si installé)

Si vous avez Railway CLI installé :

```bash
# Se connecter à Railway
railway login

# Aller dans votre projet
cd "/Users/glr_adem/Documents/B2B SAAS/backend"

# Lier le projet (si pas déjà fait)
railway link

# Afficher les variables
railway variables

# Ou spécifiquement DATABASE_URL
railway variables DATABASE_URL
```

---

## 🔍 À quoi ressemble une DATABASE_URL ?

Une DATABASE_URL typique ressemble à :

```
postgresql://postgres:mot_de_passe@containers-us-west-xxx.railway.app:5432/railway
```

Ou pour Supabase :

```
postgresql://postgres.abcdefghijklmnop:mot_de_passe@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

## ✅ Une fois que vous avez la DATABASE_URL

Vous pouvez l'utiliser avec le script RLS :

```bash
cd backend

# Exporter la variable
export DATABASE_URL="votre_url_ici"

# Test d'abord
python scripts/enable_rls_supabase.py --dry-run

# Puis application réelle
python scripts/enable_rls_supabase.py
```

---

## ⚠️ Si vous ne trouvez pas DATABASE_URL dans Railway

Cela signifie que :
1. La variable n'a pas encore été configurée
2. Elle est dans un autre service (peut-être un service de base de données séparé)

### Solutions :

**Option A : Ajouter la variable manuellement**
1. Railway → Votre service → Variables → "New Variable"
2. Nom : `DATABASE_URL`
3. Valeur : Votre URL de connexion PostgreSQL (depuis Supabase)

**Option B : Créer la variable depuis Supabase**
1. Suivez le guide pour trouver DATABASE_URL dans Supabase
2. Ajoutez-la ensuite dans Railway

---

## 🎯 Récapitulatif rapide

```
Railway Dashboard 
  → Votre Projet 
    → Votre Service Backend 
      → Variables (onglet)
        → DATABASE_URL
          → 👁️ (afficher)
          → Copier
```
