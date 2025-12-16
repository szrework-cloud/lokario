"""
Script pour vérifier les éléments en retard et les rappels
À exécuter via cron régulièrement (par exemple toutes les heures)
"""
import sys
import os
from datetime import datetime, date, timedelta
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal
from app.db.models.billing import Invoice, InvoiceStatus
from app.db.models.task import Task, TaskStatus
from app.db.models.appointment import Appointment, AppointmentStatus
from app.core.notifications import create_notification
from app.db.models.notification import NotificationType
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_overdue_invoices(db):
    """Vérifie les factures en retard et crée des notifications"""
    today = date.today()
    
    # Trouver les factures impayées avec une date d'échéance dépassée
    overdue_invoices = db.query(Invoice).filter(
        Invoice.status == InvoiceStatus.IMPAYEE,
        Invoice.due_date.isnot(None),
        Invoice.due_date < today
    ).all()
    
    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
    
    for invoice in overdue_invoices:
        # Vérifier si une notification pour cette facture existe déjà aujourd'hui
        from app.db.models.notification import Notification
        existing_notification = db.query(Notification).filter(
            Notification.company_id == invoice.company_id,
            Notification.source_type == "invoice",
            Notification.source_id == invoice.id,
            Notification.type == NotificationType.INVOICE_OVERDUE,
            Notification.created_at >= datetime.combine(today, datetime.min.time())
        ).first()
        
        if not existing_notification:
            try:
                days_overdue = (today - invoice.due_date).days
                create_notification(
                    db=db,
                    company_id=invoice.company_id,
                    notification_type=NotificationType.INVOICE_OVERDUE,
                    title="Facture en retard",
                    message=f"La facture {invoice.number} est en retard de {days_overdue} jour(s) (échéance: {invoice.due_date.strftime('%d/%m/%Y')})",
                    link_url=f"{frontend_url}/app/billing/invoices/{invoice.id}",
                    link_text="Voir la facture",
                    source_type="invoice",
                    source_id=invoice.id,
                )
                logger.info(f"✅ Notification créée pour la facture en retard {invoice.number} (ID: {invoice.id})")
            except Exception as e:
                logger.error(f"❌ Erreur lors de la création de la notification pour la facture {invoice.id}: {e}")


def check_overdue_tasks(db):
    """Vérifie les tâches en retard et crée des notifications"""
    today = date.today()
    
    # Trouver les tâches non terminées avec une date d'échéance dépassée
    overdue_tasks = db.query(Task).filter(
        Task.status != TaskStatus.TERMINE,
        Task.due_date.isnot(None),
        Task.due_date < today
    ).all()
    
    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
    
    for task in overdue_tasks:
        # Vérifier si une notification pour cette tâche existe déjà aujourd'hui
        from app.db.models.notification import Notification
        existing_notification = db.query(Notification).filter(
            Notification.company_id == task.company_id,
            Notification.source_type == "task",
            Notification.source_id == task.id,
            Notification.type == NotificationType.TASK_OVERDUE,
            Notification.created_at >= datetime.combine(today, datetime.min.time())
        ).first()
        
        if not existing_notification:
            try:
                days_overdue = (today - task.due_date).days
                create_notification(
                    db=db,
                    company_id=task.company_id,
                    notification_type=NotificationType.TASK_OVERDUE,
                    title="Tâche en retard",
                    message=f"La tâche '{task.title}' est en retard de {days_overdue} jour(s) (échéance: {task.due_date.strftime('%d/%m/%Y')})",
                    link_url=f"{frontend_url}/app/tasks",
                    link_text="Voir les tâches",
                    source_type="task",
                    source_id=task.id,
                    user_id=task.assigned_to_id,
                )
                logger.info(f"✅ Notification créée pour la tâche en retard {task.title} (ID: {task.id})")
            except Exception as e:
                logger.error(f"❌ Erreur lors de la création de la notification pour la tâche {task.id}: {e}")


