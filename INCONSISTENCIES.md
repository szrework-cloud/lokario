# Incohérences Front-End et Problèmes d'Intégration Backend

## 🔴 Incohérences Critiques

### 1. Types de Settings Incohérents

**Problème** : Il existe 3 définitions différentes des types de settings :

#### a) `CompanySettings` (settings-store.ts)
```typescript
type ModulesSettings = {
  [K in ModuleKey]: { enabled: boolean };
};
```
- Tous les modules sont **requis** (pas optionnels)
- Utilise un type mapped pour garantir la cohérence

#### b) `AdminCompanySettings` (admin/companies/[id]/page.tsx)
```typescript
modules: {
  tasks: { enabled: boolean };
  // ...
  billing?: { enabled: boolean };  // ⚠️ Optionnel
  // ...
  appointments?: { enabled: boolean };  // ⚠️ Optionnel
}
```
- `billing` et `appointments` sont **optionnels**
- Définition manuelle (pas de type mapped)

#### c) `PackSettings` (admin/packs/page.tsx)
```typescript
type ModuleConfig = {
  tasks: { enabled: boolean };
  // ... tous les modules
  // Pas de appointments ici ⚠️
};
```
- Structure différente
- Pas de module `appointments` défini

**Impact** : 
- Erreurs TypeScript potentielles lors de l'accès aux modules optionnels
- Le backend peut retourner des formats différents selon l'endpoint
- Risque de `undefined` lors de l'accès à `billing` ou `appointments`

**Solution recommandée** :
- Unifier tous les types vers `CompanySettings` de `settings-store.ts`
- Rendre tous les modules optionnels si le backend peut ne pas les retourner
- Ou garantir que le backend retourne toujours tous les modules

---

### 2. Modules Optionnels vs Requis

**Problème** : Incohérence dans l'accès aux modules optionnels

**Fichiers concernés** :
- `src/app/app/settings/page.tsx` : Utilise `billing?.enabled ?? true` et `appointments?.enabled ?? true`
- `src/app/admin/companies/[id]/page.tsx` : Utilise `billing?.enabled ?? true` mais pas pour `appointments`
- `src/store/settings-store.ts` : Tous les modules sont requis

**Impact** :
- Comportement différent selon les pages
- Risque d'erreurs si le backend ne retourne pas certains modules

**Solution recommandée** :
- Décider si tous les modules doivent être optionnels ou tous requis
- Si optionnels : mettre à jour `CompanySettings` pour rendre tous les modules optionnels
- Si requis : garantir que le backend retourne toujours tous les modules

---

### 3. Endpoints API Incohérents

**Problème** : Formats de réponse potentiellement différents

#### Endpoints identifiés :
- `/companies/me/settings` (utilisateur) → Retourne `{ company, settings }`
- `/companies/${companyId}/settings` (admin) → Retourne probablement juste `settings`
- `/users` → Peut retourner `User[]` ou `{ users: User[] }`

**Impact** :
- Le code gère déjà certains cas (voir `admin/companies/page.tsx` ligne 46-51)
- Mais pas tous les endpoints sont gérés de manière cohérente

**Solution recommandée** :
- Standardiser les formats de réponse du backend
- Ou créer des wrappers API qui normalisent les réponses

---

### 4. Mapping des Modules dans la Sidebar

**Problème** : Mapping complexe et potentiellement fragile

```typescript
const moduleKeyMapping: Record<string, string> = {
  tasks: "tasks",
  inbox: "inbox",
  followups: "relances",  // ⚠️ Mapping différent
  projects: "projects",
  billing: "billing",
  reporting: "reporting",
  chatbot: "chatbot_internal",  // ⚠️ Mapping différent
  appointments: "appointments",
};
```

**Impact** :
- Si le backend change les noms des modules, il faut mettre à jour le mapping
- "Clients" n'a pas de module dans les settings (correct mais peut être confus)

**Solution recommandée** :
- Utiliser directement les clés des modules depuis les settings
- Éviter le mapping si possible

---

## 🟡 Incohérences Moyennes

### 5. Données Mockées vs Backend Réel

**Problème** : Les données mockées peuvent ne pas correspondre au format backend

**Exemples** :
- `apiGet` retourne `{}` en mode mock, mais le code s'attend à des structures spécifiques
- Les settings mockés dans `useSettings.ts` peuvent différer du backend réel

**Impact** :
- Tests en développement peuvent masquer des problèmes
- Risque de bugs lors du passage au backend réel

**Solution recommandée** :
- Créer des fixtures de données qui correspondent exactement au format backend
- Documenter les formats attendus

---

### 6. Gestion des Erreurs API

**Problème** : Gestion d'erreur incohérente

**Fichiers** :
- `src/lib/api.ts` : Gestion d'erreur standardisée ✅
- `src/app/admin/companies/page.tsx` : Gestion spécifique pour `/users` ✅
- Mais pas partout

**Impact** :
- Certaines erreurs peuvent ne pas être bien gérées
- Messages d'erreur peuvent être incohérents

**Solution recommandée** :
- Utiliser partout les fonctions `apiGet`, `apiPost`, `apiPatch`
- Standardiser les messages d'erreur

---

## 🟢 Incohérences Mineures

### 7. Noms de Variables

**Problème** : Noms incohérents pour les mêmes concepts

- `timeSavedData` vs `mockUsageData.timeSaved`
- `CompanyInfo` vs `Company` (dans certains fichiers)

**Impact** : Confusion mineure, pas de bug

---

### 8. Formats de Date

**Problème** : Mélange de formats

- `string` (ISO) dans certains types
- `string | Date` dans d'autres

**Impact** : Conversions nécessaires, risque d'erreurs

**Solution recommandée** :
- Standardiser sur `string` (ISO) partout
- Convertir en `Date` uniquement pour l'affichage

---

## 📋 Checklist pour l'Intégration Backend

### Avant l'intégration :

- [ ] **Unifier les types de Settings**
  - Décider si tous les modules sont optionnels ou requis
  - Mettre à jour tous les types pour être cohérents

- [ ] **Standardiser les formats de réponse API**
  - Documenter les formats attendus pour chaque endpoint
  - Créer des types TypeScript pour chaque réponse API

- [ ] **Vérifier les endpoints**
  - `/companies/me/settings` doit retourner `{ company, settings }`
  - `/companies/${id}/settings` doit retourner le même format ou documenter la différence
  - `/users` doit toujours retourner un tableau ou toujours un objet avec `users`

- [ ] **Tester avec des données réelles**
  - Remplacer les mocks par de vrais appels API
  - Vérifier que tous les cas d'erreur sont gérés

- [ ] **Vérifier les modules optionnels**
  - Si le backend peut ne pas retourner certains modules, mettre à jour les types
  - Ajouter des valeurs par défaut partout où nécessaire

### Points d'attention spécifiques :

1. **Module `appointments`** : Vérifier qu'il est bien retourné par le backend dans tous les endpoints de settings
2. **Module `billing`** : Vérifier qu'il est bien retourné (actuellement optionnel)
3. **Format des dates** : S'assurer que le backend retourne des ISO strings
4. **Gestion des erreurs 404/500** : Tester tous les cas d'erreur

---

## 🔧 Actions Prioritaires

1. **URGENT** : Unifier les types `AdminCompanySettings` et `CompanySettings`
2. **URGENT** : Décider si les modules sont optionnels ou requis
3. **IMPORTANT** : Standardiser les formats de réponse API
4. **IMPORTANT** : Documenter les formats attendus du backend
5. **MOYEN** : Améliorer la gestion d'erreur partout
6. **MOYEN** : Créer des fixtures de données réalistes

