# 🔀 Transaction Pooler vs Session Pooler

## 📋 Différence

### Transaction Pooler (Recommandé pour votre app)

**Caractéristiques :**
- ✅ Meilleure scalabilité (jusqu'à 200 connexions simultanées)
- ✅ Idéal pour les requêtes HTTP courtes (requête-réponse)
- ✅ Parfait pour FastAPI/SQLAlchemy
- ✅ Moins de connexions actives nécessaires
- ⚠️ Limitations : Pas de transactions multiples, pas de préparations de requêtes persistantes

**Utilisation :**
- Requêtes courtes et simples
- Applications web (API REST)
- **C'est ce que vous voulez pour votre FastAPI backend**

**Port :** `6543`

### Session Pooler

**Caractéristiques :**
- ✅ Supporte toutes les fonctionnalités PostgreSQL (transactions, préparations, etc.)
- ✅ Connexions longues
- ⚠️ Moins de connexions simultanées (limité)
- ⚠️ Plus coûteux en ressources

**Utilisation :**
- Applications nécessitant des transactions complexes
- Connexions longues (WebSockets, sessions actives)
- Cas d'usage avancés

**Port :** `5432` (même port que direct, mais avec pooling)

## ✅ Recommandation pour votre application

**Utilisez Transaction Pooler** car :
1. ✅ Votre application FastAPI fait des requêtes courtes (requête HTTP → réponse)
2. ✅ SQLAlchemy fonctionne parfaitement avec transaction pooler
3. ✅ Meilleure performance et scalabilité
4. ✅ C'est le choix standard pour les applications web modernes

## 📝 Configuration

Dans Supabase → Settings → Database → Connection string :

1. Onglet **"Connection pooling"**
2. Sélectionnez **"Transaction mode"** ou **"Transaction pooler"**
3. Copiez l'URL (elle utilisera le port `6543`)
4. Utilisez cette URL dans Railway → `DATABASE_URL`

## 🎯 Résumé

**Pour votre application FastAPI :**
- ✅ **Transaction Pooler** (port 6543) → Recommandé
- ❌ Session Pooler → Pas nécessaire pour votre cas d'usage

**URL typique Transaction Pooler :**
```
postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

**URL typique Session Pooler :**
```
postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:5432/postgres
```

Note : Le port `6543` = Transaction, le port `5432` = Session

## 🔍 Comment savoir lequel utiliser

Dans Supabase Dashboard, quand vous voyez les options :
- **Transaction mode** / **Transaction pooler** → Utilisez celui-ci ✅
- **Session mode** / **Session pooler** → Pas nécessaire pour votre app

En résumé : **Choisissez Transaction Pooler** ! 🎯
