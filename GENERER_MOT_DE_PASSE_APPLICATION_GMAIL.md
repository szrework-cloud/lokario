# 🔑 Générer un mot de passe d'application Gmail pour IMAP

## 🔍 Problème

Gmail requiert un **"mot de passe d'application"** (application-specific password) pour les connexions IMAP/SMTP au lieu de votre mot de passe normal.

## ✅ Solution : Générer un mot de passe d'application

### Étape 1 : Activer l'authentification à 2 facteurs

**Important :** Vous devez avoir l'authentification à 2 facteurs activée sur votre compte Gmail.

1. Allez sur : https://myaccount.google.com/security
2. Si l'authentification à 2 facteurs n'est **pas activée** :
   - Activez-la d'abord
   - Suivez les instructions pour configurer (SMS, application d'authentification, etc.)

### Étape 2 : Générer un mot de passe d'application

1. Allez sur : https://myaccount.google.com/apppasswords
2. Si nécessaire, connectez-vous à votre compte Google
3. **Sélectionnez l'application** : "Mail"
4. **Sélectionnez l'appareil** : "Autre (nom personnalisé)"
5. **Nom personnalisé** : Entrez "Lokario IMAP" (ou autre nom de votre choix)
6. Cliquez sur **"Générer"**

### Étape 3 : Copier le mot de passe

Google affichera un mot de passe de 16 caractères, par exemple :
```
abcd efgh ijkl mnop
```

**Important :**
- Ce mot de passe ne sera affiché **qu'une seule fois**
- Copiez-le immédiatement
- Il n'y a pas d'espaces dans le mot de passe réel (les espaces sont juste pour la lisibilité)

### Étape 4 : Utiliser dans Lokario

Dans votre intégration email Lokario, utilisez :
- **Email** : sz.rework@gmail.com (ou votre email Gmail)
- **Mot de passe** : Le mot de passe d'application généré (16 caractères, sans espaces)

**Exemple :**
```
Email: sz.rework@gmail.com
Mot de passe: abcdefghijklmnop
```

## ⚠️ Important

1. **Ne partagez jamais** ce mot de passe d'application
2. **Ne le commitez pas** dans votre code
3. Si vous le perdez, **générez-en un nouveau** et mettez à jour votre intégration

## 🔄 Si vous avez déjà un mot de passe d'application

Si vous avez déjà généré un mot de passe d'application pour Lokario mais que ça ne fonctionne pas :

1. Vérifiez que vous avez copié le mot de passe **sans espaces**
2. Si ça ne fonctionne toujours pas, **générez-en un nouveau** sur https://myaccount.google.com/apppasswords
3. Mettez à jour le mot de passe dans votre intégration Lokario

## ✅ Après configuration

Une fois le mot de passe d'application configuré dans votre intégration Lokario, la synchronisation IMAP devrait fonctionner sans erreur.

## 📋 Résumé

- ✅ Activez l'authentification à 2 facteurs (si pas déjà fait)
- ✅ Générez un mot de passe d'application : https://myaccount.google.com/apppasswords
- ✅ Utilisez ce mot de passe (16 caractères, sans espaces) dans votre intégration Lokario
