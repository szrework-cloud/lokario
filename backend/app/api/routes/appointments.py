from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import logging

from app.db.session import get_db
from app.db.models.appointment import Appointment, AppointmentType, AppointmentStatus
from app.db.models.user import User
from app.db.models.client import Client
from app.db.models.company import Company
from app.db.models.conversation import Conversation, InboxMessage
from app.db.models.inbox_integration import InboxIntegration
from app.core.smtp_service import send_email_smtp, get_smtp_config
from app.core.encryption_service import get_encryption_service
from app.api.schemas.appointment import (
    AppointmentTypeCreate,
    AppointmentTypeUpdate,
    AppointmentTypeRead,
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentRead,
    AppointmentSettings,
    AppointmentSettingsUpdate,
    PublicAppointmentCreate,
)
from app.api.deps import get_current_active_user
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _check_company_access(current_user: User):
    """Vérifier que l'utilisateur est attaché à une entreprise"""
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )


# ===== PUBLIC ENDPOINTS (sans authentification) - DOIT ÊTRE AVANT LES ROUTES AVEC PARAMÈTRES =====

@router.get("/public/types")
def get_public_appointment_types(
    slug: str = Query(..., description="Company slug (code)"),
    db: Session = Depends(get_db)
):
    """Récupère les types de rendez-vous actifs d'une entreprise (endpoint public)"""
    from app.db.models.company import Company
    
    # Trouver l'entreprise par son slug ou son code
    company = db.query(Company).filter(
        or_(Company.slug == slug, Company.code == slug),
        Company.is_active == True
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Récupérer uniquement les types actifs
    types = db.query(AppointmentType).filter(
        AppointmentType.company_id == company.id,
        AppointmentType.is_active == True
    ).order_by(AppointmentType.name).all()
    
    return types


@router.get("/public/employees")
def get_public_employees(
    slug: str = Query(..., description="Company slug (code)"),
    db: Session = Depends(get_db)
):
    """Récupère les employés d'une entreprise (endpoint public)"""
    from app.db.models.company import Company
    
    # Trouver l'entreprise par son slug ou son code
    company = db.query(Company).filter(
        or_(Company.slug == slug, Company.code == slug),
        Company.is_active == True
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Récupérer les utilisateurs actifs de l'entreprise
    employees = db.query(User).filter(
        User.company_id == company.id,
        User.is_active == True
    ).order_by(User.full_name).all()
    
    return [
        {
            "id": emp.id,
            "name": emp.full_name,
            "email": emp.email
        }
        for emp in employees
    ]


@router.get("/public/settings")
def get_public_appointment_settings(
    slug: str = Query(..., description="Company slug (code)"),
    db: Session = Depends(get_db)
):
    """Récupère les paramètres de rendez-vous d'une entreprise (endpoint public)"""
    from app.db.models.company import Company
    from app.db.models.company_settings import CompanySettings
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Trouver l'entreprise par son slug ou son code
    company = db.query(Company).filter(
        or_(Company.slug == slug, Company.code == slug),
        Company.is_active == True
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Valeurs par défaut
    default_settings = {
        "work_start_time": "09:00",
        "work_end_time": "18:00",
        "breaks_enabled": False,
        "breaks": [],
    }
    
    try:
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == company.id
        ).first()
        
        if not company_settings:
            return default_settings
        
        settings_dict = company_settings.settings
        appointment_settings = settings_dict.get("appointments", {})
        
        if not appointment_settings:
            return default_settings
        
        # Extraire uniquement les paramètres nécessaires pour le calcul des créneaux
        result = {
            "work_start_time": appointment_settings.get("work_start_time", "09:00"),
            "work_end_time": appointment_settings.get("work_end_time", "18:00"),
            "breaks_enabled": appointment_settings.get("breaks_enabled", False),
            "breaks": appointment_settings.get("breaks", []),
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error in get_public_appointment_settings: {e}", exc_info=True)
        return default_settings


@router.get("/public/appointments")
def get_public_appointments(
    slug: str = Query(..., description="Company slug (code)"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    db: Session = Depends(get_db)
):
    """Récupère les rendez-vous d'une entreprise pour calculer les créneaux disponibles (endpoint public)"""
    from app.db.models.company import Company
    
    # Trouver l'entreprise par son slug ou son code
    company = db.query(Company).filter(
        or_(Company.slug == slug, Company.code == slug),
        Company.is_active == True
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Récupérer les rendez-vous non annulés
    query = db.query(Appointment).options(
        joinedload(Appointment.client),
        joinedload(Appointment.type),
        joinedload(Appointment.employee)
    ).filter(
        Appointment.company_id == company.id,
        Appointment.status != AppointmentStatus.CANCELLED
    )
    
    # Filtrer par date si fourni
    if start_date:
        query = query.filter(Appointment.start_date_time >= start_date)
    
    if end_date:
        query = query.filter(Appointment.start_date_time <= end_date)
    
    appointments = query.order_by(Appointment.start_date_time.asc()).all()
    
    return [AppointmentRead.from_orm_with_relations(apt) for apt in appointments]


@router.post("/public/appointments", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
def create_public_appointment(
    appointment_data: PublicAppointmentCreate,
    slug: str = Query(..., description="Company slug (code)"),
    db: Session = Depends(get_db)
):
    """Crée un rendez-vous public (sans authentification)"""
    from app.db.models.company import Company
    
    # Trouver l'entreprise par son slug ou son code
    company = db.query(Company).filter(
        or_(Company.slug == slug, Company.code == slug),
        Company.is_active == True
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Vérifier que le type existe
    appointment_type = db.query(AppointmentType).filter(
        AppointmentType.id == appointment_data.type_id,
        AppointmentType.company_id == company.id,
        AppointmentType.is_active == True
    ).first()
    
    if not appointment_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment type not found"
        )
    
    # Vérifier que l'employé existe si fourni
    if appointment_data.employee_id:
        employee = db.query(User).filter(
            User.id == appointment_data.employee_id,
            User.company_id == company.id
        ).first()
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found or not in same company"
            )
    
    # Chercher le client par email
    client = db.query(Client).filter(
        Client.company_id == company.id,
        Client.email == appointment_data.client_email
    ).first()
    
    # Si le client n'existe pas, le créer
    if not client:
        client = Client(
            company_id=company.id,
            name=appointment_data.client_name,
            email=appointment_data.client_email,
            phone=appointment_data.client_phone
        )
        db.add(client)
        db.flush()  # Pour obtenir l'ID
    
    # Vérifier les conflits de créneaux
    # Récupérer le type de rendez-vous pour prendre en compte les buffers
    appointment_type = db.query(AppointmentType).filter(
        AppointmentType.id == appointment_data.type_id,
        AppointmentType.company_id == company.id
    ).first()
    
    if not appointment_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment type not found"
        )
    
    # Calculer les dates avec buffers
    buffer_before = timedelta(minutes=appointment_type.buffer_before_minutes or 0)
    buffer_after = timedelta(minutes=appointment_type.buffer_after_minutes or 0)
    effective_start = appointment_data.start_date_time - buffer_before
    effective_end = appointment_data.end_date_time + buffer_after
    
    conflicting = db.query(Appointment).filter(
        Appointment.company_id == company.id,
        Appointment.status != AppointmentStatus.CANCELLED,
        (
            (Appointment.start_date_time < effective_end) &
            (Appointment.end_date_time > effective_start)
        )
    )
    
    if appointment_data.employee_id:
        conflicting = conflicting.filter(Appointment.employee_id == appointment_data.employee_id)
    
    if conflicting.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot conflict: another appointment exists at this time"
        )
    
    # Créer le rendez-vous
    appointment = Appointment(
        company_id=company.id,
        client_id=client.id,
        type_id=appointment_data.type_id,
        employee_id=appointment_data.employee_id,
        start_date_time=appointment_data.start_date_time,
        end_date_time=appointment_data.end_date_time,
        status=AppointmentStatus.SCHEDULED,
        notes_internal=appointment_data.notes_internal
    )
    
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    # Recharger avec les relations
    appointment = db.query(Appointment).options(
        joinedload(Appointment.client),
        joinedload(Appointment.type),
        joinedload(Appointment.employee)
    ).filter(Appointment.id == appointment.id).first()
    
    # Envoyer l'email de confirmation (sans current_user, on utilise le nom de l'entreprise)
    if client and company:
        try:
            # Créer un user temporaire pour la fonction (ou adapter la fonction)
            from app.db.models.user import User
            system_user = User(
                id=0,  # ID fictif
                company_id=company.id,
                full_name=company.name or "Équipe",
                email=company.email if hasattr(company, 'email') else None
            )
            _send_appointment_confirmation_via_inbox(db, appointment, client, company, system_user)
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de la confirmation pour le rendez-vous public {appointment.id}: {e}", exc_info=True)
            # Ne pas faire échouer la création du rendez-vous si l'envoi échoue
    
    # Créer une relance automatique pour le rendez-vous (user_id=None pour les rendez-vous publics)
    try:
        create_automatic_followup_for_appointment(db, appointment, None)
    except Exception as e:
        logger.error(f"Erreur lors de la création de la relance automatique pour le rendez-vous public {appointment.id}: {e}", exc_info=True)
        # Ne pas faire échouer la création du rendez-vous si la relance échoue
    
    return AppointmentRead.from_orm_with_relations(appointment)


# ===== APPOINTMENT TYPES =====

@router.get("/types", response_model=List[AppointmentTypeRead])
def get_appointment_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    active_only: Optional[bool] = Query(None, description="Filter by active status")
):
    """Récupère tous les types de rendez-vous de l'entreprise"""
    _check_company_access(current_user)
    
    query = db.query(AppointmentType).filter(
        AppointmentType.company_id == current_user.company_id
    )
    
    if active_only is not None:
        query = query.filter(AppointmentType.is_active == active_only)
    
    types = query.order_by(AppointmentType.name).all()
    return [AppointmentTypeRead.from_orm(t) for t in types]


@router.get("/types/{type_id}", response_model=AppointmentTypeRead)
def get_appointment_type(
    type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère un type de rendez-vous"""
    _check_company_access(current_user)
    
    appointment_type = db.query(AppointmentType).filter(
        AppointmentType.id == type_id,
        AppointmentType.company_id == current_user.company_id
    ).first()
    
    if not appointment_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment type not found"
        )
    
    return AppointmentTypeRead.from_orm(appointment_type)


@router.post("/types", response_model=AppointmentTypeRead, status_code=status.HTTP_201_CREATED)
def create_appointment_type(
    type_data: AppointmentTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée un nouveau type de rendez-vous"""
    _check_company_access(current_user)
    
    # Vérifier si le module appointments est disponible pour ce plan
    from app.core.subscription_limits import is_feature_enabled
    if not is_feature_enabled(db, current_user.company_id, "appointments"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le module rendez-vous n'est pas disponible pour le plan Essentiel. Passez au plan Pro pour accéder à cette fonctionnalité."
        )
    
    # Vérifier que l'utilisateur est owner
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can create appointment types"
        )
    
    appointment_type = AppointmentType(
        company_id=current_user.company_id,
        name=type_data.name,
        description=type_data.description,
        duration_minutes=type_data.duration_minutes,
        buffer_before_minutes=type_data.buffer_before_minutes,
        buffer_after_minutes=type_data.buffer_after_minutes,
        is_active=type_data.is_active
    )
    
    # Définir les employés autorisés (peut être None, liste vide, ou liste avec IDs)
    if type_data.employees_allowed_ids is not None:
        appointment_type.set_employees_allowed_ids(type_data.employees_allowed_ids)
    else:
        appointment_type.employees_allowed_ids = None
    
    db.add(appointment_type)
    db.commit()
    db.refresh(appointment_type)
    
    return AppointmentTypeRead.from_orm(appointment_type)


@router.patch("/types/{type_id}", response_model=AppointmentTypeRead)
def update_appointment_type(
    type_id: int,
    type_data: AppointmentTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour un type de rendez-vous"""
    _check_company_access(current_user)
    
    # Vérifier si le module appointments est disponible pour ce plan
    from app.core.subscription_limits import is_feature_enabled
    if not is_feature_enabled(db, current_user.company_id, "appointments"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le module rendez-vous n'est pas disponible pour le plan Essentiel. Passez au plan Pro pour accéder à cette fonctionnalité."
        )
    
    # Vérifier que l'utilisateur est owner
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can update appointment types"
        )
    
    appointment_type = db.query(AppointmentType).filter(
        AppointmentType.id == type_id,
        AppointmentType.company_id == current_user.company_id
    ).first()
    
    if not appointment_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment type not found"
        )
    
    # Mettre à jour les champs fournis
    update_data = type_data.model_dump(exclude_unset=True)
    
    # Gérer employees_allowed_ids séparément
    if "employees_allowed_ids" in update_data:
        employees_ids = update_data.pop("employees_allowed_ids")
        if employees_ids is not None:
            appointment_type.set_employees_allowed_ids(employees_ids)
        else:
            appointment_type.employees_allowed_ids = None
    
    for field, value in update_data.items():
        setattr(appointment_type, field, value)
    
    db.commit()
    db.refresh(appointment_type)
    
    return AppointmentTypeRead.from_orm(appointment_type)


@router.delete("/types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment_type(
    type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime un type de rendez-vous"""
    _check_company_access(current_user)
    
    # Vérifier si le module appointments est disponible pour ce plan
    from app.core.subscription_limits import is_feature_enabled
    if not is_feature_enabled(db, current_user.company_id, "appointments"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le module rendez-vous n'est pas disponible pour le plan Essentiel. Passez au plan Pro pour accéder à cette fonctionnalité."
        )
    
    # Vérifier que l'utilisateur est owner
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can delete appointment types"
        )
    
    appointment_type = db.query(AppointmentType).filter(
        AppointmentType.id == type_id,
        AppointmentType.company_id == current_user.company_id
    ).first()
    
    if not appointment_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment type not found"
        )
    
    # Vérifier qu'il n'y a pas de rendez-vous associés
    appointments_count = db.query(Appointment).filter(
        Appointment.type_id == type_id
    ).count()
    
    if appointments_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete appointment type with {appointments_count} associated appointment(s)"
        )
    
    db.delete(appointment_type)
    db.commit()
    
    return None


