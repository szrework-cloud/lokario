from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func as sql_func
from typing import List, Optional
from datetime import datetime, date, timedelta

from app.db.session import get_db
from app.db.retry import execute_with_retry
from app.db.models.task import Task, TaskType, TaskStatus
from app.db.models.user import User
from app.api.schemas.task import (
    TaskCreate, TaskUpdate, TaskRead, TaskStats, EmployeeRead
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _check_company_access(current_user: User):
    """Vérifier que l'utilisateur est attaché à une entreprise (les super_admin n'ont pas accès)"""
    # Les super_admins n'ont pas accès aux tâches
    if current_user.role == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admins do not have access to tasks"
        )
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )


def _can_access_task(task: Task, current_user: User) -> bool:
    """Vérifier si l'utilisateur peut accéder à cette tâche"""
    # Les super_admins n'ont pas accès aux tâches
    if current_user.role == "super_admin":
        return False
    # Vérifier que la tâche appartient à la même entreprise
    if task.company_id != current_user.company_id:
        return False
    # Les users ne peuvent voir que leurs tâches assignées
    if current_user.role == "user":
        return task.assigned_to_id == current_user.id
    # Les owners peuvent voir toutes les tâches de l'entreprise
    return True


def _calculate_late_status(task: Task) -> TaskStatus:
    """Calculer automatiquement le statut 'En retard' si nécessaire"""
    # Gérer les cas où task.status peut être une string (SQLite) ou un Enum
    current_status = task.status
    if isinstance(current_status, str):
        try:
            current_status = TaskStatus(current_status)
        except (ValueError, AttributeError):
            # Si ce n'est pas une valeur valide, retourner le statut par défaut
            current_status = TaskStatus.A_FAIRE
    
    # S'assurer qu'on a un Enum
    if not isinstance(current_status, TaskStatus):
        try:
            current_status = TaskStatus(str(current_status))
        except (ValueError, AttributeError):
            current_status = TaskStatus.A_FAIRE
    
    if current_status == TaskStatus.TERMINE:
        return current_status
    
    if task.due_date:
        now = datetime.now(task.due_date.tzinfo) if task.due_date.tzinfo else datetime.now()
        # Pour les tâches du jour, comparer avec la fin de journée (23:59:59) au lieu de l'heure actuelle
        # Cela évite que les tâches créées aujourd'hui soient immédiatement marquées comme en retard
        due_date_only = task.due_date.date()
        today = date.today()
        
        if due_date_only < today:
            # Tâche avec due_date dans le passé -> en retard
            return TaskStatus.EN_RETARD
        elif due_date_only == today:
            # Tâche du jour -> pas en retard tant que la journée n'est pas terminée
            # Si la tâche a une due_time, on peut la considérer en retard si l'heure est passée
            # Sinon, on considère qu'elle n'est pas en retard aujourd'hui
            if task.due_time:
                # Si due_time est défini, comparer avec l'heure actuelle
                from datetime import time
                current_time = now.time()
                if current_time > task.due_time:
                    return TaskStatus.EN_RETARD
            # Pas de due_time ou heure pas encore passée -> pas en retard
            return current_status
        else:
            # Tâche future -> pas en retard
            return current_status
    
    return current_status


# ==================== ROUTES SPÉCIFIQUES (AVANT /{task_id}) ====================

