from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.db.models.project import ProjectStatus


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    client_id: int
    status: Optional[ProjectStatus] = ProjectStatus.NOUVEAU
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[int] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    notes: Optional[str] = None


class ProjectHistoryCreate(BaseModel):
    action: str
    description: Optional[str] = None


class ProjectHistoryRead(BaseModel):
    id: int
    project_id: int
    user_id: Optional[int] = None
    action: str
    description: Optional[str] = None
    created_at: datetime
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class ProjectDocumentRead(BaseModel):
    id: int
    name: str
    file_path: str
    file_type: str
    file_size: int
    document_type: str
    uploaded_by_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProjectRead(ProjectBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
    client_name: Optional[str] = None
    history: Optional[List[ProjectHistoryRead]] = []
    documents: Optional[List[ProjectDocumentRead]] = []
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm_with_relations(cls, project):
        """Crée un ProjectRead depuis un ORM avec les relations chargées
        
        NOTE: Les documents doivent être pré-chargés via joinedload dans les routes.
        Cette méthode ne fait PAS de requête supplémentaire pour éviter la surcharge.
        """
        # Les documents sont déjà chargés via joinedload dans les routes
        # On utilise simplement project.documents qui est déjà en mémoire
        documents = []
        if hasattr(project, 'documents') and project.documents is not None:
            documents = project.documents
        # Si documents n'est pas chargé, c'est une liste vide (pas d'erreur, juste pas de documents)
        
        data = {
            "id": project.id,
            "company_id": project.company_id,
            "name": project.name,
            "description": project.description,
            "client_id": project.client_id,
            "status": project.status,
            "start_date": project.start_date,
            "end_date": project.end_date,
            "notes": project.notes,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "client_name": project.client.name if project.client else None,
            "history": [
                ProjectHistoryRead(
                    id=h.id,
                    project_id=h.project_id,
                    user_id=h.user_id,
                    action=h.action,
                    description=h.description,
                    created_at=h.created_at,
                    user_name=h.user.full_name if h.user else None
                )
                for h in (project.history or [])
            ] if hasattr(project, 'history') and project.history else [],
            "documents": [
                ProjectDocumentRead(
                    id=d.id,
                    name=d.name,
                    file_path=d.file_path,
                    file_type=d.file_type,
                    file_size=d.file_size,
                    document_type=d.document_type.value if hasattr(d.document_type, 'value') else str(d.document_type),
                    uploaded_by_name=d.uploaded_by.full_name if d.uploaded_by else None,
                    created_at=d.created_at
                )
                for d in documents
            ]
        }
        return cls(**data)
