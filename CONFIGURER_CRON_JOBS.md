# Configuration des Cron Jobs pour Lokario

## 📋 Vue d'ensemble

Pour que l'application fonctionne correctement, vous devez configurer **plusieurs cron jobs** qui s'exécutent à différentes fréquences :

1. **Synchronisation Inbox** : Toutes les minutes (ou toutes les 5 minutes)
2. **Relances automatiques** : Toutes les heures

## 🔧 Configuration sur Railway

Railway ne supporte pas les cron jobs natifs. Utilisez un service externe comme [cron-job.org](https://cron-job.org) (gratuit).

### Étape 1 : Générer un secret

```bash
openssl rand -hex 32
```

**Important** : Gardez ce secret en sécurité ! Vous l'utiliserez pour les deux cron jobs.

### Étape 2 : Configurer CRON_SECRET dans Railway

1. Ouvrez Railway Dashboard → Votre service backend
2. Variables d'environnement → Ajouter
3. Nom : `CRON_SECRET`
4. Valeur : Le secret généré à l'étape 1
5. Sauvegarder

### Étape 3 : Créer les cron jobs sur cron-job.org

#### Cron Job 1 : Synchronisation Inbox (toutes les minutes)

1. Créez un compte sur [cron-job.org](https://cron-job.org)
2. Créez une nouvelle tâche :
   - **Titre** : Lokario - Sync Inbox
   - **URL** : `https://lokario-production.up.railway.app/api/inbox/integrations/sync-all?secret=VOTRE_CRON_SECRET`
   - **Méthode** : GET
   - **Planification** : 
     - **Toutes les minutes** : `* * * * *`
     - **Ou toutes les 5 minutes** (recommandé si vous avez beaucoup d'emails) : `*/5 * * * *`
   - **Activer** : Oui
   - **Notifications** : Optionnel (pour être alerté en cas d'erreur)

#### Cron Job 2 : Relances automatiques (toutes les heures)

1. Dans le même compte cron-job.org
2. Créez une autre tâche :
   - **Titre** : Lokario - Relances automatiques
   - **URL** : `https://lokario-production.up.railway.app/api/followups/process-automatic?secret=VOTRE_CRON_SECRET`
   - **Méthode** : GET
   - **Planification** : 
     - **Toutes les heures** : `0 * * * *` (à l'heure pile, ex: 14:00, 15:00, etc.)
     - **Ou toutes les 30 minutes** : `*/30 * * * *`
   - **Activer** : Oui
   - **Notifications** : Optionnel

## 🧪 Tester les endpoints

### Test 1 : Synchronisation Inbox

```bash
curl "https://lokario-production.up.railway.app/api/inbox/integrations/sync-all?secret=VOTRE_CRON_SECRET"
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
curl "https://lokario-production.up.railway.app/api/followups/process-automatic?secret=VOTRE_CRON_SECRET"
```

Réponse attendue :
```json
{
  "success": true,
  "message": "Traitement des relances automatiques terminé avec succès",
  "timestamp": "2024-01-15T14:30:00"
}
```

## 📊 Fréquences recommandées

### Synchronisation Inbox

| Fréquence | Cron Expression | Recommandé pour |
|-----------|----------------|-----------------|
| Toutes les minutes | `* * * * *` | Production normale |
| Toutes les 5 minutes | `*/5 * * * *` | Si beaucoup d'emails, pour réduire la charge |
| Toutes les 15 minutes | `*/15 * * * *` | Développement/test |

**Note** : Plus la synchronisation est fréquente, plus vos emails seront à jour rapidement, mais cela augmente la charge sur le serveur IMAP.

### Relances automatiques

| Fréquence | Cron Expression | Recommandé pour |
|-----------|----------------|-----------------|
| Toutes les heures | `0 * * * *` | Production (recommandé) |
| Toutes les 30 minutes | `*/30 * * * *` | Si beaucoup de relances |
| Toutes les 2 heures | `0 */2 * * *` | Si peu de relances |

**Note** : Les relances respectent les délais configurés dans les paramètres. Même si le cron s'exécute toutes les heures, une relance ne sera envoyée que si le délai est atteint.

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

- Vérifiez les logs quotidiennement
- Configurez des notifications sur cron-job.org pour être alerté en cas d'échec
- Surveillez les temps de réponse (si > 30s, augmentez l'intervalle)

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

## 🔐 Sécurité

**Important** :
- Ne partagez JAMAIS votre `CRON_SECRET` publiquement
- Utilisez un secret fort (minimum 32 caractères)
- Si `CRON_SECRET` n'est pas configuré, les endpoints sont accessibles sans protection (développement uniquement)

## 📝 Exemple de configuration complète

```
Railway Variables :
- CRON_SECRET: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

Cron Job 1 (Inbox) :
- URL: https://lokario-production.up.railway.app/api/inbox/integrations/sync-all?secret=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
- Méthode: GET
- Fréquence: */5 * * * * (toutes les 5 minutes)

Cron Job 2 (Relances) :
- URL: https://lokario-production.up.railway.app/api/followups/process-automatic?secret=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
- Méthode: GET
- Fréquence: 0 * * * * (toutes les heures)
```

## ✅ Checklist de configuration

- [ ] Générer un secret fort avec `openssl rand -hex 32`
- [ ] Ajouter `CRON_SECRET` dans Railway
- [ ] Créer un compte sur cron-job.org
- [ ] Créer le cron job pour la synchronisation inbox (toutes les 5 minutes)
- [ ] Créer le cron job pour les relances automatiques (toutes les heures)
- [ ] Tester les deux endpoints manuellement
- [ ] Vérifier les logs Railway après la première exécution
- [ ] Configurer les notifications sur cron-job.org (optionnel mais recommandé)
