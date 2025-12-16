# 📋 Explication des 3 Modules de Tâches

Ce document explique l'utilité et le fonctionnement des trois modules principaux de la page des tâches : **Aujourd'hui**, **Priorités**, et **Toutes les tâches**.

---

## 🗓️ Module 1 : "Aujourd'hui"

### Utilité
Le module **"Aujourd'hui"** est la vue principale pour la gestion quotidienne des tâches. Il offre une vue d'ensemble de tout ce qui doit être fait aujourd'hui, avec un focus sur l'urgence et les priorités immédiates.

### Fonctionnement

#### Pour les Employés (vue simplifiée)
- **Affichage** : Liste simple et épurée des tâches du jour
- **Contenu** :
  - Tâches manuelles assignées pour aujourd'hui
  - Tâches générées automatiquement par les checklists/routines
- **Actions** : Cocher/décocher les tâches pour les marquer comme terminées
- **Filtres** : Aucun (vue simplifiée)

#### Pour les Administrateurs/Owners (vue complète)
Le module est organisé en **4 sections principales** :

##### 1. ⚠️ Section "En retard" (prioritaire)
- **Contenu** : Tâches dont la date d'échéance est dépassée
- **Affichage** : En haut de la page avec un badge d'alerte
- **Utilité** : Identifier immédiatement les tâches critiques nécessitant une action urgente

##### 2. 📅 Section "Tâches du jour"
- **Contenu** : Toutes les tâches prévues pour aujourd'hui
- **Fonctionnalités** :
  - Compteur de tâches
  - Options de tri (par heure, priorité, catégorie)
  - Lien "Voir tout" vers le module "Toutes les tâches"
- **Affichage** : Cartes de tâches avec toutes les informations (assigné, priorité, heure, statut)

##### 3. 🔄 Section "Tâches des routines"
- **Contenu** : Tâches générées automatiquement depuis les checklists/routines actives
- **Fonctionnement** :
  - Les checklists exécutées aujourd'hui génèrent des tâches individuelles
  - Chaque item de la checklist devient une tâche
  - Badge indiquant le nom de la checklist d'origine
- **Utilité** : Suivre la progression des routines quotidiennes (ex: ouverture magasin, fermeture)

##### 4. 📊 Section "Statistiques rapides"
Trois cartes de statistiques :
- **Progression** : Nombre de tâches terminées / total
- **Routines** : Nombre de routines actives aujourd'hui
- **Alerte** : Nombre de tâches critiques non faites

#### Badge d'information
En haut de la page, un badge affiche :
- Nombre total de tâches du jour
- Nombre de tâches en retard
- Nombre de checklists actives

#### Filtres disponibles (Admin/Owner uniquement)
- **Filtre par employé** : Voir les tâches d'un employé spécifique

#### API Backend
- **Endpoint** : `GET /tasks/today`
- **Retourne** : Liste des tâches dont la date d'échéance est aujourd'hui ou qui sont assignées pour aujourd'hui

---

## 🔥 Module 2 : "Priorités"

### Utilité
Le module **"Priorités"** permet de visualiser et gérer les tâches selon leur niveau de priorité. C'est idéal pour identifier rapidement les tâches les plus importantes et s'assurer qu'elles sont traitées en premier.

### Fonctionnement

#### Organisation par niveaux de priorité
Les tâches sont groupées en **5 catégories** :

1. **🔥 Critique** (rouge)
   - Tâches qui doivent absolument être faites aujourd'hui
   - Affichage avec badge "Doit être fait aujourd'hui"
   - Mise en évidence visuelle (fond rouge clair, bordure rouge)

2. **⚠️ Important** (orange)
   - Tâches de haute priorité nécessitant une attention rapide
   - Affichage standard avec TaskCard

3. **⚡ Urgent** (jaune)
   - Tâches urgentes mais moins critiques que les importantes
   - Affichage standard avec TaskCard

4. **📋 Moyenne** (gris)
   - Tâches normales sans urgence particulière
   - Affichage standard

5. **📝 Faible** (gris clair)
   - Tâches non urgentes pouvant être reportées
   - Affichage standard

#### Filtres disponibles
- **Boutons de filtre par priorité** :
  - Critique (rouge)
  - Important (orange)
  - Urgent (jaune)
- **Filtre par employé** : Dropdown pour filtrer par personne assignée

#### Section "Alerte Admin" (Admin/Owner uniquement)
Affiche un résumé des problèmes :
- Nombre de tâches où aucun employé n'a commencé
- Nombre de checklists non complétées
- Nombre de délais dépassés
- Nombre de tâches obligatoires non validées

#### API Backend
- **Endpoint** : `GET /tasks/priorities`
- **Retourne** : Objet avec les clés `critical`, `urgent`, `high`, `medium`, `low`, chacune contenant un tableau de tâches

---

## 📚 Module 3 : "Toutes les tâches"

### Utilité
Le module **"Toutes les tâches"** est la vue exhaustive et la plus complète. Il permet de voir, rechercher et filtrer toutes les tâches de l'entreprise, qu'elles soient d'aujourd'hui, passées ou futures.

### Fonctionnement

#### Barre de recherche
- **Recherche textuelle** : Recherche dans le titre des tâches
- **Filtrage en temps réel** : Les résultats se mettent à jour automatiquement

#### Filtres multiples
Le module offre **5 filtres combinables** :

1. **Statut** :
   - Tous les statuts
   - À faire
   - En cours
   - Terminé
   - En retard

