# 📧 Configuration DNS SendGrid pour lokario.fr

## 🎯 Objectif

Configurer les enregistrements DNS pour que SendGrid puisse envoyer des emails au nom de `lokario.fr`.

## 📋 Enregistrements à ajouter

Ajoutez ces 4 enregistrements dans votre gestionnaire DNS :

### 1. CNAME - em8029.lokario.fr
```
Type: CNAME
Host: em8029
Value: u58217847.wl098.sendgrid.net
TTL: 3600 (ou par défaut)
```

### 2. CNAME - s1._domainkey.lokario.fr
```
Type: CNAME
Host: s1._domainkey
Value: s1.domainkey.u58217847.wl098.sendgrid.net
TTL: 3600 (ou par défaut)
```

### 3. CNAME - s2._domainkey.lokario.fr
```
Type: CNAME
Host: s2._domainkey
Value: s2.domainkey.u58217847.wl098.sendgrid.net
TTL: 3600 (ou par défaut)
```

### 4. TXT - _dmarc.lokario.fr
```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none;
TTL: 3600 (ou par défaut)
```

## 🔍 Où configurer ces DNS ?

### Option 1 : Si votre domaine est géré par Vercel

Si Vercel gère les DNS de votre domaine :

1. **Vercel Dashboard** → Votre projet → Settings → Domains
2. Cliquez sur `lokario.fr`
3. Allez dans l'onglet **"DNS Records"** ou **"DNS Configuration"**
4. Ajoutez chaque enregistrement un par un

### Option 2 : Si votre domaine est géré par votre registrar (OVH, Cloudflare, etc.)

Si vous avez acheté le domaine ailleurs (OVH, Cloudflare, Google Domains, etc.) :

1. Connectez-vous à votre registrar (ex: OVH, Cloudflare, etc.)
2. Allez dans la section **"DNS"** ou **"Zone DNS"**
3. Ajoutez les 4 enregistrements ci-dessus

### Option 3 : Si vous utilisez Cloudflare

1. Cloudflare Dashboard → Sélectionnez `lokario.fr`
2. Onglet **"DNS"**
3. Cliquez sur **"Add record"**
4. Ajoutez chaque enregistrement :
   - Pour les CNAME : Type = CNAME, Name = (juste la partie avant .lokario.fr), Target = (la valeur)
   - Pour le TXT : Type = TXT, Name = `_dmarc`, Content = `v=DMARC1; p=none;`

## 📝 Instructions détaillées par registrar

### OVH
1. OVH Manager → Web → Domaines → `lokario.fr`
2. Onglet **"Zone DNS"**
3. Cliquez sur **"Ajouter une entrée"**
4. Ajoutez chaque enregistrement

### Cloudflare
1. Cloudflare Dashboard → `lokario.fr` → DNS
2. **"Add record"**
3. Pour `em8029.lokario.fr` : Type = CNAME, Name = `em8029`, Target = `u58217847.wl098.sendgrid.net`
4. Répétez pour les autres

### Google Domains
1. Google Domains → `lokario.fr` → DNS
2. Section **"Custom resource records"**
3. Ajoutez chaque enregistrement

## ⚠️ Notes importantes

1. **Le host peut varier selon l'interface** :
   - Certains systèmes demandent juste `em8029` (sans `.lokario.fr`)
   - D'autres demandent `em8029.lokario.fr` complet
   - Vérifiez la documentation de votre registrar

2. **Propagation DNS** :
   - Les changements DNS peuvent prendre **5 minutes à 48 heures** pour se propager
   - Généralement, c'est entre 15 minutes et 1 heure

3. **Vérification dans SendGrid** :
   - Après avoir ajouté les DNS, retournez sur SendGrid
   - SendGrid vérifiera automatiquement que les DNS sont configurés
   - Cela peut prendre quelques heures

## ✅ Vérifier la configuration

1. Attendez 15-30 minutes après avoir ajouté les DNS
2. Retournez sur SendGrid Dashboard → Settings → Sender Authentication → Domain Authentication
3. SendGrid devrait indiquer que les DNS sont vérifiés ✅

## 🚨 Si ça ne fonctionne pas

1. **Vérifiez que vous avez mis les bons valeurs** (copiez-collez exactement)
2. **Attendez la propagation DNS** (peut prendre jusqu'à 48h)
3. **Vérifiez que le domaine est bien `lokario.fr`** (pas `www.lokario.fr`)

## 📚 Après configuration DNS

Une fois les DNS configurés et vérifiés par SendGrid :

1. Dans Railway, configurez SendGrid SMTP :
   ```
   SMTP_HOST = smtp.sendgrid.net
   SMTP_PORT = 587
   SMTP_USE_TLS = true
   SMTP_USERNAME = apikey
   SMTP_PASSWORD = votre_api_key_sendgrid
   SMTP_FROM_EMAIL = noreply@lokario.fr (ou votre email vérifié)
   ```

2. Testez l'envoi d'email !

## 🎯 Résumé

- ❌ **Pas sur Vercel** (sauf si Vercel gère vos DNS)
- ✅ **Dans votre gestionnaire DNS** (OVH, Cloudflare, Google Domains, etc.)
- ⏰ Attendez la propagation DNS (15 min - 48h)
- ✅ Vérifiez dans SendGrid que c'est validé
