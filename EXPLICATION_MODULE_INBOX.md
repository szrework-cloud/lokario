# 📧 Module Inbox - Explication Complète

## 🎯 Vue d'ensemble

Le module **Inbox** est un système de gestion centralisée de toutes les communications clients (emails, SMS, WhatsApp) avec automatisation intelligente via l'IA. Il permet de recevoir, organiser, répondre et suivre toutes les conversations clients depuis une interface unique.

---

## 🔄 Flux de Fonctionnement

### 1. **Réception des Messages**

#### A. Emails (IMAP)
- **Synchronisation automatique** : Le système se connecte à votre boîte mail (Gmail, Outlook, OVH, etc.) via IMAP
- **Fréquence** : Toutes les minutes (cron job) ou manuellement
- **Processus** :
  1. Connexion sécurisée à la boîte mail
  2. Récupération des nouveaux emails
  3. Détection des doublons (évite les messages en double)
  4. Filtrage des newsletters automatique
  5. Création de conversations ou ajout aux conversations existantes

#### B. SMS (Vonage)
- **Webhook** : Vonage envoie les SMS reçus à votre serveur
- **URL** : `https://votre-domaine.com/inbox/webhooks/sms`
- **Processus** :
  1. Réception du webhook depuis Vonage
  2. Vérification de la signature HMAC (sécurité)
  3. Création de conversation ou ajout au thread existant

#### C. WhatsApp (Vonage)
- **Webhook** : Même principe que SMS
- **URL** : `https://votre-domaine.com/inbox/webhooks/whatsapp`

#### D. Webhooks personnalisés
- **API externe** : N'importe quel service peut envoyer des messages via webhook
- **Format JSON** standardisé
- **Sécurité** : Signature HMAC obligatoire

---

### 2. **Classification Automatique**

Dès qu'un message arrive, le système le classe automatiquement :

#### A. Par Statut
- **Nouveau** : Message non lu
- **En cours** : Conversation active
- **Résolu** : Problème résolu
- **Archivé** : Conversation terminée
- **Spam** : Message indésirable
- **Urgent** : Nécessite une attention immédiate

#### B. Par Dossier (Intelligent)
Le système utilise deux méthodes pour classer les messages dans des dossiers :

**Méthode 1 : Filtres IA (ChatGPT)**
- Analyse le contenu du message avec l'IA
- Compare avec les règles définies pour chaque dossier
- Classe automatiquement dans le bon dossier

**Méthode 2 : Filtres par Règles**
- Filtres configurables :
  - **Expéditeur** : Email ou nom spécifique
  - **Objet** : Contient certains mots
  - **Contenu** : Mots-clés dans le message
  - **Combinaisons** : Plusieurs conditions (ET/OU)

**Exemple** :
- Dossier "Rendez-vous" : Si l'objet contient "RDV" OU le contenu contient "rendez-vous"
- Dossier "Support" : Si l'expéditeur est "support@client.com" ET le contenu contient "problème"

#### C. Reclassification
- Lors de la synchronisation, les conversations sans dossier sont reclassées
- Si vous modifiez les règles d'un dossier, les conversations sont reclassées automatiquement

---

### 3. **Réponses Automatiques (Auto-Reply)**

Le système peut répondre automatiquement aux messages clients :

#### A. Configuration
1. **Activer l'auto-réponse** dans les paramètres du dossier
2. **Choisir le mode** :
   - **Automatique** : Envoi immédiat sans validation
   - **Avec validation** : Génère la réponse, vous validez avant envoi
3. **Configurer le prompt** : Dans les paramètres généraux, définir le prompt pour générer les réponses
4. **Base de connaissances** (optionnel) : Ajouter des infos sur votre entreprise pour enrichir les réponses

#### B. Fonctionnement
1. **Déclenchement** : Dès qu'un message client arrive dans un dossier avec auto-réponse activée
2. **Génération IA** :
   - Analyse de toute la conversation
   - Utilisation du prompt personnalisé
   - Ajout de la base de connaissances si activée
   - Génération d'une réponse contextuelle et professionnelle
3. **Envoi** :
   - **Mode auto** : Envoi immédiat par email/SMS
   - **Mode validation** : Affichage dans l'interface, vous modifiez et envoyez

#### C. Sécurité Anti-Boucle
- Le système détecte si vous avez répondu récemment (2 dernières minutes)
- Évite les boucles infinies si l'envoi échoue
- Permet plusieurs auto-réponses par conversation (si vous répondez manuellement entre temps)

---

### 4. **Gestion des Conversations**

#### A. Interface Utilisateur
- **Liste des conversations** : Vue d'ensemble avec statut, dossier, client
- **Vue conversation** : Fil de discussion complet
- **Filtres** : Par dossier, statut, source (email/SMS), employé assigné
- **Recherche** : Recherche dans le contenu des messages

#### B. Actions Disponibles
- **Répondre** : Envoyer une réponse manuelle
- **Attribuer** : Assigner la conversation à un employé
- **Changer le statut** : Nouveau → En cours → Résolu
- **Déplacer** : Changer de dossier
- **Notes internes** : Ajouter des notes privées (non visibles par le client)
- **Pièces jointes** : Envoyer/recevoir des fichiers
- **Créer une tâche** : Depuis la conversation
- **Créer une relance** : Programmer un suivi

#### C. Informations Client
- **Panel client** : Affiche les infos du client (nom, email, téléphone)
- **Historique** : Toutes les conversations avec ce client
- **Création automatique** : Si le client n'existe pas, il est créé automatiquement

