# Proposition de Structure de Base de Données pour le Chatbot avec ChatGPT

## Vue d'ensemble

Cette proposition définit la structure de base de données nécessaire pour intégrer ChatGPT dans le chatbot du site. La structure permet de :
- Stocker les conversations du chatbot par utilisateur et par entreprise
- Historiser tous les messages échangés
- Gérer le contexte des conversations pour ChatGPT
- Suivre les statistiques d'utilisation

## Tables proposées

### 1. Table `chatbot_conversations`

Cette table stocke les conversations du chatbot. Chaque conversation appartient à un utilisateur et à une entreprise.

```sql
chatbot_conversations
├── id (Integer, Primary Key)
├── company_id (Integer, ForeignKey -> companies.id, NOT NULL, Index)
├── user_id (Integer, ForeignKey -> users.id, NOT NULL, Index)
├── title (String, nullable) - Titre de la conversation (généré automatiquement ou défini par l'utilisateur)
├── status (String, default="active") - active, archived, deleted
├── created_at (DateTime, NOT NULL)
├── updated_at (DateTime, NOT NULL)
└── last_message_at (DateTime, nullable) - Dernier message pour tri
```

**Relations :**
- `company` -> Company
- `user` -> User
- `messages` -> chatbot_messages (one-to-many)

**Index :**
- `company_id`
- `user_id`
- `(company_id, user_id)` - Composite pour requêtes fréquentes
- `last_message_at` - Pour tri chronologique

---

### 2. Table `chatbot_messages`

Cette table stocke tous les messages échangés dans les conversations du chatbot.

```sql
chatbot_messages
├── id (Integer, Primary Key)
├── conversation_id (Integer, ForeignKey -> chatbot_conversations.id, NOT NULL, Index)
├── role (String, NOT NULL) - "user" ou "assistant" (pour ChatGPT)
├── content (Text, NOT NULL) - Contenu du message
├── tokens_used (Integer, nullable) - Nombre de tokens utilisés (pour ChatGPT)
├── model_used (String, nullable) - Modèle ChatGPT utilisé (ex: "gpt-4", "gpt-3.5-turbo")
├── metadata (JSON, nullable) - Métadonnées supplémentaires (ex: température, max_tokens)
├── created_at (DateTime, NOT NULL)
└── updated_at (DateTime, nullable)
```

**Relations :**
- `conversation` -> chatbot_conversations (many-to-one)

**Index :**
- `conversation_id`
- `created_at` - Pour tri chronologique
- `(conversation_id, created_at)` - Composite pour récupérer les messages d'une conversation dans l'ordre

---

## Schéma SQL complet

```sql
CREATE TABLE chatbot_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_company_id (company_id),
    INDEX idx_user_id (user_id),
    INDEX idx_company_user (company_id, user_id),
    INDEX idx_last_message_at (last_message_at)
);

CREATE TABLE chatbot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user' ou 'assistant'
    content TEXT NOT NULL,
    tokens_used INTEGER,
    model_used VARCHAR(100),
    metadata JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_created_at (created_at),
    INDEX idx_conversation_created (conversation_id, created_at)
);
```

---

## Modèles SQLAlchemy proposés

### `ChatbotConversation`

```python
class ChatbotConversation(Base):
    __tablename__ = "chatbot_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=True)
    status = Column(String, default="active", nullable=False)  # active, archived, deleted
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relations
    company = relationship("Company", backref="chatbot_conversations")
    user = relationship("User", backref="chatbot_conversations")
    messages = relationship("ChatbotMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatbotMessage.created_at")
```

### `ChatbotMessage`

```python
class ChatbotMessage(Base):
    __tablename__ = "chatbot_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("chatbot_conversations.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # "user" ou "assistant"
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, nullable=True)  # Nombre de tokens utilisés
    model_used = Column(String, nullable=True)  # Modèle ChatGPT utilisé
    metadata = Column(JSON, nullable=True)  # Métadonnées supplémentaires
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    
    # Relations
    conversation = relationship("ChatbotConversation", back_populates="messages")
```

---

## Fonctionnalités supportées

### 1. Historique des conversations
- Chaque utilisateur peut avoir plusieurs conversations
- Les conversations sont organisées par entreprise
- Possibilité d'archiver ou supprimer des conversations

### 2. Contexte pour ChatGPT
- Les messages sont stockés avec leur rôle (user/assistant)
- Permet de reconstruire le contexte complet d'une conversation pour ChatGPT
- Les métadonnées permettent de stocker les paramètres de l'API (température, max_tokens, etc.)

### 3. Suivi des coûts
- `tokens_used` permet de suivre l'utilisation de tokens
- `model_used` permet de savoir quel modèle a été utilisé
- Facilite le calcul des coûts par entreprise/utilisateur

### 4. Performance
- Index optimisés pour les requêtes fréquentes
- Cascade delete pour nettoyer automatiquement les messages lors de la suppression d'une conversation

---

## Migration Alembic

Une migration Alembic sera créée pour :
1. Créer les tables `chatbot_conversations` et `chatbot_messages`
2. Ajouter les index nécessaires
3. Ajouter les contraintes de clés étrangères

---

## Questions à valider

1. ✅ **Structure des tables** - Est-ce que cette structure vous convient ?
2. ✅ **Champs supplémentaires** - Y a-t-il des champs à ajouter ?
3. ✅ **Gestion des conversations** - Faut-il permettre de renommer les conversations ?
4. ✅ **Archivage** - Le système d'archivage (status) est-il suffisant ?
5. ✅ **Métadonnées** - Les métadonnées JSON sont-elles suffisantes pour stocker les paramètres ChatGPT ?

---

## Prochaines étapes après validation

1. Créer les modèles SQLAlchemy
2. Créer la migration Alembic
3. Créer les routes API backend
4. Créer le service d'intégration ChatGPT
5. Mettre à jour le frontend pour utiliser l'API

---

**Date de proposition :** $(date)
**Statut :** ⏳ En attente de validation

