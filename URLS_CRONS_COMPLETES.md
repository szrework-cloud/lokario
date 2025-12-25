# 🔗 URLs Complètes des 4 Crons pour Lokario

## 📋 Remplacez ces valeurs

- `VOTRE-DOMAINE-RAILWAY.app` → Remplacez par votre URL Railway (ex: `lokario-production.up.railway.app`)
- `VOTRE_CRON_SECRET` → Remplacez par votre secret généré avec `openssl rand -hex 32`

---

## ✅ Cron 1 : Synchronisation Inbox (OBLIGATOIRE)

**URL complète :**
```
https://VOTRE-DOMAINE-RAILWAY.app/inbox/integrations/sync-all?secret=VOTRE_CRON_SECRET
```

**Méthode :** GET ou POST  
**Fréquence :** `*/5 * * * *` (toutes les 5 minutes)

---

## ✅ Cron 2 : Relances automatiques (OBLIGATOIRE)

**URL complète :**
```
https://VOTRE-DOMAINE-RAILWAY.app/followups/process-automatic?secret=VOTRE_CRON_SECRET
```

**Méthode :** GET ou POST  
**Fréquence :** `0 * * * *` (toutes les heures)

---

## ✅ Cron 3 : Suppression des comptes (RECOMMANDÉ)

**URL complète :**
```
   https://lokario-production.up.railway.app/users/process-account-deletions?secret=VOTRE_CRON_SECRET```

**Méthode :** GET ou POST  
**Fréquence :** `0 2 * * *` (tous les jours à 2h du matin)

---

## ✅ Cron 4 : Vérification des éléments en retard et rappels (RECOMMANDÉ)

**URL complète :**
```
   https://lokario-production.up.railway.app/cron/check-overdue-and-reminders?secret=VOTRE_CRON_SECRET```

**Méthode :** GET ou POST  
**Fréquence :** `0 * * * *` (toutes les heures)

---

## 📝 Exemple avec des valeurs réelles

Si votre domaine Railway est `lokario-production.up.railway.app` et votre secret est `abc123def456...`, voici les URLs :

1. **Synchronisation Inbox :**
   ```
   https://lokario-production.up.railway.app/inbox/integrations/sync-all?secret=abc123def456...
   ```

2. **Relances automatiques :**
   ```
   https://lokario-production.up.railway.app/followups/process-automatic?secret=abc123def456...
   ```

3. **Suppression des comptes :**
   ```
   https://lokario-production.up.railway.app/users/process-account-deletions?secret=abc123def456...
   ```

4. **Vérification des éléments en retard et rappels :**
   ```
   https://lokario-production.up.railway.app/cron/check-overdue-and-reminders?secret=abc123def456...
   ```

---

## 🔍 Comment trouver votre URL Railway

1. Ouvrez Railway Dashboard → Votre service backend
2. Onglet **Settings** → **Networking**
3. Cherchez **"Public Domain"** ou **"Generate Domain"**
4. Copiez l'URL (ex: `lokario-production.up.railway.app`)

---

## 🔐 Comment trouver/générer votre CRON_SECRET

1. **Si vous l'avez déjà configuré dans Railway :**
   - Railway Dashboard → Service backend → Variables d'environnement
   - Cherchez `CRON_SECRET` et copiez la valeur

2. **Si vous devez le générer :**
   ```bash
   openssl rand -hex 32
   ```
   Puis ajoutez-le dans Railway comme variable d'environnement `CRON_SECRET`

---

## ✅ Checklist

- [ ] J'ai trouvé mon URL Railway
- [ ] J'ai généré/configuré mon CRON_SECRET dans Railway
- [ ] J'ai créé les 4 cron jobs sur cron-job.org avec les URLs complètes
- [ ] J'ai testé chaque URL manuellement (curl ou navigateur)
- [ ] Les crons s'exécutent correctement (vérifier les logs Railway)

