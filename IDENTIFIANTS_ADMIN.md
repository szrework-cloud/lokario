# 👤 Identifiants Admin par défaut

## 🔑 Super Admin

Selon les scripts de votre codebase, l'utilisateur **Super Admin** par défaut est :

```
Email: admin@localassistant.fr
Password: admin123
Rôle: super_admin
```

## ⚠️ Important

### 1. L'utilisateur doit être créé

Ces identifiants ne sont créés que si vous avez exécuté :
- Le script `backend/scripts/create_test_users.py`
- Le script `backend/scripts/init_db.py`

### 2. Vérifier si l'utilisateur existe

L'utilisateur admin pourrait ne pas exister si :
- Vous n'avez pas exécuté les scripts de création
- Vous avez une base de données vierge

### 3. Créer l'utilisateur admin

Si l'utilisateur n'existe pas, vous avez plusieurs options :

#### Option A : Utiliser le script de création

```bash
cd backend
python scripts/create_test_users.py
```

#### Option B : Créer un compte via l'interface

1. Allez sur votre site : `https://www.lokario.fr/register`
2. Créez un compte avec le rôle "owner"
3. Puis utilisez le script `change_user_role.py` pour le passer en super_admin :

```bash
python scripts/change_user_role.py admin@example.com super_admin
```

#### Option C : Créer directement en base de données

Si vous avez accès à votre base de données Supabase, vous pouvez créer l'utilisateur directement.

## 🔍 Vérifier les utilisateurs existants

Vous pouvez utiliser le script `view_database.py` pour voir tous les utilisateurs :

```bash
cd backend
python scripts/view_database.py
```

## 📝 Notes

- Le mot de passe `admin123` est un mot de passe de **test/développement**
- En production, changez ce mot de passe !
- Le super_admin a accès à `/admin/*` et `/app/*`

## 🚀 Pour Railway (Production)

En production sur Railway, vous devrez probablement :
1. Créer un compte via l'interface `/register`
2. Puis le promouvoir en super_admin via un script ou directement en base

Ou créer l'utilisateur directement via l'API/script si vous avez accès à Railway.
