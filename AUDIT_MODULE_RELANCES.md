# Audit Module Relances - Backend à Implémenter

## Vue d'ensemble
Le module Relances permet de gérer les relances clients (devis non répondu, factures impayées, infos manquantes, rappels RDV, etc.).

## Structure des données

### 1. Modèle FollowUp (Relance)
```python
class FollowUp(Base):
    __tablename__ = "followups"
    
    id: int (PK)
    company_id: int (FK -> companies.id)
    client_id: int (FK -> clients.id)
    
    # Type de relance
    type: Enum (
        "Devis non répondu",
        "Facture impayée", 
        "Info manquante",
        "Rappel RDV",
        "Client inactif",
        "Projet en attente"
    )
    
    # Source de la relance
    source_type: str  # "quote", "invoice", "appointment", "project", "conversation", "manual"
    source_id: int (nullable)  # ID de la source (quote_id, invoice_id, etc.)
    source_label: str  # Ex: "Devis #2025-023", "Facture #2025-014"
    
    # Dates
    due_date: DateTime  # Date limite pour la relance
    actual_date: DateTime  # Date réelle calculée (pour les calculs)
    
    # Statut
    status: Enum ("À faire", "Fait", "En attente")
    
    # Montant (si applicable)
    amount: Decimal (nullable)  # Pour factures impayées
    
    # Automatisation
    auto_enabled: bool (default=False)
    auto_frequency_days: int (nullable)  # Fréquence en jours
    auto_stop_on_response: bool (default=True)
    auto_stop_on_paid: bool (default=True)
    auto_stop_on_refused: bool (default=True)
    
    # Métadonnées
    created_by_id: int (FK -> users.id, nullable)
    created_at: DateTime
    updated_at: DateTime
```

### 2. Modèle FollowUpHistory (Historique des relances)
```python
class FollowUpHistory(Base):
    __tablename__ = "followup_history"
    
    id: int (PK)
    followup_id: int (FK -> followups.id)
    company_id: int (FK -> companies.id)
    
    # Message envoyé
    message: Text
    message_type: str  # "email", "whatsapp", "sms", "call"
    
    # Statut
    status: Enum ("envoyé", "lu", "répondu")
    
    # Qui a envoyé
    sent_by_id: int (FK -> users.id, nullable)
    sent_by_name: str  # Nom de la personne
    
    # Date
    sent_at: DateTime
    
    # Lien vers conversation (si envoyé via inbox)
    conversation_id: int (FK -> conversations.id, nullable)
    
    created_at: DateTime
```

### 3. Modèle FollowUpSettings (Configuration IA)
```python
class FollowUpSettings(Base):
    # Stocké dans CompanySettings.settings["followups"]
    {
        "initial_delay_days": 7,
        "max_relances": 3,
        "relance_delays": [7, 14, 21],  # Délais entre chaque relance
        "relance_methods": ["email", "email", "whatsapp"],  # Méthode pour chaque relance
        "stop_conditions": {
            "stop_on_client_response": true,
            "stop_on_invoice_paid": true,
            "stop_on_quote_refused": true
        },
        "messages": [
            {
                "id": 1,
                "type": "devis",
                "content": "Bonjour, nous vous rappelons..."
            },
            {
                "id": 2,
                "type": "facture",
                "content": "Bonjour, votre facture..."
            }
        ],
        "adapt_to_context": true  # IA adapte le message au contexte
    }
```

## Endpoints API à créer

### 1. GET /followups
Récupère la liste des relances avec filtres
- Query params:
  - `status`: "all" | "À faire" | "Fait" | "En attente"
  - `type`: "all" | "devis" | "factures" | "infos" | "rdv"
  - `client_id`: int (optionnel)
  - `source_type`: str (optionnel)
  - `source_id`: int (optionnel)
- Response: List[FollowUpRead]

### 2. GET /followups/{followup_id}
Récupère les détails d'une relance
- Response: FollowUpRead avec historique

### 3. GET /followups/stats
Récupère les KPIs
- Response: {
    "total": int,
    "invoices": int,
    "quotes": int,
    "late": int,
    "total_amount": float
  }

### 4. GET /followups/weekly
Récupère les données pour le graphique hebdomadaire
- Response: List[{day: str, count: int}]

