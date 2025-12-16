# 📧 Guide d'intégration des emails

Ce guide vous explique comment configurer la réception automatique des emails dans votre application Lokario.

## 🎯 Vue d'ensemble

L'application peut recevoir automatiquement les emails de **plusieurs boîtes mail** (Gmail, Orange, Mail Pro, etc.) et les afficher dans le module **Inbox**. Les emails sont synchronisés automatiquement toutes les 5 minutes (ou selon l'intervalle configuré).

---

## 📋 Prérequis

- Être **propriétaire (owner)** de l'entreprise
- Avoir accès aux identifiants de la boîte mail à connecter
- Pour Gmail : avoir activé la validation en 2 étapes et généré un mot de passe d'application

---

## 🚀 Étape 1 : Configurer une boîte mail depuis l'interface

### 1.1 Accéder aux paramètres

1. Connectez-vous à l'application en tant que **propriétaire**
2. Allez dans **Paramètres** (icône ⚙️ dans la sidebar)
3. Cliquez sur l'onglet **"Intégrations"**

### 1.2 Ajouter une nouvelle boîte mail

1. Cliquez sur le bouton **"+ Ajouter une boîte mail"**
2. Remplissez le formulaire :

#### Informations de base
- **Nom de l'intégration** : Un nom pour identifier cette boîte (ex: "Boîte principale", "Support client")
- **Préconfiguration** : Sélectionnez votre fournisseur (Gmail, Orange, etc.) pour remplir automatiquement les paramètres

#### Configuration IMAP
- **Adresse email** : L'adresse email complète (ex: `contact@moncommerce.fr`)
- **Mot de passe / App Password** : 
  - Pour Gmail : utilisez un **mot de passe d'application** (voir section Gmail ci-dessous)
  - Pour les autres : utilisez le mot de passe de la boîte mail
- **Serveur IMAP** : Rempli automatiquement si vous avez sélectionné une préconfiguration
- **Port** : Rempli automatiquement (généralement 993)
- **Utiliser SSL/TLS** : Coché par défaut (recommandé)

#### Paramètres de synchronisation
- **Intervalle de synchronisation** : Nombre de minutes entre chaque synchronisation (par défaut : 5 minutes)
- **Activer cette intégration** : Cochez pour activer la synchronisation automatique

3. Cliquez sur **"Créer"**

### 1.3 Tester la connexion

Après avoir créé l'intégration, vous pouvez tester manuellement :

1. Dans la liste des boîtes mail configurées, cliquez sur **"Synchroniser"**
2. Attendez quelques secondes
3. Vérifiez le statut :
   - ✅ **Synchronisé** : La connexion fonctionne
   - ❌ **Erreur** : Vérifiez les identifiants et la configuration
   - ⚠️ **Partiel** : Certains emails n'ont pas pu être importés

---

## 🔧 Étape 2 : Configurer la synchronisation automatique

Pour que les emails soient reçus automatiquement, vous devez configurer un **cron job** qui exécute le script de synchronisation.

### 2.1 Sur Mac/Linux

1. Ouvrez un terminal
2. Éditez le crontab :
   ```bash
   crontab -e
   ```
3. Ajoutez cette ligne pour synchroniser toutes les 5 minutes :
   ```bash
   */5 * * * * cd /chemin/vers/backend && /usr/bin/python3 scripts/sync_inbox_integrations.py >> logs/inbox_sync.log 2>&1
   ```
   ⚠️ Remplacez `/chemin/vers/backend` par le chemin réel vers votre dossier `backend`

4. Sauvegardez et quittez (dans vim/nano : `:wq` ou `Ctrl+X` puis `Y`)

### 2.2 Sur Windows

1. Ouvrez le **Planificateur de tâches** (Task Scheduler)
2. Créez une **tâche de base**
3. Configurez :
   - **Déclencheur** : Toutes les 5 minutes
   - **Action** : Exécuter un programme
   - **Programme** : `python`
   - **Arguments** : `scripts/sync_inbox_integrations.py`
   - **Répertoire de départ** : Chemin vers le dossier `backend`

### 2.3 Via Systemd (Production Linux)

Créez un service systemd pour une meilleure gestion :

1. Créez le fichier `/etc/systemd/system/inbox-sync.service` :
   ```ini
   [Unit]
   Description=Inbox Email Sync Service
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/chemin/vers/backend
   ExecStart=/usr/bin/python3 scripts/sync_inbox_integrations.py
   Restart=always
   RestartSec=60

   [Install]
   WantedBy=multi-user.target
   ```

