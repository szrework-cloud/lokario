from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class DocumentType(str, enum.Enum):
    DEVIS = "devis"
    FACTURE = "facture"
    CONTRAT = "contrat"
    AUTRE = "autre"


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # Chemin du fichier stocké
    file_type = Column(String, nullable=False)  # "PDF", "PNG", "JPG", etc.
    file_size = Column(Integer, nullable=False)  # Taille en bytes
    document_type = Column(Enum(DocumentType), nullable=False)
    folder_id = Column(Integer, ForeignKey("document_folders.id"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    is_template = Column(Boolean, default=False, nullable=False)  # Pour les modèles PDF réutilisables
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="documents")
    folder = relationship("DocumentFolder", back_populates="documents")
    project = relationship("Project", back_populates="documents")
    client = relationship("Client", backref="documents")
    uploaded_by = relationship("User", backref="uploaded_documents")


class DocumentFolder(Base):
    __tablename__ = "document_folders"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("document_folders.id"), nullable=True, index=True)  # Pour l'arborescence
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="document_folders")
    parent = relationship("DocumentFolder", remote_side=[id], backref="children")
    documents = relationship("Document", back_populates="folder")


class DocumentHistory(Base):
    __tablename__ = "document_history"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # "Envoyé", "Téléchargé", "Modifié", etc.
    recipient = Column(String, nullable=True)  # Email du destinataire si envoyé
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    document = relationship("Document", backref="history")
    user = relationship("User", backref="document_history_entries")

