from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.company_settings import CompanySettings
from app.db.models.client import Client
from app.db.models.project import Project, ProjectHistory
from app.db.models.task import Task
from app.db.models.billing import Quote, Invoice, QuoteLine, InvoiceLine, QuoteSignature, QuoteSignatureAuditLog, InvoicePayment
from app.db.models.quote_otp import QuoteOTP
from app.db.models.invoice_audit import InvoiceAuditLog
from app.db.models.followup import FollowUp, FollowUpHistory
from app.db.models.conversation import Conversation, InboxMessage, MessageAttachment, InternalNote
from app.db.models.appointment import Appointment
from app.api.schemas.user import UserRead, UserUpdate, UserWithCompany, UserPermissionsUpdate
from app.api.deps import get_current_active_user, get_current_super_admin, get_current_user, get_current_user_for_restore

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_active_user)):
    """
    Retourne les informations de l'utilisateur connecté.
    (Alternative à /auth/me)
    """
    return current_user


@router.get("", response_model=List[UserWithCompany])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """
    Liste tous les utilisateurs avec les infos de leur entreprise (réservé aux super_admin).
    """
    users = db.query(User).all()
    
    # Enrichir avec les infos de l'entreprise
    result = []
    for user in users:
        company = None
        if user.company_id:
            company = db.query(Company).filter(Company.id == user.company_id).first()
        
        user_dict = {
            **user.__dict__,
            "company_name": company.name if company else None,
            "company_sector": company.sector if company else None,
            "company_code": company.code if company else None,
        }
        result.append(UserWithCompany(**user_dict))
    
    return result


@router.get("/company", response_model=List[UserRead])
def get_company_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Liste les utilisateurs de la company de l'utilisateur courant.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User has no company")
    users = db.query(User).filter(User.company_id == current_user.company_id).all()
    return users


@router.patch("/{user_id}", response_model=UserWithCompany)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """
    Met à jour un utilisateur (super_admin uniquement).
    Permet de changer le rôle, l'entreprise, le nom, et l'état actif.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Vérifier que le rôle est valide
    if payload.role and payload.role not in ["super_admin", "owner", "user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'super_admin', 'owner', or 'user'"
        )
    
    # Mettre à jour les champs
    if payload.role is not None:
        user.role = payload.role
        # Si super_admin, enlever company_id
        if payload.role == "super_admin":
            user.company_id = None
        # Si owner ou user, vérifier que company_id est fourni
        elif payload.role in ["owner", "user"] and payload.company_id is None and user.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="company_id is required for owner and user roles"
            )
    
    if payload.company_id is not None:
        # Vérifier que l'entreprise existe
        if payload.company_id != 0:  # 0 signifie "pas d'entreprise"
            company = db.query(Company).filter(Company.id == payload.company_id).first()
            if not company:
                raise HTTPException(status_code=404, detail="Company not found")
            user.company_id = payload.company_id
        else:
            # 0 = pas d'entreprise (seulement pour super_admin)
            if user.role != "super_admin":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only super_admin can have no company"
                )
            user.company_id = None
    
    if payload.full_name is not None:
        user.full_name = payload.full_name
    
    if payload.is_active is not None:
        user.is_active = payload.is_active
    
    # Mettre à jour les permissions (seulement pour les users, les owners/admins ont tous les droits)
    if payload.can_edit_tasks is not None:
        user.can_edit_tasks = payload.can_edit_tasks
    if payload.can_delete_tasks is not None:
        user.can_delete_tasks = payload.can_delete_tasks
    if payload.can_create_tasks is not None:
        user.can_create_tasks = payload.can_create_tasks
    
    db.commit()
    db.refresh(user)
    
    # Enrichir avec les infos de l'entreprise
    company = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
    
    user_dict = {
        **user.__dict__,
        "company_name": company.name if company else None,
        "company_sector": company.sector if company else None,
        "company_code": company.code if company else None,
    }
    
    return UserWithCompany(**user_dict)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """
    Supprime un utilisateur (super_admin uniquement).
    Si c'est le dernier owner d'une entreprise, supprime aussi l'entreprise et tous ses utilisateurs.
    Permet de supprimer n'importe quel utilisateur, y compris les owners.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Empêcher la suppression du super_admin actuel
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Sauvegarder les infos de l'utilisateur avant suppression
    company_id = user.company_id
    user_role = user.role
    
    # Supprimer l'utilisateur
    db.delete(user)
    db.flush()  # Pour que la suppression soit visible dans la session
    
    # Si c'était un owner et qu'il avait une entreprise, vérifier s'il reste des owners
    if company_id and user_role == "owner":
        # Compter les owners restants pour cette entreprise
        remaining_owners = db.query(User).filter(
            User.company_id == company_id,
            User.role == "owner"
        ).count()
        
        # Si plus aucun owner, supprimer l'entreprise et tous ses utilisateurs
        if remaining_owners == 0:
            from app.db.models.company_settings import CompanySettings
            
            # Supprimer tous les utilisateurs restants de l'entreprise
            remaining_users = db.query(User).filter(User.company_id == company_id).all()
            for remaining_user in remaining_users:
                db.delete(remaining_user)
            
            # Supprimer les settings de l'entreprise
            settings = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
            if settings:
                db.delete(settings)
            
            # Supprimer l'entreprise
            company = db.query(Company).filter(Company.id == company_id).first()
            if company:
                db.delete(company)
    
    db.commit()
    return None


