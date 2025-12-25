# 📊 Documentation : Comment les données du Dashboard sont récupérées

## 🔄 Flux de données

### 1. Frontend - Récupération initiale

**Fichier** : `src/app/app/dashboard/page.tsx`

```typescript
const { data: stats, isLoading, error } = useDashboardStats();
```

**Hook utilisé** : `src/hooks/queries/useDashboard.ts`

```typescript
export function useDashboardStats() {
  const { token } = useAuth();
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: () => getDashboardStats(token || ""),
    enabled: !!token,
    staleTime: 1000 * 30, // 30 secondes
    refetchOnMount: true, // Toujours rafraîchir au montage
    refetchOnWindowFocus: true, // Rafraîchir au focus de la fenêtre
  });
}
```

### 2. Service API Frontend

**Fichier** : `src/services/dashboardService.ts`

```typescript
export async function getDashboardStats(token: string): Promise<DashboardStats> {
  return apiGet<DashboardStats>("/dashboard/stats", token);
}
```

**Endpoint appelé** : `GET /dashboard/stats`

### 3. Backend - Calcul des statistiques

**Fichier** : `backend/app/api/routes/dashboard.py`

**Route** : `@router.get("/stats", response_model=DashboardStats)`

---

## 📈 Détails des calculs

### CA Mensuel (`monthly_revenue`)

**Ligne** : `backend/app/api/routes/dashboard.py:116-130`

**Logique** :
1. Filtre les factures avec `status == InvoiceStatus.PAYEE`
2. Filtre par date :
   - Si `paid_at` est défini : utilise `paid_at >= premier_jour_mois`
   - Si `paid_at` est `NULL` : utilise `updated_at >= premier_jour_mois`
3. Somme les `total_ttc` de toutes les factures correspondantes

**Query SQL équivalente** :
```sql
SELECT SUM(total_ttc) 
FROM invoices 
WHERE company_id = ? 
  AND status = 'payee'
  AND (
    (paid_at IS NOT NULL AND DATE(paid_at) >= ?) 
    OR 
    (paid_at IS NULL AND DATE(updated_at) >= ?)
  )
```

**Pourquoi peut être à 0** :
- Aucune facture avec statut `PAYEE` ce mois-ci
- Les factures payées ont un `paid_at` ou `updated_at` avant le premier jour du mois
- Les factures n'ont pas de `total_ttc` défini

---

### Factures en Retard (`overdue_invoices_count` / `overdue_invoices_amount`)

**Ligne** : `backend/app/api/routes/dashboard.py:151-161`

