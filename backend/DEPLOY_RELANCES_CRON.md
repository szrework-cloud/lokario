# Guide de déploiement des relances automatiques en production

## 📋 Vue d'ensemble

Le système de relances automatiques nécessite un cron job qui s'exécute périodiquement pour envoyer les relances selon les délais configurés.

## 🔧 Installation en développement/local

### Option 1 : Utiliser le script d'installation automatique

```bash
cd backend
chmod +x install_followups_cron.sh
./install_followups_cron.sh
```

Le script va :
- Détecter Python 3
- Créer le répertoire `logs/` si nécessaire
- Ajouter un cron job qui s'exécute **toutes les heures** (à l'heure pile)
- Configurer les logs dans `backend/logs/followups_auto.log`

### Option 2 : Installation manuelle

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne (remplacer /path/to/backend par le chemin réel)
0 * * * * cd /path/to/backend && python3 scripts/send_automatic_followups.py >> logs/followups_auto.log 2>&1
```

## 🚀 Installation en production

### Sur un serveur Linux (Ubuntu/Debian)

#### 1. Se connecter au serveur

```bash
ssh user@your-server.com
cd /path/to/your/backend
```

#### 2. Installer le cron job

```bash
# Option A : Utiliser le script d'installation
chmod +x install_followups_cron.sh
./install_followups_cron.sh

# Option B : Installation manuelle
crontab -e
# Ajouter :
0 * * * * cd /path/to/backend && /usr/bin/python3 scripts/send_automatic_followups.py >> logs/followups_auto.log 2>&1
```

#### 3. Vérifier l'installation

```bash
# Vérifier que le cron est installé
crontab -l | grep followups

# Vérifier les logs (après la première exécution)
tail -f logs/followups_auto.log
```

### Sur un serveur avec systemd (alternative recommandée)

Pour une meilleure gestion en production, vous pouvez utiliser un service systemd au lieu de cron :

#### 1. Créer le fichier de service

```bash
sudo nano /etc/systemd/system/followups-auto.service
```

Contenu :

```ini
[Unit]
Description=Envoi automatique des relances
After=network.target

[Service]
Type=oneshot
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/python3 /path/to/backend/scripts/send_automatic_followups.py
StandardOutput=append:/path/to/backend/logs/followups_auto.log
StandardError=append:/path/to/backend/logs/followups_auto.log

[Install]
WantedBy=multi-user.target
```

#### 2. Créer le timer systemd

```bash
sudo nano /etc/systemd/system/followups-auto.timer
```

Contenu :

```ini
[Unit]
Description=Timer pour l'envoi automatique des relances
Requires=followups-auto.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

#### 3. Activer et démarrer

```bash
sudo systemctl daemon-reload
sudo systemctl enable followups-auto.timer
sudo systemctl start followups-auto.timer

# Vérifier le statut
sudo systemctl status followups-auto.timer
sudo systemctl list-timers | grep followups
```

### Sur Docker

Si votre application est dans Docker, vous avez plusieurs options :

#### Option 1 : Cron dans le conteneur

```dockerfile
# Dans votre Dockerfile
RUN apt-get update && apt-get install -y cron

# Copier le script cron
COPY install_followups_cron.sh /app/
RUN chmod +x /app/install_followups_cron.sh

# Démarrer cron au démarrage
CMD cron && tail -f /dev/null
```

#### Option 2 : Service séparé (recommandé)

Créer un conteneur dédié pour les tâches cron :

```yaml
# docker-compose.yml
services:
  backend:
    # ... votre service backend

  followups-cron:
    build: ./backend
    command: >
      sh -c "
        echo '0 * * * * cd /app && python3 scripts/send_automatic_followups.py >> logs/followups_auto.log 2>&1' | crontab -
        crond -f
      "
    volumes:
      - ./backend:/app
      - ./backend/logs:/app/logs
    depends_on:
      - backend
```

### Sur un service cloud (Heroku, Railway, etc.)

#### Heroku

Utiliser Heroku Scheduler (add-on) :

```bash
# Installer l'add-on
heroku addons:create scheduler:standard

# Configurer la tâche via le dashboard Heroku
# Ou via CLI :
heroku addons:open scheduler
# Ajouter : python scripts/send_automatic_followups.py
# Fréquence : Hourly
```

#### Railway / Render / Vercel

Ces plateformes ne supportent pas cron natif. Options :

1. **Utiliser un service externe** (cron-job.org, EasyCron, etc.)
   - Configurer une requête HTTP vers votre endpoint
   - Créer un endpoint `/api/cron/send-followups` protégé par un secret

2. **Utiliser un worker séparé** qui tourne en continu

## 🔍 Vérification et monitoring

### Vérifier que le cron fonctionne

```bash
# Voir les logs
tail -f backend/logs/followups_auto.log

# Vérifier les dernières exécutions
grep "Début" backend/logs/followups_auto.log | tail -5

# Vérifier les erreurs
grep "ERROR\|❌" backend/logs/followups_auto.log | tail -10
```

### Tester manuellement

```bash
cd backend
python3 scripts/send_automatic_followups.py
```

### Monitoring recommandé

- Surveiller les logs quotidiennement
- Configurer des alertes si le script échoue
- Vérifier que les relances sont bien envoyées dans l'interface

## ⚙️ Configuration

### Fréquence d'exécution

Par défaut : **toutes les heures** (`0 * * * *`)

Pour changer la fréquence, modifier le cron :
- Toutes les 30 minutes : `*/30 * * * *`
- Toutes les 2 heures : `0 */2 * * *`
- Toutes les 6 heures : `0 */6 * * *`
- Une fois par jour (minuit) : `0 0 * * *`

### Variables d'environnement

Le script utilise les mêmes variables d'environnement que le backend :
- `DATABASE_URL` : URL de la base de données
- Variables de configuration dans `app/core/config.py`

## 🐛 Dépannage

### Le cron ne s'exécute pas

1. Vérifier que cron est actif : `sudo systemctl status cron`
2. Vérifier les permissions : le script doit être exécutable
3. Vérifier le PATH : utiliser le chemin complet de Python
4. Vérifier les logs système : `grep CRON /var/log/syslog`

### Erreurs dans les logs

- **Erreur de connexion DB** : Vérifier `DATABASE_URL`
- **Erreur d'import** : Vérifier que toutes les dépendances sont installées
- **Erreur de permissions** : Vérifier les permissions sur les fichiers

## 📝 Notes importantes

- Le script s'exécute **toutes les heures** par défaut
- Il vérifie automatiquement les délais configurés dans les paramètres
- Les relances sont envoyées uniquement si les conditions sont remplies
- Les logs sont sauvegardés dans `backend/logs/followups_auto.log`
