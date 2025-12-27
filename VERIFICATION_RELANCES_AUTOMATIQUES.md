# ✅ Vérification des Relances Automatiques

## 🔄 Comment ça fonctionne

### 1. **Cron Configuration**
Le cron doit appeler cette URL toutes les heures :
```
GET/POST https://lokario-production.up.railway.app/followups/process-automatic?secret=VOTRE_CRON_SECRET
```

**Fréquence recommandée** : `0 * * * *` (toutes les heures)

### 2. **Processus Automatique**

Quand le cron s'exécute, `process_automatic_followups()` fait :

#### Étape 1 : Création des relances
- ✅ Crée automatiquement des relances pour **devis non signés**
- ✅ Crée automatiquement des relances pour **factures impayées**
- Les relances sont créées avec `auto_enabled = True`

#### Étape 2 : Traitement des relances existantes
- Récupère toutes les relances avec `auto_enabled = True` et `status != FAIT`
- Pour chaque relance, vérifie si elle doit être envoyée avec `should_send_followup()`

### 3. **Conditions d'envoi** (`should_send_followup()`)

Une relance est envoyée si :

✅ **Première relance** :
- Le délai initial est atteint (depuis `due_date`)
- Délai par défaut : 7 jours (configurable dans `relance_delays[0]`)

✅ **Relances suivantes** :
- Le délai depuis la dernière relance est atteint
- Délais par défaut : 7, 14, 21 jours (configurable dans `relance_delays`)

❌ **Conditions d'arrêt** :
- Devis signé → relance supprimée
- Facture payée → relance marquée comme FAIT
- Nombre max de relances atteint → relance marquée comme FAIT

### 4. **Envoi de la relance**

Si les conditions sont remplies :
1. Génère le message avec `generate_followup_message()`
2. Envoie via inbox (email ou SMS selon configuration)
3. Crée une entrée dans `FollowUpHistory`
4. Met à jour `due_date` pour la prochaine relance
5. Si toutes les relances sont envoyées → `status = FAIT`

## 🔍 Vérification

### 1. Vérifier que le cron est configuré

Sur cron-job.org ou votre service de cron :
- URL : `https://lokario-production.up.railway.app/followups/process-automatic?secret=VOTRE_CRON_SECRET`
- Fréquence : `0 * * * *` (toutes les heures)
- Méthode : GET ou POST

### 2. Tester manuellement

```bash
curl "https://lokario-production.up.railway.app/followups/process-automatic?secret=VOTRE_CRON_SECRET"
```

Réponse attendue :
```json
{
  "success": true,
  "message": "Traitement des relances automatiques terminé avec succès",
  "timestamp": "2025-12-27T01:00:00"
}
```

### 3. Vérifier les logs Railway

Cherchez dans les logs :
```
🔄 Déclenchement du traitement des relances automatiques via API...
🔄 Démarrage du traitement des relances automatiques...
📝 Création des relances automatiques pour devis non signés...
📝 Création des relances automatiques pour factures impayées...
📋 X relance(s) avec automatisation activée trouvée(s)
```

### 4. Vérifier dans la base de données

```sql
-- Voir les relances automatiques
SELECT id, type, source_type, source_id, due_date, status, auto_enabled
FROM followups
WHERE auto_enabled = true
ORDER BY due_date;

-- Voir l'historique des relances envoyées
SELECT fh.*, f.type, f.source_type
FROM followup_history fh
JOIN followups f ON fh.followup_id = f.id
WHERE fh.status = 'envoié'
ORDER BY fh.sent_at DESC;
```

## ⚠️ Problèmes courants

### 1. Le cron ne s'exécute pas
- ✅ Vérifier que l'URL est correcte
- ✅ Vérifier que `CRON_SECRET` est bien configuré dans Railway
- ✅ Vérifier les logs cron-job.org pour voir les erreurs

### 2. Les relances ne sont pas créées
- ✅ Vérifier que les devis/factures existent et sont dans le bon statut
- ✅ Vérifier les logs : "Entreprise X: Y devis/factures trouvé(s)"

### 3. Les relances sont créées mais pas envoyées
- ✅ Vérifier que `due_date` est dans le passé
- ✅ Vérifier que le délai depuis la dernière relance est atteint
- ✅ Vérifier les logs : "Relance X: délai requis: Y jours, jours écoulés: Z"

### 4. Erreurs d'envoi
- ✅ Vérifier la configuration inbox (email/SMS)
- ✅ Vérifier les limites du plan (Essentiel a des limites)
- ✅ Vérifier les logs d'erreur

## 📊 Logs à surveiller

### Succès
```
✅ Relance X envoyée avec succès (conversation: Y)
✅ Traitement terminé: X envoyée(s), Y ignorée(s), Z erreur(s)
```

### Erreurs
```
❌ Échec d'envoi de la relance X
❌ Erreur lors du traitement de la relance X
⚠️ Limite de relances atteinte pour entreprise X
```

## 🔧 Configuration

Les délais et nombre de relances sont configurables dans les settings de l'entreprise :

```json
{
  "followups": {
    "max_relances": 3,
    "relance_delays": [7, 14, 21],
    "messages": [...]
  }
}
```

Par défaut :
- `max_relances`: 3
- `relance_delays`: [7, 14, 21] jours

