# 🔐 Configuration Supabase RLS (Row Level Security)

## ⚠️ Situation Actuelle

Vous avez toutes vos tables en **"unrestricted"**, ce qui signifie que **RLS n'est pas activé**. 

## Est-ce normal ?

**Ça dépend de votre architecture** :

### Si vous utilisez **uniquement SQLAlchemy via FastAPI backend**

Si votre application :
- Se connecte à Supabase via `DATABASE_URL` (connexion directe PostgreSQL)
- Utilise un rôle avec privilèges élevés (`service_role` ou `postgres`)
- Ne permet **PAS** d'accès direct depuis le frontend vers Supabase

→ **Dans ce cas, RLS n'est pas nécessaire** car :
- ✅ L'accès passe uniquement par votre backend FastAPI
- ✅ La sécurité est gérée par votre authentification JWT
- ✅ Votre backend vérifie les permissions (`company_id`, etc.)

### Si vous utilisez **l'API Supabase côté client**

Si votre application :
- Utilise `@supabase/supabase-js` dans le frontend
- Se connecte directement à Supabase depuis le navigateur
- Utilise l'anonyme key de Supabase

→ **Dans ce cas, RLS est CRITIQUE** car :
- ❌ Sans RLS, n'importe qui peut lire/écrire dans vos tables
- ❌ Même avec votre JWT, si quelqu'un récupère l'anonyme key, il peut accéder aux données

## 🔍 Vérification

### Vérifier comment vous vous connectez

1. **Dans votre backend** (`backend/app/core/config.py`) :
   - Votre `DATABASE_URL` ressemble à quoi ?
   - `postgresql://postgres:[password]@...` → Service role (RLS contourné)
   - `postgresql://postgres.xxx:[password]@...` → Service role

2. **Dans votre frontend** :
   - Cherchez `@supabase/supabase-js` dans `package.json`
   - Cherchez `createClient` dans votre code frontend

### Si vous n'utilisez PAS Supabase client dans le frontend

**Vous pouvez laisser RLS désactivé** MAIS :

1. ✅ **Vérifiez que votre backend vérifie toujours les permissions** :
   - Filtrage par `company_id` sur toutes les requêtes
   - Vérification de l'authentification JWT
   - Validation des droits d'accès

2. ✅ **Vérifiez votre DATABASE_URL** :
   - Ne doit JAMAIS être exposée au frontend
   - Utilisez une variable d'environnement sécurisée
   - En production, utilisez Railway/backend secrets

3. ✅ **Activez RLS quand même** (bonne pratique) :
   - Ça protège contre les erreurs de configuration futures
   - Ça protège si vous ajoutez Supabase client plus tard
   - Ça permet d'utiliser Supabase Studio en sécurité

## 🔒 Recommandation : Activer RLS quand même

Même si vous n'en avez pas besoin maintenant, **activez RLS** :

### Pourquoi ?

1. **Protection contre les erreurs futures** : Si quelqu'un expose votre DATABASE_URL par erreur
2. **Bonne pratique** : Supabase recommande toujours d'activer RLS
3. **Sécurité en profondeur** : Double couche de sécurité (backend + RLS)

### Comment activer RLS ?

#### 1. Dans Supabase Dashboard → Authentication → Policies

Pour chaque table importante :

```sql
-- Exemple pour la table `clients`
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs ne peuvent voir que leurs propres clients
CREATE POLICY "Users can view their company's clients"
  ON clients FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));
```

#### 2. Politiques recommandées pour votre app

Comme vous utilisez votre propre système d'authentification (JWT), vous avez deux options :

**Option A : Utiliser un rôle service_role qui contourne RLS**
- Votre `DATABASE_URL` utilise déjà ce rôle
- RLS est automatiquement contourné
- ✅ Simple, mais moins sécurisé si la clé est compromise

**Option B : Créer des politiques qui utilisent votre système d'auth**
- Plus complexe car vous devez mapper votre JWT à Supabase auth
- Nécessite de synchroniser vos users avec Supabase auth.users

### Solution Simple pour Maintenant

Comme vous utilisez SQLAlchemy avec un service_role :

1. **Laissez RLS désactivé pour l'instant** si vous êtes sûr de :
   - Ne jamais exposer DATABASE_URL au frontend
   - Toujours vérifier les permissions dans votre backend

2. **Mais activez RLS quand même** pour la protection future :
   - Activez RLS sur toutes les tables
   - Créez des politiques qui utilisent `service_role()` pour permettre l'accès backend
   - Ou créez des politiques restrictives basées sur `company_id`

## 📝 Politiques RLS Recommandées

Si vous voulez activer RLS maintenant, voici des exemples :

```sql
-- 1. Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
-- ... etc pour toutes vos tables

-- 2. Politique : Service role peut tout faire (pour votre backend)
CREATE POLICY "Service role can do everything"
  ON clients FOR ALL
  USING (current_setting('role') = 'service_role');

-- 3. Ou politique basée sur company_id (si vous synchronisez avec Supabase auth)
CREATE POLICY "Users can access their company data"
  ON clients FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );
```

## ⚠️ Important

- **Ne désactivez jamais RLS** si vous utilisez Supabase client dans le frontend
- **Vérifiez toujours** que votre backend vérifie les permissions
- **Protégez votre DATABASE_URL** - ne l'exposez JAMAIS au frontend

## 🔗 Ressources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
