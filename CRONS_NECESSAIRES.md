# 🔄 Liste des Crons Nécessaires pour Lokario

## 📋 Vue d'ensemble

Pour que l'application Lokario fonctionne correctement, vous devez configurer **plusieurs cron jobs** qui s'exécutent à différentes fréquences.

## ✅ Crons OBLIGATOIRES (à configurer en priorité)

### 1. 🔄 Synchronisation Inbox (Emails)
**Priorité** : ⚠️ **CRITIQUE** - Sans ce cron, les emails ne se synchronisent pas automatiquement.

- **Endpoint** : `/inbox/integrations/sync-all?secret=VOTRE_CRON_SECRET`
- **Méthode** : GET ou POST
- **Fréquence recommandée** : `*/5 * * * *` (toutes les 5 minutes)
- **Fréquence alternative** : 
  - `* * * * *` (toutes les minutes) - pour une synchronisation plus rapide
  - `*/15 * * * *` (toutes les 15 minutes) - si vous avez peu d'emails
- **Quoi** : Synchronise tous les emails depuis les boîtes IMAP configurées
- **Configuration** : Utilise l'endpoint API existant

---

### 2. 📧 Relances automatiques
**Priorité** : ⚠️ **CRITIQUE** - Sans ce cron, les relances automatiques ne sont pas envoyées.