@router.patch("/{user_id}/permissions", response_model=UserRead)
def update_user_permissions(
    user_id: int,
    permissions: UserPermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Met à jour les permissions d'un utilisateur.
    Accessible aux owners/admins de la même entreprise.
    """
    # Vérifier que l'utilisateur a les droits (owner ou admin de la même entreprise)
    if current_user.role not in ["super_admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can update permissions"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Vérifier que l'utilisateur appartient à la même entreprise (sauf pour super_admin)
    if current_user.role != "super_admin":
        if user.company_id != current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update permissions for users from another company"
            )
    
    # Les permissions ne s'appliquent qu'aux users, pas aux owners/admins
    if user.role not in ["user"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permissions can only be set for users with role 'user'"
        )
    
    # Mettre à jour les permissions
    if permissions.can_edit_tasks is not None:
        user.can_edit_tasks = permissions.can_edit_tasks
    if permissions.can_delete_tasks is not None:
        user.can_delete_tasks = permissions.can_delete_tasks
    if permissions.can_create_tasks is not None:
        user.can_create_tasks = permissions.can_create_tasks
    
    db.commit()
    db.refresh(user)
    return user


class ImportDataRequest(BaseModel):
    data: Dict[str, Any]


@router.get("/me/export")
def export_user_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Exporte toutes les données de l'utilisateur et de son entreprise au format JSON.
    Conforme au RGPD (droit à la portabilité des données).
    """
    try:
        if not current_user.company_id:
            raise HTTPException(
                status_code=400,
                detail="User has no company. Cannot export data."
            )
        
        company_id = current_user.company_id
        
        # Collecter toutes les données
        export_data = {
            "export_date": datetime.now().isoformat(),
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "full_name": current_user.full_name,
                "role": current_user.role,
                "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
            },
            "company": None,
            "clients": [],
            "projects": [],
            "tasks": [],
            "quotes": [],
            "invoices": [],
            "followups": [],
            "conversations": [],
            "appointments": [],
        }
        
        # Données de l'entreprise
        company = db.query(Company).filter(Company.id == company_id).first()
        if company:
            # Récupérer les settings de l'entreprise
            company_settings = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
            
            export_data["company"] = {
                "id": company.id,
                "code": company.code,
                "name": company.name,
                "slug": company.slug,
                "sector": company.sector,
                "is_active": company.is_active,
                "is_auto_entrepreneur": company.is_auto_entrepreneur,
                "vat_exempt": company.vat_exempt,
                "vat_exemption_reference": company.vat_exemption_reference,
                "created_at": company.created_at.isoformat() if company.created_at else None,
            }
            
            # Ajouter les informations de l'entreprise depuis les settings si disponibles
            if company_settings and company_settings.settings:
                company_info = company_settings.settings.get("company_info", {})
                if company_info:
                    export_data["company"]["email"] = company_info.get("email")
                    export_data["company"]["phone"] = company_info.get("phone")
                    export_data["company"]["address"] = company_info.get("address")
                    export_data["company"]["city"] = company_info.get("city")
                    export_data["company"]["postal_code"] = company_info.get("postal_code")
                    export_data["company"]["country"] = company_info.get("country")
                    export_data["company"]["siren"] = company_info.get("siren")
                    export_data["company"]["siret"] = company_info.get("siret")
                    export_data["company"]["vat_number"] = company_info.get("vat_number")
                    export_data["company"]["timezone"] = company_info.get("timezone")
        
        # Clients
        clients = db.query(Client).filter(Client.company_id == company_id).all()
        for client in clients:
            export_data["clients"].append({
                "id": client.id,
                "name": client.name,
                "email": client.email,
                "phone": client.phone,
                "address": client.address,
                "city": client.city,
                "postal_code": client.postal_code,
                "country": client.country,
                "siret": client.siret,
                "vat_number": client.vat_number,
                "notes": client.notes,
                "created_at": client.created_at.isoformat() if client.created_at else None,
            })
        
        # Projets
        projects = db.query(Project).filter(Project.company_id == company_id).all()
        for project in projects:
            export_data["projects"].append({
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "client_id": project.client_id,
                "status": project.status.value if hasattr(project.status, 'value') else str(project.status),
                "start_date": project.start_date.isoformat() if project.start_date else None,
                "end_date": project.end_date.isoformat() if project.end_date else None,
                "created_at": project.created_at.isoformat() if project.created_at else None,
            })
        
        # Tâches
        tasks = db.query(Task).filter(Task.company_id == company_id).all()
        for task in tasks:
            export_data["tasks"].append({
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "status": task.status.value if hasattr(task.status, 'value') else str(task.status),
                "priority": task.priority,
                "type": task.type.value if hasattr(task.type, 'value') else str(task.type),
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "due_time": task.due_time,
                "client_id": task.client_id,
                "project_id": task.project_id,
                "assigned_to_id": task.assigned_to_id,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                "created_at": task.created_at.isoformat() if task.created_at else None,
            })
        
        # Devis
        quotes = db.query(Quote).filter(Quote.company_id == company_id).all()
        for quote in quotes:
            quote_lines = db.query(QuoteLine).filter(QuoteLine.quote_id == quote.id).all()
            export_data["quotes"].append({
                "id": quote.id,
                "number": quote.number,
                "client_id": quote.client_id,
                "status": quote.status.value if hasattr(quote.status, 'value') else str(quote.status),
                "subtotal_ht": float(quote.subtotal_ht) if quote.subtotal_ht else None,
                "total_tax": float(quote.total_tax) if quote.total_tax else None,
                "total_ttc": float(quote.total_ttc) if quote.total_ttc else None,
                "amount": float(quote.amount) if quote.amount else None,  # Pour compatibilité
                "valid_until": quote.valid_until.isoformat() if quote.valid_until else None,
                "created_at": quote.created_at.isoformat() if quote.created_at else None,
                "lines": [
                    {
                        "description": line.description,
                        "quantity": float(line.quantity) if line.quantity else None,
                        "unit_price_ht": float(line.unit_price_ht) if line.unit_price_ht else None,
                        "tax_rate": float(line.tax_rate) if line.tax_rate else None,
                        "total_ttc": float(line.total_ttc) if line.total_ttc else None,
                    }
                    for line in quote_lines
                ],
            })
        
        # Factures
        invoices = db.query(Invoice).filter(Invoice.company_id == company_id).all()
        for invoice in invoices:
            invoice_lines = db.query(InvoiceLine).filter(InvoiceLine.invoice_id == invoice.id).all()
            export_data["invoices"].append({
                "id": invoice.id,
                "number": invoice.number,
                "client_id": invoice.client_id,
                "status": invoice.status.value if hasattr(invoice.status, 'value') else str(invoice.status),
                "subtotal_ht": float(invoice.subtotal_ht) if invoice.subtotal_ht else None,
                "total_tax": float(invoice.total_tax) if invoice.total_tax else None,
                "total_ttc": float(invoice.total_ttc) if invoice.total_ttc else None,
                "amount": float(invoice.amount) if invoice.amount else None,  # Pour compatibilité
                "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
                "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
                "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
                "lines": [
                    {
                        "description": line.description,
                        "quantity": float(line.quantity) if line.quantity else None,
                        "unit_price_ht": float(line.unit_price_ht) if line.unit_price_ht else None,
                        "tax_rate": float(line.tax_rate) if line.tax_rate else None,
                        "total_ttc": float(line.total_ttc) if line.total_ttc else None,
                    }
                    for line in invoice_lines
                ],
            })
        
        # Relances
        followups = db.query(FollowUp).filter(FollowUp.company_id == company_id).all()
        for followup in followups:
            export_data["followups"].append({
                "id": followup.id,
                "client_id": followup.client_id,
                "type": followup.type.value if hasattr(followup.type, 'value') else str(followup.type),
                "status": followup.status.value if hasattr(followup.status, 'value') else str(followup.status),
                "is_automatic": followup.is_automatic,
                "scheduled_at": followup.scheduled_at.isoformat() if followup.scheduled_at else None,
                "sent_at": followup.sent_at.isoformat() if followup.sent_at else None,
                "created_at": followup.created_at.isoformat() if followup.created_at else None,
            })
        
        # Conversations (Inbox)
        conversations = db.query(Conversation).filter(Conversation.company_id == company_id).all()
        for conversation in conversations:
            export_data["conversations"].append({
                "id": conversation.id,
                "client_id": conversation.client_id,
                "subject": conversation.subject,
                "status": conversation.status.value if hasattr(conversation.status, 'value') else str(conversation.status),
                "source": conversation.source,
                "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
            })
        
        # Rendez-vous
        appointments = db.query(Appointment).filter(Appointment.company_id == company_id).all()
        for appointment in appointments:
            export_data["appointments"].append({
                "id": appointment.id,
                "client_id": appointment.client_id,
                "title": appointment.title,
                "description": appointment.description,
                "start_time": appointment.start_time.isoformat() if appointment.start_time else None,
                "end_time": appointment.end_time.isoformat() if appointment.end_time else None,
                "status": appointment.status.value if hasattr(appointment.status, 'value') else str(appointment.status),
                "created_at": appointment.created_at.isoformat() if appointment.created_at else None,
            })
        
        return export_data
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Erreur lors de l'export des données: {str(e)}")
        print(f"Traceback: {error_details}")
        raise HTTPException(
            status_code=500,
            detail=f"Error exporting data: {str(e)}"
        )


