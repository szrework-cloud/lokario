# Workflow complet de synchronisation des emails

## Vue d'ensemble

Quand un utilisateur synchronise ses emails via l'endpoint `/inbox/integrations/{integration_id}/sync`, voici le processus complet :

## 1. Préparation et récupération des emails

1. **Vérification des permissions** : Seuls les `owner` et `super_admin` peuvent synchroniser
2. **Récupération de l'intégration** : Récupère les paramètres IMAP (serveur, port, email, mot de passe chiffré)
3. **Déchiffrement du mot de passe** : Utilise `get_encryption_service()` pour déchiffrer
4. **Récupération des emails depuis IMAP** : Appelle `fetch_emails_async()` qui :
   - Se connecte au serveur IMAP
   - Récupère tous les emails de la boîte INBOX
   - Parse les emails (sujet, expéditeur, contenu, pièces jointes, Message-ID, In-Reply-To, References)
   - Retourne une liste d'emails structurés

## 2. Détection des emails supprimés

1. **Récupération des Message-IDs depuis IMAP** : Appelle `get_message_ids_from_imap_async()` pour obtenir tous les Message-IDs présents dans INBOX
2. **Comparaison avec la base de données** : Compare les Message-IDs stockés avec ceux présents dans INBOX
3. **Suppression des messages absents** :
   - Si un message stocké n'est plus dans INBOX → supprime le message
   - Si c'est le dernier message d'une conversation → supprime aussi la conversation
   - Sinon → met à jour `last_message_at` de la conversation

## 3. Traitement de chaque email

Pour chaque email récupéré :

### 3.1. Vérification des doublons

- **Normalise le Message-ID** : Enlève les chevrons `< >` et les espaces
- **Vérifie si le message existe déjà** : Utilise `is_duplicate_message()` qui cherche par Message-ID normalisé
- **Si doublon** : Skip l'email (continue avec le suivant)

### 3.2. Filtrage spam/newsletter

- **Détection** : Appelle `detect_newsletter_or_spam()` (actuellement désactivé, retourne toujours `False`)
- **Si filtré** : Skip l'email complètement (pas de stockage)

### 3.3. Création/identification du client

1. **Vérification si le client existe déjà** :
   ```python
   client = db.query(Client).filter(
       Client.company_id == company.id,
       Client.email == from_email
   ).first()
   ```

2. **Si le client n'existe pas** :
   - **Détection de notification avec IA** : Appelle `AIClassifierService().is_notification_email()`
     - Utilise un prompt hybride pour détecter si l'email est une notification automatique
     - Analyse l'expéditeur, le sujet et un extrait du contenu
   - **Si ce n'est PAS une notification** :
     - Crée un nouveau `Client` avec :
       - `company_id` : ID de l'entreprise
       - `name` : Nom de l'expéditeur ou partie avant `@` de l'email
       - `email` : Email de l'expéditeur
       - `type` : "Client"
     - `db.add(client)` et `db.flush()`
   - **Si c'est une notification** : Ne crée pas de client, `client = None`

### 3.4. Recherche/création de conversation

1. **Normalisation du sujet** : Enlève les préfixes "Re:", "Fwd:", etc. avec `normalize_subject()`