@router.get("/today", response_model=List[TaskRead])
def get_today_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère les tâches du jour (inclut les tâches générées par checklist)"""
    try:
        _check_company_access(current_user)
        
        # Nettoyer automatiquement les tâches complétées le jour précédent
        cleanup_completed_tasks(db, current_user.company_id)
        
        today = date.today()
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())
        
        # Base query : filtrer par company_id
        query = db.query(Task).filter(Task.company_id == current_user.company_id)
        
        # Les users ne voient que leurs tâches
        if current_user.role == "user":
            query = query.filter(Task.assigned_to_id == current_user.id)
        
        # Filtrer les tâches du jour :
        # 1. Tâches avec due_date aujourd'hui
        # 2. Tâches générées par checklist (checklist_instance_id avec started_at aujourd'hui)
        from app.db.models.checklist import ChecklistInstance
        
        # Récupérer les IDs des instances de checklist créées aujourd'hui
        today_checklist_instance_ids = db.query(ChecklistInstance.id).filter(
            ChecklistInstance.company_id == current_user.company_id,
            sql_func.date(ChecklistInstance.started_at) == today
        ).all()
        today_instance_ids = [row[0] for row in today_checklist_instance_ids] if today_checklist_instance_ids else []
        
        # Construire le filtre
        filters = []
        # Tâches avec due_date aujourd'hui (inclut les tâches de checklist avec due_date aujourd'hui)
        filters.append(and_(Task.due_date >= start_of_day, Task.due_date <= end_of_day))
        # Tâches générées par checklist (instance créée aujourd'hui)
        if today_instance_ids:
            filters.append(Task.checklist_instance_id.in_(today_instance_ids))
        
        if filters:
            query = query.filter(or_(*filters))
        
        query = query.options(
            joinedload(Task.assigned_to),
            joinedload(Task.client),
            joinedload(Task.project),
            joinedload(Task.conversation)
        )
        
        # Trier par due_time puis par priorité (gérer les valeurs NULL)
        # SQLite ne supporte pas nullslast(), donc on utilise une approche différente
        tasks = query.order_by(Task.due_time.asc(), Task.priority.desc()).all()
        
        # Calculer le statut "En retard"
        for task in tasks:
            try:
                new_status = _calculate_late_status(task)
                # Comparer les valeurs (string ou Enum)
                current_status_value = task.status.value if hasattr(task.status, 'value') else str(task.status)
                new_status_value = new_status.value  # new_status est toujours un Enum maintenant
                if new_status_value != current_status_value:
                    task.status = new_status
                    db.commit()
                    db.refresh(task)
            except Exception as e:
                # Si erreur lors du calcul du statut, continuer avec la tâche suivante
                continue
        
        return [TaskRead.from_orm_with_relations(task) for task in tasks]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des tâches du jour: {str(e)}"
        )


@router.get("/recent", response_model=List[TaskRead])
def get_recent_tasks(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère les tâches récemment créées"""
    try:
        _check_company_access(current_user)
        
        # Base query : filtrer par company_id
        query = db.query(Task).filter(Task.company_id == current_user.company_id)
        
        # Les users ne voient que leurs tâches
        if current_user.role == "user":
            query = query.filter(Task.assigned_to_id == current_user.id)
        
        # Trier par date de création décroissante (les plus récentes en premier)
        query = query.options(
            joinedload(Task.assigned_to),
            joinedload(Task.client),
            joinedload(Task.project),
            joinedload(Task.conversation)
        ).order_by(Task.created_at.desc()).limit(limit)
        
        tasks = query.all()
        
        # Calculer le statut "En retard" pour chaque tâche
        for task in tasks:
            try:
                new_status = _calculate_late_status(task)
                current_status_value = task.status.value if hasattr(task.status, 'value') else str(task.status)
                new_status_value = new_status.value
                if new_status_value != current_status_value:
                    task.status = new_status
                    db.commit()
                    db.refresh(task)
            except Exception as e:
                continue
        
        return [TaskRead.from_orm_with_relations(task) for task in tasks]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des tâches récentes: {str(e)}"
        )