2. **Catégorie** :
   - Toutes les catégories
   - Interne
   - Client
   - Fournisseur
   - Routine

3. **Employé** :
   - Tous les employés
   - Liste déroulante avec tous les employés de l'entreprise

4. **Priorité** :
   - Toutes les priorités
   - Critique
   - Haute
   - Moyenne
   - Faible

5. **Origine** :
   - Toutes les origines
   - Manuel (créées manuellement)
   - Généré par checklist (créées automatiquement)

#### Statistiques (Admin/Owner uniquement)
Quatre cartes de statistiques :
- **Total** : Nombre total de tâches
- **Complétées** : Nombre de tâches terminées
- **En retard** : Nombre de tâches en retard
- **Générées par checklist** : Nombre de tâches créées automatiquement

#### Affichage des tâches
- **Liste complète** : Toutes les tâches correspondant aux filtres
- **Badge d'origine** : Les tâches générées par checklist affichent un badge avec le nom de la checklist
- **Informations complètes** : Chaque tâche affiche :
  - Titre
  - Assigné à
  - Catégorie
  - Priorité
  - Date d'échéance
  - Heure (si applicable)
  - Statut
  - Actions (cocher, voir détails, ajouter commentaire)

#### Section "Tâches archivées"
- **Description** : Historique complet des 30-60 derniers jours
- **Fonctionnalité** : Bouton pour accéder à l'historique (à implémenter)

#### API Backend
- **Endpoint** : `GET /tasks`
- **Retourne** : Liste complète de toutes les tâches de l'entreprise
- **Filtrage** : Effectué côté frontend après récupération

---

## 🔄 Comparaison des 3 Modules

| Fonctionnalité | Aujourd'hui | Priorités | Toutes les tâches |
|----------------|--------------|-----------|-------------------|
| **Vue par défaut** | ✅ Oui | ❌ Non | ❌ Non |
| **Filtre par date** | ✅ Aujourd'hui uniquement | ❌ Non | ✅ Toutes les dates |
| **Filtre par priorité** | ❌ Non | ✅ Oui (groupé) | ✅ Oui (dropdown) |
| **Filtre par employé** | ✅ Oui (Admin) | ✅ Oui | ✅ Oui |
| **Filtre par statut** | ❌ Non | ❌ Non | ✅ Oui |
| **Filtre par catégorie** | ❌ Non | ❌ Non | ✅ Oui |
| **Filtre par origine** | ❌ Non | ❌ Non | ✅ Oui |
| **Recherche textuelle** | ❌ Non | ❌ Non | ✅ Oui |
| **Statistiques** | ✅ Oui (3 cartes) | ✅ Oui (alerte admin) | ✅ Oui (4 cartes) |
| **Tâches en retard** | ✅ Section dédiée | ❌ Non | ✅ Filtrable |
| **Tâches de routines** | ✅ Section dédiée | ❌ Non | ✅ Filtrable |
| **Vue employé** | ✅ Simplifiée | ❌ Non | ❌ Non |

---

## 🎯 Cas d'usage recommandés

### Utiliser "Aujourd'hui" quand :
- ✅ Vous voulez voir rapidement ce qui doit être fait aujourd'hui
- ✅ Vous êtes un employé et vous voulez une vue simple de vos tâches
- ✅ Vous voulez suivre les routines quotidiennes
- ✅ Vous voulez identifier les tâches en retard

### Utiliser "Priorités" quand :
- ✅ Vous voulez identifier les tâches les plus importantes
- ✅ Vous voulez gérer les urgences
- ✅ Vous êtes admin et voulez voir les alertes
- ✅ Vous voulez un aperçu rapide par niveau de priorité

### Utiliser "Toutes les tâches" quand :
- ✅ Vous voulez une vue exhaustive de toutes les tâches
- ✅ Vous voulez rechercher une tâche spécifique
- ✅ Vous voulez appliquer des filtres complexes
- ✅ Vous voulez voir l'historique et les statistiques globales
- ✅ Vous voulez gérer les tâches passées ou futures

---

## 🔧 Fonctionnalités communes aux 3 modules

Tous les modules partagent certaines fonctionnalités :

1. **Actions sur les tâches** :
   - Cocher/décocher pour marquer comme terminé
   - Voir les détails (à implémenter)
   - Ajouter un commentaire (à implémenter)
   - Supprimer (avec confirmation)

2. **Bouton "Ajouter une tâche"** :
   - Disponible en haut à droite
   - Ouvre un modal de création

3. **Notifications** :
   - Dropdown de notifications en haut à droite
   - Commun à tous les modules

4. **Mode Admin/Employé** :
   - Toggle pour basculer entre vue admin et vue employé (Admin/Owner uniquement)

---

## 📝 Notes techniques

- **Chargement des données** : Les données sont chargées une fois au montage du composant via `loadData()`
- **Mise à jour** : Les données sont rechargées après chaque action (création, modification, suppression)
- **Performance** : Le filtrage est effectué côté frontend pour une réactivité optimale
- **Permissions** : Les employés (`role: "user"`) ne voient que leurs propres tâches et ont une vue simplifiée

---

## 🚀 Évolutions futures possibles

- [ ] Implémentation de la modal de détails de tâche
- [ ] Système de commentaires sur les tâches
- [ ] Export des tâches (PDF, Excel)
- [ ] Vue calendrier
- [ ] Notifications push pour les tâches urgentes
- [ ] Historique complet des tâches archivées
- [ ] Graphiques de progression dans les statistiques