---

### 5. **Intelligence Artificielle**

#### A. Génération de Réponses
- **Contexte** : Analyse toute la conversation
- **Personnalisation** : Utilise le prompt de votre entreprise
- **Ton professionnel** : Réponses adaptées au contexte
- **Base de connaissances** : Enrichit avec vos infos produits/services

#### B. Résumé de Conversations
- **Résumé automatique** : Synthèse des points clés
- **Utile pour** : Conversations longues, prise de relais entre équipes

#### C. Classification Intelligente
- **Analyse sémantique** : Comprend le sens du message
- **Détection d'intention** : Urgent, question, réclamation, etc.

---

### 6. **Sécurité**

#### A. Chiffrement
- **Mots de passe** : Chiffrés en AES-256-GCM
- **Clés API** : Chiffrées avant stockage
- **Décryptage** : Automatique lors de l'utilisation

#### B. Validation
- **Webhooks** : Signature HMAC obligatoire
- **Fichiers** : Validation du type, taille, contenu réel
- **Path traversal** : Protection contre les attaques

#### C. Logs
- **Données sensibles** : Masquées automatiquement dans les logs
- **Traçabilité** : Toutes les actions sont loggées

---

## 📊 Cas d'Usage Concrets

### Cas 1 : E-commerce
1. **Client envoie un email** : "Où est ma commande #12345 ?"
2. **Classification** : Automatiquement dans le dossier "Commandes"
3. **Auto-réponse** : "Votre commande a été expédiée le [date]. Numéro de suivi : [tracking]"
4. **Si besoin** : Vous pouvez compléter manuellement

### Cas 2 : Support Technique
1. **Client SMS** : "Mon compte ne fonctionne pas"
2. **Classification** : Dossier "Support"
3. **Auto-réponse (validation)** : L'IA génère une réponse, vous la validez/modifiez
4. **Attribution** : Assignez à un technicien
5. **Résolution** : Le technicien répond, change le statut en "Résolu"

### Cas 3 : Prise de Rendez-vous
1. **Client email** : "Je voudrais prendre RDV"
2. **Classification** : Dossier "Rendez-vous"
3. **Auto-réponse** : "Voici nos disponibilités : [lien calendrier]"
4. **Suivi** : Création automatique d'une relance si pas de réponse

---

## 🔧 Configuration Nécessaire

### 1. Intégrations
- **Email** : Configurer IMAP (serveur, port, identifiants)
- **SMS** : Configurer Vonage (clés API, numéro)
- **WhatsApp** : Configurer Vonage (même compte)

### 2. Dossiers
- Créer les dossiers selon vos besoins
- Configurer les filtres (IA ou règles)
- Activer l'auto-réponse si souhaité

### 3. IA
- Configurer le prompt de réponse (obligatoire)
- Ajouter la base de connaissances (optionnel)
- Tester avec quelques messages

### 4. Synchronisation
- **Manuelle** : Bouton "Synchroniser" dans l'interface
- **Automatique** : Cron job toutes les minutes (production)

---

## 🎨 Interface Utilisateur

### Vue Principale
- **Sidebar gauche** : Liste des dossiers + compteurs
- **Centre** : Liste des conversations
- **Droite** : Vue détaillée de la conversation sélectionnée

### Fonctionnalités UI
- **Recherche en temps réel**
- **Filtres multiples** (dossier, statut, source, employé)
- **Tri** : Par date, priorité, statut
- **Compteurs** : Nombre de conversations non lues par dossier
- **Notifications** : Alertes pour nouvelles conversations

---

## 🔄 Synchronisation

### Automatique (Production)
- **Cron job** : Exécuté toutes les minutes
- **Script** : `backend/scripts/sync_emails_periodic.py`
- **Multi-entreprises** : Traite toutes les entreprises avec intégrations actives

### Manuelle
- **Bouton** : "Synchroniser" dans l'interface
- **Endpoint** : `/inbox/integrations/{id}/sync`
- **Reclassification** : Automatique après synchronisation

---

## 🚀 Points Forts du Module

1. **Centralisation** : Tous les canaux (email, SMS, WhatsApp) au même endroit
2. **Automatisation** : Classification et réponses automatiques
3. **Intelligence** : IA pour comprendre et répondre
4. **Flexibilité** : Dossiers personnalisables, filtres configurables
5. **Sécurité** : Chiffrement, validation, logs sécurisés
6. **Intégration** : Création automatique de tâches, relances, clients

---

## 📈 Statistiques et Suivi

Le module permet de suivre :
- **Volume de messages** : Par jour, semaine, mois
- **Temps de réponse** : Moyen, médian
- **Taux de résolution** : Conversations résolues
- **Répartition** : Par dossier, statut, source
- **Performance IA** : Taux de classification correcte

---

## 🔗 Intégrations avec Autres Modules

- **Clients** : Création automatique, mise à jour des infos
- **Tâches** : Création depuis une conversation
- **Relances** : Programmer un suivi depuis une conversation
- **Projets** : Lier une conversation à un projet

---

## 💡 En Résumé

Le module Inbox est votre **centre de communication client** :
- ✅ Reçoit tous les messages (email, SMS, WhatsApp)
- ✅ Classe automatiquement dans des dossiers
- ✅ Répond automatiquement avec l'IA
- ✅ Organise et suit toutes les conversations
- ✅ Sécurise toutes les données
- ✅ S'intègre avec les autres modules

**Résultat** : Vous gagnez du temps, améliorez votre réactivité et offrez une meilleure expérience client.














