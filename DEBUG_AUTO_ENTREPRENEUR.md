# Debug - Auto-entrepreneur

## ✅ Vérifications effectuées

1. **Base de données** : Les colonnes existent bien
   - `is_auto_entrepreneur` : ✅ Présent
   - `vat_exempt` : ✅ Présent
   - `vat_exemption_reference` : ✅ Présent

2. **Données** : L'entreprise "S-rework" (ID 6) a `is_auto_entrepreneur=1`

## 🔍 Étapes de debug

### 1. Vérifier que le backend retourne bien le champ

Ouvrez la console du navigateur et allez dans l'onglet **Network** (Réseau).

1. Allez dans **Paramètres** → **Informations entreprise**
2. Cochez la case "Entrepreneur individuel"
3. Cliquez sur "Enregistrer les modifications"
4. Dans l'onglet Network, trouvez la requête `PATCH /companies/me`
5. Vérifiez la **réponse** : elle doit contenir `is_auto_entrepreneur: true`

### 2. Vérifier que les données sont rechargées

Après avoir sauvegardé, regardez dans la console :
- Vous devriez voir `[Settings] Company chargée:` avec les données
- Vous devriez voir `[Settings] is_auto_entrepreneur: true`

### 3. Vérifier dans le modal de création de facture

1. Ouvrez le modal de création de facture
2. Dans la console, vous devriez voir :
   - `[CreateInvoiceModal] Modal ouvert, rechargement des settings...`
   - `[CreateInvoiceModal] Company object:` avec les données
   - `[CreateInvoiceModal] isAutoEntrepreneur calculated: true`

### 4. Si les logs ne s'affichent pas

**Solution 1 : Recharger la page**
- Après avoir coché la case et sauvegardé, **rechargez la page** (F5)
- Puis ouvrez le modal de création de facture

**Solution 2 : Vérifier que le backend est à jour**
```bash
cd backend
# Vérifier que les colonnes existent
python3 scripts/move_vat_fields_to_company_sqlite.py
# Redémarrer le backend
```

**Solution 3 : Vérifier manuellement l'API**
```bash
# Avec curl ou Postman
curl -H "Authorization: Bearer VOTRE_TOKEN" \
  http://localhost:8000/companies/me

# Vous devriez voir is_auto_entrepreneur dans la réponse
```

## 🐛 Problèmes possibles

1. **Le champ n'apparaît pas dans la réponse API**
   - Vérifier que le backend a été redémarré après la migration
   - Vérifier que le schéma `CompanyRead` inclut bien `is_auto_entrepreneur`

2. **Les données ne sont pas rechargées**
   - Le hook `useSettings` doit appeler `reloadSettings()` après la sauvegarde
   - Vérifier que `reloadSettings` est bien appelé dans `handleSave`

3. **Le composant ne reçoit pas les données**
   - Vérifier que `company` n'est pas `null` dans `CreateInvoiceModal`
   - Vérifier que le store est bien mis à jour

## ✅ Test rapide

1. Ouvrez la console du navigateur (F12)
2. Allez dans Paramètres → Informations entreprise
3. Cochez "Entrepreneur individuel"
4. Cliquez sur "Enregistrer"
5. **Rechargez la page** (F5)
6. Ouvrez le modal de création de facture
7. Vérifiez dans la console les logs `[CreateInvoiceModal]`
8. Le champ TVA doit être désactivé et à 0%
