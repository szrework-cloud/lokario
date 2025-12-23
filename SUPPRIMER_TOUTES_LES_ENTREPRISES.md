# Supprimer toutes les entreprises et leurs données

## ⚠️ ATTENTION

Cette opération est **IRRÉVERSIBLE** ! Elle va supprimer :
- Toutes les entreprises
- Tous les utilisateurs
- Tous les clients
- Tous les devis
- Toutes les factures
- Toutes les tâches
- Toutes les conversations
- Toutes les autres données associées

## 🚀 Utilisation

### Sur Railway (Recommandé)

```bash
railway run python backend/scripts/delete_all_companies.py
```

### En local

```bash
cd backend
python scripts/delete_all_companies.py
```

## 📋 Ce que fait le script

1. Demande une confirmation explicite (tapez `SUPPRIMER TOUT`)
2. Supprime toutes les données dans le bon ordre (en respectant les contraintes)
3. Réinitialise les séquences auto-incrémentées
4. Affiche le nombre de lignes supprimées pour chaque table

## ✅ Après la suppression

Toutes les tables seront vides. Vous pourrez :
- Créer de nouvelles entreprises
- Les nouveaux devis commenceront à `DEV-2025-001` pour chaque entreprise
- Les séquences seront réinitialisées

## 🔄 Alternative : Suppression SQL directe

Si vous préférez utiliser SQL directement :

```sql
-- Supprimer toutes les données (dans l'ordre)
DELETE FROM quote_signature_audit_logs;
DELETE FROM quote_signatures;
DELETE FROM quote_lines;
DELETE FROM quotes;
DELETE FROM invoice_lines;
DELETE FROM invoice_audit_logs;
DELETE FROM invoices;
DELETE FROM followups;
DELETE FROM appointments;
DELETE FROM appointment_types;
DELETE FROM tasks;
DELETE FROM checklist_instances;
DELETE FROM checklist_templates;
DELETE FROM conversations;
DELETE FROM inbox_messages;
DELETE FROM message_attachments;
DELETE FROM inbox_integrations;
DELETE FROM inbox_folders;
DELETE FROM notifications;
DELETE FROM chatbot_conversations;
DELETE FROM billing_line_templates;
DELETE FROM project_clients;
DELETE FROM projects;
DELETE FROM clients;
DELETE FROM company_settings;
DELETE FROM users;
DELETE FROM companies;

-- Réinitialiser les séquences
SELECT setval(pg_get_serial_sequence('companies', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('users', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('clients', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('quotes', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('invoices', 'id'), 1, false);
```

