# 🔍 Récupérer votre clé OpenAI depuis le projet local

## 📁 Où se trouve la clé

La clé OpenAI est généralement dans un fichier `.env` dans le dossier `backend/`.

## 🔍 Méthode 1 : Lire le fichier .env

Dans votre terminal, allez dans le dossier backend :

```bash
cd backend
cat .env | grep OPENAI_API_KEY
```

Cela affichera quelque chose comme :
```
OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890
```

## 🔍 Méthode 2 : Ouvrir le fichier .env

1. Ouvrez le fichier `backend/.env` dans votre éditeur
2. Cherchez la ligne qui commence par `OPENAI_API_KEY=`
3. Copiez la valeur après le `=` (sans les espaces)

Exemple :
```
OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890
```

→ La clé à copier est : `sk-proj-abcdefghijklmnopqrstuvwxyz1234567890`

## 📋 Ensuite : Ajouter dans Railway

Une fois que vous avez récupéré la clé :

1. **Railway Dashboard** → Service backend → Variables
2. "+ New Variable"
3. **Name** : `OPENAI_API_KEY`
4. **Value** : Collez la clé que vous avez copiée (sans le `OPENAI_API_KEY=`, juste la clé)
5. Save

## ⚠️ Important

- ✅ La clé commence par `sk-`
- ✅ Ne mettez PAS `OPENAI_API_KEY=` dans la Value, juste la clé elle-même
- ✅ Pas d'espaces avant ou après

## 🔒 Sécurité

Le fichier `.env` ne doit JAMAIS être commité dans Git (il est normalement dans `.gitignore`). C'est bien que vous ayez la clé en local, mais assurez-vous qu'elle n'est pas dans le repository Git.
