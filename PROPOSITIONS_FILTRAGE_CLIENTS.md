# Propositions pour filtrer la création automatique de clients

## 🎯 Problème actuel

Actuellement, le système crée automatiquement un client à partir de **n'importe quel email** qui :
- ✅ N'est pas une notification (détectée par l'IA)
- ✅ N'est pas déjà un client existant

**Problème** : Cela peut créer des clients qui ne sont **pas vraiment des clients de l'entreprise** :
- Fournisseurs
- Services externes (comptable, avocat, banque, etc.)
- Partenaires commerciaux
- Autres entreprises avec lesquelles on communique mais qui ne sont pas des clients

## 💡 Propositions de solutions

### **Option 1 : Détection IA "Vrai Client" (Recommandée)** ⭐

**Principe** : Utiliser l'IA pour déterminer si l'email provient d'un **VRAI CLIENT** de l'entreprise.

**Avantages** :
- ✅ Précision élevée (85-95%)
- ✅ S'adapte au contexte de l'entreprise
- ✅ Détecte les clients même avec des emails génériques

**Inconvénients** :
- ⚠️ Coût : ~$0.0000465 par email (très faible)
- ⚠️ Dépend de la qualité du prompt

**Implémentation** :
- Créer une nouvelle fonction `is_real_client_email()` dans `AIClassifierService`
- Prompt IA : "Analyse cet email et détermine s'il provient d'un VRAI CLIENT de l'entreprise (personne qui achète nos produits/services) ou d'un autre type de contact (fournisseur, partenaire, service externe, etc.)"
- Créer le client seulement si `is_real_client = True`

**Coût estimé** : ~$0.03 pour 1000 emails

---

### **Option 2 : Liste blanche de domaines** 

**Principe** : Créer un client seulement si le domaine de l'email est dans une liste blanche.

