# Workflow Préproduction (Staging)

## 🎯 Objectif
Tester les modifications dans un environnement identique à la production avant de déployer.

## 📋 Structure

```
main (production) ← staging (preprod) ← feature/xxx (développement)
```

## 🔄 Workflow

### 1. Développement
```bash
# Créer une branche feature
git checkout -b feature/ma-feature

# Faire vos modifications
# ... code ...

# Commit et push
git add .
git commit -m "feat: Ma nouvelle feature"
git push origin feature/ma-feature
```

### 2. Déploiement en Préproduction
```bash
# Basculer sur staging
git checkout staging

# Merger votre feature
git merge feature/ma-feature

# Push vers staging (déploie automatiquement sur Railway/Vercel staging)
git push origin staging
```

### 3. Tests en Préproduction
- Tester sur `lokario-staging.up.railway.app`
- Vérifier que tout fonctionne
- Tester avec des données réelles (copie de prod si possible)

### 4. Déploiement en Production
```bash
# Si tout est OK en staging, merger dans main
git checkout main
git merge staging

# Push vers main (déploie automatiquement en production)
git push origin main
```

## 🚀 Configuration Railway/Vercel

### Backend (Railway)
1. Créer un nouveau service "lokario-backend-staging"
2. Connecter la branche `staging`
3. Configurer les variables d'environnement :
   - `ENVIRONMENT=staging`
   - `DATABASE_URL` (peut être la même DB ou une DB séparée)
   - Autres variables nécessaires

### Frontend (Vercel)
1. Créer un nouveau projet "lokario-frontend-staging"
2. Connecter la branche `staging`
3. Configurer :
   - `NEXT_PUBLIC_API_URL` → URL du backend staging
   - Autres variables nécessaires

## 📝 Bonnes Pratiques

### ✅ À FAIRE
- Toujours tester en staging avant production
- Utiliser des messages de commit clairs
- Documenter les changements importants
- Tester les migrations DB en staging d'abord

### ❌ À ÉVITER
- Ne pas merger directement dans `main` sans passer par `staging`
- Ne pas déployer le vendredi soir (difficile de rollback le weekend)
- Ne pas ignorer les erreurs en staging

## 🔧 Commandes Utiles

```bash
# Voir les différences entre staging et main
git diff staging..main

# Voir l'historique des commits
git log staging..main

# Rollback en staging (si problème)
git revert HEAD
git push origin staging
```

## 🆘 En Cas de Problème

### Rollback en Staging
```bash
git checkout staging
git revert HEAD  # Annule le dernier commit
git push origin staging
```

### Rollback en Production
```bash
git checkout main
git revert HEAD
git push origin main
```

## 📊 Avantages

1. **Sécurité** : Tester avant production
2. **Confiance** : Moins de stress lors des déploiements
3. **Qualité** : Détecter les bugs avant les utilisateurs
4. **Formation** : Apprendre les bonnes pratiques
