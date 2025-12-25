# 📋 Comment Voir les Logs pour les Relances SMS

## 🔍 Selon le contexte

### Option 1 : En Production (Railway) - Relances via l'API

Si vous envoyez une relance via l'interface web (API) :

1. **Allez sur Railway Dashboard**
   - https://railway.app/dashboard
   - Sélectionnez votre projet backend

2. **Ouvrez l'onglet "Logs"**
   - Dans le menu de gauche ou en haut : **"Logs"**

3. **Envoyez une relance SMS** depuis l'interface

4. **Cherchez dans les logs** (utilisez Ctrl+F / Cmd+F) :
   - `[FOLLOWUP SEND/` - Pour voir le début de l'envoi
   - `Méthode d'envoi déterminée depuis le template: sms`
   - `Intégration SMS trouvée`
   - `Envoi du SMS de`
   - `SMS envoyé avec succès`
   - `❌` - Pour voir les erreurs

**Exemple de logs attendus :**
```
[FOLLOWUP SEND/123] ========== DÉBUT ENVOI RELANCE ==========
[FOLLOWUP SEND/123] Méthode d'envoi du template utilisée: sms
[FOLLOWUP SEND/123] Intégration SMS/WhatsApp trouvée: 33612345678
[FOLLOWUP SEND/123] 📱 Envoi du SMS de 33612345678 à +33612345678
[FOLLOWUP SEND/123] ✅ SMS envoyé avec succès à +33612345678
```

---

### Option 2 : Script Automatique en Local

Si vous exécutez le script automatique en local :

```bash
cd backend
python scripts/send_automatic_followups.py
```

Les logs s'affichent directement dans le terminal.

**Exemple :**
```
🔄 Démarrage du traitement des relances automatiques...
📋 1 relance(s) avec automatisation activée trouvée(s)
📤 Envoi de la relance 123 (Type: DEVIS_NON_REPONDU, Client: 1)
Relance 123: Méthode d'envoi déterminée depuis le template: sms
✅ SMS envoyé via inbox à +33612345678 pour la relance 123
✅ Relance 123 envoyée avec succès (conversation: 456)
✅ Traitement terminé: 1 envoyée(s), 0 ignorée(s), 0 erreur(s)
```

---

### Option 3 : Script Automatique en Production (Railway)

Si le script automatique tourne en production (cron job) :

1. **Railway Dashboard → Logs**
2. **Cherchez** :
   - `Démarrage du traitement des relances automatiques`
   - `Envoi de la relance`
   - `SMS envoyé via inbox`

---

### Option 4 : Test Direct SMS (Sans Relance)

Pour tester juste l'envoi SMS (sans passer par les relances) :

```bash
cd backend
python scripts/test_vonage_sms.py
```

Vous devrez entrer un numéro de test, et les logs s'affichent dans le terminal.

---

## 🔧 Si vous ne voyez AUCUN log

### Vérification 1 : Le service est-il actif ?

- Railway Dashboard → Service → Vérifiez que le statut est **"Running"**

### Vérification 2 : Avez-vous fait une action récente ?

- Les logs n'apparaissent que lors d'une action (envoi de relance, etc.)
- **Essayez d'envoyer une relance SMS** depuis l'interface pour voir les logs

### Vérification 3 : Filtres actifs ?

- Dans Railway Logs, vérifiez qu'il n'y a pas de filtre qui cache les logs
- Essayez de chercher : `FOLLOWUP` ou `SMS` ou `Vonage`

### Vérification 4 : Redémarrage du service

Si toujours rien :
1. Railway Dashboard → Service → **"Restart"**
2. Attendez 1-2 minutes
3. Envoyez une relance SMS
4. Vérifiez les logs

---

## 📝 Logs à Chercher Spécifiquement

### ✅ Succès
Cherchez ces messages dans les logs :
```
✅ SMS envoyé avec succès
✅ SMS envoyé via inbox
Méthode d'envoi déterminée depuis le template: sms
```

### ❌ Erreurs
Si vous voyez ces messages, il y a un problème :
```
❌ Aucune intégration SMS trouvée
❌ API Key manquante dans l'intégration SMS
❌ API Secret (webhook_secret) manquant dans l'intégration SMS
❌ Numéro de téléphone manquant dans l'intégration SMS
❌ Numéro de téléphone client manquant
❌ Impossible de décrypter les credentials Vonage
❌ Échec de l'envoi SMS
```

---

## 🎯 Test Rapide

Pour tester rapidement et voir les logs :

1. **Envoyez une relance SMS** depuis l'interface
2. **Immédiatement allez dans Railway → Logs**
3. **Cherchez** : `FOLLOWUP SEND` (Ctrl+F / Cmd+F)
4. **Lisez les logs** pour voir ce qui s'est passé

---

## 💡 Astuce

Si vous voulez voir les logs en temps réel dans Railway :
- Les logs se mettent à jour automatiquement
- Vous pouvez laisser l'onglet Logs ouvert pendant que vous envoyez une relance
- Les nouveaux logs apparaîtront automatiquement

