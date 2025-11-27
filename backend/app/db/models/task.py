from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class TaskType(str, enum.Enum):
    INTERNE = "Interne"
    CLIENT = "Client"
    FOURNISSEUR = "Fournisseur"


class TaskStatus(str, enum.Enum):
    A_FAIRE = "À faire"
    EN_COURS = "En cours"
    TERMINE = "Terminé"
    EN_RETARD = "En retard"


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    type = Column(Enum(TaskType), nullable=False, default=TaskType.INTERNE)
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.A_FAIRE)
    due_date = Column(DateTime(timezone=True), nullable=True)
    due_time = Column(String, nullable=True)  # "09:00", "Avant fermeture", etc.
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)  # Liaison au dossier
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    is_checklist_item = Column(Boolean, default=False, nullable=False)  # Pour les checklists
    checklist_template_id = Column(Integer, ForeignKey("checklist_templates.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="tasks")
    assigned_to = relationship("User", backref="assigned_tasks")
    project = relationship("Project", back_populates="tasks")
    client = relationship("Client", backref="tasks")


class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)  # "Ouverture", "Fermeture", "Nettoyage", etc.
    description = Column(Text, nullable=True)
    items = Column(Text, nullable=False)  # JSON array of task titles
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="checklist_templates")

