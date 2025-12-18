# ✅ Checklist : Email non reçu + Requêtes lentes

## 📧 Pour l'email non reçu

### Vérification 1 : Logs Railway

Railway → Logs → Cherchez :
- `[MOCK EMAIL]` → SMTP pas configuré
- `SMTP non configuré` → SMTP pas configuré  
- `Erreur d'authentification SMTP` → Problème de mot de passe/app password
- `✅ Email de vérification envoyé` → Email envoyé avec succès

### Vérification 2 : Configuration SMTP

Railway → Variables → Vérifiez :
- [ ] `SMTP_HOST` existe (ex: `smtp.gmail.com`)
- [ ] `SMTP_PORT` existe (ex: `587`)
- [ ] `SMTP_USERNAME` existe (ex: votre email Gmail)
- [ ] `SMTP_PASSWORD` existe (mot de passe d'application Gmail)
- [ ] `SMTP_FROM_EMAIL` existe
- [ ] `SMTP_USE_TLS` = `true`

### Si SMTP n'est pas configuré :

1. Suivez le guide `CONFIGURER_SMTP.md`
2. Configurez avec Gmail ou SendGrid
3. Redéployez Railway

### Si SMTP est configuré mais erreur :

- Vérifiez les logs Railway pour l'erreur exacte
- Pour Gmail : utilisez un "mot de passe d'application", pas votre mot de passe normal

## ⏱️ Pour les requêtes lentes

### Vérification 1 : DATABASE_URL utilise le pooler

Railway → Variables → `DATABASE_URL`

**✅ Correct (avec pooler) :**
```
postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

**❌ Incorrect (direct, plus lent) :**
```
postgresql://postgres.xxx:password@aws-0-region.direct.psql.supabase.com:5432/postgres
```

### Si DATABASE_URL n'utilise pas le pooler :

1. Dans Supabase → Settings → Database
2. Connection string → **"Connection pooling"** (pas "Direct connection")
3. Copiez cette URL
4. Remplacez DATABASE_URL dans Railway

### Vérification 2 : Cold start Railway

Si c'est la première requête depuis un moment :
- Le container peut être en veille
- Le démarrage prend 30-60 secondes (normal)
- Les requêtes suivantes devraient être plus rapides (< 1 seconde)

### Vérification 3 : Logs Railway pour la performance

Cherchez dans les logs :
- Temps de connexion DB
- Timeouts
- Erreurs de connexion

## 🎯 Actions prioritaires

1. **Vérifier les logs Railway** pour voir l'erreur exacte (email + performance)
2. **Vérifier SMTP est configuré** dans Railway Variables
3. **Vérifier DATABASE_URL utilise pooler.supabase.com**
4. **Tester après cold start** (2ème requête devrait être plus rapide)

## 📋 Résumé des solutions

### Email :
- Si `[MOCK EMAIL]` dans les logs → Configurez SMTP
- Si erreur SMTP → Vérifiez le mot de passe d'application Gmail
- Si pas d'erreur mais pas d'email → Vérifiez le dossier spam

### Performance :
- Utilisez `pooler.supabase.com` dans DATABASE_URL
- Cold start = normal (30-60s), requêtes suivantes rapides
- Si toujours lent → Vérifiez les logs pour les timeouts
