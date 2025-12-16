from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import json
from app.db.base import Base


class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Informations de base
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    items = Column(Text, nullable=False)  # JSON array of strings
    
    # Récurrence et planification
    recurrence = Column(String, nullable=True)  # "none", "daily", "weekly", "monthly"
    recurrence_days = Column(Text, nullable=True)  # JSON array of day numbers (0-6 for weekly, 1-31 for monthly)
    execution_time = Column(String, nullable=True)  # Format "HH:MM"
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Assignation par défaut
    default_assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="checklist_templates")
    default_assigned_to = relationship("User", foreign_keys=[default_assigned_to_id], backref="default_checklist_templates")
    
    def get_items(self) -> list[str]:
        """Retourne les items comme une liste Python"""
        if not self.items:
            return []
        try:
            return json.loads(self.items)
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_items(self, items: list[str]):
        """Définit les items depuis une liste Python"""
        self.items = json.dumps(items) if items else "[]"
    
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
        self.recurrence_days = json.dumps(days) if days else "[]"


class ChecklistInstance(Base):
    __tablename__ = "checklist_instances"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("checklist_templates.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Assignation
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Suivi de progression
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    # MVP V1: completed_items non utilisé (gardé pour compatibilité future)
    completed_items = Column(Text, nullable=True)  # JSON array of item indices (0-based) - MVP V1: non utilisé
    status = Column(String, nullable=False, default="en_cours")  # "en_cours", "termine"
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    template = relationship("ChecklistTemplate", backref="instances")
    company = relationship("Company", backref="checklist_instances")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], backref="checklist_instances")
    
    def get_completed_items(self) -> list[int]:
        """Retourne les indices des items complétés comme une liste Python"""
        if not self.completed_items:
            return []
        try:
            return json.loads(self.completed_items)
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_completed_items(self, items: list[int]):
        """Définit les indices des items complétés depuis une liste Python"""
        self.completed_items = json.dumps(items) if items else "[]"
    
    def get_total_items(self) -> int:
        """Retourne le nombre total d'items depuis le template"""
        if self.template:
            return len(self.template.get_items())
        return 0
    
    def get_completion_percentage(self) -> float:
        """Retourne le pourcentage de complétion"""
        total = self.get_total_items()
        if total == 0:
            return 0.0
        completed = len(self.get_completed_items())
        return (completed / total) * 100