def check_critical_tasks(db):
    """Vérifie les tâches critiques à venir et crée des notifications"""
    today = date.today()
    in_2_days = today + timedelta(days=2)
    
    # Trouver les tâches non terminées avec échéance dans les 2 jours et priorité haute
    critical_tasks = db.query(Task).filter(
        Task.status != TaskStatus.TERMINE,
        Task.due_date.isnot(None),
        Task.due_date >= today,
        Task.due_date <= in_2_days,
        Task.priority.in_(["high", "critical", "urgent"])
    ).all()
    
    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
    
    for task in critical_tasks:
        # Vérifier si une notification pour cette tâche existe déjà aujourd'hui
        from app.db.models.notification import Notification
        existing_notification = db.query(Notification).filter(
            Notification.company_id == task.company_id,
            Notification.source_type == "task",
            Notification.source_id == task.id,
            Notification.type == NotificationType.TASK_CRITICAL,
            Notification.created_at >= datetime.combine(today, datetime.min.time())
        ).first()
        
        if not existing_notification:
            try:
                days_until_due = (task.due_date - today).days
                due_str = task.due_date.strftime('%d/%m/%Y')
                if task.due_time:
                    due_str += f" à {task.due_time.strftime('%H:%M')}"
                
                create_notification(
                    db=db,
                    company_id=task.company_id,
                    notification_type=NotificationType.TASK_CRITICAL,
                    title="Tâche critique à venir",
                    message=f"La tâche '{task.title}' est due dans {days_until_due} jour(s) (échéance: {due_str}, priorité {task.priority})",
                    link_url=f"{frontend_url}/app/tasks",
                    link_text="Voir les tâches",
                    source_type="task",
                    source_id=task.id,
                    user_id=task.assigned_to_id,
                )
                logger.info(f"✅ Notification créée pour la tâche critique {task.title} (ID: {task.id})")
            except Exception as e:
                logger.error(f"❌ Erreur lors de la création de la notification pour la tâche {task.id}: {e}")


def check_appointment_reminders(db):
    """Vérifie les rendez-vous à venir et crée des rappels"""
    now = datetime.now()
    in_24h = now + timedelta(hours=24)
    in_2h = now + timedelta(hours=2)
    
    # Trouver les rendez-vous dans les 24 prochaines heures
    upcoming_appointments = db.query(Appointment).filter(
        Appointment.status != AppointmentStatus.CANCELLED,
        Appointment.start_date_time > now,
        Appointment.start_date_time <= in_24h
    ).all()
    
    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
    
    for appointment in upcoming_appointments:
        # Vérifier si un rappel a déjà été envoyé aujourd'hui
        from app.db.models.notification import Notification
        existing_notification = db.query(Notification).filter(
            Notification.company_id == appointment.company_id,
            Notification.source_type == "appointment",
            Notification.source_id == appointment.id,
            Notification.type == NotificationType.APPOINTMENT_REMINDER,
            Notification.created_at >= datetime.combine(now.date(), datetime.min.time())
        ).first()
        
        if not existing_notification:
            # Vérifier si on doit envoyer le rappel (dans les 24h mais pas encore passé les 2h)
            time_until = appointment.start_date_time - now
            hours_until = time_until.total_seconds() / 3600
            
            # Envoyer un rappel si c'est entre 2h et 24h avant
            if 2 <= hours_until <= 24:
                try:
                    client_name = appointment.client.name if appointment.client else "Client"
                    employee_name = appointment.employee.full_name if appointment.employee else "Non assigné"
                    start_str = appointment.start_date_time.strftime('%d/%m/%Y à %H:%M')
                    
                    create_notification(
                        db=db,
                        company_id=appointment.company_id,
                        notification_type=NotificationType.APPOINTMENT_REMINDER,
                        title="Rappel de rendez-vous",
                        message=f"Rappel: Rendez-vous avec {client_name} le {start_str} ({employee_name})",
                        link_url=f"{frontend_url}/app/appointments",
                        link_text="Voir les rendez-vous",
                        source_type="appointment",
                        source_id=appointment.id,
                        user_id=appointment.employee_id,
                    )
                    logger.info(f"✅ Notification de rappel créée pour le rendez-vous {appointment.id}")
                except Exception as e:
                    logger.error(f"❌ Erreur lors de la création du rappel pour le rendez-vous {appointment.id}: {e}")


def main():
    """Fonction principale"""
    db = SessionLocal()
    try:
        logger.info("🔄 Début de la vérification des éléments en retard et des rappels...")
        
        check_overdue_invoices(db)
        check_overdue_tasks(db)
        check_critical_tasks(db)
        check_appointment_reminders(db)
        
        logger.info("✅ Vérification terminée")
    except Exception as e:
        logger.error(f"❌ Erreur lors de la vérification: {e}", exc_info=True)
    finally:
        db.close()


if __name__ == "__main__":
    main()

