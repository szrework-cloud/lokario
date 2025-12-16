from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime


# ==================== CHECKLIST TEMPLATE SCHEMAS ====================

class ChecklistTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    items: List[str] = Field(..., min_items=1)
    recurrence: Optional[str] = Field(default="none", pattern="^(none|daily|weekly|monthly)$")
    recurrence_days: Optional[List[int]] = None
    execution_time: Optional[str] = None
    is_active: bool = True
    default_assigned_to_id: Optional[int] = None
    
    @field_validator('execution_time')
    @classmethod
    def validate_execution_time(cls, v):
        """Valider execution_time : None, chaîne vide, ou format HH:MM"""
        if v is None or v == "":
            return None
        import re
        if not re.match(r"^([0-1][0-9]|2[0-3]):[0-5][0-9]$", v):
            raise ValueError("execution_time must be in HH:MM format")
        return v


class ChecklistTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    items: Optional[List[str]] = Field(None, min_items=1)
    recurrence: Optional[str] = Field(None, pattern="^(none|daily|weekly|monthly)$")
    recurrence_days: Optional[List[int]] = None
    execution_time: Optional[str] = Field(None, pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]$")
    is_active: Optional[bool] = None
    default_assigned_to_id: Optional[int] = None


class ChecklistTemplateRead(BaseModel):
    id: int
    company_id: int
    name: str
    description: Optional[str]
    items: List[str]
    recurrence: Optional[str]
    recurrence_days: Optional[List[int]]
    execution_time: Optional[str]
    is_active: bool
    default_assigned_to_id: Optional[int]
    default_assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @classmethod
    def from_orm_with_relations(cls, template):
        """Créer un ChecklistTemplateRead depuis un ORM avec relations chargées"""
        try:
            # Récupérer les items de manière sécurisée
            items = []
            try:
                items = template.get_items() if hasattr(template, 'get_items') else []
            except Exception:
                items = []
            
            # Récupérer les jours de récurrence de manière sécurisée
            recurrence_days = []
            try:
                recurrence_days = template.get_recurrence_days() if hasattr(template, 'get_recurrence_days') else []
            except Exception:
                recurrence_days = []
            
            # Gérer updated_at : utiliser created_at si None (pour les anciens enregistrements)
            try:
                updated_at = template.updated_at if template.updated_at is not None else template.created_at
            except (AttributeError, TypeError):
                # Si updated_at n'existe pas ou est None, utiliser created_at
                updated_at = template.created_at if hasattr(template, 'created_at') else datetime.now()
            
            data = {
                "id": template.id,
                "company_id": template.company_id,
                "name": template.name,
                "description": template.description,
                "items": items,
                "recurrence": template.recurrence,
                "recurrence_days": recurrence_days,
                "execution_time": template.execution_time,
                "is_active": template.is_active,
                "default_assigned_to_id": template.default_assigned_to_id,
                "default_assigned_to_name": None,
                "created_at": template.created_at,
                "updated_at": updated_at,
            }
            
            # Ajouter le nom de l'utilisateur assigné par défaut si disponible
            try:
                if hasattr(template, 'default_assigned_to') and template.default_assigned_to:
                    data["default_assigned_to_name"] = (
                        template.default_assigned_to.full_name 
                        if hasattr(template.default_assigned_to, 'full_name') and template.default_assigned_to.full_name
                        else (template.default_assigned_to.email if hasattr(template.default_assigned_to, 'email') else None)
                    )
            except (AttributeError, KeyError, Exception):
                pass
            
            return cls(**data)
        except Exception as e:
            # Log l'erreur pour le débogage
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in from_orm_with_relations: {str(e)}")
            raise

    class Config:
        from_attributes = True


# ==================== CHECKLIST INSTANCE SCHEMAS ====================

class ChecklistTemplateExecute(BaseModel):
    """Schéma pour l'exécution d'un template (template_id vient de l'URL)"""
    assigned_to_id: Optional[int] = None


class ChecklistInstanceCreate(BaseModel):
    template_id: int
    assigned_to_id: Optional[int] = None


class ChecklistInstanceUpdate(BaseModel):
    # MVP V1: completed_items non utilisé (gardé pour compatibilité future)
    completed_items: Optional[List[int]] = None  # MVP V1: non utilisé - sera utilisé en V2
    status: Optional[str] = Field(None, pattern="^(en_cours|termine)$")


class ChecklistInstanceRead(BaseModel):
    id: int
    template_id: int
    template_name: str
    company_id: int
    assigned_to_id: Optional[int]
    assigned_to_name: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime]
    completed_items: List[int]  # Indices des items complétés
    total_items: int
    status: str
    created_at: datetime

    @classmethod
    def from_orm_with_relations(cls, instance):
        """Créer un ChecklistInstanceRead depuis un ORM avec relations chargées"""
        data = {
            "id": instance.id,
            "template_id": instance.template_id,
            "template_name": "",
            "company_id": instance.company_id,
            "assigned_to_id": instance.assigned_to_id,
            "assigned_to_name": None,
            "started_at": instance.started_at,
            "completed_at": instance.completed_at,
            "completed_items": instance.get_completed_items(),
            "total_items": instance.get_total_items(),
            "status": instance.status,
            "created_at": instance.created_at,
        }
        
        # Ajouter le nom du template
        try:
            if instance.template:
                data["template_name"] = instance.template.name
        except (AttributeError, KeyError):
            pass
        
        # Ajouter le nom de l'utilisateur assigné
        try:
            if instance.assigned_to:
                data["assigned_to_name"] = instance.assigned_to.full_name or instance.assigned_to.email
        except (AttributeError, KeyError):
            pass
        
        return cls(**data)

    class Config:
        from_attributes = True
