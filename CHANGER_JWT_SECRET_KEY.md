# Changer la Clé JWT (JWT_SECRET_KEY)

## ⚠️ IMPORTANT

**Changer la clé JWT invalidera TOUS les tokens existants !**
Tous les utilisateurs devront se reconnecter.

## 🔑 Générer une Nouvelle Clé Sécurisée

### Méthode 1 : Via Python
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Méthode 2 : Via OpenSSL
```bash
openssl rand -base64 32
```

### Méthode 3 : Via Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Exemple de clé générée :** `xK9mP2qR7vT4wY8zA1bC3dE5fG6hI0jK2lM4nO6pQ8rS0tU`

## 📋 Étapes pour Changer la Clé

### 1. Générer la Nouvelle Clé
Utilisez une des méthodes ci-dessus pour générer une clé sécurisée (minimum 32 caractères).

### 2. Mettre à Jour dans Railway (Production)

1. Allez sur [Railway Dashboard](https://railway.app)
2. Sélectionnez votre service backend **production**
3. Allez dans **Variables**
4. Trouvez `JWT_SECRET_KEY`
5. Cliquez sur **Edit** ou **Update**
6. Collez la nouvelle clé
7. Sauvegardez

**⚠️ Le service redémarrera automatiquement**

### 3. Mettre à Jour dans Railway (Staging)

Si vous avez un environnement staging :
1. Répétez les étapes pour le service backend **staging**
2. Utilisez une **clé différente** de la production (recommandé)

### 4. Vérifier

Après le redémarrage, testez la connexion :
- Tous les utilisateurs devront se reconnecter
- Les anciens tokens ne fonctionneront plus

## 🔄 Migration Progressive (Optionnel)

Si vous voulez éviter de déconnecter tous les utilisateurs d'un coup :

### Étape 1 : Ajouter la Nouvelle Clé
```bash
# Dans Railway, ajoutez une nouvelle variable
JWT_SECRET_KEY_NEW=votre-nouvelle-cle
```

### Étape 2 : Modifier le Code pour Accepter les Deux Clés
```python
# Dans backend/app/core/security.py
def verify_token(token: str):
    try:
        # Essayer avec la nouvelle clé
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.InvalidTokenError:
        # Si échec, essayer avec l'ancienne (si définie)
        if hasattr(settings, 'JWT_SECRET_KEY_OLD'):
            try:
                payload = jwt.decode(token, settings.JWT_SECRET_KEY_OLD, algorithms=[settings.JWT_ALGORITHM])
                return payload
            except jwt.InvalidTokenError:
                raise
        raise
```

### Étape 3 : Après Migration Complète
Une fois que tous les tokens ont expiré (24h par défaut), supprimez `JWT_SECRET_KEY_OLD`.

## 🆘 En Cas de Problème

### Si le Backend ne Démarre Plus
1. Vérifiez que la clé ne contient pas de caractères spéciaux problématiques
2. Vérifiez que la clé fait au moins 32 caractères
3. Vérifiez les logs Railway pour voir l'erreur exacte

### Si les Tokens ne Fonctionnent Plus
C'est normal ! Tous les utilisateurs doivent se reconnecter après le changement.

## 📝 Bonnes Pratiques

1. **Utilisez des clés différentes** pour production et staging
2. **Générez des clés aléatoires** (pas de mots de passe simples)
3. **Minimum 32 caractères** pour la sécurité
4. **Ne commitez JAMAIS** la clé dans le code
5. **Changez régulièrement** (tous les 6-12 mois)

## 🔐 Sécurité

- La clé JWT doit être **secrète** et **aléatoire**
- Ne la partagez **jamais** publiquement
- Utilisez des variables d'environnement, jamais de hardcoding
- En production, utilisez toujours une clé différente de la valeur par défaut
