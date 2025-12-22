from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import json
from app.db.base import Base


class TaskStatus(str, enum.Enum):
    A_FAIRE = "À faire"
    EN_COURS = "En cours"
    TERMINE = "Terminé"
    EN_RETARD = "En retard"


class TaskPriority(str, enum.Enum):
    """Priorités simplifiées pour MVP V1"""
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class TaskType(str, enum.Enum):
    INTERNE = "Interne"
    CLIENT = "Client"
    FOURNISSEUR = "Fournisseur"


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Informations de base
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Assignation
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Relations optionnelles
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    
    # Classification
    # Note: SQLite ne supporte pas les ENUMs natifs, SQLAlchemy les stocke comme String
    type = Column(Enum(TaskType), nullable=False, default=TaskType.INTERNE)
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.A_FAIRE)
    priority = Column(String, nullable=True)  # "normal", "high", "critical" (MVP V1 simplifié)
    
    # Dates
    due_date = Column(DateTime(timezone=True), nullable=True, index=True)
    reminder_at = Column(DateTime(timezone=True), nullable=True)  # Rappel optionnel
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Métadonnées
    recurrence = Column(String, nullable=True, default="none")  # "none", "daily", "weekly", "monthly"
    recurrence_days = Column(Text, nullable=True)  # JSON array of day numbers (0-6 for weekly, 1-31 for monthly)
    origin = Column(String, nullable=True, default="manual")  # "manual", "checklist", "conversation"
    
    # Checklist (optionnel)
    is_checklist_item = Column(Boolean, default=False, nullable=False)
    checklist_template_id = Column(Integer, nullable=True)
    checklist_instance_id = Column(Integer, ForeignKey("checklist_instances.id"), nullable=True, index=True)
    
    # Création
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="tasks")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], backref="assigned_tasks")
    client = relationship("Client", backref="tasks")
    project = relationship("Project", backref="tasks")
    conversation = relationship("Conversation", backref="tasks")
    created_by = relationship("User", foreign_keys=[created_by_id], backref="created_tasks")
    checklist_instance = relationship("ChecklistInstance", foreign_keys=[checklist_instance_id], backref="tasks")
    
    def get_recurrence_days(self) -> list[int]:
        """Retourne les jours de récurrence comme une liste Python"""
        if not self.recurrence_days:
            return []
        try:
            return json.loads(self.recurrence_days)
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_recurrence_days(self, days: list[int]):
        """Définit les jours de récurrence depuis une liste Python"""
        self.recurrence_days = json.dumps(days) if days else None
