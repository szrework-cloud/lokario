"""
Service pour construire le contexte de l'entreprise pour ChatGPT.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.db.models.company import Company
from app.db.models.client import Client
from app.db.models.billing import Quote, Invoice, InvoiceStatus, QuoteStatus
from app.db.models.task import Task
from app.db.models.project import Project
from app.db.models.appointment import Appointment
from app.db.models.followup import FollowUp, FollowUpStatus
from app.db.models.conversation import Conversation
from app.db.models.company_settings import CompanySettings


async def build_company_context(db: Session, company_id: int, limit: int = 20) -> Dict[str, Any]:
    """
    Construit le contexte complet de l'entreprise pour ChatGPT.
    
    Args:
        db: Session de base de données
        company_id: ID de l'entreprise
        limit: Nombre maximum d'éléments à récupérer par catégorie
    
    Returns:
        Dictionnaire contenant le contexte structuré
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Récupérer l'entreprise
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            logger.warning(f"Company {company_id} not found")
            return {}
        
        # Récupérer les settings
        settings = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
        
        # Construire le contexte avec gestion d'erreur pour chaque section
        context = {
            "company": {
                "name": company.name,
                "sector": company.sector,
                "is_auto_entrepreneur": company.is_auto_entrepreneur,
                "vat_exempt": company.vat_exempt,
            },
        }
        
        # Récupérer chaque section avec gestion d'erreur individuelle
        try:
            context["clients"] = await _get_clients_summary(db, company_id, limit)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des clients: {e}", exc_info=True)
            context["clients"] = {"total": 0, "recent": [], "clients_with_pending_invoices": []}
        
        try:
            context["billing"] = await _get_billing_summary(db, company_id, limit)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du billing: {e}", exc_info=True)
            context["billing"] = {"quotes": {"total": 0, "pending": 0, "recent": []}, "invoices": {"total": 0, "unpaid": 0, "total_unpaid_amount": 0, "recent": []}}
        
        try:
            context["tasks"] = await _get_tasks_summary(db, company_id, limit)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des tâches: {e}", exc_info=True)
            context["tasks"] = {"total": 0, "by_status": {}, "urgent": []}
        
        try:
            context["projects"] = await _get_projects_summary(db, company_id, limit)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des projets: {e}", exc_info=True)
            context["projects"] = {"total": 0, "active": 0, "recent": []}
        
        try:
            context["appointments"] = await _get_appointments_summary(db, company_id, limit)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des rendez-vous: {e}", exc_info=True)
            context["appointments"] = {"today": 0, "this_week": 0, "upcoming": []}
        
        try:
            context["followups"] = await _get_followups_summary(db, company_id, limit)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des relances: {e}", exc_info=True)
            context["followups"] = {"pending": 0, "recent": []}
        
        try:
            context["inbox"] = await _get_inbox_summary(db, company_id, limit)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de l'inbox: {e}", exc_info=True)
            context["inbox"] = {"unread": 0, "urgent": 0, "recent_conversations": []}
        
        # Ajouter les modules activés si disponibles
        if settings and settings.settings:
            modules = settings.settings.get("modules", {})
            context["company"]["modules_enabled"] = [
                key for key, value in modules.items() if value.get("enabled", False)
            ]
        
        return context
    except Exception as e:
        logger.error(f"Erreur lors de la construction du contexte: {e}", exc_info=True)
        return {"company": {"name": "Unknown", "sector": None, "is_auto_entrepreneur": False, "vat_exempt": False}}


async def _get_clients_summary(db: Session, company_id: int, limit: int) -> Dict[str, Any]:
    """Récupère un résumé des clients."""
    total_clients = db.query(Client).filter(Client.company_id == company_id).count()
    
    # Clients récents
    recent_clients = (
        db.query(Client)
        .filter(Client.company_id == company_id)
        .order_by(Client.created_at.desc())
        .limit(limit)
        .all()
    )
    
    recent_clients_data = []
    for client in recent_clients:
        # Compter les devis et factures
        quotes_count = db.query(Quote).filter(Quote.client_id == client.id).count()
        invoices_count = db.query(Invoice).filter(Invoice.client_id == client.id).count()
        
        recent_clients_data.append({
            "id": client.id,
            "name": client.name or client.email or "Sans nom",
            "email": client.email,
            "phone": client.phone,
            "created_at": client.created_at.isoformat() if client.created_at else None,
            "total_quotes": quotes_count,
            "total_invoices": invoices_count,
        })
    
    # Clients avec factures impayées
    unpaid_invoices = (
        db.query(Invoice)
        .filter(
            Invoice.company_id == company_id,
            Invoice.status.in_([InvoiceStatus.IMPAYEE, InvoiceStatus.EN_RETARD])
        )
        .all()
    )
    
    clients_with_pending = {}
    for invoice in unpaid_invoices:
        if invoice.client_id:
            if invoice.client_id not in clients_with_pending:
                client = db.query(Client).filter(Client.id == invoice.client_id).first()
                if client:
                    clients_with_pending[invoice.client_id] = {
                        "id": client.id,
                        "name": client.name or client.email or "Sans nom",
                        "pending_amount": 0.0,
                        "oldest_invoice_date": None,
                    }
            
            # Utiliser total_ttc en priorité, sinon amount (pour compatibilité)
            invoice_amount = float(invoice.total_ttc or invoice.amount or 0)
            clients_with_pending[invoice.client_id]["pending_amount"] += invoice_amount
            oldest_date_str = clients_with_pending[invoice.client_id]["oldest_invoice_date"]
            if oldest_date_str is None:
                # Première facture pour ce client
                clients_with_pending[invoice.client_id]["oldest_invoice_date"] = (
                    invoice.created_at.isoformat() if invoice.created_at else None
                )
            elif invoice.created_at:
                # Comparer avec la date existante
                oldest_date = datetime.fromisoformat(oldest_date_str.replace('Z', '+00:00'))
                if invoice.created_at < oldest_date:
                    clients_with_pending[invoice.client_id]["oldest_invoice_date"] = (
                        invoice.created_at.isoformat()
                    )
    
    return {
        "total": total_clients,
        "recent": recent_clients_data,
        "clients_with_pending_invoices": list(clients_with_pending.values())[:limit],
    }


