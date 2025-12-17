# 📧 SMTP Global vs Intégrations Inbox

## 🔍 Réponse à votre question

**NON, les emails de factures/devis ne sont PAS envoyés depuis votre email SMTP configuré dans Railway !**

## 📋 Comment ça fonctionne réellement

### 1. SMTP dans Railway (Variables globales)

**Utilisation :**
- ✅ Emails système (vérification d'inscription, réinitialisation mot de passe)
- ✅ Fallback si aucune intégration inbox n'est configurée
- ❌ **PAS utilisé** pour les factures, devis, relances des entreprises

**Quand c'est utilisé :**
- Route `/auth/*` : Emails de vérification
- Route `/contact` : Formulaire de contact public
- Fallback si l'intégration inbox de l'entreprise n'est pas configurée

### 2. Intégrations Inbox (Par entreprise/utilisateur)

**Utilisation :**
- ✅ **Factures et devis** : Envoyés depuis l'email de l'intégration inbox principale
- ✅ **Relances automatiques** : Envoyées depuis l'email de l'intégration inbox
- ✅ **Réponses inbox** : Envoyées depuis l'email de l'intégration inbox
- ✅ **Réponses automatiques IA** : Envoyées depuis l'email de l'intégration inbox

**Où c'est configuré :**
- Par chaque utilisateur dans l'application (module Settings → Inbox Integrations)
- Stocké dans la table `inbox_integrations`
- Chaque entreprise peut avoir sa propre intégration email

## 🎯 Fonctionnement réel

### Exemple : Envoi d'un devis

```python
# Le code cherche d'abord l'intégration inbox principale de l'entreprise
primary_integration = db.query(InboxIntegration).filter(
    InboxIntegration.company_id == company_id,
    InboxIntegration.is_primary == True,
    InboxIntegration.integration_type == "imap"
).first()

if primary_integration:
    # Utilise l'email de l'intégration inbox
    email_from = primary_integration.email_address
    email_password = primary_integration.email_password  # Déjà stocké (chiffré)
else:
    # Fallback vers les settings de l'entreprise ou SMTP global
    ...
```

### Exemple : Envoi d'une relance

Même principe : utilise l'intégration inbox principale de l'entreprise.

## 📊 Résumé

| Type d'email | Source d'envoi |
|---|---|
| **Vérification d'inscription** | SMTP Railway (global) |
| **Factures/Devis** | Intégration Inbox de l'entreprise |
| **Relances** | Intégration Inbox de l'entreprise |
| **Réponses inbox** | Intégration Inbox de l'entreprise |
| **Réponses auto IA** | Intégration Inbox de l'entreprise |

## ✅ Conclusion

### Vous devez configurer SMTP dans Railway si :

✅ Vous voulez envoyer des emails de vérification d'inscription
✅ Vous voulez un fallback si une entreprise n'a pas d'intégration inbox configurée
✅ Vous voulez que le formulaire de contact fonctionne

### Vous N'AVEZ PAS besoin de SMTP si :

❌ Vous ne vous préoccupez que des emails de factures/devis/relances
   → Ces emails utilisent les intégrations inbox des utilisateurs

## 🔧 Configuration recommandée

### Pour les emails système (inscription, etc.) :

Configurez SMTP dans Railway :
```
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=votre.email@gmail.com
SMTP_PASSWORD=mot_de_passe_application
SMTP_FROM_EMAIL=noreply@lokario.fr
```

### Pour les emails business (factures, devis) :

Les utilisateurs configurent leurs propres intégrations inbox dans l'application :
- Settings → Inbox Integrations
- Ajoutent leur email professionnel
- L'application utilise cet email pour envoyer factures/devis

## 🎯 Avantage de cette architecture

- ✅ Chaque entreprise envoie depuis son propre email professionnel
- ✅ Les clients voient l'email de l'entreprise (pas noreply@lokario.fr)
- ✅ Meilleure délivrabilité (évite les spams)
- ✅ Plus professionnel pour les entreprises

## 📝 Recommandation

Configurez quand même SMTP dans Railway pour :
1. Les emails système (inscription, etc.)
2. Le fallback si une entreprise n'a pas configuré d'intégration inbox

Mais sachez que les emails business (factures, devis) utiliseront les intégrations inbox des utilisateurs, pas votre SMTP global ! 🎯