2. **Recherche de conversation existante** (dans l'ordre) :
   - **Via In-Reply-To** : Cherche un message avec ce Message-ID comme `external_id`
   - **Via References** : Cherche un message avec le premier Message-ID de la liste `references`
   - **Via sujet normalisé** : Cherche une conversation avec le même sujet normalisé
   - **Via sujet original** : Cherche une conversation avec le même sujet original

3. **Si aucune conversation trouvée** :
   - Crée une nouvelle `Conversation` avec :
     - `company_id` : ID de l'entreprise
     - `client_id` : ID du client (ou `None` si notification)
     - `subject` : Sujet normalisé (ou original si pas de normalisation)
     - `status` : "À répondre"
     - `source` : "email"
     - `unread_count` : 1
     - `last_message_at` : Date actuelle
   - `db.add(conversation)` et `db.flush()`
   - **Note** : `is_new_conversation = True` (conversation vient d'être créée)

### 3.5. Création du message

1. **Normalise le Message-ID** : Enlève les chevrons `< >`

2. **Crée un `InboxMessage`** avec :
   - `conversation_id` : ID de la conversation
   - `from_name` : Nom de l'expéditeur
   - `from_email` : Email de l'expéditeur
   - `content` : Contenu texte (déjà nettoyé du HTML)
   - `source` : "email"
   - `is_from_client` : `True`
   - `read` : `False`
   - `external_id` : Message-ID normalisé
   - `external_metadata` : Dict avec `to`, `imap_uid`, `integration_id`

3. `db.add(message)` et `db.flush()`

### 3.6. Sauvegarde des pièces jointes

Pour chaque pièce jointe dans l'email :

1. **Création du répertoire** : `UPLOAD_DIR / {company_id}`
2. **Génération d'un nom unique** : `{uuid4()}{extension}`
3. **Sauvegarde du fichier** : Écrit le contenu binaire sur disque
4. **Création de `MessageAttachment`** avec :
   - `message_id` : ID du message
   - `name` : Nom original du fichier
   - `file_type` : Type déterminé par extension (image, pdf, document, other)
   - `file_path` : Chemin relatif au répertoire d'upload
   - `file_size` : Taille en octets
   - `mime_type` : Type MIME

5. `db.add(attachment)`

### 3.7. Mise à jour de la conversation

- `conversation.last_message_at = datetime.utcnow()`
- `conversation.unread_count += 1`

### 3.8. Classification automatique du statut

- Si le statut n'est pas manuel (`"Archivé"`, `"Spam"`, `"Urgent"`) :
  - Appelle `auto_classify_conversation_status(db, conversation, message)`
  - Met à jour `conversation.status` avec le nouveau statut

### 3.9. Classification automatique dans un dossier (IA)

- **⚠️ BUG ACTUEL** : La variable `is_new_conversation` n'est jamais définie !
- **Comportement attendu** : Si c'est une nouvelle conversation (créée à l'étape 3.4) :
  - Appelle `classify_conversation_to_folder(db, conversation, message, company_id)`
  - Cette fonction :
    1. Récupère tous les dossiers avec `autoClassify: true`
    2. Utilise `AIClassifierService().classify_message_to_folder()` pour classifier
    3. L'IA analyse le contenu, le sujet et l'expéditeur
    4. Retourne l'ID du dossier approprié
  - Si un dossier est trouvé : `conversation.folder_id = folder_id`

### 3.10. Commit de la transaction

- `db.commit()` : Sauvegarde le message, la conversation, les pièces jointes, etc.

### 3.11. Déclenchement de l'auto-réponse

- Si la conversation a un `folder_id` et que le message est du client :
  - Appelle `trigger_auto_reply_if_needed(db, conversation, message)`
  - Cette fonction vérifie si le dossier a une auto-réponse configurée
  - Si oui, envoie la réponse automatique

## 4. Reclassification globale après synchronisation

Après avoir traité tous les emails :

1. **Reclassification des conversations sans dossier** :
   - Appelle `reclassify_all_conversations(db, company_id, force=False)`
   - Cette fonction :
     - Récupère toutes les conversations sans dossier
     - Utilise la classification IA par batch (plusieurs conversations en un appel)
     - Met à jour les `folder_id` des conversations classées

2. **Déclenchement de l'auto-réponse pour les conversations nouvellement classées** :
   - Trouve les conversations classées dans les 5 dernières minutes
   - Pour chaque conversation, récupère le dernier message du client
   - Appelle `trigger_auto_reply_if_needed()` pour chaque conversation

## 5. Mise à jour du statut de synchronisation

- `integration.last_sync_at = datetime.utcnow()`
- `integration.last_sync_status` : `"success"`, `"partial"` ou `"error"`
- `integration.last_sync_error` : Message d'erreur si échec
- `db.commit()`

## 6. Retour de la réponse

Retourne un JSON avec :
```json
{
  "status": "success",
  "processed": 10,      // Nombre d'emails traités avec succès
  "total": 15,          // Nombre total d'emails récupérés
  "filtered": 2,        // Nombre d'emails filtrés (spam/newsletter)
  "deleted": 1,         // Nombre d'emails supprimés (absents de INBOX)
  "errors": []          // Liste des erreurs (email, error)
}
```

## Points importants

1. **Détection de notification** : Les notifications automatiques (Amazon, PayPal, etc.) ne créent PAS de client
2. **Regroupement des réponses** : Les réponses sont regroupées dans la même conversation via In-Reply-To/References
3. **Classification IA** : Seulement pour les nouvelles conversations (bug actuel à corriger)
4. **Reclassification globale** : Après chaque sync, toutes les conversations sans dossier sont reclassifiées
5. **Auto-réponse** : Déclenchée automatiquement si le dossier a une auto-réponse configurée
6. **Suppression automatique** : Les messages supprimés de la boîte mail sont aussi supprimés de la base

## Bug à corriger

**Ligne 964** : `is_new_conversation` n'est jamais défini. Il devrait être défini juste après la création de la conversation (ligne 889) :

```python
# Si aucune conversation trouvée, créer une nouvelle
is_new_conversation = False
if not conversation:
    # ... création de la conversation ...
    is_new_conversation = True
    print(f"[SYNC] ✅ Nouvelle conversation créée: ...")
```