async def _get_billing_summary(db: Session, company_id: int, limit: int) -> Dict[str, Any]:
    """Récupère un résumé des factures et devis."""
    # Devis
    total_quotes = db.query(Quote).filter(Quote.company_id == company_id).count()
    # Devis en attente (envoyés mais pas encore acceptés/refusés)
    pending_quotes = (
        db.query(Quote)
        .filter(
            Quote.company_id == company_id,
            Quote.status.in_([QuoteStatus.ENVOYE, QuoteStatus.VU])
        )
        .count()
    )
    
    recent_quotes = (
        db.query(Quote)
        .filter(Quote.company_id == company_id)
        .order_by(Quote.created_at.desc())
        .limit(limit)
        .all()
    )
    
    quotes_data = []
    for quote in recent_quotes:
        client = db.query(Client).filter(Client.id == quote.client_id).first() if quote.client_id else None
        # Utiliser total_ttc en priorité, sinon amount (pour compatibilité)
        quote_amount = float(quote.total_ttc or quote.amount or 0)
        quotes_data.append({
            "id": quote.id,
            "client_name": client.name if client else "Sans client",
            "amount": quote_amount,
            "status": quote.status.value if hasattr(quote.status, 'value') else str(quote.status),
            "created_at": quote.created_at.isoformat() if quote.created_at else None,
        })
    
    # Factures
    total_invoices = db.query(Invoice).filter(Invoice.company_id == company_id).count()
    unpaid_invoices = (
        db.query(Invoice)
        .filter(
            Invoice.company_id == company_id,
            Invoice.status.in_([InvoiceStatus.IMPAYEE, InvoiceStatus.EN_RETARD])
        )
        .all()
    )
    
    # Utiliser total_ttc en priorité, sinon amount (pour compatibilité)
    total_unpaid_amount = sum(float(inv.total_ttc or inv.amount or 0) for inv in unpaid_invoices)
    
    recent_invoices = (
        db.query(Invoice)
        .filter(Invoice.company_id == company_id)
        .order_by(Invoice.created_at.desc())
        .limit(limit)
        .all()
    )
    
    invoices_data = []
    for invoice in recent_invoices:
        client = db.query(Client).filter(Client.id == invoice.client_id).first() if invoice.client_id else None
        # Utiliser total_ttc en priorité, sinon amount (pour compatibilité)
        invoice_amount = float(invoice.total_ttc or invoice.amount or 0)
        invoices_data.append({
            "id": invoice.id,
            "client_name": client.name if client else "Sans client",
            "amount": invoice_amount,
            "status": invoice.status.value if hasattr(invoice.status, 'value') else str(invoice.status),
            "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        })
    
    return {
        "quotes": {
            "total": total_quotes,
            "pending": pending_quotes,
            "recent": quotes_data,
        },
        "invoices": {
            "total": total_invoices,
            "unpaid": len(unpaid_invoices),
            "total_unpaid_amount": total_unpaid_amount,
            "recent": invoices_data,
        },
    }


async def _get_tasks_summary(db: Session, company_id: int, limit: int) -> Dict[str, Any]:
    """Récupère un résumé des tâches."""
    from app.db.models.task import TaskStatus
    
    total_tasks = db.query(Task).filter(Task.company_id == company_id).count()
    
    # Tâches par statut
    tasks_by_status = {
        "À faire": db.query(Task).filter(
            Task.company_id == company_id,
            Task.status == TaskStatus.A_FAIRE
        ).count(),
        "En cours": db.query(Task).filter(
            Task.company_id == company_id,
            Task.status == TaskStatus.EN_COURS
        ).count(),
        "Terminée": db.query(Task).filter(
            Task.company_id == company_id,
            Task.status == TaskStatus.TERMINE
        ).count(),
    }
    
    # Tâches urgentes
    urgent_tasks = (
        db.query(Task)
        .filter(
            Task.company_id == company_id,
            Task.priority == "high",
            Task.status != TaskStatus.TERMINE
        )
        .order_by(Task.due_date.asc())
        .limit(limit)
        .all()
    )
    
    urgent_data = []
    for task in urgent_tasks:
        urgent_data.append({
            "id": task.id,
            "title": task.title,
            "priority": task.priority,
            "due_date": task.due_date.isoformat() if task.due_date else None,
        })
    
    return {
        "total": total_tasks,
        "by_status": tasks_by_status,
        "urgent": urgent_data,
    }


async def _get_projects_summary(db: Session, company_id: int, limit: int) -> Dict[str, Any]:
    """Récupère un résumé des projets."""
    total_projects = db.query(Project).filter(Project.company_id == company_id).count()
    
    active_projects = (
        db.query(Project)
        .filter(
            Project.company_id == company_id,
            Project.status != "completed"
        )
        .count()
    )
    
    recent_projects = (
        db.query(Project)
        .filter(Project.company_id == company_id)
        .order_by(Project.created_at.desc())
        .limit(limit)
        .all()
    )
    
    projects_data = []
    for project in recent_projects:
        client = db.query(Client).filter(Client.id == project.client_id).first() if project.client_id else None
        projects_data.append({
            "id": project.id,
            "name": project.name,
            "client_name": client.name if client else "Sans client",
            "status": project.status,
            "progress": getattr(project, 'progress', None),
        })
    
    return {
        "total": total_projects,
        "active": active_projects,
        "recent": projects_data,
    }


async def _get_appointments_summary(db: Session, company_id: int, limit: int) -> Dict[str, Any]:
    """Récupère un résumé des rendez-vous."""
    today = datetime.now().date()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    
    today_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.company_id == company_id,
            func.date(Appointment.start_date_time) == today
        )
        .count()
    )
    
    this_week_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.company_id == company_id,
            func.date(Appointment.start_date_time) >= start_of_week,
            func.date(Appointment.start_date_time) <= end_of_week
        )
        .count()
    )
    
    upcoming_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.company_id == company_id,
            Appointment.start_date_time >= datetime.now()
        )
        .order_by(Appointment.start_date_time.asc())
        .limit(limit)
        .all()
    )
    
    appointments_data = []
    for appointment in upcoming_appointments:
        client = db.query(Client).filter(Client.id == appointment.client_id).first() if appointment.client_id else None
        appointments_data.append({
            "id": appointment.id,
            "client_name": client.name if client else "Sans client",
            "date": appointment.start_date_time.isoformat() if appointment.start_date_time else None,
            "type": appointment.type.name if appointment.type else "Sans type",
        })
    
    return {
        "today": today_appointments,
        "this_week": this_week_appointments,
        "upcoming": appointments_data,
    }