# ===== APPOINTMENTS =====

@router.get("", response_model=List[AppointmentRead])
def get_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    client_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    employee_id: Optional[int] = Query(None)
):
    """Récupère tous les rendez-vous de l'entreprise avec filtres"""
    _check_company_access(current_user)
    
    # Vérifier si le module appointments est disponible pour ce plan
    from app.core.subscription_limits import is_feature_enabled
    if not is_feature_enabled(db, current_user.company_id, "appointments"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le module rendez-vous n'est pas disponible pour le plan Essentiel. Passez au plan Pro pour accéder à cette fonctionnalité."
        )
    
    query = db.query(Appointment).options(
        joinedload(Appointment.client),
        joinedload(Appointment.type),
        joinedload(Appointment.employee),
        joinedload(Appointment.conversation)
    ).filter(
        Appointment.company_id == current_user.company_id
    )
    
    # Filtres
    if client_id:
        query = query.filter(Appointment.client_id == client_id)
    
    if status:
        try:
            status_enum = AppointmentStatus(status)
            query = query.filter(Appointment.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}"
            )
    
    if start_date:
        query = query.filter(Appointment.start_date_time >= start_date)
    
    if end_date:
        query = query.filter(Appointment.start_date_time <= end_date)
    
    if employee_id:
        query = query.filter(Appointment.employee_id == employee_id)
    
    appointments = query.order_by(Appointment.start_date_time.asc()).all()
    
    return [AppointmentRead.from_orm_with_relations(apt) for apt in appointments]


