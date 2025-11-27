# 📊 ÉTAT DES LIEUX - Module Inbox

## ✅ CE QUI EXISTE DÉJÀ

### 1. Structure de base
- ✅ Layout 2 colonnes (liste + conversation)
- ✅ Page principale `/app/inbox/page.tsx`
- ✅ Composant `InboxList` pour la liste des conversations
- ✅ Composant `InboxConversation` pour l'affichage d'une conversation
- ✅ Types TypeScript définis (`InboxItem`, `Message`)

### 2. Affichage des messages
- ✅ Nom du client
- ✅ Aperçu du message (`lastMessage`)
- ✅ Date et heure
- ✅ Tag statut (À répondre / Répondu / En attente d'info)
- ✅ Historique basique des messages (affichage simple)

### 3. Fonctionnalités de réponse
- ✅ Zone de texte pour répondre
- ✅ Bouton "Générer une réponse" (IA)
- ✅ Bouton "Envoyer"
- ✅ Affichage des messages (client vs entreprise)

### 4. Actions rapides (basiques)
- ✅ Lien "Créer une tâche"
- ✅ Lien "Associer à un projet"
- ✅ Lien "Voir fiche client"

### 5. Header
- ✅ Titre "Boîte de réception"
- ✅ Description
- ✅ Bouton "Envoyer un email" (dans le header global)

---

## ❌ CE QUI MANQUE CRITIQUEMENT

### 🔴 PRIORITÉ 1 - Manque crucial

#### 1. Sidebar Inbox (catégories)
- ❌ **Aucune sidebar de filtres**
- ❌ Pas de catégories : Inbox / À répondre / En attente / Répondu / Archivés / Spam
- ❌ Pas de navigation par statut

#### 2. Historique conversation style chat
- ❌ **Historique incomplet** (seulement quelques messages affichés)
- ❌ Pas de format chat avec bulles (style WhatsApp)
- ❌ Pas de séparation par jours
- ❌ Pas de scroll infini ou pagination
- ❌ Pas de distinction visuelle claire entre messages client/entreprise
- ❌ Pas de pièces jointes dans l'historique

#### 3. Notes internes
- ❌ **Aucune fonctionnalité de notes**
- ❌ Pas de panneau latéral "Notes internes"
- ❌ Pas de possibilité d'ajouter des notes privées à l'équipe

#### 4. Fiche client latérale
- ❌ **Aucun panneau latéral client**
- ❌ Pas d'affichage des infos client (email, téléphone, adresse)
- ❌ Pas d'historique d'achats
- ❌ Pas de devis/factures associés
- ❌ Pas de projets ouverts
- ❌ Pas d'anciennes conversations
- ❌ Pas de statut client (nouveau / récurrent / VIP)

#### 5. Pièces jointes
- ❌ **Aucune gestion de fichiers**
- ❌ Pas d'upload d'images
- ❌ Pas d'upload de PDF
- ❌ Pas d'aperçu des pièces jointes
- ❌ Pas d'icône "📎" pour les attachements

#### 6. Recherche et filtres
- ❌ **Aucune barre de recherche**
- ❌ Pas de recherche par client
- ❌ Pas de recherche par mot-clé
- ❌ Pas de recherche par numéro de facture
- ❌ Pas de recherche par téléphone
- ❌ Pas de filtres rapides (chips)
- ❌ Pas de filtre par source (Email / WhatsApp / Messenger)
- ❌ Pas de filtre par employé

#### 7. Indicateurs visuels
- ❌ Pas de point de couleur pour le statut
- ❌ Pas d'avatar ou initiales du client
- ❌ Pas d'icône source (✉️ email / 📱 WhatsApp / FB Messenger)
- ❌ Pas d'indicateur "Urgent" / "Critique"

---

### 🟠 PRIORITÉ 2 - Manque important

#### 8. Multi-sources
- ❌ **Uniquement email simulé**
- ❌ Pas de support WhatsApp
- ❌ Pas de support Messenger
- ❌ Pas de support formulaire site web
- ❌ Pas de champ `source` dans les types

#### 9. Statuts avancés
- ❌ Statuts limités (3 seulement : À répondre / Répondu / En attente d'info)
- ❌ Pas de statut "Résolu"
- ❌ Pas de statut "Urgent"
- ❌ Pas de modification manuelle du statut dans la vue conversation
- ❌ Pas de changement automatique de statut

#### 10. Gestion du volume
- ❌ **Pas de pagination**
- ❌ Pas de scroll infini
- ❌ Pas de gestion pour 200+ messages par mois

#### 11. Header avec résumé
- ❌ Pas de résumé de la journée
- ❌ Pas de compteur "X messages en attente"
- ❌ Pas de compteur "X urgents"
- ❌ Pas de compteur "X clients en attente"

#### 12. Raccourcis IA avancés
- ❌ Seulement "Générer une réponse" (basique)
- ❌ Pas de "Générer réponse courte"
- ❌ Pas de "Générer réponse détaillée"
- ❌ Pas de "Résumer le message"
- ❌ Pas d'identification automatique de la demande

#### 13. Boutons actions rapides enrichis
- ⚠️ Actions basiques existent mais incomplètes
- ❌ Pas de "Créer une relance" depuis l'inbox
- ❌ Pas de modal pour créer une tâche directement
- ❌ Pas de modal pour créer un projet directement
- ❌ Pas d'association directe client/projet depuis l'inbox

---

### 🟡 PRIORITÉ 3 - Automatisations

#### 14. Automatisations Inbox
- ❌ **Aucune automatisation**
- ❌ Pas de relance automatique après 24h
- ❌ Pas de changement automatique de statut
- ❌ Pas de détection automatique du sujet
- ❌ Pas d'alertes pour messages critiques non traités
- ❌ Pas de connexion avec le module Automatisations

---

## 📋 RÉSUMÉ PAR CATÉGORIE

### Structure & Layout
- ✅ Layout 2 colonnes
- ❌ Sidebar de filtres
- ❌ Header avec résumé

### Liste des messages
- ✅ Affichage basique (nom, aperçu, date, statut)
- ❌ Recherche
- ❌ Filtres avancés
- ❌ Indicateurs visuels (avatar, icône source, couleur)
- ❌ Pagination / scroll infini

### Vue conversation
- ✅ Affichage basique des messages
- ✅ Zone de réponse
- ✅ Génération IA basique
- ❌ Historique complet style chat
- ❌ Pièces jointes
- ❌ Notes internes
- ❌ Fiche client latérale
- ❌ Raccourcis IA avancés
- ❌ Actions rapides enrichies

### Statuts & Organisation
- ✅ 3 statuts basiques
- ❌ Statuts avancés (Résolu, Urgent)
- ❌ Modification manuelle du statut
- ❌ Changement automatique de statut

### Multi-sources
- ❌ Email (simulé seulement)
- ❌ WhatsApp
- ❌ Messenger
- ❌ Formulaire site web

### Automatisations
- ❌ Toutes les automatisations manquantes

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Phase 1 - Critiques (à faire en premier)
1. **Sidebar de filtres** (Inbox / À répondre / En attente / Répondu / Archivés / Spam)
2. **Historique conversation style chat** (bulles, séparation par jours, scroll infini)
3. **Recherche et filtres** (barre de recherche + chips de filtres)
4. **Fiche client latérale** (panneau avec toutes les infos client)
5. **Pièces jointes** (upload, aperçu, affichage)

### Phase 2 - Importantes
6. **Notes internes** (panneau latéral)
7. **Statuts avancés** (Résolu, Urgent, modification manuelle)
8. **Indicateurs visuels** (avatar, icône source, points de couleur)
9. **Header avec résumé** (compteurs de la journée)
10. **Raccourcis IA enrichis** (courte, détaillée, résumé, identification)

### Phase 3 - Automatisations
11. **Multi-sources** (WhatsApp, Messenger, formulaire)
12. **Automatisations Inbox** (relances, changements de statut, détection)

---

## 📊 SCORE ACTUEL

**Fonctionnalités complètes : ~15%**

- ✅ Structure de base : 80%
- ❌ Fonctionnalités avancées : 5%
- ❌ Automatisations : 0%

**Pour un module Inbox professionnel : il manque ~85% des fonctionnalités critiques.**

