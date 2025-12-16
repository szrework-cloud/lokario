# Guide d'automatisation de la réception des emails

Ce guide explique comment configurer la réception automatique des emails pour plusieurs boîtes mail (Gmail, Orange, Mail Pro, etc.).

## 🎯 Solution recommandée : Script de synchronisation automatique

### 1. Configuration des boîtes mail

Chaque entreprise peut configurer **plusieurs boîtes mail** via l'API ou le frontend :

```bash
POST /inbox/integrations
{
  "integration_type": "imap",
  "name": "Boîte principale Gmail",
  "imap_server": "imap.gmail.com",
  "imap_port": 993,
  "email_address": "entreprise@gmail.com",
  "email_password": "votre_app_password",
  "use_ssl": true,
  "sync_interval_minutes": 5
}
```

### 2. Serveurs IMAP courants

| Fournisseur | Serveur IMAP | Port | SSL |
|------------|---------------|------|-----|
| **Gmail** | `imap.gmail.com` | 993 | Oui |
| **Orange** | `imap.orange.fr` | 993 | Oui |
| **Outlook/Hotmail** | `outlook.office365.com` | 993 | Oui |
| **Yahoo** | `imap.mail.yahoo.com` | 993 | Oui |
| **Mail Pro (OVH)** | `ssl0.ovh.net` | 993 | Oui |
| **Ionos** | `imap.ionos.fr` | 993 | Oui |

### 3. Script de synchronisation automatique

Le script `scripts/sync_inbox_integrations.py` synchronise **toutes les boîtes mail actives** automatiquement.

#### Installation du cron job

**Sur Linux/Mac :**

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne pour synchroniser toutes les 5 minutes
*/5 * * * * cd /path/to/backend && /usr/bin/python3 scripts/sync_inbox_integrations.py >> logs/inbox_sync.log 2>&1
```

**Sur Windows (Task Scheduler) :**

1. Ouvrir le Planificateur de tâches
2. Créer une tâche de base
3. Déclencher : Toutes les 5 minutes
4. Action : Exécuter `python scripts/sync_inbox_integrations.py`

**Via Docker/Systemd (Production) :**

Créer un service systemd :

```ini
# /etc/systemd/system/inbox-sync.service
[Unit]
Description=Inbox Email Sync Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/python3 scripts/sync_inbox_integrations.py
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
```

Puis activer :
```bash
sudo systemctl enable inbox-sync
sudo systemctl start inbox-sync
```

### 4. Test manuel

Pour tester la synchronisation manuellement :

```bash
cd backend
python scripts/sync_inbox_integrations.py
```

### 5. Gestion via l'API

#### Lister les intégrations

```bash
GET /inbox/integrations
Authorization: Bearer <token>
```

#### Créer une nouvelle intégration

```bash
POST /inbox/integrations
Authorization: Bearer <token>
Content-Type: application/json

{
  "integration_type": "imap",
  "name": "Boîte Orange",
  "imap_server": "imap.orange.fr",
  "imap_port": 993,
  "email_address": "contact@orange.fr",
  "email_password": "mot_de_passe",
  "use_ssl": true,
  "sync_interval_minutes": 5
}
```

#### Synchroniser manuellement une intégration

```bash
POST /inbox/integrations/{integration_id}/sync
Authorization: Bearer <token>
```

#### Synchroniser toutes les intégrations

```bash
POST /inbox/integrations/sync-all
Authorization: Bearer <token>
```

### 6. Configuration des mots de passe

#### Gmail

1. Aller dans **Paramètres Google** > **Sécurité**
2. Activer la **Validation en 2 étapes**
3. Générer un **Mot de passe d'application**
4. Utiliser ce mot de passe dans la configuration IMAP

#### Orange

1. Aller sur **orange.fr** > **Mon compte**
2. **Sécurité** > **Mots de passe d'application**
3. Générer un mot de passe pour "IMAP"
4. Utiliser ce mot de passe dans la configuration

#### Mail Pro (OVH)

1. Utiliser le mot de passe principal de la boîte mail
2. Si 2FA activé, générer un mot de passe d'application

### 7. Sécurité

⚠️ **Important :** En production, les mots de passe doivent être **chiffrés** dans la base de données.

Pour l'instant, ils sont stockés en clair. À améliorer avec :
- `cryptography` pour chiffrer/déchiffrer
- Variables d'environnement pour la clé de chiffrement

### 8. Monitoring

Le script enregistre automatiquement :
- `last_sync_at` : Dernière synchronisation
- `last_sync_status` : "success", "error", "partial"
- `last_sync_error` : Message d'erreur si échec

Vous pouvez créer une page admin pour surveiller l'état des synchronisations.

### 9. Exemple de configuration multiple

Une entreprise peut avoir :
- **Boîte principale** : `contact@entreprise.fr` (Gmail)
- **Support** : `support@entreprise.fr` (Orange)
- **Ventes** : `ventes@entreprise.fr` (Mail Pro)

Toutes seront synchronisées automatiquement toutes les 5 minutes (ou selon l'intervalle configuré).

## 🚀 Démarrage rapide

1. **Créer une intégration** via l'API ou le frontend
2. **Tester manuellement** : `python scripts/sync_inbox_integrations.py`
3. **Configurer le cron job** pour l'automatisation
4. **Vérifier les emails** dans l'Inbox de l'application

## 📝 Notes

- Le script respecte l'intervalle `sync_interval_minutes` configuré pour chaque intégration
- Si une synchronisation échoue, elle sera réessayée au prochain cycle
- Les emails déjà importés ne sont pas dupliqués (basé sur `external_id`)

