# ✅ Checklist Configuration Staging

## 📋 Vérifications à Faire

### 1. ✅ Branche Git
- [x] Branche `staging` créée
- [x] Synchronisée avec `main`
- [x] Poussée sur GitHub

### 2. ✅ Base de Données
- [x] Projet Supabase staging créé
- [x] Schéma copié depuis production
- [x] DATABASE_URL de staging notée

### 3. ✅ Clé JWT
- [x] Clé JWT staging générée : `vo0rD2Zh5W4GlZcpIYLTf-XkM_pjSXFJUsVkKYXekJw`
- [ ] **À FAIRE** : Ajouter dans Railway staging → Variables → `JWT_SECRET_KEY`

### 4. ⏳ Backend Railway (Staging)
- [ ] Créer service "lokario-backend-staging"
- [ ] Connecter branche `staging`
- [ ] Configurer variables :
  - [ ] `ENVIRONMENT=staging`
  - [ ] `DATABASE_URL` (URL staging Supabase)
  - [ ] `JWT_SECRET_KEY` (clé générée ci-dessus)
  - [ ] `SENDGRID_API_KEY`
  - [ ] `FRONTEND_URL` (URL frontend staging)
  - [ ] Autres variables nécessaires

### 5. ⏳ Frontend Vercel (Staging)
- [ ] Créer projet "lokario-staging" (ou similaire)
- [ ] Connecter branche `staging`
- [ ] Configurer variables :
  - [ ] `NEXT_PUBLIC_API_URL` (URL backend staging)
  - [ ] Autres variables nécessaires

### 6. ⏳ Tests
- [ ] Backend staging accessible
- [ ] Frontend staging accessible
- [ ] Connexion fonctionne
- [ ] Les routes API fonctionnent

## 🚀 Commandes Utiles

### Vérifier la branche staging
```bash
git checkout staging
git status
```

### Merger une feature dans staging
```bash
git checkout staging
git merge feature/ma-feature
git push origin staging
```

### Déployer staging → production
```bash
git checkout main
git merge staging
git push origin main
```

## 📝 URLs à Noter

### Backend Staging
```
https://lokario-backend-staging.up.railway.app
```

### Frontend Staging
```
https://lokario-staging.vercel.app
```

### Database Staging
```
postgresql://postgres.hobsxwtqnxrdrpmnuoga:AZERTY1234azert%2D@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
```

## ⚠️ Prochaines Étapes

1. **Configurer Railway backend staging** (voir CONFIGURER_STAGING.md)
2. **Configurer Vercel frontend staging** (voir CONFIGURER_STAGING.md)
3. **Tester le workflow** : feature → staging → production