### 5. POST /followups
Crée une nouvelle relance
- Body: FollowUpCreate
- Response: FollowUpRead

### 6. PATCH /followups/{followup_id}
Met à jour une relance
- Body: FollowUpUpdate
- Response: FollowUpRead

### 7. PATCH /followups/{followup_id}/mark-done
Marque une relance comme faite
- Response: FollowUpRead

### 8. DELETE /followups/{followup_id}
Supprime une relance
- Response: 204 No Content

### 9. POST /followups/{followup_id}/send
Envoie une relance (génère et envoie le message)
- Body: {
    "message": str (optionnel, si vide utilise template),
    "method": "email" | "whatsapp" | "sms" | "call"
  }
- Response: FollowUpHistoryRead

### 10. POST /followups/{followup_id}/generate-message
Génère un message de relance avec IA
- Body: {
    "context": str (optionnel, contexte supplémentaire)
  }
- Response: {
    "message": str
  }

### 11. GET /followups/{followup_id}/history
Récupère l'historique d'une relance
- Response: List[FollowUpHistoryRead]

### 12. GET /followups/settings
Récupère la configuration IA des relances
- Response: FollowUpSettings

### 13. PATCH /followups/settings
Met à jour la configuration IA des relances
- Body: FollowUpSettingsUpdate
- Response: FollowUpSettings

## Logique métier à implémenter

### 1. Génération automatique des relances
- **Devis non répondu**: Créer une relance si un devis n'a pas de réponse après X jours
- **Facture impayée**: Créer une relance si une facture est en retard de paiement
- **Info manquante**: Créer depuis l'inbox ou manuellement
- **Rappel RDV**: Créer depuis le module rendez-vous
- **Client inactif**: Créer si un client n'a pas eu d'activité depuis X jours
- **Projet en attente**: Créer si un projet est en attente depuis X jours

### 2. Automatisation
- Vérifier quotidiennement les relances à envoyer (basé sur `due_date`)
- Envoyer automatiquement selon la configuration IA
- Arrêter automatiquement si conditions d'arrêt remplies

### 3. Intégrations
- **Inbox**: Créer une relance depuis une conversation
- **Devis/Factures**: Lier les relances aux devis/factures (`linked_followups`)
- **Rendez-vous**: Créer des rappels RDV
- **Projets**: Créer des relances pour projets en attente

### 4. IA
- Génération de messages personnalisés selon le contexte
- Adaptation au client (ton, historique, secteur)
- Utilisation des templates configurés

## Schémas Pydantic

### FollowUpBase
```python
class FollowUpBase(BaseModel):
    type: FollowUpType
    client_id: int
    source_type: str
    source_id: Optional[int] = None
    source_label: str
    due_date: datetime
    status: FollowUpStatus = "À faire"
    amount: Optional[Decimal] = None
    auto_enabled: bool = False
    auto_frequency_days: Optional[int] = None
```

### FollowUpCreate
```python
class FollowUpCreate(FollowUpBase):
    pass
```

### FollowUpUpdate
```python
class FollowUpUpdate(BaseModel):
    status: Optional[FollowUpStatus] = None
    due_date: Optional[datetime] = None
    auto_enabled: Optional[bool] = None
    auto_frequency_days: Optional[int] = None
```

### FollowUpRead
```python
class FollowUpRead(FollowUpBase):
    id: int
    company_id: int
    client_name: str  # Depuis relation
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

### FollowUpHistoryRead
```python
class FollowUpHistoryRead(BaseModel):
    id: int
    followup_id: int
    message: str
    message_type: str
    status: str
    sent_by_name: Optional[str]
    sent_at: datetime
    
    class Config:
        from_attributes = True
```

## Permissions
- **Owner/Admin**: Toutes les opérations
- **User**: Lecture seule (peut voir les relances qui lui sont assignées si on ajoute ce champ plus tard)

## Notes importantes
1. Les relances peuvent être liées à plusieurs sources (devis, factures, rendez-vous, projets, conversations)
2. L'historique garde une trace de tous les messages envoyés
3. La configuration IA est stockée dans `CompanySettings.settings["followups"]`
4. Les relances peuvent être automatiques ou manuelles
5. Le système doit calculer automatiquement les relances à créer (devis non répondu, factures impayées, etc.)






