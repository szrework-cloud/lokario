from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List
from app.db.models.task import TaskType, TaskStatus
import json


# ==================== TASK SCHEMAS ====================

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    conversation_id: Optional[int] = None
    priority: Optional[str] = None  # "normal", "high", "critical" (MVP V1)
    due_date: Optional[datetime] = None
    due_time: Optional[str] = None
    reminder_at: Optional[datetime] = None  # Rappel optionnel
    recurrence: Optional[str] = "none"  # "none", "daily", "weekly", "monthly"
    recurrence_days: Optional[List[int]] = None  # Pour hebdomadaire (0-6, dimanche = 0)
    is_mandatory: Optional[bool] = False
    
    @field_validator('priority')
    @classmethod
    def normalize_priority(cls, v):
        """Mapper les anciennes priorités vers les nouvelles (MVP V1)"""
        if v is None:
            return None
        v_lower = v.lower()
        # Mapper les anciennes valeurs vers les nouvelles
        priority_map = {
            "low": "normal",
            "medium": "normal",
            "urgent": "high",
            "high": "high",
            "critical": "critical",
            "normal": "normal",
        }
        normalized = priority_map.get(v_lower, "normal")
        # Valider que c'est une valeur MVP valide
        if normalized not in ["normal", "high", "critical"]:
            return "normal"
        return normalized


class TaskCreate(TaskBase):
    category: Optional[str] = None  # "Interne", "Client", "Fournisseur", "Administratif" - pour compatibilité frontend
    type: Optional[str] = None  # Si fourni directement, utiliser celui-ci
    company_id: Optional[int] = None  # Pour super_admin uniquement
    
    def get_task_type(self) -> TaskType:
        """Mapper category vers TaskType Enum"""
        if self.type:
            # Si type est fourni directement, l'utiliser
            type_map = {
                "Interne": TaskType.INTERNE,
                "Client": TaskType.CLIENT,
                "Fournisseur": TaskType.FOURNISSEUR,
            }
            return type_map.get(self.type, TaskType.INTERNE)
        
        if self.category:
            # Mapper category vers type
            category_map = {
                "Interne": TaskType.INTERNE,
                "Client": TaskType.CLIENT,
                "Fournisseur": TaskType.FOURNISSEUR,
                "Administratif": TaskType.INTERNE,  # Par défaut
            }
            return category_map.get(self.category, TaskType.INTERNE)
        
        return TaskType.INTERNE  # Par défaut


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    conversation_id: Optional[int] = None
    category: Optional[str] = None  # Pour compatibilité frontend
    type: Optional[str] = None
    priority: Optional[str] = None  # "normal", "high", "critical" (MVP V1)
    status: Optional[str] = None  # "À faire", "En cours", "Terminé", "En retard"
    due_date: Optional[datetime] = None
    due_time: Optional[str] = None
    reminder_at: Optional[datetime] = None
    recurrence: Optional[str] = None
    recurrence_days: Optional[List[int]] = None  # Pour hebdomadaire (0-6, dimanche = 0)
    is_mandatory: Optional[bool] = None
    
    @field_validator('priority')
    @classmethod
    def normalize_priority(cls, v):
        """Mapper les anciennes priorités vers les nouvelles (MVP V1)"""
        if v is None:
            return None
        v_lower = v.lower()
        priority_map = {
            "low": "normal",
            "medium": "normal",
            "urgent": "high",
            "high": "high",
            "critical": "critical",
            "normal": "normal",
        }
        normalized = priority_map.get(v_lower, "normal")
        if normalized not in ["normal", "high", "critical"]:
            return "normal"
        return normalized


