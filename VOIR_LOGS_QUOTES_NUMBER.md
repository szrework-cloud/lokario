# Comment voir les logs de génération de numéro de devis

## 📊 Logs ajoutés

Les nouveaux logs détaillés affichent :
- Le nombre de devis trouvés pour chaque entreprise
- La liste complète des numéros existants
- Le numéro maximum trouvé
- Le prochain numéro généré

## 🔍 Où voir les logs

### Option 1 : Railway Dashboard (Recommandé)

1. **Allez sur [railway.app](https://railway.app)**
2. **Ouvrez votre projet "lokario"**
3. **Cliquez sur le service backend**
4. **Onglet "Deployments"** → Cliquez sur le dernier déploiement
5. **Onglet "Logs"** ou **"View Logs"**

### Option 2 : Railway CLI

```bash
railway logs
```

Pour suivre en temps réel :
```bash
railway logs --follow
```

### Option 3 : Filtrer les logs

Dans Railway Dashboard, vous pouvez filtrer les logs en cherchant :
- `[QUOTE NUMBER]` pour voir tous les logs de génération de numéro
- `company_id=` pour voir les logs pour une entreprise spécifique

## 📝 Logs à chercher

Quand vous créez un devis, vous devriez voir :

```
[QUOTE NUMBER] Devis trouvés pour company_id=X, année=2025: N devis
[QUOTE NUMBER] Numéros existants pour company_id=X: ['DEV-2025-001', 'DEV-2025-002', ...]
[QUOTE NUMBER] Numéros valides trouvés: [1, 2, ...], maximum: X, prochain: XXX
[QUOTE NUMBER] Numéro généré: DEV-2025-XXX (tentative 1)
```

## ⚠️ Si vous ne voyez pas les logs

1. **Vérifiez que le déploiement est terminé** : Les logs n'apparaissent qu'après le déploiement
2. **Créez un nouveau devis** : Les logs n'apparaissent que lors de la création d'un devis
3. **Vérifiez le niveau de log** : Les logs `INFO` devraient être visibles par défaut
4. **Rafraîchissez la page** : Les logs peuvent prendre quelques secondes à apparaître

## 🔧 Si les logs ne s'affichent toujours pas

Vérifiez que le niveau de log est configuré correctement dans Railway :
- Railway Dashboard → Service backend → Settings → Variables
- Cherchez `LOG_LEVEL` ou `PYTHONUNBUFFERED`
- Assurez-vous que `LOG_LEVEL=INFO` ou `DEBUG` est défini

