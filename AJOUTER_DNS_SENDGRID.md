# ➕ Ajouter les DNS SendGrid (sans toucher aux DNS existants)

## ✅ Ce qu'il faut faire

**AJOUTEZ les nouveaux enregistrements SendGrid**, **ne remplacez PAS** les enregistrements existants.

Vos DNS actuels sont nécessaires pour que votre site fonctionne sur Vercel !

## 📋 Enregistrements actuels (À CONSERVER)

Conservez ces enregistrements tels quels :

1. ✅ `CNAME www` → `b6f138d391a273f0.vercel-dns-017.com` (pour Vercel)
2. ✅ `A @` → `216.198.79.1` (pour Vercel)

## ➕ Enregistrements SendGrid à AJOUTER

Ajoutez ces 4 nouveaux enregistrements (en plus de ceux qui existent déjà) :

### 1. CNAME - em8029
```
Type: CNAME
Nom: em8029
Contenu: u58217847.wl098.sendgrid.net
TTL: 300 (ou laissez la valeur par défaut)
Priorité: 0 (ou laissez vide)
```

### 2. CNAME - s1._domainkey
```
Type: CNAME
Nom: s1._domainkey
Contenu: s1.domainkey.u58217847.wl098.sendgrid.net
TTL: 300 (ou laissez la valeur par défaut)
Priorité: 0 (ou laissez vide)
```

### 3. CNAME - s2._domainkey
```
Type: CNAME
Nom: s2._domainkey
Contenu: s2.domainkey.u58217847.wl098.sendgrid.net
TTL: 300 (ou laissez la valeur par défaut)
Priorité: 0 (ou laissez vide)
```

### 4. TXT - _dmarc
```
Type: TXT
Nom: _dmarc
Contenu: v=DMARC1; p=none;
TTL: 300 (ou laissez la valeur par défaut)
Priorité: 0 (ou laissez vide)
```

## 📊 Résultat final

Après avoir ajouté les enregistrements SendGrid, vous aurez **6 enregistrements au total** :

### Existant (Vercel) - À CONSERVER
1. ✅ CNAME `www` → Vercel
2. ✅ A `@` → IP Vercel

### Nouveau (SendGrid) - À AJOUTER
3. ➕ CNAME `em8029` → SendGrid
4. ➕ CNAME `s1._domainkey` → SendGrid
5. ➕ CNAME `s2._domainkey` → SendGrid
6. ➕ TXT `_dmarc` → SendGrid

## 🎯 Étapes

1. Dans votre gestionnaire DNS, cherchez le bouton **"Ajouter un enregistrement"** ou **"Add record"**
2. Ajoutez les 4 enregistrements SendGrid **un par un**
3. **Ne supprimez pas** les enregistrements existants (www et @)

## ✅ Vérification

Après avoir ajouté les enregistrements, vous devriez avoir :

```
Type    Nom            Contenu/Valeur
-----------------------------------------------
CNAME   www            b6f138d391a273f0.vercel-dns-017.com
A       @              216.198.79.1
CNAME   em8029         u58217847.wl098.sendgrid.net
CNAME   s1._domainkey  s1.domainkey.u58217847.wl098.sendgrid.net
CNAME   s2._domainkey  s2.domainkey.u58217847.wl098.sendgrid.net
TXT     _dmarc         v=DMARC1; p=none;
```

## ⚠️ Important

- ✅ **Ajoutez** les nouveaux enregistrements SendGrid
- ❌ **Ne supprimez pas** les enregistrements Vercel existants
- ⏰ Attendez 15-30 minutes pour la propagation DNS
- ✅ Vérifiez dans SendGrid que les DNS sont validés
