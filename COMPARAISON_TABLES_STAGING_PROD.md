# 📊 Comparaison des Tables entre Staging et Production

**Date**: 2025-12-25  
**Environnements comparés**: Staging vs Production

---

## 📋 Résumé Exécutif

- ✅ **Total de tables identiques**: 41 tables dans les deux environnements
- ⚠️ **Différences détectées**: 1 table avec des colonnes différentes

---

## 🔍 Détails de la Comparaison

### Tables Identiques

Les deux environnements contiennent exactement les **41 mêmes tables** :

1. alembic_version
2. appointment_types
3. appointments
4. billing_line_templates
5. chatbot_context_cache
6. chatbot_conversations
7. chatbot_messages
8. checklist_instances
9. checklist_templates
10. clients
11. companies
12. company_settings
13. conversations
14. document_folders
15. document_history
16. documents
17. followup_history
18. followups
19. inbox_folders
20. inbox_integrations
21. inbox_messages
22. internal_notes
23. invoice_audit_logs
24. invoice_lines
25. invoice_payments
26. invoices
27. message_attachments
28. notifications
29. project_history
30. projects
31. quote_lines
32. quote_otps
33. quote_signature_audit_logs
34. quote_signatures
35. quotes
36. subscription_events
37. subscription_invoices
38. subscription_payment_methods
39. subscriptions
40. tasks ⚠️ (voir différences ci-dessous)
41. users

---

## ⚠️ Différences Détectées

### Table: `tasks`

**Colonnes présentes en PRODUCTION mais absentes en STAGING** :

1. **`due_time`**
   - Type: `VARCHAR`
   - Nullable: `True`
   - Description: Heure d'échéance de la tâche
   - **Migration de suppression**: `69f2b8b467ed_remove_due_time_from_tasks.py`

2. **`is_mandatory`**
   - Type: `BOOLEAN`
   - Nullable: `False`
   - Description: Indique si la tâche est obligatoire
   - **Migration de suppression**: `69e5192fb36d_remove_is_mandatory_from_tasks.py`

**📌 Note importante**: Ces colonnes ont été **supprimées** dans des migrations récentes. Staging est donc **en avance** sur production concernant ces suppressions. Il faut appliquer ces migrations en production pour synchroniser les environnements.

---

## 🔧 Recommandations

### ⚠️ Action Requise: Appliquer les migrations de suppression en PRODUCTION

Les colonnes `due_time` et `is_mandatory` ont été **supprimées** dans des migrations récentes qui ont été appliquées en staging mais **pas encore en production**.

**Migrations à appliquer en production** :
1. `69e5192fb36d_remove_is_mandatory_from_tasks.py`
2. `69f2b8b467ed_remove_due_time_from_tasks.py`

**Pour synchroniser production avec staging** :

```bash
cd backend
export DATABASE_URL="postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

# Vérifier l'état actuel des migrations
alembic current

# Appliquer toutes les migrations manquantes
alembic upgrade head
```

**⚠️ Attention**: Ces migrations suppriment des colonnes. Assurez-vous que :
- Le code de l'application ne dépend plus de ces colonnes
- Aucune donnée importante n'est stockée dans ces colonnes

---

## 📝 Notes

- Les 40 autres tables sont **identiques** entre staging et production
- **STAGING est en avance** : Les migrations de suppression ont été appliquées en staging mais pas en production
- Il est recommandé de synchroniser **production avec staging** en appliquant les migrations manquantes

---

## ✅ Prochaines Étapes

1. [ ] Vérifier l'état actuel des migrations en **production** (`alembic current`)
2. [ ] Vérifier que le code ne dépend plus de `due_time` et `is_mandatory`
3. [ ] Appliquer les migrations de suppression en production :
   - `69e5192fb36d_remove_is_mandatory_from_tasks.py`
   - `69f2b8b467ed_remove_due_time_from_tasks.py`
4. [ ] Re-vérifier la comparaison après synchronisation

---

**Script utilisé**: `backend/compare_databases.py`

