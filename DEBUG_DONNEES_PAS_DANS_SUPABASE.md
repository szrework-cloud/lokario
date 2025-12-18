# 🔍 Debug : Les données ne vont pas dans Supabase

## 🔍 Problème

Les logs montrent que l'inscription réussit (201 Created) mais les données n'apparaissent pas dans Supabase.

## ✅ Vérifications à faire

### 1. Vérifier DATABASE_URL dans Railway

**Dans Railway → Variables, vérifiez que :**

```
DATABASE_URL = postgresql://postgres:password@host:port/postgres
```

**Important :**
- Doit être au format `postgresql://` (pas `https://`)
- Doit pointer vers votre projet Supabase
- Utilisez le **Connection Pooler** (port 6543) pour de meilleures performances

### 2. Vérifier que vous regardez le bon projet Supabase

- Allez sur https://supabase.com/dashboard
- **Vérifiez que vous êtes sur le bon projet** (celui qui correspond à votre DATABASE_URL)
- Cliquez sur **Table Editor**

### 3. Vérifier les logs Railway

Cherchez dans les logs Railway :
- `✅ Utilisateur créé avec succès`
- `✅ Entreprise créée avec ID: X`
- **Pas d'erreurs de base de données**

### 4. Vérifier que les commits sont faits

Le code utilise `db.commit()` après la création, donc les données devraient être sauvegardées.

## 🔍 Diagnostic

### Si les logs montrent "201 Created" mais pas de données dans Supabase :

1. **Projet Supabase différent** → Vérifiez que DATABASE_URL pointe vers le bon projet
2. **DATABASE_URL incorrect** → Vérifiez le format (postgresql://...)
3. **Connexion échoue silencieusement** → Vérifiez les logs Railway pour des erreurs de connexion DB

### Test rapide : Vérifier la connexion DB

Les logs devraient montrer des connexions DB. Si vous voyez des erreurs comme :
```
❌ Erreur de connexion à la base de données
```

→ Problème de DATABASE_URL

## 📋 Checklist

- [ ] DATABASE_URL est configuré dans Railway
- [ ] DATABASE_URL est au format `postgresql://` (pas `https://`)
- [ ] Vous regardez le bon projet Supabase
- [ ] Les logs Railway montrent "201 Created"
- [ ] Pas d'erreurs de base de données dans les logs

## 🔧 Solution

Si les données ne sont vraiment pas dans Supabase malgré un "201 Created" :

1. Vérifiez DATABASE_URL dans Railway
2. Vérifiez les logs Railway complets pour des erreurs DB
3. Testez une connexion manuelle à Supabase avec DATABASE_URL

## 📝 Note importante

Si vous voyez "201 Created" dans les logs mais pas de données, cela peut signifier :
- Les données sont dans une autre base de données (mauvais DATABASE_URL)
- Les commits échouent silencieusement (vérifier les logs d'erreur)
- Vous regardez le mauvais projet Supabase
