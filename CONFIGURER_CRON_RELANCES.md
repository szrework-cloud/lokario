# Configuration des relances automatiques via Cron

## 📋 Vue d'ensemble

Pour que les relances automatiques se déclenchent, vous devez configurer un cron job qui appelle périodiquement l'endpoint API `/api/followups/process-automatic`.

## 🔧 Configuration sur Railway

Railway ne supporte pas les cron jobs natifs. Vous avez deux options :

### Option 1 : Service externe de cron (Recommandé)

Utilisez un service comme [cron-job.org](https://cron-job.org) (gratuit) ou [EasyCron](https://www.easycron.com/) :

1. **Créer un compte sur cron-job.org**

2. **Configurer la variable d'environnement CRON_SECRET**
   - Dans Railway, ajoutez une variable d'environnement `CRON_SECRET`
   - Générez un secret aléatoire (ex: `openssl rand -hex 32`)

3. **Créer une tâche cron sur cron-job.org**
   - URL : `https://lokario-production.up.railway.app/api/followups/process-automatic?secret=VOTRE_CRON_SECRET`
   - Méthode : GET ou POST
   - Fréquence : Toutes les heures (`0 * * * *`)
   - Activer : Oui

4. **Tester manuellement**
   ```
   curl "https://lokario-production.up.railway.app/api/followups/process-automatic?secret=VOTRE_CRON_SECRET"
   ```

### Option 2 : Worker séparé (Alternative)

Créez un service Railway séparé qui tourne en continu et appelle l'endpoint périodiquement.

## 🔐 Sécurité

L'endpoint est protégé par le paramètre `secret` qui doit correspondre à la variable d'environnement `CRON_SECRET`.

**Important** : 
- Ne partagez JAMAIS votre `CRON_SECRET` publiquement
- Utilisez un secret fort (minimum 32 caractères)
- Si `CRON_SECRET` n'est pas configuré, l'endpoint est accessible sans protection (développement uniquement)

## 📝 Configuration locale (Développement)

### Option 1 : Appel manuel

```bash
# Dans votre terminal
curl "http://localhost:8000/api/followups/process-automatic?secret=VOTRE_CRON_SECRET"
```

### Option 2 : Cron local

Si vous voulez tester avec un vrai cron local :

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne (toutes les heures)
0 * * * * curl -s "http://localhost:8000/api/followups/process-automatic?secret=VOTRE_CRON_SECRET" > /dev/null 2>&1
```

### Option 3 : Utiliser le script directement

```bash
cd backend
python3 scripts/send_automatic_followups.py
```

## 🧪 Test

Pour tester que tout fonctionne :

1. **Vérifier que l'endpoint répond** :
   ```bash
   curl "https://lokario-production.up.railway.app/api/followups/process-automatic?secret=VOTRE_CRON_SECRET"
   ```

2. **Vérifier les logs Railway** :
   - Allez dans Railway Dashboard > Votre service > Logs
   - Vous devriez voir : `🔄 Déclenchement du traitement des relances automatiques via API...`
   - Puis les logs de traitement des relances

3. **Vérifier dans l'interface** :
   - Allez dans l'interface > Relances
   - Les relances qui devaient être envoyées aujourd'hui devraient maintenant être envoyées

## ⏰ Fréquence recommandée

- **Par défaut** : Toutes les heures (`0 * * * *`)
- **Si vous avez beaucoup de relances** : Toutes les 30 minutes (`*/30 * * * *`)
- **Si vous avez peu de relances** : Une fois par jour à minuit (`0 0 * * *`)

## 📊 Monitoring

### Vérifier que le cron s'exécute

1. **Dans cron-job.org** :
   - Allez dans "Job Logs"
   - Vérifiez que les exécutions sont réussies (code 200)

2. **Dans Railway** :
   - Vérifiez les logs du backend
   - Recherchez les lignes contenant "process-automatic"

### Dépannage

**Le cron ne s'exécute pas** :
- Vérifiez que `CRON_SECRET` est bien configuré dans Railway
- Vérifiez que l'URL dans cron-job.org est correcte
- Vérifiez que le secret correspond exactement

**Erreur 403 Forbidden** :
- Vérifiez que le secret dans l'URL correspond à `CRON_SECRET`
- Le secret est sensible à la casse

**Erreur 500 Internal Server Error** :
- Vérifiez les logs Railway pour voir l'erreur exacte
- Vérifiez que la base de données est accessible
- Vérifiez que les dépendances sont installées

## 🎯 Résumé des étapes

1. ✅ Générer un secret : `openssl rand -hex 32`
2. ✅ Ajouter `CRON_SECRET` dans Railway avec ce secret
3. ✅ Créer un compte sur cron-job.org
4. ✅ Créer une tâche cron avec l'URL complète incluant le secret
5. ✅ Tester manuellement pour vérifier que ça fonctionne
6. ✅ Vérifier les logs après la première exécution
