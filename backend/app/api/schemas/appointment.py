from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


# ==================== APPOINTMENT TYPE SCHEMAS ====================

class AppointmentTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int = Field(default=30, ge=1)
    buffer_before_minutes: Optional[int] = Field(default=0, ge=0)
    buffer_after_minutes: Optional[int] = Field(default=0, ge=0)
    employees_allowed_ids: Optional[List[int]] = Field(default=None, description="List of employee IDs allowed for this appointment type. Use null or empty list to allow all employees.")
    is_active: bool = True


class AppointmentTypeCreate(AppointmentTypeBase):
    pass


class AppointmentTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=1)
    buffer_before_minutes: Optional[int] = Field(default=None, ge=0)
    buffer_after_minutes: Optional[int] = Field(default=None, ge=0)
    employees_allowed_ids: Optional[List[int]] = Field(default=None, description="List of employee IDs allowed for this appointment type. Use null or empty list to allow all employees.")
    is_active: Optional[bool] = None


class AppointmentTypeRead(AppointmentTypeBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Convertit un objet ORM en schéma Pydantic avec conversion de employees_allowed_ids"""
        import json
        data = {
            "id": obj.id,
            "company_id": obj.company_id,
            "name": obj.name,
            "description": obj.description,
            "duration_minutes": obj.duration_minutes,
            "buffer_before_minutes": obj.buffer_before_minutes,
            "buffer_after_minutes": obj.buffer_after_minutes,
            "is_active": obj.is_active,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
        }
        
        # Convertir employees_allowed_ids de JSON string à list
        if obj.employees_allowed_ids:
            try:
                data["employees_allowed_ids"] = json.loads(obj.employees_allowed_ids)
            except (json.JSONDecodeError, TypeError):
                data["employees_allowed_ids"] = []
        else:
            data["employees_allowed_ids"] = None
        
        # Utiliser model_validate pour Pydantic V2
        return cls.model_validate(data)


# ==================== APPOINTMENT SCHEMAS ====================

class AppointmentBase(BaseModel):
    client_id: int
    type_id: int
    employee_id: Optional[int] = None
    conversation_id: Optional[int] = None
    start_date_time: datetime
    end_date_time: datetime
    status: str = "scheduled"
    notes_internal: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    client_id: Optional[int] = None
    type_id: Optional[int] = None
    employee_id: Optional[int] = None
    conversation_id: Optional[int] = None
    start_date_time: Optional[datetime] = None
    end_date_time: Optional[datetime] = None
    status: Optional[str] = None
    notes_internal: Optional[str] = None


class AppointmentRead(BaseModel):
    id: int
    company_id: int
    client_id: int
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    type_id: int
    type_name: Optional[str] = None
    employee_id: Optional[int] = None
    employee_name: Optional[str] = None
    conversation_id: Optional[int] = None
    start_date_time: datetime
    end_date_time: datetime
    status: str
    notes_internal: Optional[str] = None
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm_with_relations(cls, appointment):
        """Crée un AppointmentRead avec les relations chargées"""
        data = {
            "id": appointment.id,
            "company_id": appointment.company_id,
            "client_id": appointment.client_id,
            "client_name": appointment.client.name if appointment.client else None,
            "client_email": appointment.client.email if appointment.client else None,
            "client_phone": appointment.client.phone if appointment.client else None,
            "type_id": appointment.type_id,
            "type_name": appointment.type.name if appointment.type else None,
            "employee_id": appointment.employee_id,
            "employee_name": appointment.employee.full_name if appointment.employee else None,
            "conversation_id": appointment.conversation_id,
            "start_date_time": appointment.start_date_time,
            "end_date_time": appointment.end_date_time,
            "status": appointment.status.value if hasattr(appointment.status, 'value') else str(appointment.status),
            "notes_internal": appointment.notes_internal,
            "created_by_id": appointment.created_by_id,
            "created_at": appointment.created_at,
            "updated_at": appointment.updated_at,
        }
        return cls(**data)


# ==================== APPOINTMENT SETTINGS SCHEMAS ====================

class AppointmentReminderTemplate(BaseModel):
    id: int
    relance_number: int  # 1, 2, ou 3 (numéro de la relance)
    hours_before: int  # Nombre d'heures avant le rendez-vous
    content: str  # Template du message avec variables


class WorkBreak(BaseModel):
    """Schéma pour une pause de travail avec heure de début et de fin"""
    start_time: str = Field(..., description="Heure de début de la pause (format HH:MM, ex: '12:00')")
    end_time: str = Field(..., description="Heure de fin de la pause (format HH:MM, ex: '13:00')")
    
    class Config:
        from_attributes = True


class AppointmentSettings(BaseModel):
    auto_reminder_enabled: bool = True
    auto_reminder_offset_hours: int = Field(default=4, ge=1)
    include_reschedule_link_in_reminder: bool = True
    auto_no_show_message_enabled: bool = True
    reschedule_base_url: Optional[str] = None
    # Configuration des relances multiples
    max_reminder_relances: int = Field(default=1, ge=1, le=3)  # Nombre max de relances (1 à 3)
    reminder_relances: List[AppointmentReminderTemplate] = Field(default_factory=list)  # Templates pour chaque relance
    # Horaires de travail
    work_start_time: Optional[str] = Field(default="09:00", description="Heure de début du travail (format HH:MM)")
    work_end_time: Optional[str] = Field(default="18:00", description="Heure de fin du travail (format HH:MM)")
    breaks_enabled: bool = Field(default=False, description="Activer les pauses entre les rendez-vous")
    breaks: List[WorkBreak] = Field(default_factory=list, description="Liste des pauses avec heure de début et de fin")
    
    class Config:
        from_attributes = True


class AppointmentReminderTemplateUpdate(BaseModel):
    id: Optional[int] = None
    relance_number: int = Field(ge=1, le=3)  # 1, 2, ou 3
    hours_before: int = Field(ge=1)  # Nombre d'heures avant le rendez-vous
    content: str  # Template du message


class WorkBreakUpdate(BaseModel):
    """Schéma pour mettre à jour une pause de travail"""
    start_time: str = Field(..., description="Heure de début de la pause (format HH:MM)")
    end_time: str = Field(..., description="Heure de fin de la pause (format HH:MM)")


class AppointmentSettingsUpdate(BaseModel):
    """Schéma pour mettre à jour les paramètres de rendez-vous (tous les champs optionnels)"""
    auto_reminder_enabled: Optional[bool] = None
    auto_reminder_offset_hours: Optional[int] = Field(default=None, ge=1)
    include_reschedule_link_in_reminder: Optional[bool] = None
    auto_no_show_message_enabled: Optional[bool] = None
    work_start_time: Optional[str] = None
    work_end_time: Optional[str] = None
    breaks_enabled: Optional[bool] = None
    breaks: Optional[List[WorkBreakUpdate]] = None
    reschedule_base_url: Optional[str] = None
    max_reminder_relances: Optional[int] = Field(default=None, ge=1, le=3)
    reminder_relances: Optional[List[AppointmentReminderTemplateUpdate]] = None


# ==================== PUBLIC APPOINTMENT SCHEMAS ====================

class PublicAppointmentCreate(BaseModel):
    """Schéma pour créer un rendez-vous depuis la page publique"""
    type_id: int
    employee_id: Optional[int] = None
    start_date_time: datetime
    end_date_time: datetime
    client_name: str
    client_email: str
    client_phone: Optional[str] = None
    notes_internal: Optional[str] = None


