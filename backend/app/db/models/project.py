from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class ProjectStatus(str, enum.Enum):
    NOUVEAU = "Nouveau"
    EN_COURS = "En cours"
    TERMINE = "Terminé"


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ProjectStatus), nullable=False, default=ProjectStatus.NOUVEAU)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="projects")
    client = relationship("Client", back_populates="projects")
    quotes = relationship("Quote", back_populates="project")
    invoices = relationship("Invoice", back_populates="project")
    documents = relationship("Document", back_populates="project")
    history = relationship("ProjectHistory", back_populates="project", order_by="ProjectHistory.created_at")


class ProjectHistory(Base):
    __tablename__ = "project_history"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # "Créé", "Statut changé", "Note ajoutée", etc.
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    project = relationship("Project", back_populates="history")
    user = relationship("User", backref="project_history_entries")

