# 🔧 Debug : Erreur "Bad Credentials" Vonage SMS

## ❌ Erreur Rencontrée

```
[VONAGE] Erreur API: Bad Credentials
[FOLLOWUP SEND/32] ❌ Échec de l'envoi SMS: Bad Credentials
```

## 🔍 Causes Possibles

1. **Credentials incorrects dans la base de données**
   - API Key Vonage incorrecte
   - API Secret Vonage incorrecte
   - Credentials mal copiés depuis le Dashboard Vonage

2. **Problème de chiffrement**
   - Les credentials ont été chiffrés avec une clé différente
   - `ENCRYPTION_MASTER_KEY` différente entre staging et production
   - Les credentials ne sont pas chiffrés mais le système essaie de les déchiffrer (ou vice versa)

3. **Credentials expirés ou révoqués**
   - Les credentials ont été régénérés dans Vonage
   - Le compte Vonage a été suspendu

## ✅ Solutions

### Solution 1 : Vérifier les Credentials dans Vonage Dashboard

1. **Allez sur le Dashboard Vonage**
   - https://dashboard.nexmo.com/
   - Connectez-vous à votre compte

2. **Vérifiez vos credentials**
   - Allez dans **Settings** → **API Keys**
   - Notez votre **API Key** et **API Secret**

3. **Comparez avec ceux dans votre application**
   - Dans votre interface, allez dans **Paramètres** → **Intégrations Inbox**
   - Vérifiez que les credentials correspondent

### Solution 2 : Mettre à Jour les Credentials

Si les credentials sont incorrects, vous devez les mettre à jour :

1. **Dans l'interface de l'application**
   - Allez dans **Paramètres** → **Intégrations Inbox**
   - Trouvez votre intégration SMS
   - Cliquez sur **Modifier**
   - Mettez à jour :
     - **API Key Vonage** : Votre API Key depuis le Dashboard Vonage
     - **API Secret Vonage** : Votre API Secret depuis le Dashboard Vonage
   - **Sauvegardez**

2. **Les credentials seront automatiquement chiffrés et stockés**

### Solution 3 : Vérifier ENCRYPTION_MASTER_KEY

Si vous avez un problème de chiffrement :

1. **Vérifiez que `ENCRYPTION_MASTER_KEY` est configurée**
   - Railway → Variables d'environnement
   - Vérifiez que `ENCRYPTION_MASTER_KEY` existe

2. **Important** : La clé doit être **identique** entre :
   - L'environnement où vous avez créé/mis à jour l'intégration
   - L'environnement où vous essayez d'envoyer les SMS

3. **Si la clé a changé** :
   - Vous devrez recréer l'intégration SMS avec les nouveaux credentials
   - Ou utiliser la même clé de chiffrement

### Solution 4 : Tester avec le Script de Test

Utilisez le script de test pour vérifier les credentials :

```bash
cd backend
python scripts/test_vonage_sms.py
```

Ce script :
- Récupère l'intégration SMS
- Affiche les credentials (masqués)
- Teste l'envoi d'un SMS
- Vous dira si les credentials sont corrects

## 🔍 Diagnostic dans les Logs

Cherchez ces messages dans les logs Railway :

### ✅ Si le décryptage fonctionne :
```
[FOLLOWUP SEND/32] 📱 Envoi du SMS de +33770024283 à 0682613941
[VONAGE] Envoi SMS de 33770024283 vers 33682613941
```

### ❌ Si le décryptage échoue :
```
❌ Impossible de décrypter les credentials Vonage
```

### ❌ Si les credentials sont incorrects :
```
[VONAGE] Erreur API: Bad Credentials
```

## 📝 Checklist de Vérification

- [ ] Les credentials Vonage dans le Dashboard sont corrects
- [ ] L'API Key correspond à celle dans l'intégration
- [ ] L'API Secret correspond à celui dans l'intégration
- [ ] Les credentials n'ont pas d'espaces avant/après
- [ ] `ENCRYPTION_MASTER_KEY` est configurée dans Railway
- [ ] La même clé de chiffrement est utilisée partout

## 💡 Conseils

1. **Copier les credentials** depuis le Dashboard Vonage en faisant attention :
   - Pas d'espaces avant/après
   - Pas de caractères invisibles
   - API Key et API Secret complets

2. **Si vous régénérez les credentials** dans Vonage :
   - Mettez à jour l'intégration dans l'application
   - Les anciens credentials ne fonctionneront plus

3. **Vérifier le solde Vonage** :
   - Allez dans le Dashboard Vonage
   - Vérifiez que vous avez du crédit disponible
   - Certains comptes ont un crédit limité

## 🆘 Si Rien Ne Fonctionne

1. **Créez une nouvelle intégration SMS** :
   - Supprimez l'ancienne intégration
   - Créez-en une nouvelle avec les bons credentials

2. **Vérifiez votre compte Vonage** :
   - Le compte est-il actif ?
   - Y a-t-il des restrictions ?
   - Le solde est-il suffisant ?

3. **Testez directement avec Vonage** :
   - Utilisez l'API Vonage directement (curl ou Postman)
   - Pour vérifier que vos credentials fonctionnent