**Logique** :
1. Filtre les factures avec statut `IMPAYEE` ou `ENVOYEE`
2. Filtre par date : `due_date < aujourd'hui` (date d'échéance passée)
3. Compte le nombre et somme les montants

**Query SQL équivalente** :
```sql
SELECT COUNT(*), SUM(total_ttc) 
FROM invoices 
WHERE company_id = ? 
  AND status IN ('impayee', 'envoyee')
  AND due_date IS NOT NULL
  AND DATE(due_date) < DATE('now')
```

**Pourquoi peut être à 0** :
- Aucune facture avec statut `IMPAYEE` ou `ENVOYEE`
- Aucune facture avec une `due_date` passée
- Les factures en retard ont déjà été payées (statut changé en `PAYEE`)

---

### Tâches Complétées (`tasks_completed_this_week`)

**Ligne** : `backend/app/api/routes/dashboard.py:171-187`

**Logique** :
1. Filtre les tâches avec `status == TaskStatus.TERMINE`
2. Filtre par date (semaine courante, depuis lundi) :
   - Si `completed_at` est défini : utilise `completed_at >= début_semaine`
   - Si `completed_at` est `NULL` : utilise `updated_at >= début_semaine`

**Query SQL équivalente** :
```sql
SELECT COUNT(*) 
FROM tasks 
WHERE company_id = ? 
  AND status = 'termine'
  AND (
    (completed_at IS NOT NULL AND DATE(completed_at) >= ?) 
    OR 
    (completed_at IS NULL AND DATE(updated_at) >= ?)
  )
```

**Début de semaine** : Calculé comme le lundi de la semaine courante
```python
days_since_monday = today.weekday()  # 0 = lundi, 6 = dimanche
week_start = today - timedelta(days=days_since_monday)
```

**Pourquoi peut être à 0** :
- Aucune tâche avec statut `TERMINE` cette semaine
- Les tâches terminées ont été complétées avant le lundi de la semaine courante
- Les tâches n'ont pas de `completed_at` ou `updated_at` cette semaine

---

### Devis Envoyés (`quotes_sent_this_month`)

**Ligne** : `backend/app/api/routes/dashboard.py:77-81`

**Logique** :
1. Filtre les devis avec statut `ENVOYE`, `VU`, `ACCEPTE`, ou `REFUSE`
2. Filtre par date : `sent_at >= premier_jour_mois`

**Pourquoi fonctionne** : Le calcul est simple et direct, basé sur `sent_at`

---

### Devis Acceptés (`quotes_accepted`)

**Ligne** : `backend/app/api/routes/dashboard.py:92-102`

**Logique** :
1. Filtre les devis avec statut `ACCEPTE`
2. Filtre par date : `accepted_at >= premier_jour_mois` (ou `updated_at` si `accepted_at` est NULL)

---

### Relances Envoyées (`followups_sent_this_month`)

**Ligne** : `backend/app/api/routes/dashboard.py:164-169`

**Logique** :
1. Filtre les relances avec statut `ENVOYE`
2. Filtre par date : `sent_at >= premier_jour_mois`

---

## 🔄 Cache et rafraîchissement

### Configuration React Query

**StaleTime** : 30 secondes
- Après 30 secondes, les données sont considérées comme "stales"
- Au prochain accès, React Query revalide automatiquement

**RefetchOnMount** : `true`
- Les données sont toujours rechargées quand le composant Dashboard se monte

**RefetchOnWindowFocus** : `true`
- Les données sont rechargées quand l'utilisateur revient sur l'onglet

**GcTime** : 5 minutes
- Les données sont gardées en cache pendant 5 minutes après la dernière utilisation

### Comment forcer un rafraîchissement

**Option 1 - Recharger la page** :
- Appuyez sur `F5` ou `Cmd+R` / `Ctrl+R`

**Option 2 - Invalider le cache programmatiquement** :
```typescript
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
```

**Option 3 - Attendre le rafraîchissement automatique** :
- Les données se rafraîchissent automatiquement toutes les 30 secondes
- Ou quand vous revenez sur l'onglet (refetchOnWindowFocus)

---

## 🔍 Debugging - Vérifier les données

### 1. Vérifier les logs backend

Les requêtes SQL sont exécutées côté backend. Pour déboguer :

```python
# Ajouter des logs dans dashboard.py
logger.info(f"CA mensuel calculé: {monthly_revenue}")
logger.info(f"Factures en retard: {overdue_invoices_count}")
logger.info(f"Tâches complétées: {tasks_completed_this_week}")
```

### 2. Vérifier les données en base

**Pour le CA mensuel** :
```sql
SELECT id, number, status, total_ttc, paid_at, updated_at 
FROM invoices 
WHERE company_id = ? 
  AND status = 'payee'
  AND (DATE(paid_at) >= DATE('now', 'start of month') 
       OR (paid_at IS NULL AND DATE(updated_at) >= DATE('now', 'start of month')));
```

**Pour les factures en retard** :
```sql
SELECT id, number, status, due_date, total_ttc 
FROM invoices 
WHERE company_id = ? 
  AND status IN ('impayee', 'envoyee')
  AND due_date IS NOT NULL
  AND DATE(due_date) < DATE('now');
```

**Pour les tâches complétées** :
```sql
SELECT id, title, status, completed_at, updated_at 
FROM tasks 
WHERE company_id = ? 
  AND status = 'termine'
  AND (
    (completed_at IS NOT NULL AND DATE(completed_at) >= DATE('now', 'weekday 0', '-7 days'))
    OR (completed_at IS NULL AND DATE(updated_at) >= DATE('now', 'weekday 0', '-7 days'))
  );
```

---

## ⚠️ Problèmes courants

### CA mensuel à 0€

**Causes possibles** :
1. Aucune facture avec statut `PAYEE` ce mois-ci
2. Les factures payées ont été marquées comme payées avant le début du mois
3. Les factures n'ont pas de `total_ttc` défini

**Solution** : Vérifier que les factures ont bien le statut `PAYEE` et une date de paiement ce mois-ci

### Tâches complétées à 0

**Causes possibles** :
1. Aucune tâche terminée cette semaine (depuis lundi)
2. Les tâches terminées l'ont été avant le lundi de la semaine courante
3. Les tâches n'ont pas de `completed_at` ou `updated_at` défini

**Solution** : Vérifier que les tâches ont bien le statut `TERMINE` et ont été complétées cette semaine

### Factures en retard à 0

**Causes possibles** :
1. Aucune facture avec statut `IMPAYEE` ou `ENVOYEE`
2. Aucune facture avec une date d'échéance passée
3. Toutes les factures en retard ont déjà été payées

**Solution** : Vérifier que les factures ont bien une `due_date` passée et un statut non payé

---

## 📝 Notes importantes

1. **Dates** : Toutes les dates sont comparées en UTC côté backend
2. **Timezone** : Les dates peuvent varier selon le timezone du serveur
3. **Cache** : Les données sont mises en cache 30 secondes pour éviter trop de requêtes
4. **Performance** : Les requêtes utilisent des index sur `company_id`, `status`, et les dates

