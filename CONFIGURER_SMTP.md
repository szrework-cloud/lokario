# 📧 Configurer SMTP pour l'envoi d'emails

## 📋 Prérequis

Pour configurer SMTP, vous avez besoin d'un compte email avec accès SMTP :
- Gmail (recommandé pour commencer)
- Outlook/Office 365
- SendGrid (service dédié)
- Mailgun (service dédié)
- OVH, Gandi, etc. (hébergeurs)

## 📧 Option 1 : Gmail (Simple pour commencer)

### Étape 1 : Activer l'accès moins sécurisé (ou mot de passe d'application)

#### Ancienne méthode (mot de passe d'application - Recommandé) :

1. **Activez la vérification en 2 étapes**
   - Allez sur : https://myaccount.google.com/security
   - Activez "Validation en deux étapes"

2. **Générez un mot de passe d'application**
   - Allez sur : https://myaccount.google.com/apppasswords
   - Sélectionnez "Mail" et "Autre (nom personnalisé)"
   - Entrez "Lokario Backend"
   - Cliquez sur "Générer"
   - **Copiez le mot de passe** (16 caractères) - il ne sera affiché qu'une fois !

#### Alternative (si pas de 2FA) :
- Activez "Autoriser les applications moins sécurisées" dans les paramètres Google (moins recommandé)

### Étape 2 : Ajouter les variables dans Railway

1. **Railway Dashboard** → Votre service → Variables

2. **Ajoutez ces variables** :

   **Variable 1 :**
   - Name : `SMTP_HOST`
   - Value : `smtp.gmail.com`

   **Variable 2 :**
   - Name : `SMTP_PORT`
   - Value : `587`

   **Variable 3 :**
   - Name : `SMTP_USE_TLS`
   - Value : `true`

   **Variable 4 :**
   - Name : `SMTP_USERNAME`
   - Value : Votre adresse Gmail (ex: `votre.email@gmail.com`)

   **Variable 5 :**
   - Name : `SMTP_PASSWORD`
   - Value : Le mot de passe d'application généré (les 16 caractères)

   **Variable 6 :**
   - Name : `SMTP_FROM_EMAIL`
   - Value : Votre adresse Gmail (ex: `votre.email@gmail.com`)

### Configuration Gmail complète :

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=true
SMTP_USERNAME=votre.email@gmail.com
SMTP_PASSWORD=votre_mot_de_passe_application_16_caracteres
SMTP_FROM_EMAIL=votre.email@gmail.com
```

## 📧 Option 2 : SendGrid (Service professionnel)

SendGrid est spécialisé dans l'envoi d'emails transactionnels.

### Étape 1 : Créer un compte SendGrid

1. Allez sur : https://sendgrid.com
2. Créez un compte gratuit (100 emails/jour gratuitement)
3. Vérifiez votre email

### Étape 2 : Créer une API Key

1. Settings → API Keys
2. "Create API Key"
3. Nom : "Lokario Production"
4. Permissions : "Full Access" (ou "Mail Send" seulement)
5. **Copiez la clé** - elle ne sera affichée qu'une fois !

### Étape 3 : Variables Railway

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USE_TLS=true
SMTP_USERNAME=apikey
SMTP_PASSWORD=votre_api_key_sendgrid
SMTP_FROM_EMAIL=noreply@lokario.fr
```

**Note** : `SMTP_USERNAME` doit être exactement `apikey` pour SendGrid.

## 📧 Option 3 : Outlook/Office 365

### Configuration :

```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USE_TLS=true
SMTP_USERNAME=votre.email@outlook.com
SMTP_PASSWORD=votre_mot_de_passe
SMTP_FROM_EMAIL=votre.email@outlook.com
```

## ✅ Vérification après configuration

Après avoir ajouté les variables et redéployé, vérifiez les logs Railway :

**Avant :**
```
⚠️  SMTP non configuré - Les emails ne seront pas envoyés (mode MOCK)
```

**Après :**
```
📧 Configuration SMTP chargée:
   Host: smtp.gmail.com
   Port: 587
   Username: votre.email@gmail.com
   Password: ✅ Configuré (16 caractères)
   From: votre.email@gmail.com
```

## 🧪 Tester l'envoi d'emails

Une fois configuré, testez l'envoi d'un email depuis votre application (par exemple, via un endpoint de test ou une action qui envoie un email).

## ⚠️ Limitations Gmail

Gmail a des limites :
- **500 emails/jour** pour les comptes gratuits
- **2000 emails/jour** pour Google Workspace

Pour la production avec beaucoup d'emails, utilisez SendGrid, Mailgun, ou un service dédié.

## 🔒 Sécurité

- ✅ **Ne commitez JAMAIS** les mots de passe dans Git
- ✅ **Utilisez des mots de passe d'application** (pas votre mot de passe principal)
- ✅ **Stockez uniquement** dans les variables d'environnement Railway
- ✅ **Changez les mots de passe** régulièrement

## 📝 Résumé rapide : Gmail

1. Activez la vérification en 2 étapes
2. Générez un mot de passe d'application : https://myaccount.google.com/apppasswords
3. Dans Railway, ajoutez :
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USE_TLS=true`
   - `SMTP_USERNAME=votre.email@gmail.com`
   - `SMTP_PASSWORD=mot_de_passe_application_16_caracteres`
   - `SMTP_FROM_EMAIL=votre.email@gmail.com`
4. Redéployez
5. Vérifiez les logs

Une fois configuré, votre application pourra envoyer des emails ! 📧
