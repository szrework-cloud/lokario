from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, cast, Integer
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.db.session import get_db
from app.db.models.user import User
from app.db.models.billing import Quote, Invoice, QuoteStatus, InvoiceStatus
from app.db.models.task import Task, TaskStatus
from app.db.models.followup import FollowUp, FollowUpHistory, FollowUpHistoryStatus
from app.db.models.conversation import Conversation
from app.api.deps import get_current_active_user
from app.db.retry import execute_with_retry
from pydantic import BaseModel

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardStats(BaseModel):
    # Temps gagné (mock pour l'instant, sera calculé plus tard)
    time_saved: dict
    
    # KPIs
    quotes_sent_this_month: int
    quotes_sent_last_month: int
    quotes_accepted: int
    quotes_accepted_rate: float
    
    monthly_revenue: float  # CA mensuel
    monthly_revenue_last_month: float
    
    overdue_invoices_count: int
    overdue_invoices_amount: float
    
    followups_sent_this_month: int
    
    tasks_completed_this_week: int
    
    # Graphiques
    monthly_billing: List[dict]  # [{label: str, value: float}]
    weekly_quotes: List[dict]  # [{label: str, value: int}]


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère toutes les statistiques pour le dashboard"""
    # Les super_admins n'ont pas accès au dashboard
    if current_user.role == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admins do not have access to dashboard"
        )
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    now = datetime.now()
    today = date.today()
    
    # Calculer les dates
    first_day_this_month = date(today.year, today.month, 1)
    first_day_last_month = (first_day_this_month - timedelta(days=1)).replace(day=1)
    last_day_last_month = first_day_this_month - timedelta(days=1)
    
    # Calculer le début de la semaine (lundi)
    days_since_monday = today.weekday()
    week_start = today - timedelta(days=days_since_monday)
    
    # ==================== DEVIS ====================
    # Devis envoyés ce mois-ci
    quotes_sent_this_month = db.query(Quote).filter(
        Quote.company_id == current_user.company_id,
        Quote.status.in_([QuoteStatus.ENVOYE, QuoteStatus.VU, QuoteStatus.ACCEPTE, QuoteStatus.REFUSE]),
        func.date(Quote.sent_at) >= first_day_this_month
    ).count()
    
    # Devis envoyés le mois dernier
    quotes_sent_last_month = db.query(Quote).filter(
        Quote.company_id == current_user.company_id,
        Quote.status.in_([QuoteStatus.ENVOYE, QuoteStatus.VU, QuoteStatus.ACCEPTE, QuoteStatus.REFUSE]),
        func.date(Quote.sent_at) >= first_day_last_month,
        func.date(Quote.sent_at) <= last_day_last_month
    ).count()
    
    # Devis acceptés ce mois-ci (basé sur accepted_at ou status si accepted_at n'est pas défini)
    quotes_accepted = db.query(Quote).filter(
        Quote.company_id == current_user.company_id,
        Quote.status == QuoteStatus.ACCEPTE,
        or_(
            func.date(Quote.accepted_at) >= first_day_this_month,
            and_(
                Quote.accepted_at.is_(None),
                func.date(Quote.updated_at) >= first_day_this_month
            )
        )
    ).count()
    
    # Taux d'acceptation (tous les devis acceptés ou refusés ce mois-ci)
    total_quotes_this_month = db.query(Quote).filter(
        Quote.company_id == current_user.company_id,
        Quote.status.in_([QuoteStatus.ACCEPTE, QuoteStatus.REFUSE]),
        func.date(Quote.sent_at) >= first_day_this_month
    ).count()
    
    quotes_accepted_rate = (quotes_accepted / total_quotes_this_month * 100) if total_quotes_this_month > 0 else 0.0
    
    # ==================== FACTURES ====================
    # CA mensuel (factures payées ce mois-ci)
    # Utiliser paid_at si disponible, sinon utiliser updated_at si le statut est PAYEE
    def _get_monthly_revenue():
        return db.query(func.sum(Invoice.total_ttc)).filter(
            Invoice.company_id == current_user.company_id,
            Invoice.status == InvoiceStatus.PAYEE,
            or_(
                and_(
                    Invoice.paid_at.isnot(None),
                    func.date(Invoice.paid_at) >= first_day_this_month
                ),
                and_(
                    Invoice.paid_at.is_(None),
                    func.date(Invoice.updated_at) >= first_day_this_month
                )
            )
        ).scalar() or Decimal('0')
    monthly_revenue = execute_with_retry(db, _get_monthly_revenue, max_retries=3, initial_delay=0.5, max_delay=2.0)
    
    # CA mois dernier
    def _get_monthly_revenue_last_month():
        return db.query(func.sum(Invoice.total_ttc)).filter(
            Invoice.company_id == current_user.company_id,
            Invoice.status == InvoiceStatus.PAYEE,
            or_(
                and_(
                    Invoice.paid_at.isnot(None),
                    func.date(Invoice.paid_at) >= first_day_last_month,
                    func.date(Invoice.paid_at) <= last_day_last_month
                ),
                and_(
                    Invoice.paid_at.is_(None),
                    func.date(Invoice.updated_at) >= first_day_last_month,
                    func.date(Invoice.updated_at) <= last_day_last_month
                )
            )
        ).scalar() or Decimal('0')
    monthly_revenue_last_month = execute_with_retry(db, _get_monthly_revenue_last_month, max_retries=3, initial_delay=0.5, max_delay=2.0)
    
    # Factures en retard (statut IMPAYEE avec due_date passée)
    # Inclure aussi les factures ENVOYEE en retard pour être plus complet
    def _get_overdue_invoices():
        return db.query(Invoice).filter(
            Invoice.company_id == current_user.company_id,
            Invoice.status.in_([InvoiceStatus.IMPAYEE, InvoiceStatus.ENVOYEE]),
            Invoice.due_date.isnot(None),
            func.date(Invoice.due_date) < today
        ).all()
    overdue_invoices = execute_with_retry(db, _get_overdue_invoices, max_retries=3, initial_delay=0.5, max_delay=2.0)
    
    overdue_invoices_count = len(overdue_invoices)
    overdue_invoices_amount = sum(float(inv.total_ttc or inv.amount or 0) for inv in overdue_invoices)
    
    # ==================== RELANCES ====================
    # Relances envoyées ce mois-ci
    def _get_followups_sent_this_month():
        return db.query(FollowUpHistory).filter(
            FollowUpHistory.company_id == current_user.company_id,
            FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE,
            func.date(FollowUpHistory.sent_at) >= first_day_this_month
        ).count()
    followups_sent_this_month = execute_with_retry(db, _get_followups_sent_this_month, max_retries=3, initial_delay=0.5, max_delay=2.0)
    
    # ==================== TÂCHES ====================
    # Tâches complétées cette semaine
    # Utiliser completed_at si disponible, sinon utiliser updated_at si le statut est TERMINE
    def _get_tasks_completed_this_week():
        return db.query(Task).filter(
            Task.company_id == current_user.company_id,
            Task.status == TaskStatus.TERMINE,
            or_(
                and_(
                    Task.completed_at.isnot(None),
                    func.date(Task.completed_at) >= week_start
                ),
                and_(
                    Task.completed_at.is_(None),
                    func.date(Task.updated_at) >= week_start
                )
            )
        ).count()
    tasks_completed_this_week = execute_with_retry(db, _get_tasks_completed_this_week, max_retries=3, initial_delay=0.5, max_delay=2.0)
    
    # ==================== GRAPHIQUES ====================
    # Montants facturés par mois (6 derniers mois)
    monthly_billing = []
    for i in range(5, -1, -1):  # 5 mois en arrière jusqu'à maintenant
        month_start = (first_day_this_month - timedelta(days=30*i)).replace(day=1)
        if month_start.month == 12:
            month_end = date(month_start.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(month_start.year, month_start.month + 1, 1) - timedelta(days=1)
        
        # Limiter à aujourd'hui si c'est le mois en cours
        if month_end > today:
            month_end = today
        
        month_revenue_query = db.query(func.sum(Invoice.total_ttc)).filter(
            Invoice.company_id == current_user.company_id,
            Invoice.status == InvoiceStatus.PAYEE,
            or_(
                and_(
                    Invoice.paid_at.isnot(None),
                    func.date(Invoice.paid_at) >= month_start,
                    func.date(Invoice.paid_at) <= month_end
                ),
                and_(
                    Invoice.paid_at.is_(None),
                    func.date(Invoice.updated_at) >= month_start,
                    func.date(Invoice.updated_at) <= month_end
                )
            )
        )
        month_revenue = month_revenue_query.scalar() or Decimal('0')
        
        month_names = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]
        monthly_billing.append({
            "label": month_names[month_start.month - 1],
            "value": float(month_revenue)
        })
    
    # Nombre de devis envoyés par semaine (4 dernières semaines)
    weekly_quotes = []
    for i in range(3, -1, -1):  # 3 semaines en arrière + semaine actuelle
        week_start_date = week_start - timedelta(weeks=i)
        week_end_date = week_start_date + timedelta(days=6)
        
        # Limiter à aujourd'hui si c'est la semaine en cours
        if week_end_date > today:
            week_end_date = today
        
        def _get_week_quotes_count():
            return db.query(Quote).filter(
                Quote.company_id == current_user.company_id,
                Quote.status.in_([QuoteStatus.ENVOYE, QuoteStatus.VU, QuoteStatus.ACCEPTE, QuoteStatus.REFUSE]),
                func.date(Quote.sent_at) >= week_start_date,
                func.date(Quote.sent_at) <= week_end_date
            ).count()
        week_quotes_count = execute_with_retry(db, _get_week_quotes_count, max_retries=3, initial_delay=0.5, max_delay=2.0)
        
        weekly_quotes.append({
            "label": f"Sem {4-i}",
            "value": week_quotes_count
        })
    
    # ==================== TEMPS GAGNÉ ====================
    # Calculer le temps gagné basé sur les actions automatisées
    
    # Trouver la première activité automatisée pour calculer le nombre réel de jours
    def _get_first_auto_followup():
        return db.query(func.min(FollowUpHistory.sent_at)).join(
            FollowUp, FollowUpHistory.followup_id == FollowUp.id
        ).filter(
            FollowUpHistory.company_id == current_user.company_id,
            FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE,
            FollowUp.auto_enabled == True
        ).scalar()
    first_auto_followup = execute_with_retry(db, _get_first_auto_followup, max_retries=3, initial_delay=0.5, max_delay=2.0)
    
    def _get_first_auto_reply():
        return db.query(func.min(Conversation.last_message_at)).filter(
            Conversation.company_id == current_user.company_id,
            Conversation.auto_reply_sent == True,
            Conversation.last_message_at.isnot(None)
        ).scalar()
    first_auto_reply = execute_with_retry(db, _get_first_auto_reply, max_retries=3, initial_delay=0.5, max_delay=2.0)
    
    def _get_first_auto_task():
        return db.query(func.min(Task.created_at)).filter(
            Task.company_id == current_user.company_id,
            Task.origin == "checklist"
        ).scalar()
    first_auto_task = execute_with_retry(db, _get_first_auto_task, max_retries=3, initial_delay=0.5, max_delay=2.0)
    
    # Trouver la date la plus ancienne parmi toutes les activités
    first_activity_date = None
    for activity_date in [first_auto_followup, first_auto_reply, first_auto_task]:
        if activity_date:
            date_only = activity_date.date() if isinstance(activity_date, datetime) else activity_date
            if first_activity_date is None or date_only < first_activity_date:
                first_activity_date = date_only
    
    # Si aucune activité trouvée, utiliser la date d'aujourd'hui (0 jour)
    if first_activity_date is None:
        actual_days = 1  # Au moins 1 jour pour éviter division par zéro
    else:
        actual_days = (today - first_activity_date).days + 1  # +1 pour inclure aujourd'hui
        # Limiter à 30 jours maximum pour l'affichage
        actual_days = min(actual_days, 30)
    
    # TOUJOURS limiter la recherche à exactement 30 jours pour le calcul du temps gagné
    # Peu importe quand la première activité a eu lieu, on ne compte que les 30 derniers jours
    activity_start_date = today - timedelta(days=29)  # 30 jours incluant aujourd'hui (0 à 29 = 30 jours)
    
    week_ago = today - timedelta(days=7)
    
    # 1. Relances automatiques envoyées
    # Estimation : 2 minutes par relance automatique
    def _get_auto_followups_30d():
        return db.query(FollowUpHistory).join(
            FollowUp, FollowUpHistory.followup_id == FollowUp.id
        ).filter(
            FollowUpHistory.company_id == current_user.company_id,
            FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE,
            FollowUp.auto_enabled == True,
            func.date(FollowUpHistory.sent_at) >= activity_start_date
        ).count()
    auto_followups_30d = execute_with_retry(db, _get_auto_followups_30d, max_retries=3, initial_delay=0.5, max_delay=2.0)
    time_from_auto_followups_30d = auto_followups_30d * 2  # minutes
    
    # 2. Réponses automatiques inbox
    # Estimation : 2 minutes par réponse automatique
    def _get_auto_replies_30d():
        return db.query(Conversation).filter(
            Conversation.company_id == current_user.company_id,
            Conversation.auto_reply_sent == True,
            Conversation.last_message_at.isnot(None),
            func.date(Conversation.last_message_at) >= activity_start_date
        ).count()
    auto_replies_30d = execute_with_retry(db, _get_auto_replies_30d, max_retries=3, initial_delay=0.5, max_delay=2.0)
    time_from_auto_replies_30d = auto_replies_30d * 2  # minutes
    
    # 3. Tâches créées automatiquement depuis les checklists
    # Estimation : 1 minute par tâche programmée (création manuelle simplifiée)
    # Ne compter que les tâches dont la date d'échéance est passée ou aujourd'hui (pas les tâches futures)
    def _get_auto_tasks_30d():
        return db.query(Task).filter(
            Task.company_id == current_user.company_id,
            Task.origin == "checklist",
            func.date(Task.created_at) >= activity_start_date,
            or_(
                Task.due_date.is_(None),  # Tâches sans date d'échéance
                func.date(Task.due_date) <= today  # Tâches dont l'échéance est passée ou aujourd'hui
            )
        ).count()
    auto_tasks_30d = execute_with_retry(db, _get_auto_tasks_30d, max_retries=3, initial_delay=0.5, max_delay=2.0)
    time_from_auto_tasks_30d = auto_tasks_30d * 1  # minutes (réduit à 1 min pour les tâches programmées)
    
    # Total temps gagné en minutes (calcul initial)
    total_minutes_30d = time_from_auto_followups_30d + time_from_auto_replies_30d + time_from_auto_tasks_30d
    
    # Vérifier si toutes les activités sont d'aujourd'hui
    # Si oui, on ajuste actual_days à 1 pour afficher "aujourd'hui"
    activities_today_count = db.query(FollowUpHistory).join(
        FollowUp, FollowUpHistory.followup_id == FollowUp.id
    ).filter(
        FollowUpHistory.company_id == current_user.company_id,
        FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE,
        FollowUp.auto_enabled == True,
        func.date(FollowUpHistory.sent_at) == today
    ).count() + db.query(Conversation).filter(
        Conversation.company_id == current_user.company_id,
        Conversation.auto_reply_sent == True,
        Conversation.last_message_at.isnot(None),
        func.date(Conversation.last_message_at) == today
    ).count() + db.query(Task).filter(
        Task.company_id == current_user.company_id,
        Task.origin == "checklist",
        func.date(Task.created_at) == today,
        or_(
            Task.due_date.is_(None),
            func.date(Task.due_date) <= today
        )
    ).count()
    
    total_activities_count = auto_followups_30d + auto_replies_30d + auto_tasks_30d
    
    # Si toutes les activités sont d'aujourd'hui, afficher "aujourd'hui"
    if total_activities_count > 0 and activities_today_count == total_activities_count:
        actual_days = 1
    
    total_hours_30d = total_minutes_30d // 60
    remaining_minutes_30d = total_minutes_30d % 60
    
    # Temps gagné cette semaine
    auto_followups_week = db.query(FollowUpHistory).join(
        FollowUp, FollowUpHistory.followup_id == FollowUp.id
    ).filter(
        FollowUpHistory.company_id == current_user.company_id,
        FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE,
        FollowUp.auto_enabled == True,
        func.date(FollowUpHistory.sent_at) >= week_ago
    ).count()
    auto_replies_week = db.query(Conversation).filter(
        Conversation.company_id == current_user.company_id,
        Conversation.auto_reply_sent == True,
        Conversation.last_message_at.isnot(None),
        func.date(Conversation.last_message_at) >= week_ago
    ).count()
    auto_tasks_week = db.query(Task).filter(
        Task.company_id == current_user.company_id,
        Task.origin == "checklist",
        func.date(Task.created_at) >= week_ago,
        or_(
            Task.due_date.is_(None),
            func.date(Task.due_date) <= today
        )
    ).count()
    
    total_minutes_week = (auto_followups_week * 2) + (auto_replies_week * 2) + (auto_tasks_week * 1)
    total_hours_week = total_minutes_week // 60
    remaining_minutes_week = total_minutes_week % 60
    
    # Temps gagné ce mois
    auto_followups_month = db.query(FollowUpHistory).join(
        FollowUp, FollowUpHistory.followup_id == FollowUp.id
    ).filter(
        FollowUpHistory.company_id == current_user.company_id,
        FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE,
        FollowUp.auto_enabled == True,
        func.date(FollowUpHistory.sent_at) >= first_day_this_month
    ).count()
    auto_replies_month = db.query(Conversation).filter(
        Conversation.company_id == current_user.company_id,
        Conversation.auto_reply_sent == True,
        Conversation.last_message_at.isnot(None),
        func.date(Conversation.last_message_at) >= first_day_this_month
    ).count()
    auto_tasks_month = db.query(Task).filter(
        Task.company_id == current_user.company_id,
        Task.origin == "checklist",
        func.date(Task.created_at) >= first_day_this_month,
        or_(
            Task.due_date.is_(None),
            func.date(Task.due_date) <= today
        )
    ).count()
    
    total_minutes_month = (auto_followups_month * 2) + (auto_replies_month * 2) + (auto_tasks_month * 1)
    total_hours_month = total_minutes_month // 60
    remaining_minutes_month = total_minutes_month % 60
    
    # Adapter la description selon le nombre réel de jours
    # Si toutes les activités sont d'aujourd'hui, on vérifie s'il y a vraiment des activités aujourd'hui
    if actual_days == 1 or (first_activity_date is not None and first_activity_date == today):
        description = "Temps gagné grâce à l'automatisation et l'IA aujourd'hui"
        # Ajuster actual_days à 1 si nécessaire
        if actual_days != 1:
            actual_days = 1
    elif actual_days < 30:
        description = f"Temps gagné grâce à l'automatisation et l'IA sur les {actual_days} derniers jours"
    else:
        description = "Temps gagné grâce à l'automatisation et l'IA sur les 30 derniers jours"
    
    time_saved = {
        "total": {
            "hours": int(total_hours_30d),
            "minutes": int(remaining_minutes_30d)
        },
        "thisWeek": {
            "hours": int(total_hours_week),
            "minutes": int(remaining_minutes_week)
        },
        "thisMonth": {
            "hours": int(total_hours_month),
            "minutes": int(remaining_minutes_month)
        },
        "description": description,
        "actual_days": actual_days  # Nombre réel de jours pour le calcul de la moyenne
    }
    
    return DashboardStats(
        time_saved=time_saved,
        quotes_sent_this_month=quotes_sent_this_month,
        quotes_sent_last_month=quotes_sent_last_month,
        quotes_accepted=quotes_accepted,
        quotes_accepted_rate=round(quotes_accepted_rate, 1),
        monthly_revenue=float(monthly_revenue),
        monthly_revenue_last_month=float(monthly_revenue_last_month),
        overdue_invoices_count=overdue_invoices_count,
        overdue_invoices_amount=overdue_invoices_amount,
        followups_sent_this_month=followups_sent_this_month,
        tasks_completed_this_week=tasks_completed_this_week,
        monthly_billing=monthly_billing,
        weekly_quotes=weekly_quotes
    )