async def _get_followups_summary(db: Session, company_id: int, limit: int) -> Dict[str, Any]:
    """Récupère un résumé des relances."""
    pending_followups = (
        db.query(FollowUp)
        .filter(
            FollowUp.company_id == company_id,
            FollowUp.status == FollowUpStatus.A_FAIRE
        )
        .count()
    )
    
    recent_followups = (
        db.query(FollowUp)
        .filter(FollowUp.company_id == company_id)
        .order_by(FollowUp.due_date.asc())
        .limit(limit)
        .all()
    )
    
    followups_data = []
    for followup in recent_followups:
        client = db.query(Client).filter(Client.id == followup.client_id).first() if followup.client_id else None
        followups_data.append({
            "id": followup.id,
            "client_name": client.name if client else "Sans client",
            "type": followup.type.value if hasattr(followup.type, 'value') else str(followup.type),
            "amount": float(followup.amount or 0) if hasattr(followup, 'amount') else None,
            "scheduled_date": followup.due_date.isoformat() if followup.due_date else None,
        })
    
    return {
        "pending": pending_followups,
        "recent": followups_data,
    }


async def _get_inbox_summary(db: Session, company_id: int, limit: int) -> Dict[str, Any]:
    """Récupère un résumé de l'inbox."""
    unread_conversations = (
        db.query(Conversation)
        .filter(
            Conversation.company_id == company_id,
            Conversation.unread_count > 0
        )
        .count()
    )
    
    urgent_conversations = (
        db.query(Conversation)
        .filter(
            Conversation.company_id == company_id,
            Conversation.is_urgent == True
        )
        .count()
    )
    
    recent_conversations = (
        db.query(Conversation)
        .filter(Conversation.company_id == company_id)
        .order_by(Conversation.last_message_at.desc())
        .limit(limit)
        .all()
    )
    
    conversations_data = []
    for conv in recent_conversations:
        client = db.query(Client).filter(Client.id == conv.client_id).first() if conv.client_id else None
        conversations_data.append({
            "id": conv.id,
            "client_name": client.name if client else "Sans client",
            "subject": conv.subject,
            "status": conv.status,
            "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None,
        })
    
    return {
        "unread": unread_conversations,
        "urgent": urgent_conversations,
        "recent_conversations": conversations_data,
    }

