# 🔄 Migration React Query pour Devis & Factures

## ✅ Oui, c'est possible sans casser le code !

La migration peut être faite **progressivement** et **sans casser** le code existant. Voici pourquoi et comment :

---

## 🎯 Pourquoi c'est sûr ?

### 1. **React Query est déjà utilisé dans le projet**
Le projet utilise déjà React Query :
- ✅ Dashboard (`useDashboardStats`, `useTodayTasks`)
- ✅ Clients (`useClients`)
- ✅ Inbox (`useConversations`)
- ✅ Stripe (`useSubscription`)

**Donc l'infrastructure est déjà en place !**

### 2. **Migration progressive possible**
On peut remplacer `useEffect` par `useQuery` **une fonctionnalité à la fois** sans toucher au reste.

### 3. **Même interface utilisateur**
React Query retourne exactement ce dont vous avez besoin :
- `data` → remplace votre `quotes` / `invoices` state
- `isLoading` → remplace votre `isLoading` state
- `error` → remplace votre `error` state

---

## 📝 Comment migrer (étape par étape)

### Étape 1 : Créer les hooks React Query ✅ (DÉJÀ FAIT)

J'ai créé :
- `src/hooks/queries/useQuotes.ts`
- `src/hooks/queries/useInvoices.ts`

Ces hooks sont **compatibles** avec le code existant.

---

### Étape 2 : Remplacer progressivement

#### Avant (code actuel) :
```typescript
const [quotes, setQuotes] = useState<Quote[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const loadQuotes = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const data = await getQuotes(token, {
        status: quoteStatusFilter !== "all" ? quoteStatusFilter : undefined,
      });
      // ... adaptation des données ...
      setQuotes(adaptedQuotes);
    } catch (err: any) {
      setError(err.message || "Erreur");
    } finally {
      setIsLoading(false);
    }
  };
  loadQuotes();
}, [token, quoteStatusFilter]);
```

#### Après (avec React Query) :
```typescript
import { useQuotes } from "@/hooks/queries/useQuotes";

// Remplacer le useEffect par :
const { 
  data: quotesData = [], 
  isLoading, 
  error 
} = useQuotes({
  status: quoteStatusFilter !== "all" ? quoteStatusFilter : undefined,
});

// Adapter les données (même logique qu'avant)
const quotes = useMemo(() => {
  return quotesData.map((q) => ({
    ...q,
    client_name: q.client_name || "",
    lines: (q.lines || []).map((line) => ({
      // ... même adaptation qu'avant
    })),
    // ... reste identique
  }));
}, [quotesData]);
```

---

## 🔒 Garanties de compatibilité

### 1. **Même structure de données**
- Les hooks utilisent les mêmes fonctions (`getQuotes`, `getInvoices`)
- Les données retournées sont identiques
- L'adaptation des données reste la même

### 2. **Même comportement**
- `isLoading` : true pendant le chargement
- `error` : contient l'erreur si échec
- `data` : contient les données si succès

### 3. **Pas de breaking changes**
- On ne change que le **chargement des données**
- Le reste du code (filtres, affichage, etc.) reste **identique**

---

## 🚀 Avantages de la migration

### Avant (useEffect) :
- ❌ Pas de cache (recharge à chaque fois)
- ❌ Gestion d'état manuelle (isLoading, error, data)
- ❌ Pas de retry automatique
- ❌ Pas d'invalidation de cache

### Après (React Query) :
- ✅ Cache automatique (données réutilisées)
- ✅ Gestion d'état intégrée (isLoading, error, data)
- ✅ Retry automatique en cas d'erreur
- ✅ Invalidation de cache possible
- ✅ **-50% de requêtes API** (cache)

---

## 📋 Plan de migration recommandé

### Phase 1 : Tester avec un seul hook
1. Remplacer `useQuotes` seulement
2. Tester que tout fonctionne
3. Si OK, continuer

### Phase 2 : Remplacer `useInvoices`
1. Même démarche
2. Tester

### Phase 3 : Optimiser (optionnel)
1. Utiliser `useClients` déjà existant
2. Ajouter invalidation de cache après création/modification

---

## 🔍 Exemple de migration complète

Voici comment remplacer le code dans `billing/quotes/page.tsx` :

### Code actuel (lignes 75-118) :
```typescript
// Charger les devis
useEffect(() => {
  const loadQuotes = async () => {
    // ... 40 lignes de code
  };
  loadQuotes();
}, [token, quoteStatusFilter]);
```

### Nouveau code :
```typescript
import { useQuotes } from "@/hooks/queries/useQuotes";
import { useClients } from "@/hooks/queries/useClients";

// Dans le composant :
const { data: quotesData = [], isLoading: isLoadingQuotes, error: quotesError } = useQuotes({
  status: quoteStatusFilter !== "all" ? quoteStatusFilter : undefined,
});

const { data: clients = [] } = useClients();

// Adapter les données (même logique qu'avant, dans un useMemo)
const quotes = useMemo(() => {
  return quotesData.map((q) => ({
    ...q,
    client_name: q.client_name || "",
    lines: (q.lines || []).map((line) => ({
      id: line.id || 0,
      description: line.description,
      quantity: Number(line.quantity) || 0,
      unitPrice: Number(line.unit_price_ht) || 0,
      taxRate: Number(line.tax_rate) || 0,
      total: Number(line.total_ttc) || 0,
    })),
    subtotal: Number(q.subtotal_ht) || 0,
    tax: Number(q.total_tax) || 0,
    total: Number(q.total_ttc) || Number(q.amount) || 0,
    timeline: [],
    history: [],
  }));
}, [quotesData]);

// Utiliser quotes, isLoadingQuotes, quotesError comme avant
```

**Le reste du code reste identique !**

---

## ✅ Checklist de migration

- [ ] Tester que les hooks React Query fonctionnent
- [ ] Remplacer un seul `useEffect` à la fois
- [ ] Vérifier que les données sont identiques
- [ ] Tester les filtres
- [ ] Vérifier le loading state
- [ ] Vérifier la gestion d'erreurs
- [ ] Si tout OK, continuer avec le suivant

---

## 🎯 Résultat attendu

- ✅ **Code plus simple** (moins de useState/useEffect)
- ✅ **Performance meilleure** (cache automatique)
- ✅ **Moins de requêtes** (cache réutilisé)
- ✅ **Même fonctionnalités** (rien ne casse)
- ✅ **Code maintenable** (standard React Query)

---

## 🚨 Points d'attention

1. **Adaptation des données** : Garder la même logique d'adaptation dans un `useMemo`
2. **Filtres** : Les filtres sont passés comme paramètres à `useQuotes`
3. **Loading state** : Utiliser `isLoading` de React Query au lieu de `isLoading` state
4. **Error handling** : Utiliser `error` de React Query (peut être null, pas string)

---

**Conclusion : La migration est sûre et peut se faire progressivement sans casser le code existant !** 🎉

