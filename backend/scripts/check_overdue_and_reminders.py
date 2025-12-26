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
    """Vérifie les relances automatiques de rendez-vous et les envoie si nécessaire"""
    from app.db.models.followup import FollowUp, FollowUpType, FollowUpStatus
    from app.db.models.appointment import Appointment
    from datetime import timezone
    
    now = datetime.now(timezone.utc)
    
    # Trouver toutes les relances de type RAPPEL_RDV qui sont actives et dont la due_date est atteinte
    appointment_followups = db.query(FollowUp).filter(
        FollowUp.type == FollowUpType.RAPPEL_RDV,
        FollowUp.status == FollowUpStatus.A_FAIRE,
        FollowUp.auto_enabled == True,
        FollowUp.due_date <= now  # La date de relance est atteinte ou dépassée
    ).all()
    
    logger.info(f"📅 {len(appointment_followups)} relance(s) de rendez-vous à traiter")
    
    # Importer les fonctions nécessaires depuis send_automatic_followups
    try:
        from scripts.send_automatic_followups import should_send_followup, generate_followup_message, send_followup_via_inbox
    except ImportError:
        logger.error("❌ Impossible d'importer les fonctions de send_automatic_followups")
        return
    
    sent_count = 0
    for followup in appointment_followups:
        try:
            # Vérifier si le rendez-vous existe toujours et n'est pas annulé
            appointment = db.query(Appointment).filter(
                Appointment.id == followup.source_id,
                Appointment.company_id == followup.company_id
            ).first()
            
            if not appointment:
                logger.info(f"Relance {followup.id}: Rendez-vous {followup.source_id} introuvable, marquage comme FAIT")
                followup.status = FollowUpStatus.FAIT
                db.commit()
                continue
            
            if appointment.status == AppointmentStatus.CANCELLED:
                logger.info(f"Relance {followup.id}: Rendez-vous {appointment.id} annulé, marquage comme FAIT")
                followup.status = FollowUpStatus.FAIT
                db.commit()
                continue
            
            # Vérifier si le rendez-vous est déjà passé
            if appointment.start_date_time < now:
                logger.info(f"Relance {followup.id}: Rendez-vous {appointment.id} déjà passé, marquage comme FAIT")
                followup.status = FollowUpStatus.FAIT
                db.commit()
                continue
            
            # Vérifier si on doit envoyer la relance (pour les rendez-vous, on vérifie les heures avant)
            # La due_date est calculée comme start_date_time - hours_before
            time_until_appointment = appointment.start_date_time - now
            hours_until = time_until_appointment.total_seconds() / 3600
            
            # Pour les rendez-vous, on envoie la relance si on est proche de la due_date (dans une fenêtre de 1h)
            time_since_due = (now - followup.due_date).total_seconds() / 3600
            if time_since_due < 0 or time_since_due > 1:
                # Pas encore le moment ou trop tard
                continue
            
            # Générer le message de relance
            message = generate_followup_message(followup, db)
            
            if not message:
                logger.warning(f"Relance {followup.id}: Impossible de générer le message")
                continue
            
            # Envoyer la relance via inbox (email/SMS)
            success, conversation_id = send_followup_via_inbox(followup, message, "email", db)
            
            if success:
                sent_count += 1
                logger.info(f"✅ Relance de rendez-vous {followup.id} envoyée avec succès")
            else:
                logger.warning(f"⚠️ Relance de rendez-vous {followup.id} non envoyée")
                
        except Exception as e:
            logger.error(f"❌ Erreur lors du traitement de la relance {followup.id}: {e}", exc_info=True)
    
    if sent_count > 0:
        logger.info(f"✅ {sent_count} relance(s) de rendez-vous envoyée(s)")


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

