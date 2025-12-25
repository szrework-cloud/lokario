# 📱 Guide Complet : Mise en Place de Vonage SMS

Ce guide vous explique comment configurer Vonage SMS dans votre application Lokario, étape par étape.

## 📋 Prérequis

1. Un compte Vonage (inscription gratuite sur https://www.vonage.com/)
2. Un numéro de téléphone Vonage (acheté depuis le Dashboard)
3. Vos credentials API Vonage (API Key et API Secret)

---

## 🔑 Étape 1 : Créer un compte Vonage

1. Allez sur https://www.vonage.com/
2. Cliquez sur **"Sign Up"** ou **"Get Started"**
3. Remplissez le formulaire d'inscription :
   - Email
   - Nom et prénom
   - Mot de passe
   - Pays (important pour la réglementation)
4. Validez votre email
5. Connectez-vous à votre Dashboard : https://dashboard.nexmo.com/

---

## 📞 Étape 2 : Obtenir un numéro de téléphone Vonage

1. Dans votre Dashboard Vonage, allez dans **"Numbers"** → **"Buy Numbers"**
2. Sélectionnez votre pays (ex: France)
3. Choisissez les fonctionnalités :
   - ✅ **SMS** (obligatoire)
   - Optionnel: Voice, MMS
4. Sélectionnez un numéro disponible
5. Cliquez sur **"Buy"** et confirmez l'achat
6. **Notez votre numéro** (format: `33612345678` ou `+33612345678`)

💡 **Coût** : Les numéros Vonage sont généralement facturés mensuellement (environ 1-3€/mois selon le pays).

---

## 🔐 Étape 3 : Récupérer vos credentials API

1. Dans votre Dashboard Vonage, allez dans **"Settings"** (en haut à droite)
2. Cliquez sur **"API Settings"** dans le menu de gauche
3. Vous verrez :
   - **API Key** : Copiez cette valeur
   - **API Secret** : Cliquez sur "Show" et copiez cette valeur

⚠️ **Important** : Gardez ces credentials secrets et ne les partagez pas.

---

## ⚙️ Étape 4 : Configurer l'intégration dans Lokario

### 4.1 Accéder aux paramètres

1. Connectez-vous à votre application Lokario
2. Allez dans **Paramètres** (icône ⚙️ dans la sidebar)
3. Cliquez sur l'onglet **"Intégrations Inbox"**

### 4.2 Créer l'intégration SMS

1. Cliquez sur le bouton **"Ajouter une intégration"**
2. Dans le formulaire qui s'ouvre :
   
   **Type d'intégration** : Sélectionnez **"📱 SMS (Vonage)"**

   **Nom** : Donnez un nom à votre intégration (ex: "SMS Vonage Principal")

   **Numéro Vonage** : 
   - Entrez votre numéro Vonage acheté à l'étape 2
   - Format : `33612345678` ou `+33612345678` (les deux fonctionnent)

   **API Key Vonage** : 
   - Collez votre API Key récupérée à l'étape 3

   **API Secret Vonage** : 
   - Collez votre API Secret récupérée à l'étape 3

3. Cochez **"Activer cette intégration"** si vous voulez l'utiliser immédiatement
4. Cliquez sur **"Enregistrer"**

✅ L'intégration est maintenant configurée !

---

## 🔗 Étape 5 : Configurer le webhook pour recevoir les SMS

Pour que votre application puisse **recevoir** les SMS, vous devez configurer un webhook dans Vonage.

### 5.1 Obtenir l'URL de votre webhook

Selon votre environnement :

**En production (Railway/Vercel)** :
```
https://votre-domaine.com/inbox/webhooks/sms
```
Exemple : `https://lokario-staging.up.railway.app/inbox/webhooks/sms`

**En développement local** :
Vous devez utiliser un tunnel (ngrok, localtunnel, etc.) :
```
https://votre-url-ngrok.ngrok.io/inbox/webhooks/sms
```

### 5.2 Configurer le webhook dans Vonage

1. Dans votre Dashboard Vonage, allez dans **"Numbers"** → **"Your Numbers"**
2. Cliquez sur votre numéro de téléphone
3. Dans la section **"Inbound SMS"** ou **"Webhooks"**, trouvez le champ **"Webhook URL"**
4. Entrez votre URL webhook :
   ```
   https://votre-domaine.com/inbox/webhooks/sms
   ```
5. Sélectionnez **HTTP Method** : `POST`
6. Cliquez sur **"Save"** ou **"Update"**

⚠️ **Note** : Vonage peut prendre quelques minutes pour activer le webhook.

---

## ✅ Étape 6 : Tester l'intégration

### 6.1 Tester l'envoi d'un SMS

1. Allez dans **Inbox** dans votre application
2. Créez une nouvelle conversation ou ouvrez une conversation existante
3. Tapez un message
4. Cliquez sur **Envoyer**
5. Vérifiez que le SMS a bien été envoyé (vous devriez le voir dans la conversation)

### 6.2 Tester la réception d'un SMS

1. Envoyez un SMS depuis votre téléphone vers votre numéro Vonage
2. Attendez quelques secondes
3. Rafraîchissez votre Inbox dans l'application
4. Vous devriez voir apparaître une nouvelle conversation avec le SMS reçu

---

## 🔍 Dépannage

### Les SMS ne sont pas envoyés

1. ✅ Vérifiez que vos credentials API (API Key et API Secret) sont corrects
2. ✅ Vérifiez que votre numéro Vonage est bien configuré dans l'intégration
3. ✅ Vérifiez que le numéro du destinataire est au bon format (format international : `33612345678` ou `+33612345678`)
4. ✅ Consultez les logs du backend pour voir les erreurs éventuelles
5. ✅ Vérifiez votre solde Vonage dans le Dashboard (certains comptes ont un crédit limité)

### Les SMS ne sont pas reçus

1. ✅ Vérifiez que le webhook est bien configuré dans votre Dashboard Vonage
2. ✅ Vérifiez que l'URL du webhook est accessible publiquement (pas de firewall bloquant)
3. ✅ Vérifiez que l'URL du webhook se termine bien par `/inbox/webhooks/sms`
4. ✅ Vérifiez que la méthode HTTP est bien `POST`
5. ✅ Consultez les logs du backend pour voir si les webhooks arrivent
6. ✅ Testez avec un outil comme ngrok si vous êtes en développement local

### Erreur "Invalid credentials"

- Vérifiez que votre API Key et API Secret sont corrects
- Vérifiez qu'il n'y a pas d'espaces avant ou après les credentials
- Vérifiez que vous utilisez les bonnes credentials (production vs sandbox)

### Erreur "Insufficient balance"

- Ajoutez des crédits à votre compte Vonage
- Allez dans **"Account"** → **"Top Up"** dans votre Dashboard

---

## 📊 Utilisation dans Lokario

Une fois configuré, Vonage SMS fonctionne automatiquement avec :

- ✅ **Inbox** : Envoi et réception de SMS
- ✅ **Relances automatiques** : Envoi de SMS via les relances
- ✅ **Réponses automatiques** : Envoi de réponses automatiques par SMS
- ✅ **Conversations clients** : Gestion complète des conversations SMS

---

## 🔒 Sécurité

Les credentials Vonage sont stockés de manière sécurisée dans la base de données :

- ✅ **Chiffrement** : Les API Key et API Secret sont chiffrés avant stockage
- ✅ **Pas de logs** : Les credentials ne sont jamais loggés en clair
- ✅ **HTTPS** : Toutes les communications se font en HTTPS

---

## 📚 Ressources supplémentaires

- [Documentation officielle Vonage SMS](https://developer.vonage.com/en/sms/overview)
- [API Reference Vonage](https://developer.vonage.com/api/sms)
- [Dashboard Vonage](https://dashboard.nexmo.com/)
- [Support Vonage](https://support.nexmo.com/)

---

## 💡 Astuces

1. **Numéro alphanumérique** : Vous pouvez utiliser un nom alphanumérique (ex: "LOKARIO") au lieu d'un numéro pour l'envoi, mais cela peut être bloqué par certains opérateurs
2. **Format des numéros** : Vonage accepte les numéros avec ou sans le `+`, mais il est recommandé d'utiliser le format international complet
3. **Prix** : Vérifiez les tarifs par pays sur le site Vonage avant d'envoyer des SMS en masse
4. **Limites** : Certains comptes ont des limites d'envoi quotidiennes, vérifiez dans votre Dashboard

---

## ✅ Checklist de configuration

- [ ] Compte Vonage créé
- [ ] Numéro de téléphone Vonage acheté
- [ ] API Key et API Secret récupérés
- [ ] Intégration SMS créée dans Lokario
- [ ] Webhook configuré dans Vonage
- [ ] Test d'envoi réussi
- [ ] Test de réception réussi

Une fois toutes ces étapes complétées, votre intégration Vonage est opérationnelle ! 🎉