**Avantages** :
- ✅ Gratuit (pas d'appel IA)
- ✅ Contrôle total
- ✅ Rapide

**Inconvénients** :
- ❌ Nécessite une configuration manuelle
- ❌ Ne détecte pas les nouveaux clients avec des domaines inconnus
- ❌ Peut bloquer des vrais clients

**Implémentation** :
- Ajouter un champ `allowed_client_domains` dans `CompanySettings` (JSON)
- Exemple : `["@client1.com", "@client2.fr", "@gmail.com"]`
- Vérifier si `from_email` contient un domaine autorisé avant de créer le client

**Configuration** : Interface dans les paramètres pour gérer la liste blanche

---

### **Option 3 : Liste noire de domaines**

**Principe** : Créer un client seulement si le domaine de l'email **n'est pas** dans une liste noire.

**Avantages** :
- ✅ Gratuit (pas d'appel IA)
- ✅ Bloque les domaines connus (fournisseurs, services, etc.)
- ✅ Plus permissif que la liste blanche

**Inconvénients** :
- ❌ Peut créer des clients indésirables si le domaine n'est pas dans la liste noire
- ❌ Nécessite une maintenance de la liste noire

**Implémentation** :
- Ajouter un champ `blocked_client_domains` dans `CompanySettings` (JSON)
- Exemple : `["@amazon.com", "@paypal.com", "@comptable.fr", "@banque.fr"]`
- Vérifier si `from_email` contient un domaine bloqué avant de créer le client

**Configuration** : Interface dans les paramètres pour gérer la liste noire

---

### **Option 4 : Détection par mots-clés dans le contenu** 

**Principe** : Créer un client seulement si l'email contient des mots-clés indiquant un vrai client.

**Avantages** :
- ✅ Gratuit (pas d'appel IA)
- ✅ Détecte les demandes de devis, commandes, etc.

**Inconvénients** :
- ❌ Peut manquer des clients (emails sans mots-clés)
- ❌ Peut créer des faux positifs

**Implémentation** :
- Liste de mots-clés : `["devis", "commande", "achat", "facture", "projet", "besoin", "demande"]`
- Vérifier si le contenu ou le sujet contient ces mots-clés
- Créer le client seulement si au moins un mot-clé est trouvé

---

### **Option 5 : Mode manuel uniquement** 

**Principe** : Ne jamais créer de clients automatiquement, seulement manuellement.

**Avantages** :
- ✅ Contrôle total
- ✅ Pas de faux clients

**Inconvénients** :
- ❌ Perte de productivité
- ❌ Nécessite une action manuelle pour chaque nouveau client

**Implémentation** :
- Désactiver complètement la création automatique de clients
- Ajouter un bouton "Créer un client" dans l'interface inbox pour créer manuellement

---

### **Option 6 : Hybride (IA + Liste noire)** ⭐⭐ **RECOMMANDÉ**

**Principe** : Combiner la détection IA avec une liste noire de domaines.

**Avantages** :
- ✅ Précision élevée (IA)
- ✅ Bloque les domaines connus (liste noire)
- ✅ Économique (liste noire = gratuit, IA seulement si nécessaire)

**Inconvénients** :
- ⚠️ Nécessite une configuration initiale (liste noire)
- ⚠️ Coût IA (mais réduit grâce à la liste noire)

**Implémentation** :
1. Vérifier d'abord la liste noire (gratuit, rapide)
2. Si pas dans la liste noire, utiliser l'IA pour déterminer si c'est un vrai client
3. Créer le client seulement si :
   - Pas dans la liste noire ET
   - IA confirme que c'est un vrai client

**Coût estimé** : ~$0.015 pour 1000 emails (si 50% sont filtrés par la liste noire)

---

## 📊 Comparaison des options

| Option | Précision | Coût | Configuration | Maintenance |
|--------|-----------|------|---------------|-------------|
| **Option 1 : IA** | ⭐⭐⭐⭐⭐ (85-95%) | ~$0.03/1000 | Faible | Automatique |
| **Option 2 : Liste blanche** | ⭐⭐⭐ (70-80%) | Gratuit | Élevée | Manuelle |
| **Option 3 : Liste noire** | ⭐⭐ (60-70%) | Gratuit | Moyenne | Manuelle |
| **Option 4 : Mots-clés** | ⭐⭐ (50-60%) | Gratuit | Faible | Automatique |
| **Option 5 : Manuel** | ⭐⭐⭐⭐⭐ (100%) | Gratuit | Aucune | Aucune |
| **Option 6 : Hybride** | ⭐⭐⭐⭐⭐ (90-95%) | ~$0.015/1000 | Moyenne | Automatique |

## 🎯 Recommandation

**Option 6 : Hybride (IA + Liste noire)** est la meilleure solution car :
- ✅ Précision élevée grâce à l'IA
- ✅ Coût réduit grâce à la liste noire
- ✅ Bloque les domaines connus (fournisseurs, services, etc.)
- ✅ S'adapte aux nouveaux clients grâce à l'IA

**Configuration initiale** :
- Liste noire par défaut : `["@amazon.com", "@paypal.com", "@noreply", "@no-reply", "@notifications", "@notification"]`
- L'utilisateur peut ajouter d'autres domaines dans les paramètres

## 🔧 Détails d'implémentation (Option 6)

### 1. Ajouter la liste noire dans `CompanySettings`
```python
blocked_client_domains: List[str] = []  # ["@amazon.com", "@paypal.com"]
```

### 2. Créer la fonction `is_real_client_email()` dans `AIClassifierService`
```python
def is_real_client_email(
    self,
    from_email: str,
    subject: str,
    content_preview: str,
    blocked_domains: List[str]
) -> bool:
    # 1. Vérifier la liste noire (gratuit)
    for domain in blocked_domains:
        if domain in from_email.lower():
            return False
    
    # 2. Utiliser l'IA si pas dans la liste noire
    # Prompt : "Est-ce que cet email provient d'un VRAI CLIENT qui achète nos produits/services ?"
    ...
```

### 3. Modifier la création de client dans `inbox_integrations.py`
```python
# Au lieu de :
if not is_notification:
    client = Client(...)

# Faire :
if not is_notification:
    is_real_client = ai_service.is_real_client_email(
        from_email=from_email,
        subject=subject,
        content_preview=content[:200],
        blocked_domains=company_settings.blocked_client_domains or []
    )
    if is_real_client:
        client = Client(...)
```

## 📝 Notes

- L'**Option 5 (Manuel)** peut être activée en désactivant complètement la création automatique
- L'**Option 6 (Hybride)** peut être désactivée pour revenir à l'Option 1 (IA seule)
- Toutes les options peuvent être combinées selon les besoins

