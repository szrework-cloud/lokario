# 🔍 Diagnostic : Email non reçu + Requêtes lentes

## 📧 Problème 1 : Email de validation non reçu

### Causes possibles

#### 1. SMTP non configuré correctement

Vérifiez dans Railway → Variables :
- `SMTP_HOST` est configuré
- `SMTP_PORT` est configuré
- `SMTP_USERNAME` est configuré
- `SMTP_PASSWORD` est configuré
- `SMTP_FROM_EMAIL` est configuré

**Si SMTP n'est pas configuré :**
- L'application ne peut pas envoyer d'emails
- Le code peut échouer silencieusement ou utiliser un mode "mock"

#### 2. Email dans les spams

Vérifiez votre dossier spam/courrier indésirable.

#### 3. Email envoyé mais erreur silencieuse

Les erreurs d'envoi peuvent ne pas être visibles côté frontend.

### Solutions

#### A. Vérifier les logs Railway

Dans Railway → Logs, cherchez :
- Messages liés à SMTP
- Erreurs d'envoi d'email
- Messages "SMTP non configuré"

#### B. Vérifier la configuration SMTP

Assurez-vous que SMTP est bien configuré (voir `CONFIGURER_SMTP.md`).

#### C. Tester l'envoi d'email

Vous pouvez tester l'envoi d'email via l'API directement.

## ⏱️ Problème 2 : Requêtes très lentes (1-2 minutes)

### Causes possibles

#### 1. Cold start Railway

Railway peut mettre le container en veille après inactivité. Le premier démarrage peut prendre 30-60 secondes.

**Solution :**
- C'est normal pour le premier démarrage
- Les requêtes suivantes devraient être plus rapides

#### 2. Problème de connexion à la base de données

Si la connexion à Supabase est lente :
- Vérifiez la région de Supabase (elle doit être proche de Railway)
- Vérifiez que la DATABASE_URL est correcte
- Vérifiez les logs Railway pour les erreurs de connexion

#### 3. Pas de connection pooling

Supabase peut limiter le nombre de connexions simultanées.

**Solution :**
- Utilisez la connection string avec "pooler" :
  ```
  postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
  ```
  (Notez `pooler.supabase.com` au lieu de `direct.psql.supabase.com`)

#### 4. Requêtes SQL lentes

Si les requêtes à la base sont lentes :
- Vérifiez les index sur les tables
- Vérifiez que les requêtes sont optimisées

### Solutions

#### A. Vérifier la DATABASE_URL

Assurez-vous que votre DATABASE_URL utilise le pooler :
```
postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

#### B. Vérifier les logs Railway

Cherchez dans les logs :
- Temps de connexion à la base
- Timeouts
- Erreurs de connexion

#### C. Vérifier la région

Railway et Supabase doivent être dans la même région (ou proches) :
- Railway : Europe (europe-west4)
- Supabase : Vérifiez dans Settings → Infrastructure

## 🔍 Vérifications immédiates

### 1. Logs Railway pour les emails

Railway → Logs → Cherchez :
```
[SMTP] ...
SMTP non configuré
Erreur lors de l'envoi de l'email
```

### 2. Logs Railway pour la performance

Railway → Logs → Cherchez :
- Temps de réponse des requêtes
- Timeouts
- Erreurs de connexion DB

### 3. Configuration SMTP

Railway → Variables → Vérifiez que SMTP est configuré

### 4. Configuration DATABASE_URL

Railway → Variables → Vérifiez que DATABASE_URL utilise le pooler

## 📋 Checklist

### Pour l'email :
- [ ] SMTP configuré dans Railway
- [ ] Vérifier les logs Railway pour les erreurs SMTP
- [ ] Vérifier le dossier spam
- [ ] Tester l'envoi d'email

### Pour la performance :
- [ ] DATABASE_URL utilise le pooler (pooler.supabase.com)
- [ ] Vérifier les logs pour les timeouts
- [ ] Vérifier la région Railway vs Supabase
- [ ] Les requêtes suivantes sont plus rapides (cold start normal)

## 🎯 Actions prioritaires

1. **Vérifier les logs Railway** pour voir les erreurs exactes
2. **Vérifier SMTP** est configuré
3. **Vérifier DATABASE_URL** utilise le pooler
4. **Tester après cold start** (la deuxième requête devrait être plus rapide)