class TaskRead(TaskBase):
    id: int
    company_id: int
    type: str  # Enum value comme string
    category: str  # Dérivé de type pour compatibilité frontend
    status: str  # Enum value comme string
    origin: Optional[str] = None
    is_checklist_item: bool
    checklist_template_id: Optional[int] = None
    checklist_instance_id: Optional[int] = None
    reminder_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Relations (optionnelles, chargées si demandées)
    assigned_to_name: Optional[str] = None
    assigned_to_avatar: Optional[str] = None
    client_name: Optional[str] = None
    project_name: Optional[str] = None
    conversation_subject: Optional[str] = None
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm_with_relations(cls, task):
        """Créer un TaskRead avec les relations chargées"""
        # Extraire type et status de manière sécurisée
        def _get_enum_value(enum_obj, default_value):
            """Extraire la valeur d'un Enum ou string"""
            if enum_obj is None:
                return default_value
            if hasattr(enum_obj, 'value'):
                return str(enum_obj.value)
            return str(enum_obj)
        
        task_type = _get_enum_value(task.type, "Interne")
        task_status = _get_enum_value(task.status, "À faire")
        
        data = {
            "id": task.id,
            "company_id": task.company_id,
            "title": task.title,
            "description": task.description,
            "assigned_to_id": task.assigned_to_id,
            "client_id": task.client_id,
            "project_id": task.project_id,
            "conversation_id": task.conversation_id,
            "type": task_type,
            "category": cls._get_category_from_type(task.type) if task.type is not None else "Interne",
            "status": task_status,
            "priority": task.priority,
            "due_date": task.due_date,
            "due_time": task.due_time,
            "recurrence": task.recurrence if hasattr(task, 'recurrence') and task.recurrence is not None else "none",
            "recurrence_days": task.get_recurrence_days() if hasattr(task, 'get_recurrence_days') else (task.recurrence_days if hasattr(task, 'recurrence_days') else None),
            "is_mandatory": task.is_mandatory,
            "origin": task.origin if hasattr(task, 'origin') else ("checklist" if task.is_checklist_item else "manual"),
            "is_checklist_item": task.is_checklist_item,
            "checklist_template_id": task.checklist_template_id,
            "checklist_instance_id": task.checklist_instance_id,
            "reminder_at": task.reminder_at,
            "completed_at": task.completed_at,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
        }
        
        # Relations (gérer les cas où les relations peuvent être None ou non chargées)
        try:
            if task.assigned_to:
                data["assigned_to_name"] = task.assigned_to.full_name or task.assigned_to.email
                # Générer avatar depuis initiales
                if task.assigned_to.full_name:
                    names = task.assigned_to.full_name.split()
                    if len(names) >= 2:
                        data["assigned_to_avatar"] = (names[0][0] + names[-1][0]).upper()
                    else:
                        data["assigned_to_avatar"] = names[0][0].upper() if names else "U"
                else:
                    data["assigned_to_avatar"] = task.assigned_to.email[0].upper() if task.assigned_to.email else "U"
        except (AttributeError, KeyError):
            pass
        
        try:
            if task.client:
                data["client_name"] = task.client.name
        except (AttributeError, KeyError):
            pass
        
        try:
            if task.project:
                data["project_name"] = task.project.name
        except (AttributeError, KeyError):
            pass
        
        try:
            if task.conversation:
                data["conversation_subject"] = task.conversation.subject
        except (AttributeError, KeyError):
            pass
        
        return cls(**data)
    
    @staticmethod
    def _get_category_from_type(task_type) -> str:
        """Convertir TaskType Enum vers category string"""
        if task_type is None:
            return "Interne"
        
        if hasattr(task_type, 'value'):
            type_value = task_type.value
        else:
            type_value = str(task_type)
        
        type_to_category = {
            "Interne": "Interne",
            "Client": "Client",
            "Fournisseur": "Fournisseur",
        }
        return type_to_category.get(type_value, "Interne")


# ==================== UTILITY SCHEMAS ====================

class EmployeeRead(BaseModel):
    """Schéma pour la liste des employés"""
    id: int
    full_name: Optional[str] = None
    email: str
    
    class Config:
        from_attributes = True


class TaskStats(BaseModel):
    """Statistiques des tâches (simplifié pour MVP V1)"""
    total: int
    completed: int
    late: int
