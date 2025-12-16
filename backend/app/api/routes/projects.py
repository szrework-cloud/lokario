from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from pathlib import Path
import uuid
import os
import shutil
import logging
from urllib.parse import quote

from app.db.session import get_db
from app.db.models.project import Project, ProjectHistory, ProjectStatus
from app.db.models.document import Document, DocumentType
from app.db.models.user import User
from app.db.models.client import Client
from app.api.schemas.project import ProjectCreate, ProjectUpdate, ProjectRead, ProjectHistoryRead, ProjectHistoryCreate, ProjectDocumentRead
from app.api.deps import get_current_active_user
from app.core.config import settings

router = APIRouter(prefix="/projects", tags=["projects"])


def _check_company_access(current_user: User):
    """Vérifier que l'utilisateur est attaché à une entreprise"""
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )


@router.get("", response_model=List[ProjectRead])
def get_projects(
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère la liste des projets de l'entreprise"""
    _check_company_access(current_user)
    
    query = db.query(Project).filter(Project.company_id == current_user.company_id)
    
    # Filtres
    if status:
        try:
            status_enum = ProjectStatus(status)
            query = query.filter(Project.status == status_enum)
        except ValueError:
            pass
    
    if client_id:
        query = query.filter(Project.client_id == client_id)
    
    # Charger les relations
    query = query.options(
        joinedload(Project.client),
        joinedload(Project.history).joinedload(ProjectHistory.user),
        joinedload(Project.documents).joinedload(Document.uploaded_by)
    )
    
    projects = query.order_by(Project.created_at.desc()).all()
    
    # Les documents sont déjà chargés via joinedload dans la query ci-dessus
    # Pas besoin de requêtes supplémentaires - c'est déjà optimisé avec un JOIN SQL
    return [ProjectRead.from_orm_with_relations(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère un projet par son ID"""
    _check_company_access(current_user)
    
    project = db.query(Project).options(
        joinedload(Project.client),
        joinedload(Project.history).joinedload(ProjectHistory.user),
        joinedload(Project.documents).joinedload(Document.uploaded_by)
    ).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return ProjectRead.from_orm_with_relations(project)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée un nouveau projet"""
    _check_company_access(current_user)
    
    # Vérifier que le client appartient à la même entreprise
    client = db.query(Client).filter(
        Client.id == project_data.client_id,
        Client.company_id == current_user.company_id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client not found or not in same company"
        )
    
    # Créer le projet
    project = Project(
        company_id=current_user.company_id,
        name=project_data.name,
        description=project_data.description,
        client_id=project_data.client_id,
        status=project_data.status or ProjectStatus.NOUVEAU,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        notes=project_data.notes
    )
    
    db.add(project)
    db.flush()
    
    # Créer un événement d'historique
    history_entry = ProjectHistory(
        project_id=project.id,
        user_id=current_user.id,
        action="Projet créé",
        description=f"Projet '{project.name}' créé"
    )
    db.add(history_entry)
    
    db.commit()
    db.refresh(project)
    
    # Recharger avec les relations (joinedload = une seule requête SQL avec JOIN, très efficace)
    project = db.query(Project).options(
        joinedload(Project.client),
        joinedload(Project.history).joinedload(ProjectHistory.user),
        joinedload(Project.documents).joinedload(Document.uploaded_by)
    ).filter(Project.id == project.id).first()
    
    # Les documents sont déjà chargés via joinedload - pas de requête supplémentaire nécessaire
    return ProjectRead.from_orm_with_relations(project)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour un projet"""
    _check_company_access(current_user)
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Vérifier le client si fourni
    if project_data.client_id and project_data.client_id != project.client_id:
        client = db.query(Client).filter(
            Client.id == project_data.client_id,
            Client.company_id == current_user.company_id
        ).first()
        
        if not client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client not found or not in same company"
            )
    
    # Mettre à jour les champs
    old_status = project.status
    update_data = project_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if hasattr(project, field):
            setattr(project, field, value)
    
    # Créer un événement d'historique pour le changement de statut
    if project_data.status and project_data.status != old_status:
        history_entry = ProjectHistory(
            project_id=project.id,
            user_id=current_user.id,
            action="Statut changé",
            description=f"De '{old_status.value}' à '{project_data.status.value}'"
        )
        db.add(history_entry)
    
    # Créer un événement d'historique pour la modification de notes
    if project_data.notes is not None and project_data.notes != project.notes:
        history_entry = ProjectHistory(
            project_id=project.id,
            user_id=current_user.id,
            action="Note modifiée",
            description=project_data.notes[:100] + "..." if project_data.notes and len(project_data.notes) > 100 else project_data.notes
        )
        db.add(history_entry)
    
    db.commit()
    db.refresh(project)
    
    # Recharger avec les relations (joinedload = une seule requête SQL avec JOIN, très efficace)
    project = db.query(Project).options(
        joinedload(Project.client),
        joinedload(Project.history).joinedload(ProjectHistory.user),
        joinedload(Project.documents).joinedload(Document.uploaded_by)
    ).filter(Project.id == project.id).first()
    
    # Les documents sont déjà chargés via joinedload - pas de requête supplémentaire nécessaire
    return ProjectRead.from_orm_with_relations(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime un projet"""
    _check_company_access(current_user)
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Supprimer l'historique associé
    db.query(ProjectHistory).filter(ProjectHistory.project_id == project_id).delete()
    
    db.delete(project)
    db.commit()
    
    return None


@router.post("/{project_id}/history", response_model=ProjectHistoryRead, status_code=status.HTTP_201_CREATED)
def add_project_history(
    project_id: int,
    history_data: ProjectHistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Ajoute un événement à l'historique d'un projet"""
    _check_company_access(current_user)
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    history_entry = ProjectHistory(
        project_id=project_id,
        user_id=current_user.id,
        action=history_data.action,
        description=history_data.description
    )
    
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    
    # Charger la relation user
    history_entry = db.query(ProjectHistory).options(
        joinedload(ProjectHistory.user)
    ).filter(ProjectHistory.id == history_entry.id).first()
    
    return ProjectHistoryRead(
        id=history_entry.id,
        project_id=history_entry.project_id,
        user_id=history_entry.user_id,
        action=history_entry.action,
        description=history_entry.description,
        created_at=history_entry.created_at,
        user_name=history_entry.user.full_name if history_entry.user else None
    )


@router.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime un événement de l'historique d'un projet"""
    _check_company_access(current_user)
    
    history_entry = db.query(ProjectHistory).join(Project).filter(
        ProjectHistory.id == history_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not history_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found"
        )
    
    db.delete(history_entry)
    db.commit()
    
    return None


# ===== DOCUMENTS / PIÈCES JOINTES =====

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def get_file_type(filename: str) -> str:
    """Détermine le type de fichier basé sur l'extension."""
    ext = Path(filename).suffix.lower()
    if ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        return "image"
    elif ext == ".pdf":
        return "pdf"
    elif ext in [".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"]:
        return "document"
    else:
        return "other"


@router.get("/{project_id}/documents", response_model=List[ProjectDocumentRead])
def get_project_documents(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère tous les documents d'un projet"""
    _check_company_access(current_user)
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    documents = db.query(Document).options(
        joinedload(Document.uploaded_by)
    ).filter(
        Document.project_id == project_id,
        Document.company_id == current_user.company_id
    ).order_by(Document.created_at.desc()).all()
    
    return [
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


@router.post("/{project_id}/documents/upload", response_model=ProjectDocumentRead)
async def upload_project_document(
    project_id: int,
    file: UploadFile = File(...),
    document_type: str = Form("autre"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload un document pour un projet"""
    _check_company_access(current_user)
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.company_id == current_user.company_id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Vérifier la taille du fichier
    file_content = await file.read()
    file_size = len(file_content)
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Vérifier l'extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # SÉCURITÉ: Vérifier le MIME type réel du fichier
    try:
        import filetype
        detected_type = filetype.guess(file_content)
        if detected_type:
            real_mime_type = detected_type.mime
            if real_mime_type not in settings.ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File type mismatch. Detected MIME type '{real_mime_type}' is not allowed."
                )
    except ImportError:
        # Si filetype n'est pas disponible, on skip cette vérification
        pass
    
    # Générer un nom de fichier unique
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    company_upload_dir = UPLOAD_DIR / str(current_user.company_id)
    company_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = company_upload_dir / unique_filename
    
    # Sauvegarder le fichier
    try:
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Vérifier que le fichier a bien été écrit
        if not file_path.exists() or file_path.stat().st_size != file_size:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="File was not saved correctly to disk"
            )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error saving file {file_path}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )
    
    # Déterminer le type de document
    try:
        doc_type = DocumentType(document_type)
    except ValueError:
        doc_type = DocumentType.AUTRE
    
    # Créer l'entrée dans la base de données
    document = Document(
        company_id=current_user.company_id,
        name=file.filename,
        file_path=str(file_path.relative_to(UPLOAD_DIR)),
        file_type=get_file_type(file.filename),
        file_size=file_size,
        document_type=doc_type,
        project_id=project_id,
        uploaded_by_id=current_user.id
    )
    
    db.add(document)
    db.flush()
    
    # Créer un événement d'historique
    history_entry = ProjectHistory(
        project_id=project_id,
        user_id=current_user.id,
        action="Document ajouté",
        description=f"Fichier '{file.filename}' uploadé"
    )
    db.add(history_entry)
    
    # IMPORTANT: Commit pour s'assurer que le document est bien sauvegardé
    db.commit()
    db.refresh(document)
    
    # Vérifier que le document est bien en base de données
    saved_document = db.query(Document).filter(Document.id == document.id).first()
    if not saved_document:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document was not saved to database"
        )
    
    # Charger la relation uploaded_by
    document = db.query(Document).options(
        joinedload(Document.uploaded_by)
    ).filter(Document.id == document.id).first()
    
    # Log pour vérifier que le document est bien associé au projet
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Document {document.id} uploaded for project {project_id}, file_path: {document.file_path}")
    
    return ProjectDocumentRead(
        id=document.id,
        name=document.name,
        file_path=document.file_path,
        file_type=document.file_type,
        file_size=document.file_size,
        document_type=document.document_type.value if hasattr(document.document_type, 'value') else str(document.document_type),
        uploaded_by_name=document.uploaded_by.full_name if document.uploaded_by else None,
        created_at=document.created_at
    )


@router.get("/documents/{document_id}/download")
async def download_project_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Télécharge un document d'un projet"""
    _check_company_access(current_user)
    
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.company_id == current_user.company_id,
        Document.project_id.isnot(None)  # Seulement les documents de projets
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    file_path = UPLOAD_DIR / document.file_path
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    return FileResponse(
        path=str(file_path),
        filename=document.name,
        media_type='application/octet-stream'
    )


@router.get("/documents/{document_id}/preview")
async def preview_project_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Prévisualise un document d'un projet (pour affichage inline dans le navigateur)"""
    logger = logging.getLogger(__name__)
    
    try:
        _check_company_access(current_user)
        
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.company_id == current_user.company_id,
            Document.project_id.isnot(None)  # Seulement les documents de projets
        ).first()
        
        if not document:
            logger.error(f"Document {document_id} not found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        logger.info(f"Document trouvé: {document.name}, file_path: {document.file_path}")
        
        # Construire le chemin complet
        if not document.file_path:
            logger.error(f"Document {document_id} has no file_path")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document file path is missing"
            )
        
        file_path = UPLOAD_DIR / document.file_path
        logger.info(f"Chemin complet du fichier: {file_path}, existe: {file_path.exists()}")
        
        if not file_path.exists():
            logger.error(f"File not found at path: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found on server at {file_path}"
            )
        
        # Déterminer le media_type selon l'extension
        file_ext = Path(document.name).suffix.lower()
        media_type_map = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.csv': 'text/csv',
        }
        media_type = media_type_map.get(file_ext, 'application/octet-stream')
        
        # Lire le fichier
        try:
            with open(file_path, "rb") as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error reading file: {str(e)}"
            )
        
        # Encoder le nom de fichier pour les headers HTTP (RFC 2231)
        # Utiliser urllib.parse.quote pour encoder les caractères spéciaux
        from urllib.parse import quote
        encoded_filename = quote(document.name, safe='')
        
        headers = {
            "Content-Disposition": f'inline; filename="{encoded_filename}"; filename*=UTF-8\'\'{quote(document.name)}'
        }
        
        return Response(
            content=content,
            media_type=media_type,
            headers=headers
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in preview_project_document: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime un document d'un projet"""
    _check_company_access(current_user)
    
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.company_id == current_user.company_id,
        Document.project_id.isnot(None)
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    project_id = document.project_id
    
    # Supprimer le fichier du disque
    file_path = UPLOAD_DIR / document.file_path
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            import logging
            logging.error(f"Erreur lors de la suppression du fichier {file_path}: {e}")
    
    # Créer un événement d'historique
    history_entry = ProjectHistory(
        project_id=project_id,
        user_id=current_user.id,
        action="Document supprimé",
        description=f"Fichier '{document.name}' supprimé"
    )
    db.add(history_entry)
    
    # Supprimer l'entrée de la base de données
    db.delete(document)
    db.commit()
    
    return None
