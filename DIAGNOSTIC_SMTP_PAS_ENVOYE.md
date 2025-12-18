# 🔍 Diagnostic : SMTP configuré mais emails non envoyés

## ✅ Ce que vous avez

- ✅ SMTP configuré dans Railway Variables
- ✅ Toutes les variables SMTP présentes
- ❌ Mais les emails ne sont pas envoyés

## 🔍 Étapes de diagnostic

### Étape 1 : Vérifier les logs Railway

Dans Railway → Logs, cherchez ces messages :

#### A. Si vous voyez `[MOCK EMAIL]`

```
📧 [MOCK EMAIL] Email de vérification
```

**Cela signifie** : Le code pense que SMTP n'est pas configuré !

**Cause probable :**
- `SMTP_HOST` est vide ou null dans Railway
- La variable n'est pas lue correctement

**Solution :**
- Vérifiez que `SMTP_HOST` a bien une valeur (ex: `smtp.gmail.com`)
- Pas juste le nom, mais une vraie valeur

#### B. Si vous voyez une erreur SMTP

```
❌ Erreur d'authentification SMTP
Erreur lors de l'envoi de l'email
```

**Cela signifie** : SMTP est configuré mais il y a une erreur

**Causes possibles :**
1. **Mot de passe incorrect** (pour Gmail, doit être un "mot de passe d'application")
2. **Authentification à 2 facteurs non activée** (pour Gmail)
3. **Paramètres SMTP incorrects** (port, TLS, etc.)

#### C. Si vous voyez `✅ Email de vérification envoyé`

```
✅ Email de vérification envoyé avec succès à email@example.com
```

**Cela signifie** : L'email a été envoyé avec succès !

**Si vous ne le recevez pas :**
- Vérifiez votre dossier spam/courrier indésirable
- Vérifiez que l'adresse email est correcte

### Étape 2 : Vérifier les variables Railway

Dans Railway → Variables, vérifiez chaque variable SMTP :

1. **SMTP_HOST**
   - Valeur : `smtp.gmail.com` (ou autre serveur SMTP)
   - ⚠️ Pas vide, pas juste le nom de la variable

2. **SMTP_PORT**
   - Valeur : `587` (pour Gmail avec TLS)

3. **SMTP_USE_TLS**
   - Valeur : `true` (ou `True`, ou `1`)

4. **SMTP_USERNAME**
   - Valeur : Votre email Gmail complet (ex: `votre.email@gmail.com`)

5. **SMTP_PASSWORD**
   - Pour Gmail : **DOIT être un mot de passe d'application** (pas votre mot de passe normal)
   - Généré ici : https://myaccount.google.com/apppasswords
   - Format : 16 caractères (ex: `abcd efgh ijkl mnop`)

6. **SMTP_FROM_EMAIL**
   - Valeur : Votre email Gmail (ex: `votre.email@gmail.com`)

### Étape 3 : Vérifier Gmail (si vous utilisez Gmail)

#### A. Authentification à 2 facteurs

1. Allez sur : https://myaccount.google.com/security
2. Vérifiez que "Validation en deux étapes" est activée
3. Si non, activez-la

#### B. Mot de passe d'application

1. Allez sur : https://myaccount.google.com/apppasswords
2. Générez un nouveau mot de passe d'application :
   - Sélectionnez "Mail"
   - Sélectionnez "Autre (nom personnalisé)"
   - Nom : "Lokario Backend"
   - Cliquez sur "Générer"
   - **Copiez le mot de passe** (16 caractères) - il ne sera affiché qu'une fois !
3. Utilisez ce mot de passe (pas votre mot de passe Gmail normal) dans `SMTP_PASSWORD`

**Format du mot de passe d'application :**
- 16 caractères avec des espaces (ex: `abcd efgh ijkl mnop`)
- Vous pouvez enlever les espaces pour Railway (ex: `abcdefghijklmnop`)

### Étape 4 : Tester manuellement

Vous pouvez tester l'envoi d'email directement depuis Railway :

1. Railway Dashboard → Service backend → Logs
2. Créez un compte de test
3. Regardez les logs en temps réel pour voir les messages SMTP

## 🎯 Checklist de vérification

- [ ] `SMTP_HOST` existe et a une valeur (pas vide)
- [ ] `SMTP_PORT` = `587` (pour Gmail)
- [ ] `SMTP_USE_TLS` = `true`
- [ ] `SMTP_USERNAME` = votre email Gmail complet
- [ ] `SMTP_PASSWORD` = mot de passe d'application Gmail (16 caractères)
- [ ] `SMTP_FROM_EMAIL` = votre email Gmail
- [ ] Authentification à 2 facteurs activée sur Gmail
- [ ] Vérifié les logs Railway pour les erreurs SMTP
- [ ] Vérifié le dossier spam

## 📋 Messages dans les logs à chercher

**Si SMTP pas configuré :**
```
[MOCK EMAIL]
SMTP non configuré
```

**Si erreur d'authentification :**
```
❌ Erreur d'authentification SMTP
```

**Si email envoyé :**
```
✅ Email de vérification envoyé avec succès
[SMTP] Email envoyé avec succès
```

**Si autre erreur :**
```
❌ Erreur lors de l'envoi de l'email
```

## 🔧 Solution rapide : Regénérer le mot de passe d'application Gmail

Si vous utilisez Gmail et que ça ne fonctionne pas :

1. https://myaccount.google.com/apppasswords
2. Supprimez l'ancien mot de passe d'application (si vous l'avez perdu)
3. Créez-en un nouveau pour "Mail" → "Lokario Backend"
4. Copiez le nouveau mot de passe (16 caractères)
5. Mettez à jour `SMTP_PASSWORD` dans Railway
6. Redéployez Railway

## 📝 Résumé

**Les causes les plus communes :**
1. `SMTP_HOST` est vide ou mal configuré
2. Mot de passe Gmail normal utilisé au lieu d'un mot de passe d'application
3. Authentification à 2 facteurs non activée sur Gmail
4. Email dans le dossier spam

Vérifiez d'abord les logs Railway pour voir le message exact ! 🔍