2. Activez et démarrez le service :
   ```bash
   sudo systemctl enable inbox-sync
   sudo systemctl start inbox-sync
   ```

3. Vérifiez le statut :
   ```bash
   sudo systemctl status inbox-sync
   ```

---

## 📮 Configuration par fournisseur

### Gmail

#### 1. Activer la validation en 2 étapes

1. Allez sur [myaccount.google.com](https://myaccount.google.com)
2. **Sécurité** > **Validation en deux étapes**
3. Suivez les instructions pour activer la 2FA

#### 2. Générer un mot de passe d'application

1. Toujours dans **Sécurité**, allez dans **Mots de passe des applications**
2. Sélectionnez **"Autre (nom personnalisé)"**
3. Entrez un nom (ex: "Lokario IMAP")
4. Cliquez sur **"Générer"**
5. **Copiez le mot de passe** (16 caractères) - vous ne pourrez plus le voir après !

#### 3. Configuration dans Lokario

- **Serveur IMAP** : `imap.gmail.com`
- **Port** : `993`
- **Email** : Votre adresse Gmail complète
- **Mot de passe** : Le mot de passe d'application généré (pas votre mot de passe Gmail !)
- **SSL/TLS** : ✅ Activé

### Orange

#### Configuration dans Lokario

- **Serveur IMAP** : `imap.orange.fr`
- **Port** : `993`
- **Email** : Votre adresse Orange complète
- **Mot de passe** : Votre mot de passe Orange
- **SSL/TLS** : ✅ Activé

**Note** : Si vous avez activé la validation en 2 étapes, vous devrez peut-être générer un mot de passe d'application depuis votre compte Orange.

### Mail Pro (OVH)

#### Configuration dans Lokario

- **Serveur IMAP** : `ssl0.ovh.net`
- **Port** : `993`
- **Email** : Votre adresse email complète
- **Mot de passe** : Votre mot de passe de boîte mail
- **SSL/TLS** : ✅ Activé

### Outlook / Microsoft 365

#### Configuration dans Lokario

- **Serveur IMAP** : `outlook.office365.com`
- **Port** : `993`
- **Email** : Votre adresse Outlook complète
- **Mot de passe** : Votre mot de passe Microsoft
- **SSL/TLS** : ✅ Activé

**Note** : Si vous avez activé l'authentification à deux facteurs, vous devrez peut-être créer un mot de passe d'application depuis [account.microsoft.com](https://account.microsoft.com).

### Yahoo

#### Configuration dans Lokario

- **Serveur IMAP** : `imap.mail.yahoo.com`
- **Port** : `993`
- **Email** : Votre adresse Yahoo complète
- **Mot de passe** : Votre mot de passe Yahoo (ou mot de passe d'application si 2FA activé)
- **SSL/TLS** : ✅ Activé

### Ionos

#### Configuration dans Lokario

- **Serveur IMAP** : `imap.ionos.fr`
- **Port** : `993`
- **Email** : Votre adresse email complète
- **Mot de passe** : Votre mot de passe de boîte mail
- **SSL/TLS** : ✅ Activé

---

## 🧪 Tester manuellement

Avant de configurer le cron job, testez la synchronisation manuellement :

### Via le terminal

```bash
cd backend
python3 scripts/sync_inbox_integrations.py
```

Vous devriez voir :
```
🔄 Synchronisation de 1 intégration(s)...
📧 Synchronisation de 'Boîte principale Gmail' (imap)...
✅ 'Boîte principale Gmail': 3 email(s) traité(s)
✅ Synchronisation terminée
```

### Via l'interface

1. Allez dans **Paramètres** > **Intégrations**
2. Cliquez sur **"Synchroniser"** à côté de la boîte mail
3. Attendez quelques secondes
4. Vérifiez le statut de synchronisation

### Via l'API

```bash
curl -X POST http://localhost:8000/inbox/integrations/1/sync \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

---

## 📊 Vérifier que ça fonctionne

### 1. Vérifier les emails dans l'Inbox

1. Allez dans le module **Inbox**
2. Vous devriez voir les emails reçus apparaître dans la liste
3. Les emails sont automatiquement associés aux clients si l'adresse email correspond

### 2. Vérifier les logs de synchronisation

Si vous avez configuré le cron job avec des logs :

```bash
tail -f logs/inbox_sync.log
```

Vous verrez les synchronisations en temps réel.

### 3. Vérifier le statut dans l'interface

Dans **Paramètres** > **Intégrations**, chaque boîte mail affiche :
- **Dernière synchronisation** : Quand la dernière sync a eu lieu
- **Statut** : ✅ Synchronisé, ❌ Erreur, ou ⚠️ Partiel
- **Erreur** : Message d'erreur si la synchronisation a échoué

---

## 🔍 Dépannage

### Erreur : "Authentication failed"

**Causes possibles :**
- Mot de passe incorrect
- Pour Gmail : vous utilisez votre mot de passe au lieu d'un mot de passe d'application
- Validation en 2 étapes activée sans mot de passe d'application

**Solutions :**
1. Vérifiez que vous utilisez le bon mot de passe
2. Pour Gmail : générez un nouveau mot de passe d'application
3. Testez la connexion depuis un client email (Thunderbird, Mail) pour vérifier que les identifiants fonctionnent

### Erreur : "Connection refused" ou "Timeout"

**Causes possibles :**
- Serveur IMAP incorrect
- Port incorrect
- Firewall bloquant la connexion
- SSL/TLS mal configuré

**Solutions :**
1. Vérifiez le serveur IMAP (voir section "Configuration par fournisseur")
2. Vérifiez que le port est correct (généralement 993 pour SSL)
3. Essayez avec SSL/TLS activé et désactivé
4. Vérifiez que votre firewall/autorouteur n'bloque pas les connexions sortantes sur le port 993

### Les emails ne s'affichent pas dans l'Inbox

**Causes possibles :**
- La synchronisation n'a pas encore été exécutée
- Le cron job n'est pas configuré
- Les emails sont dans le dossier "Spam" ou "Corbeille"

**Solutions :**
1. Synchronisez manuellement depuis l'interface
2. Vérifiez que le cron job est bien configuré et actif
3. Vérifiez les logs pour voir s'il y a des erreurs
4. Assurez-vous que les emails sont bien dans la boîte de réception principale

### Erreur : "Too many login attempts"

**Causes possibles :**
- Trop de tentatives de connexion en peu de temps
- Gmail/Outlook a temporairement bloqué l'accès

**Solutions :**
1. Attendez 15-30 minutes
2. Réduisez l'intervalle de synchronisation (passez de 5 à 10 ou 15 minutes)
3. Vérifiez que vous n'avez pas plusieurs cron jobs qui tournent en même temps

### Les emails sont dupliqués

**Causes possibles :**
- Le script de synchronisation tourne plusieurs fois en même temps
- Plusieurs intégrations pointent vers la même boîte mail

**Solutions :**
1. Vérifiez qu'il n'y a qu'un seul cron job configuré
2. Vérifiez qu'il n'y a qu'une seule intégration par boîte mail
3. Le système devrait normalement éviter les doublons grâce à `external_id`, mais si le problème persiste, contactez le support

---

## 📝 Bonnes pratiques

### 1. Utiliser des mots de passe d'application

Pour Gmail, Outlook et autres services avec 2FA, **toujours utiliser un mot de passe d'application** plutôt que votre mot de passe principal. C'est plus sécurisé et vous pouvez révoquer l'accès facilement.

### 2. Nommer clairement les intégrations

Donnez des noms explicites à vos intégrations :
- ✅ "Boîte principale - contact@moncommerce.fr"
- ✅ "Support client - support@moncommerce.fr"
- ❌ "Email 1", "Test", "Nouvelle intégration"

### 3. Configurer des intervalles raisonnables

- **5 minutes** : Pour les boîtes très actives
- **10-15 minutes** : Pour la plupart des cas
- **30 minutes** : Pour les boîtes peu actives

Évitez les intervalles trop courts (< 2 minutes) qui peuvent causer des problèmes de rate limiting.

### 4. Surveiller les statuts

Vérifiez régulièrement les statuts de synchronisation dans **Paramètres** > **Intégrations** pour détecter rapidement les problèmes.

### 5. Tester avant de mettre en production

Toujours tester manuellement avant de configurer le cron job pour s'assurer que tout fonctionne.

---

## 🆘 Support

Si vous rencontrez des problèmes :

1. **Vérifiez les logs** : `logs/inbox_sync.log` ou les logs du service systemd
2. **Testez manuellement** : Exécutez `python3 scripts/sync_inbox_integrations.py`
3. **Vérifiez la configuration** : Serveur, port, identifiants
4. **Contactez le support** : Avec les logs d'erreur et la configuration (sans le mot de passe !)

---

## 📚 Ressources supplémentaires

- [Guide d'automatisation backend](../backend/INBOX_AUTOMATION_GUIDE.md)
- [Documentation API Inbox](../backend/INBOX_INTEGRATIONS_GUIDE.md)
- [Configuration SMTP pour l'envoi](../backend/SMTP_SETUP_GUIDE.md)

---

**Dernière mise à jour** : Décembre 2024