@router.post("/me/import")
def import_user_data(
    request: ImportDataRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Importe des données depuis un export JSON.
    ATTENTION: Peut écraser des données existantes.
    """
    if not current_user.company_id:
        raise HTTPException(
            status_code=400,
            detail="User has no company. Cannot import data."
        )
    
    company_id = current_user.company_id
    data = request.data
    
    try:
        # Vérifier que c'est un export Lokario valide
        if "export_date" not in data:
            raise HTTPException(
                status_code=400,
                detail="Invalid export file. Missing 'export_date' field."
            )
        
        # Importer les clients
        if "clients" in data and isinstance(data["clients"], list):
            for client_data in data["clients"]:
                # Vérifier si le client existe déjà (par email ou nom)
                existing_client = None
                if client_data.get("email"):
                    existing_client = db.query(Client).filter(
                        Client.company_id == company_id,
                        Client.email == client_data["email"]
                    ).first()
                elif client_data.get("name"):
                    existing_client = db.query(Client).filter(
                        Client.company_id == company_id,
                        Client.name == client_data["name"]
                    ).first()
                
                if existing_client:
                    # Mettre à jour le client existant
                    if "name" in client_data:
                        existing_client.name = client_data["name"]
                    if "email" in client_data:
                        existing_client.email = client_data["email"]
                    if "phone" in client_data:
                        existing_client.phone = client_data["phone"]
                    if "address" in client_data:
                        existing_client.address = client_data["address"]
                    if "city" in client_data:
                        existing_client.city = client_data["city"]
                    if "postal_code" in client_data:
                        existing_client.postal_code = client_data["postal_code"]
                    if "country" in client_data:
                        existing_client.country = client_data["country"]
                    if "siret" in client_data:
                        existing_client.siret = client_data["siret"]
                    if "vat_number" in client_data:
                        existing_client.vat_number = client_data["vat_number"]
                    if "notes" in client_data:
                        existing_client.notes = client_data["notes"]
                else:
                    # Créer un nouveau client
                    new_client = Client(
                        company_id=company_id,
                        name=client_data.get("name", ""),
                        email=client_data.get("email"),
                        phone=client_data.get("phone"),
                        address=client_data.get("address"),
                        city=client_data.get("city"),
                        postal_code=client_data.get("postal_code"),
                        country=client_data.get("country"),
                        siret=client_data.get("siret"),
                        vat_number=client_data.get("vat_number"),
                        notes=client_data.get("notes"),
                    )
                    db.add(new_client)
        
        db.commit()
        
        return {
            "message": "Data imported successfully",
            "imported_at": datetime.now().isoformat()
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error importing data: {str(e)}"
        )


@router.post("/me/delete")
def delete_user_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Marque le compte pour suppression avec une période de grâce de 30 jours.
    
    Comportement:
    - Marque le compte pour suppression (deletion_requested_at = maintenant)
    - Calcule la date de suppression définitive (deletion_scheduled_at = maintenant + 30 jours)
    - L'utilisateur ne pourra plus accéder à son compte pendant cette période
    - Un cron job supprimera définitivement le compte après 30 jours
    
    L'utilisateur peut restaurer son compte pendant les 30 jours via /users/me/restore
    """
    from datetime import timedelta
    
    # Récupérer l'utilisateur depuis la session actuelle
    user_id = current_user.id
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Vérifier si la suppression est déjà en cours
    if user.deletion_requested_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account deletion already in progress. Use /users/me/restore to cancel."
        )
    
    try:
        # Marquer le compte pour suppression
        now = datetime.now()
        user.deletion_requested_at = now
        user.deletion_scheduled_at = now + timedelta(days=30)
        
        db.commit()
        db.refresh(user)
        
        return {
            "message": "Account deletion requested. Your account will be permanently deleted in 30 days. You can restore it before then using /users/me/restore",
            "deletion_requested_at": user.deletion_requested_at.isoformat(),
            "deletion_scheduled_at": user.deletion_scheduled_at.isoformat(),
            "days_remaining": 30
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error requesting account deletion: {str(e)}"
        )


