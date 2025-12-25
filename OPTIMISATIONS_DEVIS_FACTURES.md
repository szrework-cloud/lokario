# 🚀 Optimisations pour Devis et Factures

## 📊 Analyse des Opportunités d'Optimisation

### 🔴 Priorité 1 : Frontend (Impact Élevé)

#### 1.1 Utiliser React Query au lieu de useEffect
**Problème :** `billing/quotes/page.tsx` utilise `useEffect` avec appels API directs
- Pas de cache automatique
- Rechargement à chaque changement de filtre
- Pas de gestion du loading/error optimisée

**Solution :** Migrer vers React Query
- Cache automatique des données
- Refetch intelligent
- Optimistic updates
- Meilleure gestion des états

**Fichiers concernés :**
- `src/app/app/billing/quotes/page.tsx` (lignes 62-181)

**Gain estimé :** -50% de requêtes API, -40% de temps de chargement

---

#### 1.2 Lazy Loading des Modals
**Problème :** Les modals sont chargés même s'ils ne sont pas utilisés
- `CreateQuoteModal` chargé au démarrage
- `CreateInvoiceModal` chargé au démarrage
- `DocumentPreviewModal` peut être lazy loadé

**Solution :** Lazy load des modals comme pour les tâches
- Créer `.lazy.tsx` pour chaque modal
- Réduire le bundle initial

**Fichiers concernés :**
- `src/components/billing/CreateQuoteModal.tsx`
- `src/components/billing/CreateInvoiceModal.tsx`
- `src/components/billing/CreditNoteModal.tsx`

**Gain estimé :** -20% du bundle initial

---

#### 1.3 Memoization des Composants de Liste
**Problème :** Les tableaux de devis/factures re-rendent à chaque changement
- Re-renders inutiles lors des filtres
- Pas de memoization des lignes de tableau

**Solution :** Utiliser `React.memo()` pour :
- Composants de ligne de tableau
- Composants de filtres
- Composants de statistiques

**Gain estimé :** -30% de re-renders inutiles

---

#### 1.4 Filtrage Côté Serveur
**Problème :** Tous les filtres sont appliqués côté client
- Charge tous les devis/factures même si non nécessaires
- Pas de pagination côté serveur
- Performance dégradée avec beaucoup de données

**Solution :** Appliquer les filtres côté serveur
- Passer les filtres comme query params à l'API
- Implémenter la pagination serveur
- Réduire la quantité de données transférées

**Gain estimé :** -70% de données transférées, -60% de temps de chargement pour grandes listes

---

### 🟡 Priorité 2 : Backend (Impact Moyen-Élevé)

#### 2.1 Optimisation des Requêtes avec Eager Loading
**Problème :** Potentiels problèmes N+1 dans les requêtes
- Chargement des relations client, lignes, etc.

**Vérification nécessaire :**
- `quotes.py` : Vérifier si `joinedload` est utilisé partout
- `invoices.py` : Vérifier si `joinedload` est utilisé partout

**Solution :** S'assurer que toutes les relations sont préchargées
```python
query = query.options(
    joinedload(Quote.client),
    joinedload(Quote.lines),
    joinedload(Quote.company)
)
```

**Gain estimé :** -50% de requêtes DB pour les listes

---

#### 2.2 Batch Operations si nécessaire
**Problème :** Commits individuels (moins critique que pour tasks)
- Vérifier s'il y a des boucles avec commits

**Observation :** Les commits semblent ponctuels (pas de boucles critiques)

---

#### 2.3 Index de Base de Données
**Problème :** Recherches et filtres peuvent être lents
**Solution :** Vérifier les index sur :
- `quotes.company_id`
- `quotes.client_id`
- `quotes.status`
- `quotes.created_at`
- `invoices.company_id`
- `invoices.client_id`
- `invoices.status`
- `invoices.due_date` (pour calcul des factures en retard)

**Gain estimé :** -40% de temps pour les requêtes filtrées

---

### 🟢 Priorité 3 : Optimisations UX (Impact Moyen)

#### 3.1 Pagination Côté Serveur
**Problème :** Charge toutes les données d'un coup
- Pagination côté client seulement
- Performance dégradée avec beaucoup de devis/factures

**Solution :** Implémenter pagination serveur
- Paramètres `skip` et `limit` dans l'API
- Navigation par pages
- Chargement progressif

**Gain estimé :** -80% de temps initial pour grandes listes

---

#### 3.2 Virtual Scrolling pour Grandes Listes
**Problème :** Rend toutes les lignes même si non visibles
- Performance dégradée avec >100 éléments

**Solution :** Utiliser `react-window` ou `react-virtualized`
- Rendre uniquement les éléments visibles
- Scroll virtuel

**Gain estimé :** -60% de temps de rendu pour grandes listes

---

#### 3.3 Debounce des Filtres de Recherche
**Problème :** Recherche déclenchée à chaque frappe
- Trop de requêtes API

**Solution :** Debounce de 300-500ms
- Réduire les requêtes inutiles

**Gain estimé :** -70% de requêtes de recherche

---

## 📋 Plan d'Implémentation Recommandé

### Phase 1 : Quick Wins (2-3h)
1. ✅ Migrer vers React Query (cache automatique)
2. ✅ Lazy load des modals (3 modals)
3. ✅ Memoization des composants de liste

### Phase 2 : Optimisations Backend (1-2h)
1. Vérifier et optimiser eager loading
2. Vérifier les index DB
3. S'assurer que les filtres passent par l'API

### Phase 3 : Pagination et Performance (2-3h)
1. Implémenter pagination serveur
2. Débouncer les recherches
3. Virtual scrolling si nécessaire (si >200 éléments fréquents)

---

## 🎯 Métriques Cibles

### Avant Optimisations
- Temps de chargement liste : ~1-2s (tout chargé)
- Requêtes API : 2-3 par changement de filtre
- Bundle modals : ~50KB chargés inutilement
- Re-renders : ~100% à chaque changement de filtre

### Après Optimisations Phase 1
- Temps de chargement liste : ~0.5-1s (avec cache)
- Requêtes API : ~50% de moins (cache React Query)
- Bundle modals : ~0KB jusqu'à ouverture
- Re-renders : ~70% de moins (memoization)

### Après Optimisations Phase 2-3
- Temps de chargement liste : ~0.3-0.5s (pagination)
- Requêtes API : ~70% de moins (pagination + cache)
- Données transférées : ~80% de moins (pagination serveur)
- Re-renders : ~85% de moins

---

## 🔍 Points d'Attention

1. **Compatibilité** : S'assurer que les filtres existants continuent de fonctionner
2. **Tests** : Tester avec de grandes listes (100+ devis/factures)
3. **Cache** : Gérer l'invalidation du cache lors des créations/modifications
4. **Filtres complexes** : Vérifier que tous les filtres sont bien supportés par l'API

---

## 📝 Notes Techniques

- React Query permet déjà de gérer les filtres dans la `queryKey`
- La pagination serveur nécessite des modifications API (déjà supportée partiellement)
- Le virtual scrolling n'est nécessaire que si les listes dépassent souvent 100 éléments
- Les index DB doivent être vérifiés en production avec EXPLAIN