@router.get("/priorities", response_model=dict)
def get_priority_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère les tâches groupées par priorité (MVP V1: critical, high, normal)"""
    try:
        _check_company_access(current_user)
        
        query = db.query(Task).filter(Task.company_id == current_user.company_id)
        
        # Les users ne voient que leurs tâches
        if current_user.role == "user":
            query = query.filter(Task.assigned_to_id == current_user.id)
        
        # Filtrer les tâches non terminées
        query = query.filter(
            Task.status != TaskStatus.TERMINE.value
        )
        
        query = query.options(
            joinedload(Task.assigned_to),
            joinedload(Task.client),
            joinedload(Task.project),
            joinedload(Task.conversation)
        )
        
        tasks = query.all()
        
        # Grouper par priorité MVP V1 (3 niveaux uniquement)
        grouped = {
            "critical": [],
            "high": [],
            "normal": [],
        }
        
        # Fonction pour mapper les anciennes priorités vers les nouvelles
        def normalize_priority(priority: Optional[str]) -> str:
            """Mapper les anciennes priorités vers MVP V1 (normal, high, critical)"""
            if not priority:
                return "normal"
            priority_lower = priority.lower()
            priority_map = {
                "low": "normal",
                "medium": "normal",
                "urgent": "high",
                "high": "high",
                "critical": "critical",
                "normal": "normal",
            }
            return priority_map.get(priority_lower, "normal")
        
        for task in tasks:
            try:
                new_status = _calculate_late_status(task)
                # Comparer les valeurs (string ou Enum)
                current_status_value = task.status.value if hasattr(task.status, 'value') else str(task.status)
                new_status_value = new_status.value  # new_status est toujours un Enum maintenant
                if new_status_value != current_status_value:
                    task.status = new_status
                    db.commit()
                    db.refresh(task)
                
                # Normaliser la priorité vers MVP V1
                normalized_priority = normalize_priority(task.priority)
                grouped[normalized_priority].append(TaskRead.from_orm_with_relations(task))
            except Exception as e:
                # Si erreur avec une tâche, continuer avec la suivante
                continue
        
        # Calculer les alertes admin (uniquement pour admin/owner)
        admin_alerts = {}
        if current_user.role in ["super_admin", "owner"]:
            from app.db.models.checklist import ChecklistInstance
            from datetime import date
            
            def _get_status_value(status):
                """Extraire la valeur du statut (Enum ou string)"""
                if status is None:
                    return None
                if isinstance(status, str):
                    return status
                elif hasattr(status, 'value'):
                    return status.value
                else:
                    return str(status)
            
            def _get_status_value_local(status):
                """Extraire la valeur du statut (Enum ou string)"""
                if status is None:
                    return None
                if isinstance(status, str):
                    return status
                elif hasattr(status, 'value'):
                    return status.value
                else:
                    return str(status)
            
            # Tâches critiques non faites
            critical_not_done = len([t for t in tasks if normalize_priority(t.priority) == "critical" and _get_status_value_local(t.status) != TaskStatus.TERMINE.value])
            
            # Tâches en retard
            late_count = len([t for t in tasks if _get_status_value_local(t.status) == TaskStatus.EN_RETARD.value])
            
            # Routines non terminées (checklist instances en cours aujourd'hui)
            today = date.today()
            routines_not_done = db.query(ChecklistInstance).filter(
                ChecklistInstance.company_id == current_user.company_id,
                ChecklistInstance.status == "en_cours",
                sql_func.date(ChecklistInstance.started_at) == today
            ).count()
            
            admin_alerts = {
                "critical_not_done": critical_not_done,
                "late_count": late_count,
                "routines_not_done": routines_not_done,
            }
        
        return {
            "critical": grouped["critical"],
            "high": grouped["high"],
            "normal": grouped["normal"],
            "admin_alerts": admin_alerts if admin_alerts else None,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des tâches par priorité: {str(e)}"
        )


@router.get("/stats", response_model=TaskStats)
def get_task_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère les statistiques des tâches"""
    try:
        _check_company_access(current_user)
        
        query = db.query(Task).filter(Task.company_id == current_user.company_id)
        
        # Les users ne voient que leurs tâches
        if current_user.role == "user":
            query = query.filter(Task.assigned_to_id == current_user.id)
        
        all_tasks = query.all()
        
        # Calculer le statut "En retard" pour toutes les tâches
        for task in all_tasks:
            try:
                new_status = _calculate_late_status(task)
                # Comparer les valeurs (string ou Enum)
                current_status_value = task.status.value if hasattr(task.status, 'value') else str(task.status)
                new_status_value = new_status.value  # new_status est toujours un Enum maintenant
                if new_status_value != current_status_value:
                    task.status = new_status
                    db.commit()
                    db.refresh(task)
            except Exception as e:
                # Si erreur avec une tâche, continuer avec la suivante
                continue
        
        # Statistiques simplifiées pour MVP V1
        def _get_status_value(status):
            """Extraire la valeur du statut (Enum ou string)"""
            if status is None:
                return None
            if isinstance(status, str):
                return status
            elif hasattr(status, 'value'):
                return status.value
            else:
                return str(status)
        
        total = len(all_tasks)
        completed = sum(1 for t in all_tasks if _get_status_value(t.status) == TaskStatus.TERMINE.value)
        late = sum(1 for t in all_tasks if _get_status_value(t.status) == TaskStatus.EN_RETARD.value)
        
        return TaskStats(
            total=total,
            completed=completed,
            late=late
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des statistiques: {str(e)}"
        )


@router.get("/employees", response_model=List[EmployeeRead])
def get_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère la liste des employés de l'entreprise (pour les dropdowns)"""
    try:
        _check_company_access(current_user)
        
        employees = db.query(User).filter(
            User.company_id == current_user.company_id,
            User.is_active == True
        ).order_by(User.full_name.asc(), User.email.asc()).all()
        
        return [EmployeeRead.model_validate(emp) for emp in employees]
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting employees: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting employees: {str(e)}"
        )


# ==================== ROUTES CRUD ====================

