# ⚡ Guide rapide : Intégrer une boîte mail en 5 minutes

## 🎯 Objectif

Connecter votre boîte mail Gmail/Orange/etc. pour recevoir automatiquement les emails dans l'Inbox.

---

## 📝 Étapes rapides

### 1️⃣ Configurer la boîte mail (2 min)

1. **Paramètres** > **Intégrations** > **"+ Ajouter une boîte mail"**
2. Sélectionnez votre fournisseur (Gmail, Orange, etc.)
3. Entrez votre **email** et **mot de passe**
4. Cliquez sur **"Créer"**

### 2️⃣ Tester (1 min)

1. Cliquez sur **"Synchroniser"** à côté de votre boîte mail
2. Vérifiez que le statut passe à ✅ **"Synchronisé"**

### 3️⃣ Activer l'automatisation (2 min)

#### Sur Mac/Linux :
```bash
crontab -e
# Ajoutez cette ligne :
*/5 * * * * cd /chemin/vers/backend && python3 scripts/sync_inbox_integrations.py
```

#### Sur Windows :
- Planificateur de tâches > Créer une tâche
- Déclencher : Toutes les 5 minutes
- Action : Exécuter `python scripts/sync_inbox_integrations.py`

---

## 🔑 Gmail : Mot de passe d'application

Si vous utilisez Gmail, vous **devez** créer un mot de passe d'application :

1. [myaccount.google.com](https://myaccount.google.com) > **Sécurité**
2. Activez la **Validation en 2 étapes** (si pas déjà fait)
3. **Mots de passe des applications** > **"Autre"** > Nommez-le "Lokario"
4. **Copiez le mot de passe** (16 caractères)
5. Utilisez ce mot de passe dans Lokario (pas votre mot de passe Gmail !)

---

## ✅ Vérification

1. Allez dans **Inbox**
2. Vous devriez voir vos emails apparaître
3. Les nouveaux emails arrivent automatiquement toutes les 5 minutes

---

## 🆘 Problème ?

- **Erreur d'authentification** : Vérifiez le mot de passe (pour Gmail, utilisez un mot de passe d'application)
- **Les emails n'apparaissent pas** : Cliquez sur "Synchroniser" manuellement
- **Besoin d'aide** : Consultez le [guide complet](GUIDE_INTEGRATION_EMAILS.md)

---

**C'est tout ! 🎉** Vos emails sont maintenant synchronisés automatiquement.