# ===== APPOINTMENT SETTINGS (doit être avant les routes avec paramètres) =====

@router.get("/settings")
def get_appointment_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère les paramètres de rendez-vous de l'entreprise"""
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Valeurs par défaut
    default_settings = {
        "auto_reminder_enabled": True,
        "auto_reminder_offset_hours": 4,
        "include_reschedule_link_in_reminder": True,
        "auto_no_show_message_enabled": True,
        "reschedule_base_url": None,
        "max_reminder_relances": 1,
        "reminder_relances": [],
        "work_start_time": "09:00",
        "work_end_time": "18:00",
        "breaks_enabled": False,
        "breaks": [],
    }
    
    try:
        _check_company_access(current_user)
    except Exception as e:
        logger.error(f"Company access check failed: {e}")
        raise
    
    try:
        from app.db.models.company_settings import CompanySettings
        
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        if not company_settings:
            return default_settings
        
        settings_dict = company_settings.settings
        appointment_settings = settings_dict.get("appointments", {})
        
        if not appointment_settings:
            return default_settings
        
        # Nettoyer et convertir les valeurs pour éviter les erreurs de type
        cleaned_settings = default_settings.copy()
        
        # Convertir auto_reminder_enabled
        if "auto_reminder_enabled" in appointment_settings:
            val = appointment_settings["auto_reminder_enabled"]
            if isinstance(val, bool):
                cleaned_settings["auto_reminder_enabled"] = val
            elif isinstance(val, str):
                cleaned_settings["auto_reminder_enabled"] = val.lower() in ("true", "1", "yes")
            elif isinstance(val, (int, float)):
                cleaned_settings["auto_reminder_enabled"] = bool(val)
        
        # Convertir auto_reminder_offset_hours (s'assurer que c'est un int)
        if "auto_reminder_offset_hours" in appointment_settings:
            val = appointment_settings["auto_reminder_offset_hours"]
            try:
                if isinstance(val, int):
                    cleaned_settings["auto_reminder_offset_hours"] = max(1, val)
                elif isinstance(val, str):
                    cleaned_settings["auto_reminder_offset_hours"] = max(1, int(float(val)))
                elif isinstance(val, float):
                    cleaned_settings["auto_reminder_offset_hours"] = max(1, int(val))
            except (ValueError, TypeError):
                pass  # Garder la valeur par défaut
        
        # Convertir include_reschedule_link_in_reminder
        if "include_reschedule_link_in_reminder" in appointment_settings:
            val = appointment_settings["include_reschedule_link_in_reminder"]
            if isinstance(val, bool):
                cleaned_settings["include_reschedule_link_in_reminder"] = val
            elif isinstance(val, str):
                cleaned_settings["include_reschedule_link_in_reminder"] = val.lower() in ("true", "1", "yes")
            elif isinstance(val, (int, float)):
                cleaned_settings["include_reschedule_link_in_reminder"] = bool(val)
        
        # Convertir auto_no_show_message_enabled
        if "auto_no_show_message_enabled" in appointment_settings:
            val = appointment_settings["auto_no_show_message_enabled"]
            if isinstance(val, bool):
                cleaned_settings["auto_no_show_message_enabled"] = val
            elif isinstance(val, str):
                cleaned_settings["auto_no_show_message_enabled"] = val.lower() in ("true", "1", "yes")
            elif isinstance(val, (int, float)):
                cleaned_settings["auto_no_show_message_enabled"] = bool(val)
        
        # reschedule_base_url (string, peut être None)
        if "reschedule_base_url" in appointment_settings:
            val = appointment_settings["reschedule_base_url"]
            if val is not None and val != "":
                cleaned_settings["reschedule_base_url"] = str(val)
            else:
                cleaned_settings["reschedule_base_url"] = None
        
        # Convertir max_reminder_relances
        if "max_reminder_relances" in appointment_settings:
            val = appointment_settings["max_reminder_relances"]
            try:
                if isinstance(val, int):
                    cleaned_settings["max_reminder_relances"] = max(1, min(3, val))
                elif isinstance(val, str):
                    cleaned_settings["max_reminder_relances"] = max(1, min(3, int(float(val))))
                elif isinstance(val, float):
                    cleaned_settings["max_reminder_relances"] = max(1, min(3, int(val)))
            except (ValueError, TypeError):
                pass
        
        # Convertir reminder_relances (liste de templates)
        if "reminder_relances" in appointment_settings:
            val = appointment_settings["reminder_relances"]
            if isinstance(val, list):
                cleaned_settings["reminder_relances"] = val
            else:
                cleaned_settings["reminder_relances"] = []
        
        # Convertir les horaires de travail
        if "work_start_time" in appointment_settings:
            val = appointment_settings["work_start_time"]
            if val and isinstance(val, str) and len(val.strip()) > 0:
                cleaned_settings["work_start_time"] = val.strip()
        
        if "work_end_time" in appointment_settings:
            val = appointment_settings["work_end_time"]
            if val and isinstance(val, str) and len(val.strip()) > 0:
                cleaned_settings["work_end_time"] = val.strip()
        
        # Convertir breaks_enabled
        if "breaks_enabled" in appointment_settings:
            val = appointment_settings["breaks_enabled"]
            if isinstance(val, bool):
                cleaned_settings["breaks_enabled"] = val
            elif isinstance(val, str):
                cleaned_settings["breaks_enabled"] = val.lower() in ("true", "1", "yes")
            elif isinstance(val, (int, float)):
                cleaned_settings["breaks_enabled"] = bool(val)
        
        # Convertir breaks (liste de pauses avec start_time et end_time)
        if "breaks" in appointment_settings:
            val = appointment_settings["breaks"]
            if isinstance(val, list):
                # Valider et nettoyer chaque pause
                cleaned_breaks = []
                for break_item in val:
                    if isinstance(break_item, dict) and "start_time" in break_item and "end_time" in break_item:
                        cleaned_breaks.append({
                            "start_time": str(break_item["start_time"]),
                            "end_time": str(break_item["end_time"]),
                        })
                cleaned_settings["breaks"] = cleaned_breaks
            else:
                cleaned_settings["breaks"] = []
        # Migration depuis l'ancien format (break_count + break_duration) - non supporté, réinitialiser
        elif "break_count" in appointment_settings or "break_duration" in appointment_settings:
            cleaned_settings["breaks"] = []
        
        # S'assurer que tous les types sont corrects avant de retourner
        cleaned_settings["auto_reminder_offset_hours"] = int(cleaned_settings["auto_reminder_offset_hours"])
        cleaned_settings["auto_reminder_enabled"] = bool(cleaned_settings["auto_reminder_enabled"])
        cleaned_settings["include_reschedule_link_in_reminder"] = bool(cleaned_settings["include_reschedule_link_in_reminder"])
        cleaned_settings["auto_no_show_message_enabled"] = bool(cleaned_settings["auto_no_show_message_enabled"])
        cleaned_settings["max_reminder_relances"] = int(cleaned_settings.get("max_reminder_relances", 1))
        cleaned_settings["breaks_enabled"] = bool(cleaned_settings.get("breaks_enabled", False))
        if "breaks" not in cleaned_settings:
            cleaned_settings["breaks"] = []
        if "reminder_relances" not in cleaned_settings:
            cleaned_settings["reminder_relances"] = []
        if "work_start_time" not in cleaned_settings:
            cleaned_settings["work_start_time"] = "09:00"
        if "work_end_time" not in cleaned_settings:
            cleaned_settings["work_end_time"] = "18:00"
        
        return cleaned_settings
        
    except Exception as e:
        logger.error(f"Error in get_appointment_settings: {e}", exc_info=True)
        # En cas d'erreur, retourner les valeurs par défaut
        return default_settings