@router.get("", response_model=List[TaskRead])
def get_tasks(
    skip: Optional[int] = Query(None, ge=0),
    limit: Optional[int] = Query(None, ge=1, le=1000),
    status: Optional[str] = Query(None, description="Filtrer par statut"),
    priority: Optional[str] = Query(None, description="Filtrer par priorité"),
    category: Optional[str] = Query(None, description="Filtrer par catégorie (Interne, Client, Fournisseur)"),
    assigned_to_id: Optional[int] = Query(None, description="Filtrer par utilisateur assigné"),
    client_id: Optional[int] = Query(None, description="Filtrer par client"),
    project_id: Optional[int] = Query(None, description="Filtrer par projet"),
    conversation_id: Optional[int] = Query(None, description="Filtrer par conversation"),
    search: Optional[str] = Query(None, description="Recherche dans titre et description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère la liste des tâches avec filtres"""
    _check_company_access(current_user)
    
    # Nettoyer automatiquement les tâches complétées le jour précédent
    cleanup_completed_tasks(db, current_user.company_id)
    
    # Appliquer les valeurs par défaut manuellement pour éviter les erreurs de parsing
    skip = skip if skip is not None else 0
    limit = limit if limit is not None else 100
    
    # Base query : filtrer par company_id
    query = db.query(Task).filter(Task.company_id == current_user.company_id)
    
    # Les users ne voient que leurs tâches assignées
    if current_user.role == "user":
        query = query.filter(Task.assigned_to_id == current_user.id)
    
    # Filtres
    if status:
        try:
            status_enum = TaskStatus(status)
            query = query.filter(Task.status == status_enum)
        except ValueError:
            pass
    
    if priority:
        query = query.filter(Task.priority == priority)
    
    if category:
        # Mapper category vers TaskType
        category_map = {
            "Interne": TaskType.INTERNE,
            "Client": TaskType.CLIENT,
            "Fournisseur": TaskType.FOURNISSEUR,
        }
        task_type = category_map.get(category)
        if task_type:
            query = query.filter(Task.type == task_type)
    
    if assigned_to_id:
        query = query.filter(Task.assigned_to_id == assigned_to_id)
    
    if client_id:
        query = query.filter(Task.client_id == client_id)
    
    if project_id:
        query = query.filter(Task.project_id == project_id)
    
    if conversation_id:
        query = query.filter(Task.conversation_id == conversation_id)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                Task.title.ilike(search_term),
                Task.description.ilike(search_term)
            )
        )
    
    # Charger les relations
    query = query.options(
        joinedload(Task.assigned_to),
        joinedload(Task.client),
        joinedload(Task.project),
        joinedload(Task.conversation)
    )
    
    # Calculer le statut "En retard" pour chaque tâche
    tasks = query.order_by(Task.due_date.asc(), Task.priority.desc()).offset(skip).limit(limit).all()
    
    # Mettre à jour le statut si nécessaire (même logique que get_priority_tasks)
    for task in tasks:
        try:
            new_status = _calculate_late_status(task)
            # Comparer les valeurs (string ou Enum) de manière robuste
            current_status_value = task.status.value if hasattr(task.status, 'value') else str(task.status)
            new_status_value = new_status.value  # new_status est toujours un Enum maintenant
            if new_status_value != current_status_value:
                task.status = new_status
                db.commit()
                db.refresh(task)
        except Exception as e:
            # Si erreur avec une tâche, continuer avec la suivante
            continue
    
    return [TaskRead.from_orm_with_relations(task) for task in tasks]


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère une tâche spécifique"""
    _check_company_access(current_user)
    
    task = db.query(Task).options(
        joinedload(Task.assigned_to),
        joinedload(Task.client),
        joinedload(Task.project),
        joinedload(Task.conversation)
    ).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    if not _can_access_task(task, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Calculer le statut "En retard" si nécessaire
    new_status = _calculate_late_status(task)
    if new_status != task.status:
        task.status = new_status
        db.commit()
        db.refresh(task)
    
    return TaskRead.from_orm_with_relations(task)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée une nouvelle tâche"""
    _check_company_access(current_user)
    company_id = current_user.company_id
    
    # Si l'utilisateur est un "user" et qu'aucune assignation n'est spécifiée, assigner automatiquement à lui
    assigned_to_id = task_data.assigned_to_id
    if current_user.role == "user" and not assigned_to_id:
        assigned_to_id = current_user.id
    
    # Valider que assigned_to_id appartient à la même entreprise (si spécifié)
    if assigned_to_id:
        assigned_user = db.query(User).filter(
            User.id == assigned_to_id,
            User.company_id == company_id
        ).first()
        if not assigned_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user not found or not in same company"
            )
    
    # Valider client_id si fourni
    if task_data.client_id:
        from app.db.models.client import Client
        client = db.query(Client).filter(
            Client.id == task_data.client_id,
            Client.company_id == company_id
        ).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client not found or not in same company"
            )
    
    # Valider project_id si fourni
    if task_data.project_id:
        from app.db.models.project import Project
        project = db.query(Project).filter(
            Project.id == task_data.project_id,
            Project.company_id == company_id
        ).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project not found or not in same company"
            )
    
    # Valider conversation_id si fourni
    if task_data.conversation_id:
        from app.db.models.conversation import Conversation
        conversation = db.query(Conversation).filter(
            Conversation.id == task_data.conversation_id,
            Conversation.company_id == company_id
        ).first()
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conversation not found or not in same company"
            )
    
    # Si une date est fournie et que la récurrence est "none", créer une seule tâche
    # Sinon, générer les tâches récurrentes
    recurrence = task_data.recurrence or "none"
    recurrence_days = task_data.recurrence_days or []
    
    if task_data.due_date and recurrence == "none":
        # Tâche unique avec date spécifique
        task = Task(
            company_id=company_id,
            title=task_data.title,
            description=task_data.description,
            assigned_to_id=assigned_to_id,
            client_id=task_data.client_id,
            project_id=task_data.project_id,
            conversation_id=task_data.conversation_id,
            type=task_data.get_task_type(),
            priority=task_data.priority,
            due_date=task_data.due_date,
            due_time=task_data.due_time,
            recurrence="none",
            origin="manual",
            created_by_id=current_user.id,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        
        # Vérifier si la tâche est critique (échéance proche) et créer une notification
        if task.due_date:
            from datetime import date, timedelta
            today = date.today()
            days_until_due = (task.due_date - today).days
            
            # Tâche critique si échéance dans les 2 jours et priorité haute/critique
            if days_until_due <= 2 and task.priority in ["high", "critical", "urgent"]:
                try:
                    from app.core.notifications import create_notification
                    from app.db.models.notification import NotificationType
                    from app.core.config import settings
                    
                    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                    due_str = task.due_date.strftime('%d/%m/%Y')
                    if task.due_time:
                        due_str += f" à {task.due_time.strftime('%H:%M')}"
                    
                    create_notification(
                        db=db,
                        company_id=company_id,
                        notification_type=NotificationType.TASK_CRITICAL,
                        title="Tâche critique à venir",
                        message=f"La tâche '{task.title}' est due le {due_str} (priorité {task.priority})",
                        link_url=f"{frontend_url}/app/tasks",
                        link_text="Voir les tâches",
                        source_type="task",
                        source_id=task.id,
                        user_id=assigned_to_id,  # Notifier l'utilisateur assigné
                    )
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"✅ Notification créée pour la tâche critique {task.id}")
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Erreur lors de la création de la notification pour la tâche {task.id}: {e}")
    else:
        # Tâche récurrente : générer toutes les occurrences futures
        from datetime import date, datetime, timedelta
        today = date.today()
        
        # Calculer les dates d'exécution selon la récurrence
        execution_dates = []
        
        if recurrence == "daily":
            # Créer les tâches pour les 30 prochains jours
            for i in range(30):
                execution_dates.append(today + timedelta(days=i))
                
        elif recurrence == "weekly":
            if recurrence_days and len(recurrence_days) > 0:
                # Créer les tâches pour les 52 prochaines semaines (1 an) sur les jours spécifiés
                start_date = today
                end_date = start_date + timedelta(weeks=52)
                current_date = start_date
                while current_date <= end_date:
                    weekday_python = current_date.weekday()  # 0 = lundi, 6 = dimanche
                    weekday_model = (weekday_python + 1) % 7  # Convertir en format modèle : 0 = dimanche, 6 = samedi
                    if weekday_model in recurrence_days:
                        execution_dates.append(current_date)
                    current_date += timedelta(days=1)
            else:
                # Si weekly mais pas de jours spécifiés, créer pour tous les lundis
                start_date = today
                end_date = start_date + timedelta(weeks=52)
                current_date = start_date
                while current_date <= end_date:
                    if current_date.weekday() == 0:  # Lundi
                        execution_dates.append(current_date)
                    current_date += timedelta(days=1)
                    
        elif recurrence == "monthly":
            # Créer les tâches pour les 12 prochains mois
            for i in range(12):
                execution_dates.append(today + timedelta(days=i * 30))
        else:
            # Aucune récurrence ou récurrence inconnue : créer une seule tâche pour aujourd'hui
            execution_dates.append(today)
        
        # Créer toutes les tâches
        tasks_to_create = []
        for execution_date in execution_dates:
            task = Task(
                company_id=company_id,
                title=task_data.title,
                description=task_data.description,
                assigned_to_id=assigned_to_id,
                client_id=task_data.client_id,
                project_id=task_data.project_id,
                conversation_id=task_data.conversation_id,
                type=task_data.get_task_type(),
                priority=task_data.priority,
                due_date=datetime.combine(execution_date, task_data.due_time if task_data.due_time else datetime.min.time()) if task_data.due_time else datetime.combine(execution_date, datetime.min.time()),
                due_time=task_data.due_time,
                recurrence=recurrence,
                origin="manual",
                created_by_id=current_user.id,
            )
            if recurrence_days:
                task.set_recurrence_days(recurrence_days)
            tasks_to_create.append(task)
        
        # Ajouter toutes les tâches à la session
        for task in tasks_to_create:
            db.add(task)
        db.commit()
        
        # Utiliser la première tâche créée pour la réponse
        task = tasks_to_create[0]
        db.refresh(task)
    
    # Charger les relations
    task = db.query(Task).options(
        joinedload(Task.assigned_to),
        joinedload(Task.client),
        joinedload(Task.project),
        joinedload(Task.conversation)
    ).filter(Task.id == task.id).first()
    
    return TaskRead.from_orm_with_relations(task)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour une tâche"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        _check_company_access(current_user)
        
        task = db.query(Task).filter(Task.id == task_id).first()
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        if not _can_access_task(task, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Mettre à jour les champs
        update_data = task_data.model_dump(exclude_unset=True)
        
        # Gérer le mapping category -> type
        if "category" in update_data:
            category = update_data.pop("category")
            category_map = {
                "Interne": TaskType.INTERNE,
                "Client": TaskType.CLIENT,
                "Fournisseur": TaskType.FOURNISSEUR,
                "Administratif": TaskType.INTERNE,
            }
            if category in category_map:
                update_data["type"] = category_map[category]
        
        # Gérer le mapping type string -> Enum
        if "type" in update_data and isinstance(update_data["type"], str):
        type_map = {
            "Interne": TaskType.INTERNE,
            "Client": TaskType.CLIENT,
            "Fournisseur": TaskType.FOURNISSEUR,
        }
        if update_data["type"] in type_map:
            update_data["type"] = type_map[update_data["type"]]
        
        # Gérer le statut
        if "status" in update_data:
        try:
            update_data["status"] = TaskStatus(update_data["status"])
            # Si on marque comme terminé, mettre completed_at
            if update_data["status"] == TaskStatus.TERMINE and not task.completed_at:
                update_data["completed_at"] = datetime.now()
            # Si on décoche (change de TERMINE vers autre chose), enlever completed_at
            elif task.status == TaskStatus.TERMINE and update_data["status"] != TaskStatus.TERMINE:
                update_data["completed_at"] = None
        except ValueError:
            del update_data["status"]
        
        # Valider les foreign keys
        if "assigned_to_id" in update_data and update_data["assigned_to_id"]:
        # Vérifier que l'utilisateur assigné appartient à la même entreprise
        assigned_user = db.query(User).filter(
            User.id == update_data["assigned_to_id"],
            User.company_id == current_user.company_id
        ).first()
            if not assigned_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned user not found or not in same company"
                )
        
        # Gérer recurrence_days avant setattr (champ spécial)
        if "recurrence_days" in update_data:
            recurrence_days = update_data.pop("recurrence_days")
            task.set_recurrence_days(recurrence_days)
        
        # Filtrer les champs qui n'existent plus dans le modèle (comme is_mandatory)
        valid_fields = {field for field in update_data.keys() if hasattr(task, field)}
        filtered_update_data = {field: value for field, value in update_data.items() if field in valid_fields}
        
        for field, value in filtered_update_data.items():
            setattr(task, field, value)
        
        db.commit()
        db.refresh(task)
        
        # Vérifier si la tâche est maintenant en retard ou critique après la mise à jour
        if task.due_date and task.status != TaskStatus.TERMINE:
        from datetime import date, timedelta
        today = date.today()
        days_until_due = (task.due_date - today).days
        
        # Vérifier si la tâche est en retard
        if days_until_due < 0:
            try:
                from app.core.notifications import create_notification
                from app.db.models.notification import NotificationType
                from app.core.config import settings
                
                frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                due_str = task.due_date.strftime('%d/%m/%Y')
                if task.due_time:
                    due_str += f" à {task.due_time.strftime('%H:%M')}"
                
                create_notification(
                    db=db,
                    company_id=current_user.company_id,
                    notification_type=NotificationType.TASK_OVERDUE,
                    title="Tâche en retard",
                    message=f"La tâche '{task.title}' est en retard (échéance: {due_str})",
                    link_url=f"{frontend_url}/app/tasks",
                    link_text="Voir les tâches",
                    source_type="task",
                    source_id=task.id,
                    user_id=task.assigned_to_id,
                )
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"✅ Notification créée pour la tâche en retard {task.id}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Erreur lors de la création de la notification pour la tâche {task.id}: {e}")
            # Vérifier si la tâche est critique (échéance proche)
            elif days_until_due <= 2 and task.priority in ["high", "critical", "urgent"]:
            try:
                from app.core.notifications import create_notification
                from app.db.models.notification import NotificationType
                from app.core.config import settings
                
                frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                due_str = task.due_date.strftime('%d/%m/%Y')
                if task.due_time:
                    due_str += f" à {task.due_time.strftime('%H:%M')}"
                
                create_notification(
                    db=db,
                    company_id=current_user.company_id,
                    notification_type=NotificationType.TASK_CRITICAL,
                    title="Tâche critique à venir",
                    message=f"La tâche '{task.title}' est due le {due_str} (priorité {task.priority})",
                    link_url=f"{frontend_url}/app/tasks",
                    link_text="Voir les tâches",
                    source_type="task",
                    source_id=task.id,
                    user_id=task.assigned_to_id,
                )
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"✅ Notification créée pour la tâche critique {task.id}")
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Erreur lors de la création de la notification pour la tâche {task.id}: {e}")
        
        # Charger les relations
        task_id = task.id  # Sauvegarder l'ID avant la requête
        try:
            task_with_relations = db.query(Task).options(
                joinedload(Task.assigned_to),
                joinedload(Task.client),
                joinedload(Task.project),
                joinedload(Task.conversation)
            ).filter(Task.id == task_id).first()
            
            if not task_with_relations:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Task not found after update"
                )
            
            return TaskRead.from_orm_with_relations(task_with_relations)
        except HTTPException:
            # Re-raise les HTTPException
            raise
        except Exception as e:
            logger.error(f"Erreur lors du chargement des relations de la tâche {task_id}: {e}", exc_info=True)
            # Si le chargement des relations échoue, retourner quand même la tâche de base
            # La mise à jour a réussi, on ne veut pas faire échouer la requête
            db.refresh(task)
            return TaskRead.from_orm_with_relations(task)
    except HTTPException:
        # Re-raise les HTTPException
        raise
    except Exception as e:
        # Gestion d'erreur globale pour toutes les autres exceptions
        logger.error(f"Erreur lors de la mise à jour de la tâche {task_id}: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise à jour de la tâche: {str(e)}"
        )


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime une tâche"""
    _check_company_access(current_user)
    
    task = db.query(Task).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    if not _can_access_task(task, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Vérifier les permissions : owners/admins ont tous les droits, users doivent avoir can_delete_tasks
    if current_user.role == "user" and not current_user.can_delete_tasks:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete tasks"
        )
    
    # Vérifier s'il y a d'autres tâches liées à la même instance de checklist
    if task.checklist_instance_id:
        other_tasks_count = db.query(Task).filter(
            Task.checklist_instance_id == task.checklist_instance_id,
            Task.id != task_id
        ).count()
    
    db.delete(task)
    db.commit()
    return


@router.delete("/{task_id}/all-occurrences", status_code=status.HTTP_200_OK)
def delete_all_task_occurrences(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime toutes les occurrences d'une tâche récurrente (même titre et même template)"""
    _check_company_access(current_user)
    
    # Vérifier les permissions : owners/admins ont tous les droits, users doivent avoir can_delete_tasks
    if current_user.role == "user" and not current_user.can_delete_tasks:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete tasks"
        )
    
    task = db.query(Task).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    if not _can_access_task(task, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Vérifier si c'est une tâche récurrente (soit checklist, soit récurrence manuelle)
    is_recurring = task.is_checklist_item or (task.recurrence and task.recurrence != "none")
    
    if not is_recurring:
        # Tâche non récurrente : supprimer seulement cette tâche
        db.delete(task)
        db.commit()
        return {"deleted_count": 1, "message": "Task deleted (not a recurring task)"}
    
    # Tâche récurrente : supprimer toutes les occurrences
    
    # Cas 1: Tâche de checklist avec template
    if task.is_checklist_item and task.checklist_template_id:
        tasks_to_delete = db.query(Task).filter(
            Task.company_id == current_user.company_id,
            Task.checklist_template_id == task.checklist_template_id,
            Task.title == task.title,
            Task.is_checklist_item == True
        ).all()
    # Cas 2: Tâche de checklist sans template (orpheline)
    elif task.is_checklist_item and not task.checklist_template_id:
        tasks_to_delete = db.query(Task).filter(
            Task.company_id == current_user.company_id,
            Task.checklist_template_id.is_(None),
            Task.title == task.title,
            Task.is_checklist_item == True
        ).all()
    # Cas 3: Tâche récurrente créée manuellement (avec recurrence mais pas checklist)
    elif task.recurrence and task.recurrence != "none":
        # Supprimer toutes les tâches avec le même titre, la même récurrence, et sans template
        tasks_to_delete = db.query(Task).filter(
            Task.company_id == current_user.company_id,
            Task.title == task.title,
            Task.recurrence == task.recurrence,
            Task.checklist_template_id.is_(None),
            Task.is_checklist_item == False,
            Task.origin == "manual"
        ).all()
    else:
        # Fallback : supprimer seulement cette tâche
        db.delete(task)
        db.commit()
        return {"deleted_count": 1, "message": "Task deleted (unhandled case)"}
    
    deleted_count = len(tasks_to_delete)
    
    for t in tasks_to_delete:
        db.delete(t)
    
    db.commit()
    
    return {
        "deleted_count": deleted_count,
        "message": f"Deleted {deleted_count} task occurrence(s)"
    }


@router.patch("/{task_id}/complete", response_model=TaskRead)
def complete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Marque une tâche comme terminée"""
    _check_company_access(current_user)
    
    task = db.query(Task).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    if not _can_access_task(task, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    task.status = TaskStatus.TERMINE
    task.completed_at = datetime.now()
    
    db.commit()
    db.refresh(task)
    
    # Charger les relations
    task = db.query(Task).options(
        joinedload(Task.assigned_to),
        joinedload(Task.client),
        joinedload(Task.project),
        joinedload(Task.conversation)
    ).filter(Task.id == task.id).first()
    
    return TaskRead.from_orm_with_relations(task)


def cleanup_completed_tasks(db: Session, company_id: Optional[int] = None):
    """
    Supprime automatiquement les tâches complétées le jour précédent.
    Ex: si on est le 09, supprime toutes les tâches complétées le 08.
    
    Args:
        db: Session de base de données
        company_id: ID de l'entreprise (optionnel, si None nettoie toutes les entreprises)
    """
    # Date d'hier (sans l'heure, juste la date)
    today = date.today()
    yesterday_date = today - timedelta(days=1)
    # Début de la journée d'hier (00:00:00)
    yesterday_start = datetime.combine(yesterday_date, datetime.min.time())
    # Fin de la journée d'hier (23:59:59.999999)
    yesterday_end = datetime.combine(yesterday_date, datetime.max.time())
    
    # Construire la requête : tâches complétées
    query = db.query(Task).filter(
        or_(
            Task.status == TaskStatus.TERMINE.value,
            Task.status == TaskStatus.TERMINE  # Fallback pour les cas où c'est un Enum
        ),
        Task.completed_at.isnot(None)
    )
    
    # Filtrer par entreprise si spécifié
    if company_id is not None:
        query = query.filter(Task.company_id == company_id)
    
    # Récupérer toutes les tâches complétées et filtrer en Python
    # (SQLite peut avoir des problèmes avec sql_func.date())
    # Utiliser retry pour gérer les erreurs de connexion SSL
    all_completed = execute_with_retry(
        db,
        lambda: query.all(),
        max_retries=3
    )
    tasks_to_delete = []
    
    for task in all_completed:
        if task.completed_at:
            # Extraire la date de completed_at
            if isinstance(task.completed_at, datetime):
                task_completed_date = task.completed_at.date()
            else:
                try:
                    from datetime import datetime as dt
                    task_completed_date = dt.fromisoformat(str(task.completed_at)).date()
                except Exception as e:
                    continue
            
            # Vérifier si la date correspond à hier
            if task_completed_date == yesterday_date:
                tasks_to_delete.append(task)
    
    deleted_count = len(tasks_to_delete)
    
    # Supprimer les tâches
    for task in tasks_to_delete:
        db.delete(task)
    
    if deleted_count > 0:
        db.commit()
    
    return deleted_count


@router.get("/debug-completed", status_code=status.HTTP_200_OK)
def debug_completed_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Endpoint de diagnostic pour voir les tâches complétées.
    """
    _check_company_access(current_user)
    
    # Récupérer toutes les tâches complétées de l'entreprise
    tasks = db.query(Task).filter(
        Task.company_id == current_user.company_id,
        or_(
            Task.status == TaskStatus.TERMINE.value,
            Task.status == TaskStatus.TERMINE
        )
    ).all()
    
    result = []
    for task in tasks:
        result.append({
            "id": task.id,
            "title": task.title,
            "status": str(task.status),
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "company_id": task.company_id
        })
    
    return {
        "total_completed": len(result),
        "tasks": result
    }


@router.post("/cleanup-completed", status_code=status.HTTP_200_OK)
def cleanup_completed_tasks_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Endpoint pour nettoyer manuellement les tâches complétées depuis au moins un jour.
    Seuls les owners et admins peuvent déclencher ce nettoyage.
    """
    _check_company_access(current_user)
    
    # Seuls les owners et admins peuvent déclencher le nettoyage
    if current_user.role not in ["super_admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can trigger cleanup"
        )
    
    deleted_count = cleanup_completed_tasks(db, current_user.company_id)
    
    return {
        "message": f"{deleted_count} tâche(s) complétée(s) supprimée(s)",
        "deleted_count": deleted_count
    }
