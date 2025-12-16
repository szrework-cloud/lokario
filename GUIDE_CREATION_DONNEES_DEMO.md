# Guide : Créer des données de démo pour les captures d'écran

## 🎯 Objectif

Ce guide vous explique comment créer des données de démo réalistes dans votre application pour faire des captures d'écran pour la landing page, sans affecter vos données réelles.

## 📋 Prérequis

1. Avoir une entreprise créée dans l'application
2. Avoir un utilisateur owner ou admin pour cette entreprise
3. Avoir le backend démarré

## 🚀 Utilisation

### Étape 1 : Lancer le script

```bash
cd backend
python scripts/create_demo_data.py
```

### Étape 2 : Choisir l'entreprise

Le script vous affichera la liste des entreprises disponibles :

```
📋 Entreprises disponibles:
  1. Ma Boulangerie (ID: 1)
  2. Autre Entreprise (ID: 2)

👉 Entrez le numéro de l'entreprise (ou 'all' pour toutes):
```

- Entrez le **numéro** de l'entreprise (ex: `1`)
- Ou tapez `all` pour créer des données pour toutes les entreprises

### Étape 3 : Attendre la création

Le script va créer automatiquement :

✅ **5 clients** (Boulangerie, Café, Restaurant, Salon, Boutique)
✅ **8 tâches** (réparties sur plusieurs jours)
✅ **3 projets** (en cours et terminés)
✅ **3 devis** (avec différents statuts)
✅ **3 factures** (payées et envoyées)
✅ **3 rendez-vous** (sur plusieurs jours)
✅ **Relances** (pour les factures en attente)

## 📸 Faire les captures d'écran

Une fois les données créées :

1. **Connectez-vous** avec votre compte owner/admin
2. **Naviguez** dans les différents modules :
   - Dashboard → Voir les KPIs et statistiques
   - Tâches → Voir les tâches du jour
   - Clients → Voir la liste des clients
   - Projets → Voir les projets en cours
   - Devis & Factures → Voir les devis et factures
   - Rendez-vous → Voir l'agenda
   - Relances → Voir les relances à faire

3. **Faites vos captures d'écran** pour chaque module

## 🔄 Réinitialiser les données

Si vous voulez recommencer avec des données propres :

### Option 1 : Supprimer les données de démo manuellement

Vous pouvez supprimer les données créées depuis l'interface ou via SQL :

```sql
-- ATTENTION : Supprime toutes les données de l'entreprise
-- Remplacez COMPANY_ID par l'ID de votre entreprise

DELETE FROM tasks WHERE company_id = COMPANY_ID;
DELETE FROM projects WHERE company_id = COMPANY_ID;
DELETE FROM quotes WHERE company_id = COMPANY_ID;
DELETE FROM invoices WHERE company_id = COMPANY_ID;
DELETE FROM appointments WHERE company_id = COMPANY_ID;
DELETE FROM followups WHERE company_id = COMPANY_ID;
DELETE FROM clients WHERE company_id = COMPANY_ID;
```

### Option 2 : Relancer le script

Le script vérifie si les données existent déjà et ne les recrée pas. Si vous voulez les recréer, supprimez-les d'abord.

## ⚠️ Important

- **Les données créées sont réelles** : elles seront dans votre base de données
- **Le script ne supprime pas** les données existantes
- **Les données sont liées à votre entreprise** : elles n'apparaîtront que pour votre compte
- **Vous pouvez supprimer** les données créées depuis l'interface si besoin

## 🎨 Personnaliser les données

Si vous voulez modifier les données créées, éditez le fichier :

```
backend/scripts/create_demo_data.py
```

Vous pouvez modifier :
- `DEMO_CLIENTS` : Liste des clients à créer
- `DEMO_TASKS` : Liste des tâches à créer
- `DEMO_PROJECTS` : Liste des projets à créer
- `DEMO_QUOTES` : Liste des devis à créer
- `DEMO_INVOICES` : Liste des factures à créer
- `DEMO_APPOINTMENTS` : Liste des rendez-vous à créer

## 💡 Astuces

1. **Créer un compte de test dédié** : Créez une entreprise spécifique pour les captures d'écran
2. **Utiliser un environnement de développement** : Si possible, utilisez une base de données de dev séparée
3. **Faire des captures variées** : Le script crée des données avec différents statuts pour montrer toutes les fonctionnalités

## 🆘 Problèmes courants

### "Aucune entreprise active trouvée"
→ Créez d'abord une entreprise et un utilisateur owner/admin

### "Aucun owner/admin trouvé"
→ Assurez-vous qu'il y a un utilisateur avec le rôle "owner" ou "admin" pour l'entreprise

### Erreurs de création
→ Vérifiez que le backend est bien démarré et que la base de données est accessible

---

**Bonnes captures d'écran ! 📸**