@router.post("/me/restore")
def restore_user_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_for_restore)  # Permet l'accès même si deletion_requested_at est défini
):
    """
    Restaure un compte en cours de suppression.
    
    Annule la demande de suppression et restaure l'accès au compte.
    """
    user_id = current_user.id
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.deletion_requested_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No deletion request in progress"
        )
    
    try:
        # Annuler la suppression
        user.deletion_requested_at = None
        user.deletion_scheduled_at = None
        
        db.commit()
        db.refresh(user)
        
        return {
            "message": "Account restoration successful. Your account has been restored and you can now access it normally.",
            "restored_at": datetime.now().isoformat()
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error restoring account: {str(e)}"
        )


@router.get("/me/deletion-status")
def get_deletion_status(
    current_user: User = Depends(get_current_user_for_restore)  # Permet l'accès même si deletion_requested_at est défini
):
    """
    Retourne le statut de suppression du compte.
    """
    from datetime import datetime, timedelta, timezone
    
    if current_user.deletion_requested_at is None:
        return {
            "deletion_in_progress": False,
            "deletion_requested_at": None,
            "deletion_scheduled_at": None,
            "days_remaining": None
        }
    
    now = datetime.now(timezone.utc)
    days_remaining = None
    if current_user.deletion_scheduled_at:
        # S'assurer que deletion_scheduled_at a un timezone pour la comparaison
        scheduled_at = current_user.deletion_scheduled_at
        if scheduled_at.tzinfo is None:
            # Si pas de timezone, supposer UTC
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        delta = scheduled_at - now
        days_remaining = max(0, delta.days)
    
    return {
        "deletion_in_progress": True,
        "deletion_requested_at": current_user.deletion_requested_at.isoformat() if current_user.deletion_requested_at else None,
        "deletion_scheduled_at": current_user.deletion_scheduled_at.isoformat() if current_user.deletion_scheduled_at else None,
        "days_remaining": days_remaining
    }

