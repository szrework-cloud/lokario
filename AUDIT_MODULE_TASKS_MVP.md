# Audit Module Tasks - MVP V1

## ✅ CE QUI EST DÉJÀ CONFORME AU MVP

### Modèle Task (backend/app/db/models/task.py)
- ✅ Tous les champs essentiels présents sauf :
  - ❌ `reminder_at` (manquant)
  - ❌ `checklist_instance_id` (manquant)

### Endpoints
- ✅ GET /tasks/today (existe, filtre par company_id et role)
- ✅ GET /tasks/priorities (existe mais retourne 5 priorités au lieu de 3)
- ✅ GET /tasks (existe avec filtres)
- ✅ POST /tasks (existe)
- ✅ PATCH /tasks/{id} (existe)
- ✅ PATCH /tasks/{id}/complete (existe)
- ✅ DELETE /tasks/{id} (existe)

### Permissions
- ✅ Filtrage par company_id implémenté
- ✅ User voit seulement ses tâches
- ✅ Admin/Owner voit toutes les tâches de la company

### Checklist
- ✅ ChecklistTemplate existe avec les champs nécessaires
- ✅ POST /checklists/templates/{id}/execute existe
- ❌ Anti-duplication manquante (peut créer plusieurs instances le même jour)
- ❌ checklist_instance_id non ajouté aux tâches créées

## ❌ CE QUI DOIT ÊTRE MODIFIÉ

### 1. Priorités (URGENT)
- ❌ Actuellement : 5 niveaux (low, medium, high, critical, urgent)
- ✅ MVP demande : 3 niveaux (critical, high, normal)
- **Action** : Simplifier TaskPriority Enum et mapper les anciennes valeurs

### 2. Champs manquants dans Task
- ❌ `reminder_at` (DateTime nullable)
- ❌ `checklist_instance_id` (Integer nullable, ForeignKey vers checklist_instances)
- **Action** : Ajouter ces champs + migration Alembic

### 3. GET /tasks/priorities
- ❌ Retourne 5 groupes (critical, urgent, high, medium, low)
- ✅ MVP demande : 3 groupes (critical, high, normal)
- **Action** : Modifier la logique de groupement

### 4. GET /tasks/priorities - Alerte Admin
- ❌ Section "Alerte admin" manquante
- ✅ MVP demande : nb tâches critiques non faites, nb en retard, nb routines non terminées
- **Action** : Ajouter cette section dans la réponse

### 5. ChecklistInstance
- ⚠️ Contient `completed_items` (JSON) qui n'est pas dans le MVP
- **Action** : Simplifier pour MVP (garder mais ne pas utiliser activement)

### 6. POST /checklists/templates/{id}/execute
- ❌ Pas d'anti-duplication (peut créer plusieurs instances le même jour)
- ❌ Ne lie pas checklist_instance_id aux tâches créées
- **Action** : Ajouter vérification + lier les tâches à l'instance

### 7. GET /tasks/today
- ⚠️ N'inclut pas explicitement les tâches de checklist du jour
- **Action** : S'assurer que les tâches générées par checklist sont incluses

### 8. GET /tasks/stats
- ❌ Retourne trop de statistiques (in_progress, todo, by_priority, by_category)
- ✅ MVP demande : total, completed, late uniquement
- **Action** : Simplifier TaskStats schema et logique

### 9. Frontend
- ❌ Types TypeScript utilisent 5 priorités
- ❌ Affichage utilise 5 priorités
- ❌ Statistiques affichées trop complexes
- **Action** : Adapter pour 3 priorités et statistiques simplifiées

## 📋 PLAN D'IMPLÉMENTATION

Voir la liste des TODOs créée.
