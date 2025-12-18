# 📧 Paramètres IMAP/SMTP pour tous les fournisseurs d'email

Ce guide liste les paramètres de connexion IMAP/SMTP pour configurer votre intégration email dans Lokario.

## 📋 Table des matières

1. [Gmail](#gmail)
2. [Orange](#orange)
3. [OVH](#ovh)
4. [Hostinger](#hostinger)
5. [Outlook / Microsoft 365](#outlook--microsoft-365)
6. [Yahoo Mail](#yahoo-mail)
7. [SFR](#sfr)
8. [Bouygues Telecom](#bouygues-telecom)
9. [Free](#free)
10. [Autres fournisseurs](#autres-fournisseurs)

---

## 🔵 Gmail

### IMAP (Réception)
- **Serveur IMAP** : `imap.gmail.com`
- **Port IMAP** : `993`
- **SSL/TLS** : ✅ Activé (SSL)

### SMTP (Envoi)
- **Serveur SMTP** : `smtp.gmail.com`
- **Port SMTP** : `587` (TLS) ou `465` (SSL)
- **TLS/SSL** : ✅ Activé

### ⚠️ Mot de passe spécial requis
**Important** : Gmail nécessite un **mot de passe d'application** (pas votre mot de passe normal).

1. Activez l'authentification à 2 facteurs : https://myaccount.google.com/security
2. Générez un mot de passe d'application : https://myaccount.google.com/apppasswords
   - Application : "Mail"
   - Appareil : "Autre (nom personnalisé)" → "Lokario IMAP"
   - Copiez le mot de passe de 16 caractères (sans espaces)

**Dans Lokario** :
- Email : `votre.email@gmail.com`
- Mot de passe : Le mot de passe d'application généré (16 caractères, sans espaces)

---

## 🟠 Orange

### IMAP (Réception)
- **Serveur IMAP** : `imap.orange.fr`
- **Port IMAP** : `993`
- **SSL/TLS** : ✅ Activé (SSL)

### SMTP (Envoi)
- **Serveur SMTP** : `smtp.orange.fr`
- **Port SMTP** : `465` (SSL) ou `587` (TLS)
- **TLS/SSL** : ✅ Activé

### ⚠️ Mot de passe
Utilisez votre **mot de passe Orange normal** (celui de votre compte Orange).

**Dans Lokario** :
- Email : `votre.email@orange.fr`
- Mot de passe : Votre mot de passe Orange

### 📝 Note
Si vous avez un compte Orange (ex: `@orange.fr`, `@wanadoo.fr`), utilisez ces paramètres. Pour les comptes Livebox, les paramètres peuvent varier.

---

## 🔵 OVH

### IMAP (Réception)
- **Serveur IMAP** : `ssl0.ovh.net` ou `imap.ovh.net`
- **Port IMAP** : `993`
- **SSL/TLS** : ✅ Activé (SSL)

### SMTP (Envoi)
- **Serveur SMTP** : `ssl0.ovh.net` ou `smtp.ovh.net`
- **Port SMTP** : `465` (SSL) ou `587` (TLS)
- **TLS/SSL** : ✅ Activé

### ⚠️ Mot de passe
Utilisez votre **mot de passe OVH normal** (celui configuré dans votre compte OVH).

**Dans Lokario** :
- Email : `votre.email@votre-domaine.com` (ou `@ovh.com`, etc.)
- Mot de passe : Votre mot de passe OVH

### 📝 Note
Pour les comptes email OVH (hébergement web ou email), utilisez `ssl0.ovh.net`. Si vous avez un domaine personnalisé hébergé chez OVH, utilisez les mêmes paramètres.

---

## 🟢 Hostinger

### IMAP (Réception)
- **Serveur IMAP** : `imap.hostinger.com`
- **Port IMAP** : `993`
- **SSL/TLS** : ✅ Activé (SSL)

### SMTP (Envoi)
- **Serveur SMTP** : `smtp.hostinger.com`
- **Port SMTP** : `465` (SSL) ou `587` (TLS)
- **TLS/SSL** : ✅ Activé

### ⚠️ Mot de passe
Utilisez votre **mot de passe d'email Hostinger** (celui configuré dans hPanel).

**Dans Lokario** :
- Email : `votre.email@votre-domaine.com`
- Mot de passe : Votre mot de passe d'email Hostinger

### 📝 Note
Si vous avez créé des comptes email via Hostinger (hPanel), utilisez ces paramètres. Le mot de passe est celui que vous avez défini lors de la création du compte email, **pas** votre mot de passe hPanel.

---

## 🔵 Outlook / Microsoft 365

### IMAP (Réception)
- **Serveur IMAP** : `outlook.office365.com` ou `imap-mail.outlook.com`
- **Port IMAP** : `993`
- **SSL/TLS** : ✅ Activé (SSL)

### SMTP (Envoi)
- **Serveur SMTP** : `smtp.office365.com` ou `smtp-mail.outlook.com`
- **Port SMTP** : `587` (TLS)
- **TLS/SSL** : ✅ Activé (STARTTLS)

### ⚠️ Mot de passe
Pour les comptes personnels Outlook/Hotmail, utilisez votre mot de passe Microsoft normal.

Pour Microsoft 365 (comptes professionnels), vous pourriez avoir besoin d'un **mot de passe d'application** si l'authentification à 2 facteurs est activée.

**Générer un mot de passe d'application (si 2FA activé)** :
1. Allez sur : https://account.microsoft.com/security
2. Activez l'authentification à 2 facteurs si pas déjà fait
3. Allez dans "Options de sécurité supplémentaires" → "Mots de passe d'application"
4. Générez un mot de passe d'application pour "Mail"

**Dans Lokario** :
- Email : `votre.email@outlook.com` ou `votre.email@votre-domaine.com`
- Mot de passe : Votre mot de passe Microsoft ou mot de passe d'application

---

## 🟣 Yahoo Mail

### IMAP (Réception)
- **Serveur IMAP** : `imap.mail.yahoo.com`
- **Port IMAP** : `993`
- **SSL/TLS** : ✅ Activé (SSL)

### SMTP (Envoi)
- **Serveur SMTP** : `smtp.mail.yahoo.com`
- **Port SMTP** : `465` (SSL) ou `587` (TLS)
- **TLS/SSL** : ✅ Activé

### ⚠️ Mot de passe spécial requis
Yahoo nécessite un **mot de passe d'application** pour les connexions IMAP/SMTP.

**Générer un mot de passe d'application** :
1. Allez sur : https://login.yahoo.com/account/security
2. Activez l'authentification à 2 facteurs si pas déjà fait
3. Allez dans "Générer un mot de passe d'application"
4. Sélectionnez "Mail" → "Autre" → Nommez-le "Lokario"
5. Copiez le mot de passe généré (sans espaces)

**Dans Lokario** :
- Email : `votre.email@yahoo.com` ou `votre.email@yahoo.fr`
- Mot de passe : Le mot de passe d'application généré

---

## 🟡 SFR

### IMAP (Réception)
- **Serveur IMAP** : `imap.sfr.fr`
- **Port IMAP** : `993`
- **SSL/TLS** : ✅ Activé (SSL)

### SMTP (Envoi)
- **Serveur SMTP** : `smtp.sfr.fr`
- **Port SMTP** : `465` (SSL) ou `587` (TLS)
- **TLS/SSL** : ✅ Activé

### ⚠️ Mot de passe
Utilisez votre **mot de passe SFR normal** (celui de votre compte SFR).

**Dans Lokario** :
- Email : `votre.email@sfr.fr` ou `votre.email@neuf.fr`
- Mot de passe : Votre mot de passe SFR

---

## 🔴 Bouygues Telecom

### IMAP (Réception)
- **Serveur IMAP** : `imap.bouyguestelecom.fr`
- **Port IMAP** : `993`
- **SSL/TLS** : ✅ Activé (SSL)

### SMTP (Envoi)
- **Serveur SMTP** : `smtp.bouyguestelecom.fr`
- **Port SMTP** : `465` (SSL) ou `587` (TLS)
- **TLS/SSL** : ✅ Activé

### ⚠️ Mot de passe
Utilisez votre **mot de passe Bouygues Telecom normal**.

**Dans Lokario** :
- Email : `votre.email@bbox.fr` ou `votre.email@bouyguestelecom.fr`
- Mot de passe : Votre mot de passe Bouygues Telecom

---

## 🔵 Free

### IMAP (Réception)
- **Serveur IMAP** : `imap.free.fr`
- **Port IMAP** : `993`
- **SSL/TLS** : ✅ Activé (SSL)

### SMTP (Envoi)
- **Serveur SMTP** : `smtp.free.fr`
- **Port SMTP** : `465` (SSL) ou `587` (TLS)
- **TLS/SSL** : ✅ Activé

### ⚠️ Mot de passe
Utilisez votre **mot de passe Free normal** (celui de votre compte Free).

**Dans Lokario** :
- Email : `votre.email@free.fr`
- Mot de passe : Votre mot de passe Free

---

## 🌐 Autres fournisseurs

### ProtonMail
**Note** : ProtonMail ne supporte pas IMAP/SMTP standard avec des clients externes. Utilisez plutôt Bridge (application officielle ProtonMail) qui crée un proxy IMAP/SMTP local. Ceci n'est **pas recommandé** pour Lokario en production.

### Zoho Mail
- **IMAP** : `imap.zoho.com` (port 993, SSL)
- **SMTP** : `smtp.zoho.com` (port 465 SSL ou 587 TLS)
- **Mot de passe** : Mot de passe normal ou mot de passe d'application si 2FA activé

### iCloud Mail (Apple)
- **IMAP** : `imap.mail.me.com` (port 993, SSL)
- **SMTP** : `smtp.mail.me.com` (port 587, TLS)
- **Mot de passe** : **Mot de passe d'application requis** (généré sur appleid.apple.com)

### FastMail
- **IMAP** : `imap.fastmail.com` (port 993, SSL)
- **SMTP** : `smtp.fastmail.com` (port 465 SSL ou 587 TLS)
- **Mot de passe** : Mot de passe normal

### Tutanota
**Note** : Tutanota ne supporte pas IMAP/SMTP standard. **Non compatible** avec Lokario.

### Infomaniak
- **IMAP** : `imap.infomaniak.com` (port 993, SSL)
- **SMTP** : `smtp.infomaniak.com` (port 465 SSL ou 587 TLS)
- **Mot de passe** : Mot de passe d'email configuré dans Infomaniak

### Gandi Mail
- **IMAP** : `imap.gandi.net` (port 993, SSL)
- **SMTP** : `smtp.gandi.net` (port 465 SSL ou 587 TLS)
- **Mot de passe** : Mot de passe d'email configuré dans Gandi

---

## 📝 Récapitulatif des paramètres communs

### Ports standard
- **IMAP avec SSL** : Port `993` (SSL/TLS)
- **IMAP sans SSL** : Port `143` (non recommandé)
- **SMTP avec SSL** : Port `465` (SSL/TLS)
- **SMTP avec STARTTLS** : Port `587` (TLS)

### Dans Lokario
Lors de la configuration de votre intégration email, vous devrez renseigner :

1. **Type d'intégration** : IMAP
2. **Serveur IMAP** : (voir tableau ci-dessus selon votre fournisseur)
3. **Port IMAP** : `993` (généralement)
4. **SSL activé** : ✅ Oui
5. **Email** : Votre adresse email complète
6. **Mot de passe** : Voir les notes spécifiques par fournisseur ci-dessus

---

## ⚠️ Notes importantes

### Authentification à 2 facteurs (2FA)
Si votre fournisseur d'email a l'authentification à 2 facteurs activée, vous aurez généralement besoin d'un **mot de passe d'application** plutôt que votre mot de passe normal :

- ✅ **Gmail** : Mot de passe d'application requis
- ✅ **Yahoo** : Mot de passe d'application requis
- ✅ **iCloud** : Mot de passe d'application requis
- ⚠️ **Microsoft 365** : Mot de passe d'application requis si 2FA activé
- ❌ **Orange, OVH, Hostinger, SFR, Free, Bouygues** : Mot de passe normal généralement suffisant

### Sécurité
- Utilisez **toujours SSL/TLS** pour les connexions IMAP/SMTP (ports 993, 465, ou 587)
- Ne partagez jamais vos mots de passe d'application
- Ne commitez jamais vos mots de passe dans le code
- Si vous suspectez une compromission, changez immédiatement votre mot de passe

### Dépannage
Si la connexion échoue :

1. **Vérifiez que les paramètres sont corrects** (serveur, port, SSL)
2. **Vérifiez le mot de passe** (mot de passe d'application si requis)
3. **Vérifiez que l'accès IMAP/SMTP est activé** dans les paramètres de votre compte email
4. **Vérifiez votre pare-feu** (certains réseaux bloquent les ports IMAP/SMTP)
5. **Contactez le support de votre fournisseur d'email** si le problème persiste

---

## 🔗 Liens utiles

- **Gmail** : https://myaccount.google.com/apppasswords
- **Yahoo** : https://login.yahoo.com/account/security
- **Microsoft** : https://account.microsoft.com/security
- **iCloud** : https://appleid.apple.com

---

**Dernière mise à jour** : Décembre 2024
