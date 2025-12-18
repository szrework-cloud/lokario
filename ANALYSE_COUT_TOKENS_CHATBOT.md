# 💰 Analyse du coût des tokens pour le chatbot

## 📊 1770 tokens : Est-ce beaucoup ?

### Comparaison rapide
- **1770 tokens** ≈ **1400-1500 mots** en français
- C'est **modéré** pour une requête avec contexte complet d'entreprise
- Pour comparaison :
  - Un email moyen : ~100-200 tokens
  - Un article de blog : ~500-1000 tokens
  - Un livre : ~100,000+ tokens

### Coût réel (GPT-4o-mini)

**Prix OpenAI GPT-4o-mini** (décembre 2024) :
- **Input** : $0.150 par million de tokens
- **Output** : $0.600 par million de tokens

**Coût de votre requête** :
- Si 1770 tokens = **input uniquement** : `1770 × $0.150 / 1,000,000 = $0.00027` (0.027 centimes)
- Si mix input/output (80% input, 20% output) : `(1416 × $0.150 + 354 × $0.600) / 1,000,000 = $0.00038` (0.038 centimes)

**En euros** (taux approximatif 1€ = 1.10$) :
- **~0.0003€ par requête** (0.03 centimes d'euro)
- **~1€ pour 3000 requêtes**
- **~10€ pour 30,000 requêtes**

### Est-ce normal ?

Oui, c'est **normal** pour votre cas d'usage car :

1. **Contexte riche** : Vous envoyez le contexte complet de l'entreprise :
   - Clients (liste + factures impayées)
   - Devis et factures récents
   - Tâches (statuts + urgentes)
   - Projets actifs
   - Rendez-vous
   - Relances en attente
   - Conversations inbox récentes

2. **3 messages** : Le log indique "3 messages à ChatGPT" :
   - Message système (contexte)
   - Historique de conversation (si présent)
   - Message utilisateur actuel

3. **GPT-4o-mini** : Vous utilisez déjà le modèle le moins cher d'OpenAI

### Optimisations possibles

#### 1. Limiter la quantité de données dans le contexte

**Actuellement** (dans `chatbot_context_service.py`) :
- Limite par défaut : `limit=20` éléments par catégorie
- Affiche jusqu'à 5 éléments dans chaque section

**Option A : Réduire la limite**
```python
# Au lieu de limit=20, utiliser limit=10
context = await build_company_context(db, company_id, limit=10)
```

**Option B : Filtrer plus agressivement**
- Ne pas inclure les sections inutiles selon la question
- Charger dynamiquement le contexte selon le type de question

#### 2. Utiliser un système de cache de contexte

Cache le contexte pendant X minutes pour éviter de le reconstruire à chaque requête :
- Contexte reconstruit toutes les 5 minutes
- Réutilisé pour toutes les requêtes dans cette fenêtre

#### 3. Contexte dynamique basé sur l'intention

Analyser d'abord l'intention de la question, puis charger seulement le contexte pertinent :
- Question sur les factures → Charger uniquement le contexte facturation
- Question sur les tâches → Charger uniquement le contexte tâches
- Question générale → Charger un résumé minimal

#### 4. Réduire les détails dans le formatage

Dans `chatbot_service.py`, ligne 77-78 :
```python
# Actuellement : Affiche email, nombre de factures, nombre de devis
lines.append(f"   - {client.get('name', 'Sans nom')} ({client.get('email', 'N/A')}) - {client.get('total_invoices', 0)} factures, {client.get('total_quotes', 0)} devis")

# Optimisé : Juste le nom
lines.append(f"   - {client.get('name', 'Sans nom')}")
```

### Recommandations

#### Pour l'instant : **Laissez comme c'est**

Pourquoi ?
- Le coût est **négligeable** (0.03 centimes par requête)
- Le contexte complet améliore **significativement** la qualité des réponses
- GPT-4o-mini est déjà le modèle le **moins cher**
- L'optimisation prématurée peut **dégrader l'expérience utilisateur**

#### Optimiser seulement si :

1. **Volume très élevé** : Plus de 1000 requêtes/jour/utilisateur
2. **Coût devient problématique** : Dépassement de budget mensuel
3. **Performances lentes** : Le temps de réponse devient inacceptable

### Calcul du budget estimé

**Scénario réaliste** :
- 10 utilisateurs actifs
- 20 questions/jour/utilisateur
- 1770 tokens/requête en moyenne

**Calcul** :
- Requêtes/jour : 10 × 20 = **200 requêtes/jour**
- Requêtes/mois : 200 × 30 = **6000 requêtes/mois**
- Coût/mois : 6000 × $0.0003 = **$1.80/mois** (~1.65€/mois)

**Conclusion** : Même avec un usage intensif, le coût reste **très faible**.

### Suivi des coûts

Pour surveiller les coûts réels, vous pouvez :

1. **Activer le logging détaillé** dans `chatbot_service.py` :
```python
logger.info(f"[CHATBOT] Tokens utilisés - Input: {response.usage.prompt_tokens}, Output: {response.usage.completion_tokens}, Total: {response.usage.total_tokens}")
```

2. **Créer une table de tracking** dans la base de données :
   - Enregistrer chaque requête avec le nombre de tokens
   - Calculer le coût par utilisateur/entreprise
   - Générer des rapports mensuels

3. **Configurer des alertes OpenAI** :
   - Dashboard OpenAI → Billing → Set spending limits
   - Alerte à $5, $10, $50, etc.

---

**Conclusion** : 1770 tokens, c'est **normal et économique** pour votre cas d'usage. Continuez à optimiser la qualité plutôt que les coûts tant que le budget reste raisonnable.