- **Endpoint** : `/followups/process-automatic?secret=VOTRE_CRON_SECRET`
- **Méthode** : GET ou POST
- **Fréquence recommandée** : `0 * * * *` (toutes les heures à l'heure pile)
- **Fréquence alternative** : 
  - `*/30 * * * *` (toutes les 30 minutes) - si vous avez beaucoup de relances
  - `0 */2 * * *` (toutes les 2 heures) - si vous avez peu de relances
- **Quoi** : Traite et envoie les relances automatiques pour les devis/factures impayés
- **Configuration** : Utilise l'endpoint API existant

---

## 📌 Crons OPTIONNELS (recommandés)

### 3. 🗑️ Suppression des comptes (Nettoyage)
**Priorité** : 🔶 **RECOMMANDÉ** - ⚠️ **NÉCESSAIRE POUR LA SUPPRESSION DÉFINITIVE**

- **Endpoint** : `/users/process-account-deletions?secret=VOTRE_CRON_SECRET`
- **Méthode** : GET ou POST
- **Fréquence recommandée** : `0 2 * * *` (tous les jours à 2h du matin)
- **Quoi** : Supprime définitivement les comptes marqués pour suppression après 30 jours
- **Sans cron** : ❌ **Les comptes ne seront JAMAIS supprimés définitivement**
  - Quand un utilisateur demande la suppression, le système marque juste `deletion_scheduled_at = maintenant + 30 jours`
  - Mais la suppression réelle nécessite absolument l'exécution de ce script
  - Les comptes resteront indéfiniment en attente de suppression
- **Configuration** : Utilise l'endpoint API existant

---

### 4. 🔔 Vérification des éléments en retard et rappels
**Priorité** : 🔶 **RECOMMANDÉ** - ⚠️ **UTILE MAIS PAS STRICTEMENT NÉCESSAIRE**

- **Endpoint** : `/cron/check-overdue-and-reminders?secret=VOTRE_CRON_SECRET`
- **Méthode** : GET ou POST
- **Fréquence recommandée** : `0 * * * *` (toutes les heures) ou `0 */2 * * *` (toutes les 2 heures)
- **Quoi** : 
  - Vérifie les factures en retard et crée des notifications
  - Vérifie les tâches en retard
  - Vérifie les tâches critiques
  - Crée des rappels pour les rendez-vous
- **Sans cron** : ⚠️ **Fonctionnalités partiellement disponibles**
  - ❌ **Factures en retard** : Aucune notification automatique ne sera créée
  - ⚠️ **Tâches en retard** : Les notifications sont créées lors de la création/modification d'une tâche si elle est déjà en retard, mais pas pour les tâches qui deviennent en retard sans interaction
  - ❌ **Tâches critiques** : Aucune notification automatique ne sera créée
  - ❌ **Rappels de rendez-vous** : Aucun rappel automatique ne sera envoyé
- **Configuration** : Utilise l'endpoint API existant

---

## 🚀 Configuration sur Railway

Railway ne supporte pas les cron jobs natifs. Vous devez utiliser un service externe comme **[cron-job.org](https://cron-job.org)** (gratuit).

### Étape 1 : Générer un secret

```bash
openssl rand -hex 32
```

**Important** : Gardez ce secret en sécurité ! Vous l'utiliserez pour les cron jobs.

### Étape 2 : Configurer CRON_SECRET dans Railway

1. Ouvrez Railway Dashboard → Votre service backend
2. Variables d'environnement → Ajouter
3. Nom : `CRON_SECRET`
4. Valeur : Le secret généré à l'étape 1
5. Sauvegarder

### Étape 3 : Créer les cron jobs sur cron-job.org

#### Cron Job 1 : Synchronisation Inbox

1. Créez un compte sur [cron-job.org](https://cron-job.org)
2. Créez une nouvelle tâche :
   - **Titre** : Lokario - Sync Inbox
   - **URL** : `https://VOTRE-DOMAINE-RAILWAY.app/inbox/integrations/sync-all?secret=VOTRE_CRON_SECRET`
   - **Méthode** : GET
   - **Planification** : `*/5 * * * *` (toutes les 5 minutes)
   - **Activer** : Oui
   - **Notifications** : Recommandé (pour être alerté en cas d'erreur)

#### Cron Job 2 : Relances automatiques

1. Dans le même compte cron-job.org
2. Créez une autre tâche :
   - **Titre** : Lokario - Relances automatiques
   - **URL** : `https://VOTRE-DOMAINE-RAILWAY.app/followups/process-automatic?secret=VOTRE_CRON_SECRET`
   - **Méthode** : GET
   - **Planification** : `0 * * * *` (toutes les heures)
   - **Activer** : Oui
   - **Notifications** : Recommandé

#### Cron Job 3 : Suppression des comptes

1. Dans le même compte cron-job.org
2. Créez une autre tâche :
   - **Titre** : Lokario - Suppression des comptes
   - **URL** : `https://VOTRE-DOMAINE-RAILWAY.app/users/process-account-deletions?secret=VOTRE_CRON_SECRET`
   - **Méthode** : GET
   - **Planification** : `0 2 * * *` (tous les jours à 2h du matin)
   - **Activer** : Oui
   - **Notifications** : Recommandé

#### Cron Job 4 : Vérification des éléments en retard et rappels

1. Dans le même compte cron-job.org
2. Créez une autre tâche :
   - **Titre** : Lokario - Vérification retards/rappels
   - **URL** : `https://VOTRE-DOMAINE-RAILWAY.app/cron/check-overdue-and-reminders?secret=VOTRE_CRON_SECRET`
   - **Méthode** : GET
   - **Planification** : `0 * * * *` (toutes les heures)
   - **Activer** : Oui
   - **Notifications** : Optionnel

---

## 🧪 Tester les endpoints

### Test 1 : Synchronisation Inbox

```bash
curl "https://VOTRE-DOMAINE-RAILWAY.app/inbox/integrations/sync-all?secret=VOTRE_CRON_SECRET"
```

Réponse attendue :
```json
{
  "success": true,
  "message": "Synchronisation inbox terminée avec succès",
  "timestamp": "2024-01-15T14:30:00"
}
```

### Test 2 : Relances automatiques

```bash
curl "https://VOTRE-DOMAINE-RAILWAY.app/followups/process-automatic?secret=VOTRE_CRON_SECRET"
```

Réponse attendue :
```json
{
  "success": true,
  "message": "Traitement des relances automatiques terminé avec succès",
  "timestamp": "2024-01-15T14:30:00"
}
```

### Test 3 : Suppression des comptes

```bash
curl "https://VOTRE-DOMAINE-RAILWAY.app/users/process-account-deletions?secret=VOTRE_CRON_SECRET"
```

Réponse attendue :
```json
{
  "success": true,
  "message": "Traitement des suppressions de comptes terminé avec succès",
  "timestamp": "2024-01-15T14:30:00"
}
```

### Test 4 : Vérification des éléments en retard et rappels

```bash
curl "https://VOTRE-DOMAINE-RAILWAY.app/cron/check-overdue-and-reminders?secret=VOTRE_CRON_SECRET"
```

Réponse attendue :
```json
{
  "success": true,
  "message": "Vérification des éléments en retard et des rappels terminée avec succès",
  "timestamp": "2024-01-15T14:30:00"
}
```

---

## 📊 Récapitulatif des fréquences recommandées

| Cron | Endpoint | Fréquence | Cron Expression | Priorité |
|------|----------|-----------|-----------------|----------|
| Synchronisation Inbox | `/inbox/integrations/sync-all` | Toutes les 5 min | `*/5 * * * *` | ⚠️ CRITIQUE |
| Relances automatiques | `/followups/process-automatic` | Toutes les heures | `0 * * * *` | ⚠️ CRITIQUE |
| Suppression comptes | `/users/process-account-deletions` | Quotidien (2h) | `0 2 * * *` | 🔶 RECOMMANDÉ |
| Vérification retard/rappels | `/cron/check-overdue-and-reminders` | Toutes les heures | `0 * * * *` | 🔶 RECOMMANDÉ |

---

## 🔍 Vérification et monitoring

### Vérifier que les cron jobs fonctionnent

1. **Dans cron-job.org** :
   - Allez dans "Job Logs" ou "Historie"
   - Vérifiez que les exécutions sont réussies (code 200)
   - Vérifiez les temps de réponse (ne doivent pas dépasser quelques secondes)

2. **Dans Railway** :
   - Allez dans "Logs"
   - Recherchez les lignes contenant :
     - `🔄 Déclenchement de la synchronisation inbox via API...`
     - `🔄 Déclenchement du traitement des relances automatiques via API...`

### Monitoring recommandé

- ✅ Vérifiez les logs quotidiennement
- ✅ Configurez des notifications sur cron-job.org pour être alerté en cas d'échec
- ✅ Surveillez les temps de réponse (si > 30s, augmentez l'intervalle)

---

## 🐛 Dépannage

### Erreur 403 Forbidden

- Vérifiez que `CRON_SECRET` est bien configuré dans Railway
- Vérifiez que le secret dans l'URL correspond exactement à `CRON_SECRET`
- Le secret est sensible à la casse

### Erreur 500 Internal Server Error

- Vérifiez les logs Railway pour voir l'erreur exacte
- Vérifiez que la base de données est accessible
- Vérifiez que les dépendances sont installées
- Pour la synchronisation inbox : vérifiez que les intégrations IMAP sont bien configurées

### Les emails ne se synchronisent pas

1. Vérifiez que le cron job inbox s'exécute bien (logs cron-job.org)
2. Vérifiez que les intégrations inbox sont actives dans l'interface
3. Vérifiez les logs Railway pour voir les erreurs de connexion IMAP
4. Testez manuellement l'endpoint de synchronisation

### Les relances ne sont pas envoyées

1. Vérifiez que le cron job relances s'exécute bien (logs cron-job.org)
2. Vérifiez que les relances ont bien `auto_enabled = True` dans la base de données
3. Vérifiez que les délais sont atteints (les relances ne sont envoyées que si le délai est dépassé)
4. Vérifiez que les relances automatiques sont activées dans les paramètres de facturation
5. Testez manuellement l'endpoint de relances

---

## 🔐 Sécurité

**Important** :
- ⚠️ Ne partagez JAMAIS votre `CRON_SECRET` publiquement
- ⚠️ Utilisez un secret fort (minimum 32 caractères)
- ⚠️ Si `CRON_SECRET` n'est pas configuré, les endpoints sont accessibles sans protection (développement uniquement)

---

## ✅ Checklist de configuration

### Pour les crons obligatoires :

- [ ] Générer un secret fort avec `openssl rand -hex 32`
- [ ] Ajouter `CRON_SECRET` dans Railway
- [ ] Créer un compte sur cron-job.org
- [ ] Créer le cron job pour la synchronisation inbox (toutes les 5 minutes)
- [ ] Créer le cron job pour les relances automatiques (toutes les heures)
- [ ] Tester les deux endpoints manuellement
- [ ] Vérifier les logs Railway après la première exécution
- [ ] Configurer les notifications sur cron-job.org (recommandé)

### Pour les crons optionnels :

- [ ] Évaluer si vous avez besoin du nettoyage des comptes (recommandé pour la production)
- [ ] Évaluer si vous avez besoin de la vérification des éléments en retard (recommandé)
- [ ] Si nécessaire, créer des endpoints API pour ces scripts ou utiliser un serveur Linux avec crontab

---

## 📚 Documentation supplémentaire

Pour plus de détails, consultez :
- `CONFIGURER_CRON_JOBS.md` - Guide détaillé de configuration
- `CONFIGURER_CRON_RELANCES.md` - Guide spécifique aux relances
- `backend/CRON_COEXISTENCE.md` - Informations sur la coexistence des crons

