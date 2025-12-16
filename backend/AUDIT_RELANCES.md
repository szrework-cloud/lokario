# Audit du Module Relances (Followups)

## Date: 2025-12-09

## Problèmes Identifiés

### 🔴 CRITIQUE

1. **Champ `actual_date` manquant dans le schéma `FollowUpRead`**
   - **Localisation**: `backend/app/api/schemas/followup.py`
   - **Problème**: Le modèle DB a `actual_date` mais le schéma Pydantic ne l'expose pas
   - **Impact**: Le frontend ne peut pas utiliser `actual_date` pour calculer les retards correctement
   - **Solution**: Ajouter `actual_date: Optional[datetime]` au schéma `FollowUpRead`

2. **Frontend utilise `due_date` au lieu de `actual_date`**
   - **Localisation**: `src/services/followupsService.ts` lignes 116, 139, 204, 243, 270
   - **Problème**: Le frontend calcule `actualDate` depuis `due_date` au lieu d'utiliser `actual_date`
   - **Impact**: Calculs de retards incorrects
   - **Solution**: Utiliser le champ `actual_date` du backend si disponible

### 🟡 IMPORTANT

3. **Endpoints `/settings` utilisent `JSONResponse` au lieu de modèles Pydantic**
   - **Localisation**: `backend/app/api/routes/followups.py` lignes 612-654, 657-692
   - **Problème**: Pas de validation Pydantic, risque d'erreurs de type
   - **Impact**: Pas de validation automatique des types
   - **Solution**: Utiliser `response_model=FollowUpSettings` et retourner des instances Pydantic

4. **Duplication de code dans les routes**
   - **Localisation**: `backend/app/api/routes/followups.py` (multiples occurrences)
   - **Problème**: Code répété pour créer `followup_dict` dans plusieurs endpoints
   - **Impact**: Maintenance difficile, risque d'incohérences
   - **Solution**: Créer une fonction helper `_followup_to_dict()`

5. **Incohérence dans le calcul des retards**
   - **Localisation**: 
     - Backend: ligne 194 utilise `actual_date`
     - Frontend: ligne 119-124 utilise `actualDate` calculé depuis `due_date`
   - **Problème**: Logique différente entre backend et frontend
   - **Impact**: Résultats différents selon où le calcul est fait
   - **Solution**: Aligner la logique, utiliser `actual_date` partout

### 🟢 MINEUR

6. **Gestion d'erreurs incohérente**
   - **Localisation**: `backend/app/api/routes/followups.py`
   - **Problème**: Certaines routes ont try/except, d'autres non
   - **Impact**: Expérience utilisateur incohérente en cas d'erreur
   - **Solution**: Standardiser la gestion d'erreurs

7. **Type `FollowUpReadResponse` dans le frontend ne correspond pas exactement**
   - **Localisation**: `src/services/followupsService.ts` ligne 50
   - **Problème**: L'interface TypeScript ne reflète pas tous les champs du backend
   - **Impact**: Risque d'erreurs de type à l'exécution
   - **Solution**: Ajouter `actual_date` à l'interface

8. **Validation manquante pour `actual_date` dans `FollowUpUpdate`**
   - **Localisation**: `backend/app/api/schemas/followup.py` ligne 30
   - **Problème**: Impossible de mettre à jour `actual_date` via l'API
   - **Impact**: Fonctionnalité limitée
   - **Solution**: Ajouter `actual_date: Optional[datetime]` à `FollowUpUpdate`

## Corrections Appliquées

- ✅ Colonne `actual_date` ajoutée à la base de données
- ✅ Endpoint `/stats` utilise maintenant `FollowUpStats` au lieu de `JSONResponse`
- ✅ Endpoint `/weekly` utilise maintenant `List[WeeklyFollowUpData]` au lieu de `JSONResponse`
- ✅ Ajout de `actual_date` au schéma `FollowUpRead` et `FollowUpBase`
- ✅ Ajout de `actual_date` à `FollowUpUpdate` pour permettre la mise à jour
- ✅ Correction du frontend pour utiliser `actual_date` du backend (avec fallback sur `due_date`)
- ✅ Création de la fonction helper `_followup_to_dict()` pour éviter la duplication de code
- ✅ Correction des endpoints `/settings` pour utiliser les modèles Pydantic au lieu de `JSONResponse`
- ✅ Ajout de `actual_date` dans tous les dictionnaires retournés par les routes

## Résumé

Tous les problèmes critiques et importants ont été corrigés. Le module relances est maintenant :
- ✅ Cohérent entre backend et frontend
- ✅ Utilise correctement `actual_date` pour les calculs de retards
- ✅ Valide les données avec Pydantic partout
- ✅ Évite la duplication de code grâce à la fonction helper
- ✅ Expose `actual_date` dans l'API pour permettre sa mise à jour