@router.patch("/settings")
def update_appointment_settings(
    settings_data: AppointmentSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour les paramètres de rendez-vous"""
    _check_company_access(current_user)
    
    # Vérifier que l'utilisateur est owner
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can update appointment settings"
        )
    
    from app.db.models.company_settings import CompanySettings
    
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    
    if not company_settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company settings not found"
        )
    
    # Mettre à jour les settings
    from fastapi.responses import JSONResponse
    from sqlalchemy.orm.attributes import flag_modified
    
    settings_dict = company_settings.settings
    if "appointments" not in settings_dict:
        settings_dict["appointments"] = {}
    
    # Mettre à jour uniquement les champs fournis (exclude_unset=True)
    update_data = settings_data.model_dump(exclude_unset=True)
    settings_dict["appointments"].update(update_data)
    
    company_settings.settings = settings_dict
    flag_modified(company_settings, "settings")  # Important pour les champs JSON
    
    db.commit()
    db.refresh(company_settings)
    
    # Retourner directement un dictionnaire pour éviter la validation Pydantic
    return JSONResponse(content=settings_dict.get("appointments", {}))


@router.get("/{appointment_id}", response_model=AppointmentRead)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère un rendez-vous"""
    _check_company_access(current_user)
    
    appointment = db.query(Appointment).options(
        joinedload(Appointment.client),
        joinedload(Appointment.type),
        joinedload(Appointment.employee),
        joinedload(Appointment.conversation)
    ).filter(
        Appointment.id == appointment_id,
        Appointment.company_id == current_user.company_id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    return AppointmentRead.from_orm_with_relations(appointment)


def _send_appointment_confirmation_via_inbox(
    db: Session,
    appointment: Appointment,
    client: Client,
    company: Company,
    current_user: User
) -> None:
    """
    Envoie un email de confirmation de rendez-vous via l'inbox (email).
    Cherche une conversation existante avec le client, sinon en crée une nouvelle.
    """
    logger.info(f"[APPOINTMENT CONFIRM] 🚀 Début de l'envoi de la confirmation pour le rendez-vous {appointment.id} pour le client {client.name} (ID: {client.id})")
    
    # Vérifier que le client a un email
    if not client.email:
        logger.warning(f"[APPOINTMENT CONFIRM] ❌ Impossible d'envoyer la confirmation: le client {client.name} n'a pas d'email")
        return
    
    logger.info(f"[APPOINTMENT CONFIRM] ✅ Client a un email: {client.email}")
    
    # Chercher une conversation existante avec ce client
    logger.info(f"[APPOINTMENT CONFIRM] 🔍 Recherche d'une conversation existante avec le client {client.id}...")
    existing_conversation = db.query(Conversation).filter(
        Conversation.company_id == company.id,
        Conversation.client_id == client.id,
        Conversation.source == "email"
    ).order_by(Conversation.last_message_at.desc()).first()
    
    # Si pas de conversation existante, en créer une nouvelle
    if not existing_conversation:
        logger.info(f"[APPOINTMENT CONFIRM] 📝 Aucune conversation existante, création d'une nouvelle conversation...")
        conversation = Conversation(
            company_id=company.id,
            client_id=client.id,
            subject=f"Confirmation de rendez-vous - {appointment.type.name if appointment.type else 'Rendez-vous'}",
            status="À répondre",
            source="email",
            unread_count=0,
            last_message_at=datetime.now(timezone.utc),
        )
        db.add(conversation)
        db.flush()
    else:
        conversation = existing_conversation
        # Mettre à jour le sujet si nécessaire
        if not conversation.subject or "Rendez-vous" not in conversation.subject:
            conversation.subject = f"Confirmation de rendez-vous - {appointment.type.name if appointment.type else 'Rendez-vous'}"
    
    # Formater la date et l'heure
    start_str = appointment.start_date_time.strftime('%d/%m/%Y à %H:%M')
    end_str = appointment.end_date_time.strftime('%H:%M')
    employee_name = appointment.employee.full_name if appointment.employee else "Non assigné"
    
    # Construire le message de confirmation
    message_content = f"""Bonjour {client.name},

Votre rendez-vous a été confirmé avec succès.

📅 Date et heure : {start_str} - {end_str}
👤 Type : {appointment.type.name if appointment.type else 'Rendez-vous'}
👨‍💼 Employé : {employee_name}
"""
    
    # Ajouter le lien de reprogrammation si configuré
    from app.db.models.company_settings import CompanySettings
    company_settings_obj = db.query(CompanySettings).filter(
        CompanySettings.company_id == company.id
    ).first()
    
    if company_settings_obj and company_settings_obj.settings:
        appointment_settings = company_settings_obj.settings.get("appointments", {})
        reschedule_base_url = appointment_settings.get("reschedule_base_url")
        include_reschedule_link = appointment_settings.get("include_reschedule_link_in_reminder", True)
        
        if include_reschedule_link and reschedule_base_url:
            # Générer un token pour la reprogrammation si nécessaire
            # Pour l'instant, on utilise juste l'URL de base
            message_content += f"\nPour reprogrammer votre rendez-vous, visitez : {reschedule_base_url}\n"
    
    if appointment.notes_internal:
        message_content += f"\nNotes : {appointment.notes_internal}\n"
    
    message_content += "\nCordialement,\nL'équipe"
    
    # Créer le message dans la conversation
    message = InboxMessage(
        conversation_id=conversation.id,
        from_name=current_user.full_name or company.name or "Équipe",
        from_email=None,  # Sera rempli par l'intégration SMTP
        from_phone=None,
        content=message_content,
        source="email",
        is_from_client=False,
        read=True,
    )
    db.add(message)
    
    # Mettre à jour la conversation
    conversation.last_message_at = datetime.now(timezone.utc)
    
    # Lier le rendez-vous à la conversation si ce n'est pas déjà fait
    if not appointment.conversation_id:
        appointment.conversation_id = conversation.id
    
    db.commit()
    db.refresh(conversation)
    db.refresh(message)
    
    # Récupérer l'intégration inbox principale pour envoyer l'email
    logger.info(f"[APPOINTMENT CONFIRM] 🔍 Recherche de l'intégration inbox principale...")
    primary_integration = db.query(InboxIntegration).filter(
        InboxIntegration.company_id == company.id,
        InboxIntegration.is_primary == True,
        InboxIntegration.is_active == True,
        InboxIntegration.integration_type == "imap"
    ).first()
    
    if not primary_integration:
        logger.warning(f"[APPOINTMENT CONFIRM] ❌ Aucune intégration inbox principale trouvée")
        return
    
    if not primary_integration.email_address:
        logger.warning(f"[APPOINTMENT CONFIRM] ❌ L'intégration inbox n'a pas d'adresse email configurée")
        return
    
    if not primary_integration.email_password:
        logger.warning(f"[APPOINTMENT CONFIRM] ❌ L'intégration inbox n'a pas de mot de passe configuré")
        return
    
    logger.info(f"[APPOINTMENT CONFIRM] ✅ Intégration inbox trouvée: {primary_integration.email_address}")
    
    # Envoyer l'email via SMTP
    try:
        smtp_config = get_smtp_config(primary_integration.email_address)
        
        # Décrypter le mot de passe
        encryption_service = get_encryption_service()
        email_password = encryption_service.decrypt(primary_integration.email_password) if primary_integration.email_password else None
        
        if not email_password:
            logger.error(f"[APPOINTMENT CONFIRM] ❌ Impossible de décrypter le mot de passe email")
            return
        
        subject = f"Confirmation de rendez-vous - {appointment.type.name if appointment.type else 'Rendez-vous'}"
        
        logger.info(f"[APPOINTMENT CONFIRM] 📧 Envoi de l'email de confirmation de {primary_integration.email_address} à {client.email}")
        send_email_smtp(
            to_email=client.email,
            subject=subject,
            body=message_content,
            smtp_config=smtp_config,
            from_email=primary_integration.email_address,
            from_password=email_password,
            from_name=company.name or "Équipe"
        )
        logger.info(f"[APPOINTMENT CONFIRM] ✅ Email de confirmation envoyé avec succès à {client.email}")
    except Exception as e:
        logger.error(f"[APPOINTMENT CONFIRM] ❌ Erreur lors de l'envoi de l'email: {e}", exc_info=True)


def create_automatic_followup_for_appointment(db: Session, appointment: Appointment, user_id: Optional[int]):
    """
    Crée automatiquement une relance pour un rendez-vous.
    Vérifie d'abord si les relances automatiques sont activées dans les settings.
    Utilise FollowUpType.RAPPEL_RDV et ne sera pas affichée dans la liste des relances.
    """
    try:
        # Vérifier si les relances automatiques sont activées
        from app.db.models.company_settings import CompanySettings
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == appointment.company_id
        ).first()
        
        # Vérifier si les relances automatiques pour les rendez-vous sont activées
        should_create = True
        if company_settings and company_settings.settings:
            appointment_settings = company_settings.settings.get("appointments", {})
            auto_reminder_enabled = appointment_settings.get("auto_reminder_enabled", True)
            if not auto_reminder_enabled:
                should_create = False
                logger.info(f"[FOLLOWUP AUTO APPOINTMENT] Relances automatiques désactivées pour les rendez-vous")
        
        if not should_create:
            return
        
        # Vérifier si une relance existe déjà pour ce rendez-vous
        from app.db.models.followup import FollowUp, FollowUpType, FollowUpStatus
        existing_followup = db.query(FollowUp).filter(
            FollowUp.source_type == "appointment",
            FollowUp.source_id == appointment.id,
            FollowUp.type == FollowUpType.RAPPEL_RDV
        ).first()
        
        if existing_followup:
            logger.info(f"[FOLLOWUP AUTO APPOINTMENT] Relance déjà existante pour le rendez-vous {appointment.id}")
            return
        
        # Récupérer les paramètres de relance depuis les settings
        reminder_relances = []
        if company_settings and company_settings.settings:
            appointment_settings = company_settings.settings.get("appointments", {})
            reminder_relances = appointment_settings.get("reminder_relances", [])
        
        # Si pas de relances configurées, utiliser les valeurs par défaut
        if not reminder_relances:
            # Par défaut : 1 relance 24h avant
            reminder_relances = [{"relance_number": 1, "hours_before": 24, "content": "Rappel : Vous avez un rendez-vous le {date} à {time}."}]
        
        # Calculer la date due pour la première relance (heures avant le rendez-vous)
        first_reminder = reminder_relances[0] if reminder_relances else {"hours_before": 24}
        hours_before = first_reminder.get("hours_before", 24)
        due_date = appointment.start_date_time - timedelta(hours=hours_before)
        
        # Si la date est dans le passé, ne pas créer la relance
        if due_date < datetime.now(timezone.utc):
            logger.info(f"[FOLLOWUP AUTO APPOINTMENT] La date de relance est dans le passé, pas de relance créée")
            return
        
        # Créer la relance automatique
        followup = FollowUp(
            company_id=appointment.company_id,
            client_id=appointment.client_id,
            type=FollowUpType.RAPPEL_RDV,
            source_type="appointment",
            source_id=appointment.id,
            source_label=f"Rendez-vous {appointment.type.name if appointment.type else 'Rendez-vous'} - {appointment.start_date_time.strftime('%d/%m/%Y %H:%M')}",
            due_date=due_date,
            actual_date=due_date,
            status=FollowUpStatus.A_FAIRE,
            amount=None,  # Pas de montant pour les rendez-vous
            auto_enabled=True,
            auto_frequency_days=None,  # Sera géré par les heures avant le rendez-vous
            auto_stop_on_response=True,
            auto_stop_on_paid=False,  # Pas applicable pour les rendez-vous
            auto_stop_on_refused=False,  # Pas applicable pour les rendez-vous
            created_by_id=user_id
        )
        
        db.add(followup)
        db.commit()
        logger.info(f"[FOLLOWUP AUTO APPOINTMENT] ✅ Relance automatique créée pour le rendez-vous {appointment.id} - Due: {due_date.strftime('%Y-%m-%d %H:%M')}")
        
    except Exception as e:
        logger.error(f"[FOLLOWUP AUTO APPOINTMENT] ❌ Erreur lors de la création de la relance automatique pour le rendez-vous {appointment.id}: {e}", exc_info=True)
        # Ne pas faire échouer la création du rendez-vous si la relance échoue


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée un nouveau rendez-vous"""
    _check_company_access(current_user)
    
    # Vérifier si le module appointments est disponible pour ce plan
    from app.core.subscription_limits import is_feature_enabled
    if not is_feature_enabled(db, current_user.company_id, "appointments"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le module rendez-vous n'est pas disponible pour le plan Essentiel. Passez au plan Pro pour accéder à cette fonctionnalité."
        )
    
    # Vérifier que l'utilisateur est owner
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can create appointments"
        )
    
    # Vérifier que le client existe et appartient à la même entreprise
    client = db.query(Client).filter(
        Client.id == appointment_data.client_id,
        Client.company_id == current_user.company_id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found or not in same company"
        )
    
    # Vérifier que le type existe
    appointment_type = db.query(AppointmentType).filter(
        AppointmentType.id == appointment_data.type_id,
        AppointmentType.company_id == current_user.company_id
    ).first()
    
    if not appointment_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment type not found"
        )
    
    # Vérifier que l'employé existe si fourni
    if appointment_data.employee_id:
        employee = db.query(User).filter(
            User.id == appointment_data.employee_id,
            User.company_id == current_user.company_id
        ).first()
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found or not in same company"
            )
    
    # Vérifier les conflits de créneaux
    # Récupérer le type de rendez-vous pour prendre en compte les buffers
    appointment_type = db.query(AppointmentType).filter(
        AppointmentType.id == appointment_data.type_id,
        AppointmentType.company_id == current_user.company_id
    ).first()
    
    if not appointment_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment type not found"
        )
    
    # Calculer les dates avec buffers
    buffer_before = timedelta(minutes=appointment_type.buffer_before_minutes or 0)
    buffer_after = timedelta(minutes=appointment_type.buffer_after_minutes or 0)
    effective_start = appointment_data.start_date_time - buffer_before
    effective_end = appointment_data.end_date_time + buffer_after
    
    conflicting = db.query(Appointment).filter(
        Appointment.company_id == current_user.company_id,
        Appointment.status != AppointmentStatus.CANCELLED,
        (
            (Appointment.start_date_time < effective_end) &
            (Appointment.end_date_time > effective_start)
        )
    )
    
    if appointment_data.employee_id:
        conflicting = conflicting.filter(Appointment.employee_id == appointment_data.employee_id)
    
    if conflicting.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot conflict: another appointment exists at this time"
        )
    
    # Créer le rendez-vous
    appointment = Appointment(
        company_id=current_user.company_id,
        client_id=appointment_data.client_id,
        type_id=appointment_data.type_id,
        employee_id=appointment_data.employee_id,
        conversation_id=appointment_data.conversation_id,
        start_date_time=appointment_data.start_date_time,
        end_date_time=appointment_data.end_date_time,
        status=AppointmentStatus(appointment_data.status),
        notes_internal=appointment_data.notes_internal,
        created_by_id=current_user.id
    )
    
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    # Recharger avec les relations pour avoir accès au client et au type
    appointment = db.query(Appointment).options(
        joinedload(Appointment.client),
        joinedload(Appointment.type),
        joinedload(Appointment.employee),
        joinedload(Appointment.conversation)
    ).filter(Appointment.id == appointment.id).first()
    
    # Récupérer l'entreprise pour l'envoi de confirmation
    from app.db.models.company import Company
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    
    # Envoyer l'email de confirmation
    if client and company:
        try:
            _send_appointment_confirmation_via_inbox(db, appointment, client, company, current_user)
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de la confirmation pour le rendez-vous {appointment.id}: {e}", exc_info=True)
            # Ne pas faire échouer la création du rendez-vous si l'envoi échoue
    
    # Créer une relance automatique pour le rendez-vous
    try:
        create_automatic_followup_for_appointment(db, appointment, current_user.id)
    except Exception as e:
        logger.error(f"Erreur lors de la création de la relance automatique pour le rendez-vous {appointment.id}: {e}", exc_info=True)
        # Ne pas faire échouer la création du rendez-vous si la relance échoue
    
    # Créer une notification pour le nouveau rendez-vous
    try:
        from app.core.notifications import create_notification
        from app.db.models.notification import NotificationType
        from app.core.config import settings
        
        frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
        client_name = client.name if client else "Client"
        employee_name = appointment.employee.full_name if appointment.employee else "Non assigné"
        
        create_notification(
            db=db,
            company_id=current_user.company_id,
            notification_type=NotificationType.APPOINTMENT_CREATED,
            title="Nouveau rendez-vous créé",
            message=f"Rendez-vous avec {client_name} le {appointment.start_date_time.strftime('%d/%m/%Y à %H:%M')} ({employee_name})",
            link_url=f"{frontend_url}/app/appointments",
            link_text="Voir les rendez-vous",
            source_type="appointment",
            source_id=appointment.id,
            user_id=appointment.employee_id,  # Notifier l'employé assigné si disponible
        )
        logger.info(f"✅ Notification créée pour le nouveau rendez-vous {appointment.id}")
    except Exception as e:
        logger.warning(f"Erreur lors de la création de la notification pour le rendez-vous {appointment.id}: {e}")
    
    return AppointmentRead.from_orm_with_relations(appointment)


@router.patch("/{appointment_id}", response_model=AppointmentRead)
def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour un rendez-vous"""
    _check_company_access(current_user)
    
    # Vérifier si le module appointments est disponible pour ce plan
    from app.core.subscription_limits import is_feature_enabled
    if not is_feature_enabled(db, current_user.company_id, "appointments"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le module rendez-vous n'est pas disponible pour le plan Essentiel. Passez au plan Pro pour accéder à cette fonctionnalité."
        )
    
    # Vérifier que l'utilisateur est owner
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can update appointments"
        )
    
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.company_id == current_user.company_id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Vérifier les conflits si les dates changent
    update_data = appointment_data.model_dump(exclude_unset=True)
    new_start = update_data.get("start_date_time", appointment.start_date_time)
    new_end = update_data.get("end_date_time", appointment.end_date_time)
    new_employee_id = update_data.get("employee_id", appointment.employee_id)
    new_type_id = update_data.get("type_id", appointment.type_id)
    
    if new_start != appointment.start_date_time or new_end != appointment.end_date_time or new_employee_id != appointment.employee_id or new_type_id != appointment.type_id:
        # Récupérer le type de rendez-vous pour prendre en compte les buffers
        type_to_check = db.query(AppointmentType).filter(
            AppointmentType.id == new_type_id,
            AppointmentType.company_id == current_user.company_id
        ).first()
        
        if type_to_check:
            # Calculer les dates avec buffers
            buffer_before = timedelta(minutes=type_to_check.buffer_before_minutes or 0)
            buffer_after = timedelta(minutes=type_to_check.buffer_after_minutes or 0)
            effective_start = new_start - buffer_before
            effective_end = new_end + buffer_after
        else:
            effective_start = new_start
            effective_end = new_end
        
        conflicting = db.query(Appointment).filter(
            Appointment.company_id == current_user.company_id,
            Appointment.id != appointment_id,
            Appointment.status != AppointmentStatus.CANCELLED,
            (
                (Appointment.start_date_time < effective_end) &
                (Appointment.end_date_time > effective_start)
            )
        )
        
        if new_employee_id:
            conflicting = conflicting.filter(Appointment.employee_id == new_employee_id)
        
        if conflicting.first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time slot conflict: another appointment exists at this time"
            )
    
    # Sauvegarder l'ancien statut et les anciennes dates pour les notifications
    old_status = appointment.status
    old_start = appointment.start_date_time
    old_end = appointment.end_date_time
    
    # Mettre à jour les champs
    if "status" in update_data:
        try:
            appointment.status = AppointmentStatus(update_data["status"])
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {update_data['status']}"
            )
        update_data.pop("status")
    
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    db.commit()
    db.refresh(appointment)
    
    # Créer des notifications selon les changements
    try:
        from app.core.notifications import create_notification
        from app.db.models.notification import NotificationType
        from app.core.config import settings
        
        frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
        client_name = appointment.client.name if appointment.client else "Client"
        
        # Notification si annulé
        if old_status != AppointmentStatus.CANCELLED and appointment.status == AppointmentStatus.CANCELLED:
            create_notification(
                db=db,
                company_id=current_user.company_id,
                notification_type=NotificationType.APPOINTMENT_CANCELLED,
                title="Rendez-vous annulé",
                message=f"Le rendez-vous avec {client_name} du {old_start.strftime('%d/%m/%Y à %H:%M')} a été annulé",
                link_url=f"{frontend_url}/app/appointments",
                link_text="Voir les rendez-vous",
                source_type="appointment",
                source_id=appointment.id,
                user_id=appointment.employee_id,
            )
        # Notification si modifié (dates ou statut changé, mais pas annulé)
        elif (old_start != appointment.start_date_time or 
              old_end != appointment.end_date_time or 
              (old_status != appointment.status and appointment.status != AppointmentStatus.CANCELLED)):
            create_notification(
                db=db,
                company_id=current_user.company_id,
                notification_type=NotificationType.APPOINTMENT_MODIFIED,
                title="Rendez-vous modifié",
                message=f"Le rendez-vous avec {client_name} a été modifié (nouvelle date: {appointment.start_date_time.strftime('%d/%m/%Y à %H:%M')})",
                link_url=f"{frontend_url}/app/appointments",
                link_text="Voir les rendez-vous",
                source_type="appointment",
                source_id=appointment.id,
                user_id=appointment.employee_id,
            )
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"✅ Notification créée pour la modification du rendez-vous {appointment.id}")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Erreur lors de la création de la notification pour le rendez-vous {appointment.id}: {e}")
    
    # Recharger avec les relations
    appointment = db.query(Appointment).options(
        joinedload(Appointment.client),
        joinedload(Appointment.type),
        joinedload(Appointment.employee),
        joinedload(Appointment.conversation)
    ).filter(Appointment.id == appointment.id).first()
    
    return AppointmentRead.from_orm_with_relations(appointment)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime un rendez-vous"""
    _check_company_access(current_user)
    
    # Vérifier si le module appointments est disponible pour ce plan
    from app.core.subscription_limits import is_feature_enabled
    if not is_feature_enabled(db, current_user.company_id, "appointments"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le module rendez-vous n'est pas disponible pour le plan Essentiel. Passez au plan Pro pour accéder à cette fonctionnalité."
        )
    
    # Vérifier que l'utilisateur est owner
    if current_user.role not in ["owner", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can delete appointments"
        )
    
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.company_id == current_user.company_id
    ).first()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Créer une notification pour l'annulation (suppression = annulation)
    try:
        from app.core.notifications import create_notification
        from app.db.models.notification import NotificationType
        from app.core.config import settings
        
        frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
        client_name = appointment.client.name if appointment.client else "Client"
        
        create_notification(
            db=db,
            company_id=current_user.company_id,
            notification_type=NotificationType.APPOINTMENT_CANCELLED,
            title="Rendez-vous annulé",
            message=f"Le rendez-vous avec {client_name} du {appointment.start_date_time.strftime('%d/%m/%Y à %H:%M')} a été annulé",
            link_url=f"{frontend_url}/app/appointments",
            link_text="Voir les rendez-vous",
            source_type="appointment",
            source_id=appointment.id,
            user_id=appointment.employee_id,
        )
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"✅ Notification créée pour l'annulation du rendez-vous {appointment.id}")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Erreur lors de la création de la notification pour l'annulation du rendez-vous {appointment.id}: {e}")
    
    db.delete(appointment)
    db.commit()
    
    return None


