from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func as sql_func
from typing import List, Optional
from datetime import datetime
import logging
import traceback

from app.db.session import get_db
from app.db.models.checklist import ChecklistTemplate, ChecklistInstance
from app.db.models.task import Task, TaskStatus, TaskType
from app.db.models.user import User
from app.api.schemas.checklist import (
    ChecklistTemplateCreate,
    ChecklistTemplateUpdate,
    ChecklistTemplateRead,
    ChecklistTemplateExecute,
    ChecklistInstanceCreate,
    ChecklistInstanceUpdate,
    ChecklistInstanceRead,
)
from app.api.deps import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/checklists", tags=["checklists"])


def _check_company_access(current_user: User):
    """Vérifier que l'utilisateur est attaché à une entreprise"""
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )


# ==================== CHECKLIST TEMPLATE ROUTES ====================

@router.get("/templates", response_model=List[ChecklistTemplateRead])
def get_checklist_templates(
    is_active: Optional[bool] = Query(None, description="Filtrer par statut actif"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère la liste des templates de checklist"""
    try:
        _check_company_access(current_user)
        
        query = db.query(ChecklistTemplate).filter(
            ChecklistTemplate.company_id == current_user.company_id
        )
        
        if is_active is not None:
            query = query.filter(ChecklistTemplate.is_active == is_active)
        
        query = query.options(
            joinedload(ChecklistTemplate.default_assigned_to)
        ).order_by(ChecklistTemplate.created_at.desc())
        
        templates = query.all()
        return [ChecklistTemplateRead.from_orm_with_relations(t) for t in templates]
    except Exception as e:
        logger.error(f"Error getting checklist templates: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/templates/{template_id}", response_model=ChecklistTemplateRead)
def get_checklist_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère un template de checklist par ID"""
    _check_company_access(current_user)
    
    template = db.query(ChecklistTemplate).options(
        joinedload(ChecklistTemplate.default_assigned_to)
    ).filter(
        ChecklistTemplate.id == template_id,
        ChecklistTemplate.company_id == current_user.company_id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist template not found"
        )
    
    return ChecklistTemplateRead.from_orm_with_relations(template)


@router.post("/templates", response_model=ChecklistTemplateRead, status_code=status.HTTP_201_CREATED)
def create_checklist_template(
    template_data: ChecklistTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée un nouveau template de checklist"""
    try:
        _check_company_access(current_user)
        
        logger.info(f"Creating checklist template: name={template_data.name}, items_count={len(template_data.items)}")
        
        # Vérifier que default_assigned_to_id appartient à la même entreprise
        if template_data.default_assigned_to_id:
            assigned_user = db.query(User).filter(
                User.id == template_data.default_assigned_to_id,
                User.company_id == current_user.company_id
            ).first()
            if not assigned_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned user not found or not in the same company"
                )
        
        template = ChecklistTemplate(
            company_id=current_user.company_id,
            name=template_data.name,
            description=template_data.description,
            recurrence=template_data.recurrence or "none",
            is_active=template_data.is_active,
            default_assigned_to_id=template_data.default_assigned_to_id,
        )
        template.set_items(template_data.items)
        
        if template_data.recurrence_days:
            template.set_recurrence_days(template_data.recurrence_days)
        elif template_data.recurrence == "weekly":
            # Si weekly mais pas de jours spécifiés, initialiser avec une liste vide
            template.set_recurrence_days([])
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        # Recharger avec les relations
        template = db.query(ChecklistTemplate).options(
            joinedload(ChecklistTemplate.default_assigned_to)
        ).filter(ChecklistTemplate.id == template.id).first()
        
        return ChecklistTemplateRead.from_orm_with_relations(template)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checklist template: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.patch("/templates/{template_id}", response_model=ChecklistTemplateRead)
def update_checklist_template(
    template_id: int,
    template_data: ChecklistTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour un template de checklist"""
    _check_company_access(current_user)
    
    template = db.query(ChecklistTemplate).filter(
        ChecklistTemplate.id == template_id,
        ChecklistTemplate.company_id == current_user.company_id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist template not found"
        )
    
    # Mettre à jour les champs fournis
    if template_data.name is not None:
        template.name = template_data.name
    if template_data.description is not None:
        template.description = template_data.description
    if template_data.items is not None:
        template.set_items(template_data.items)
    if template_data.recurrence is not None:
        template.recurrence = template_data.recurrence
    if template_data.recurrence_days is not None:
        template.set_recurrence_days(template_data.recurrence_days)
    elif template_data.recurrence == "weekly" and template.recurrence == "weekly":
        # Si on passe à weekly mais pas de jours spécifiés, garder les jours existants ou initialiser
        if not template.get_recurrence_days():
            template.set_recurrence_days([])
    if template_data.is_active is not None:
        template.is_active = template_data.is_active
    if template_data.default_assigned_to_id is not None:
        # Vérifier que l'utilisateur appartient à la même entreprise
        if template_data.default_assigned_to_id:
            assigned_user = db.query(User).filter(
                User.id == template_data.default_assigned_to_id,
                User.company_id == current_user.company_id
            ).first()
            if not assigned_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned user not found or not in the same company"
                )
        template.default_assigned_to_id = template_data.default_assigned_to_id
    
    db.commit()
    db.refresh(template)
    
    # Recharger avec les relations
    template = db.query(ChecklistTemplate).options(
        joinedload(ChecklistTemplate.default_assigned_to)
    ).filter(ChecklistTemplate.id == template.id).first()
    
    return ChecklistTemplateRead.from_orm_with_relations(template)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime un template de checklist"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        _check_company_access(current_user)
        
        template = db.query(ChecklistTemplate).filter(
            ChecklistTemplate.id == template_id,
            ChecklistTemplate.company_id == current_user.company_id
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Checklist template not found"
            )
        
        # Vérifier s'il y a des instances associées
        from app.db.models.checklist import ChecklistInstance
        instances_count = db.query(ChecklistInstance).filter(
            ChecklistInstance.template_id == template_id,
            ChecklistInstance.company_id == current_user.company_id
        ).count()
        
        # Vérifier s'il y a des tâches associées
        from app.db.models.task import Task
        tasks_count = db.query(Task).filter(
            Task.checklist_template_id == template_id,
            Task.company_id == current_user.company_id
        ).count()
        
        logger.info(f"Suppression du template {template_id}: {instances_count} instances, {tasks_count} tâches associées")
        
        # D'abord, mettre à jour les tâches qui référencent des instances de checklist
        # pour retirer la référence à checklist_instance_id
        if instances_count > 0:
            # Récupérer les IDs des instances à supprimer
            instance_ids = db.query(ChecklistInstance.id).filter(
                ChecklistInstance.template_id == template_id,
                ChecklistInstance.company_id == current_user.company_id
            ).all()
            instance_ids = [id_tuple[0] for id_tuple in instance_ids]
            
            # Mettre à jour les tâches qui référencent ces instances
            tasks_with_instances_count = db.query(Task).filter(
                Task.checklist_instance_id.in_(instance_ids),
                Task.company_id == current_user.company_id
            ).update(
                {Task.checklist_instance_id: None},
                synchronize_session=False
            )
            if tasks_with_instances_count > 0:
                logger.info(f"Mis à jour {tasks_with_instances_count} tâche(s) pour retirer la référence aux instances de checklist")
        
        # Maintenant, supprimer les instances associées (les tâches ne les référencent plus)
        if instances_count > 0:
            deleted_count = db.query(ChecklistInstance).filter(
                ChecklistInstance.template_id == template_id,
                ChecklistInstance.company_id == current_user.company_id
            ).delete(synchronize_session=False)
            logger.info(f"Supprimé {deleted_count} instance(s) associée(s) au template {template_id}")
        
        # Mettre à jour les tâches pour retirer la référence au template (au lieu de les supprimer)
        if tasks_count > 0:
            db.query(Task).filter(
                Task.checklist_template_id == template_id,
                Task.company_id == current_user.company_id
            ).update(
                {Task.checklist_template_id: None},
                synchronize_session=False
            )
            logger.info(f"Mis à jour {tasks_count} tâche(s) pour retirer la référence au template {template_id}")
        
        # Supprimer le template
        db.delete(template)
        db.commit()
        
        logger.info(f"Template {template_id} supprimé avec succès")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du template {template_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression du template: {str(e)}"
        )


# ==================== CHECKLIST INSTANCE ROUTES ====================

@router.get("/instances", response_model=List[ChecklistInstanceRead])
def get_checklist_instances(
    status_filter: Optional[str] = Query(None, alias="status", description="Filtrer par statut (en_cours, termine)"),
    template_id: Optional[int] = Query(None, description="Filtrer par template"),
    assigned_to_id: Optional[int] = Query(None, description="Filtrer par utilisateur assigné"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère la liste des instances de checklist"""
    _check_company_access(current_user)
    
    query = db.query(ChecklistInstance).filter(
        ChecklistInstance.company_id == current_user.company_id
    )
    
    # Les users ne voient que leurs instances
    if current_user.role == "user":
        query = query.filter(ChecklistInstance.assigned_to_id == current_user.id)
    
    if status_filter:
        query = query.filter(ChecklistInstance.status == status_filter)
    
    if template_id:
        query = query.filter(ChecklistInstance.template_id == template_id)
    
    if assigned_to_id:
        query = query.filter(ChecklistInstance.assigned_to_id == assigned_to_id)
    
    query = query.options(
        joinedload(ChecklistInstance.template),
        joinedload(ChecklistInstance.assigned_to)
    ).order_by(ChecklistInstance.started_at.desc())
    
    instances = query.all()
    return [ChecklistInstanceRead.from_orm_with_relations(i) for i in instances]


@router.get("/instances/{instance_id}", response_model=ChecklistInstanceRead)
def get_checklist_instance(
    instance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère une instance de checklist par ID"""
    _check_company_access(current_user)
    
    instance = db.query(ChecklistInstance).options(
        joinedload(ChecklistInstance.template),
        joinedload(ChecklistInstance.assigned_to)
    ).filter(
        ChecklistInstance.id == instance_id,
        ChecklistInstance.company_id == current_user.company_id
    ).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist instance not found"
        )
    
    # Vérifier les permissions (users ne peuvent voir que leurs instances)
    if current_user.role == "user" and instance.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this checklist instance"
        )
    
    return ChecklistInstanceRead.from_orm_with_relations(instance)


@router.post("/templates/{template_id}/execute", response_model=ChecklistInstanceRead, status_code=status.HTTP_201_CREATED)
def execute_checklist_template(
    template_id: int,
    instance_data: Optional[ChecklistTemplateExecute] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Exécute un template de checklist (crée une instance et génère les tâches)"""
    try:
        _check_company_access(current_user)
        
        # Récupérer le template
        template = db.query(ChecklistTemplate).filter(
            ChecklistTemplate.id == template_id,
            ChecklistTemplate.company_id == current_user.company_id,
            ChecklistTemplate.is_active == True
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Checklist template not found or inactive"
            )
        
        # Déterminer l'utilisateur assigné
        assigned_to_id = None
        if instance_data and instance_data.assigned_to_id:
            assigned_to_id = instance_data.assigned_to_id
        elif template.default_assigned_to_id:
            assigned_to_id = template.default_assigned_to_id
        else:
            # Si aucun assigned_to_id n'est fourni, assigner à l'utilisateur qui exécute la checklist
            assigned_to_id = current_user.id
    
        # Vérifier que l'utilisateur assigné appartient à la même entreprise
        if assigned_to_id:
            assigned_user = db.query(User).filter(
                User.id == assigned_to_id,
                User.company_id == current_user.company_id
            ).first()
            if not assigned_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned user not found or not in the same company"
                )
        
        # Vérifier la récurrence hebdomadaire : si weekly, vérifier que le jour actuel est dans recurrence_days
        from datetime import date, datetime
        today = date.today()
        # Note: On ne vérifie plus si aujourd'hui est un jour d'exécution valide
        # car l'exécution crée toutes les occurrences futures, pas seulement pour aujourd'hui
        
        # Anti-duplication MVP : Vérifier si une instance existe déjà aujourd'hui pour ce template
        existing_instance = db.query(ChecklistInstance).filter(
            ChecklistInstance.template_id == template_id,
            ChecklistInstance.company_id == current_user.company_id,
            sql_func.date(ChecklistInstance.started_at) == today
        ).first()
        
        if existing_instance:
            # Si instance existe déjà aujourd'hui, vérifier si des tâches existent
            logger.info(f"Checklist template {template_id} already executed today, returning existing instance {existing_instance.id}")
            # Vérifier si des tâches existent pour cette instance
            from datetime import date
            today = date.today()
            existing_tasks = db.query(Task).filter(
                Task.checklist_instance_id == existing_instance.id
            ).all()
            logger.info(f"Instance {existing_instance.id} a {len(existing_tasks)} tâches existantes")
            
            # Récupérer toutes les dates d'exécution futures selon la récurrence
            items = template.get_items()
            from datetime import datetime, timedelta
            
            execution_dates = []
            if template.recurrence == "daily":
                for i in range(30):
                    execution_dates.append(today + timedelta(days=i))
            elif template.recurrence == "weekly":
                recurrence_days = template.get_recurrence_days()
                if recurrence_days and len(recurrence_days) > 0:
                    start_date = today
                    end_date = start_date + timedelta(weeks=52)
                    current_date = start_date
                    while current_date <= end_date:
                        weekday_python = current_date.weekday()
                        weekday_model = (weekday_python + 1) % 7
                        if weekday_model in recurrence_days:
                            execution_dates.append(current_date)
                        current_date += timedelta(days=1)
                else:
                    execution_dates.append(today)
            elif template.recurrence == "monthly":
                # Créer les tâches pour les 12 prochains mois en utilisant les jours spécifiés
                recurrence_days = template.get_recurrence_days()
                if recurrence_days and len(recurrence_days) > 0:
                    # Pour chaque mois des 12 prochains mois
                    from calendar import monthrange
                    for month_offset in range(12):
                        # Calculer la date du premier jour du mois cible
                        target_year = today.year
                        target_month = today.month + month_offset
                        # Gérer le dépassement d'année
                        while target_month > 12:
                            target_month -= 12
                            target_year += 1
                        
                        # Pour chaque jour spécifié dans recurrence_days
                        for day in recurrence_days:
                            # Vérifier que le jour existe dans ce mois (ex: pas de 31 février)
                            days_in_month = monthrange(target_year, target_month)[1]
                            if 1 <= day <= days_in_month:
                                execution_date = date(target_year, target_month, day)
                                # Ne créer que les dates futures ou aujourd'hui
                                if execution_date >= today:
                                    execution_dates.append(execution_date)
                else:
                    # Si pas de jours spécifiés, utiliser le jour d'aujourd'hui pour chaque mois
                    for month_offset in range(12):
                        target_year = today.year
                        target_month = today.month + month_offset
                        while target_month > 12:
                            target_month -= 12
                            target_year += 1
                        # Utiliser le jour d'aujourd'hui, ou le dernier jour du mois si le jour n'existe pas
                        from calendar import monthrange
                        days_in_month = monthrange(target_year, target_month)[1]
                        day = min(today.day, days_in_month)
                        execution_date = date(target_year, target_month, day)
                        if execution_date >= today:
                            execution_dates.append(execution_date)
            else:
                execution_dates.append(today)
            
            # Récupérer les dates des tâches existantes pour éviter les doublons
            existing_dates = set()
            for task in existing_tasks:
                if task.due_date:
                    existing_dates.add(task.due_date.date())
            
            # Créer les tâches manquantes pour toutes les dates futures
            tasks_to_create = []
            for execution_date in execution_dates:
                if execution_date not in existing_dates:
                    for index, item in enumerate(items):
                        task = Task(
                            company_id=current_user.company_id,
                            title=item,
                            description=f"Tâche générée depuis la checklist: {template.name}",
                            assigned_to_id=assigned_to_id,
                            type=TaskType.INTERNE,
                            status=TaskStatus.A_FAIRE,
                            priority="normal",
                            origin="checklist",
                            is_checklist_item=True,
                            checklist_template_id=template_id,
                            checklist_instance_id=existing_instance.id,
                            created_by_id=current_user.id,
                            due_date=datetime.combine(execution_date, datetime.min.time()),
                        )
                        tasks_to_create.append(task)
            
            if tasks_to_create:
                for task in tasks_to_create:
                    db.add(task)
                db.commit()
                logger.info(f"{len(tasks_to_create)} nouvelles tâches créées pour l'instance {existing_instance.id}")
            else:
                logger.info(f"Toutes les tâches existent déjà pour l'instance {existing_instance.id}")
            
            instance = existing_instance
        else:
            # Créer l'instance
            instance = ChecklistInstance(
                template_id=template_id,
                company_id=current_user.company_id,
                assigned_to_id=assigned_to_id,
                status="en_cours",
            )
            instance.set_completed_items([])
            
            db.add(instance)
            db.commit()
            db.refresh(instance)
            
            # Générer les tâches depuis le template
            items = template.get_items()
            from datetime import datetime, date, timedelta
            
            # Calculer les dates d'exécution selon la récurrence
            execution_dates = []
            today = date.today()
            
            if template.recurrence == "daily":
                # Créer les tâches pour les 30 prochains jours
                for i in range(30):
                    execution_dates.append(today + timedelta(days=i))
                    
            elif template.recurrence == "weekly":
                recurrence_days = template.get_recurrence_days()
                if recurrence_days and len(recurrence_days) > 0:
                    # Créer les tâches pour les 52 prochaines semaines (1 an)
                    start_date = today
                    end_date = start_date + timedelta(weeks=52)
                    
                    current_date = start_date
                    while current_date <= end_date:
                        # Convertir le jour de la semaine Python (0=lundi, 6=dimanche) vers le format modèle (0=dimanche, 6=samedi)
                        weekday_python = current_date.weekday()  # 0=lundi, 6=dimanche
                        weekday_model = (weekday_python + 1) % 7  # Convertir vers 0=dimanche, 6=samedi
                        
                        if weekday_model in recurrence_days:
                            execution_dates.append(current_date)
                        current_date += timedelta(days=1)
                else:
                    # Si weekly mais pas de jours spécifiés, créer seulement pour aujourd'hui
                    execution_dates.append(today)
                    
            elif template.recurrence == "monthly":
                # Créer les tâches pour les 12 prochains mois en utilisant les jours spécifiés
                recurrence_days = template.get_recurrence_days()
                if recurrence_days and len(recurrence_days) > 0:
                    # Pour chaque mois des 12 prochains mois
                    from calendar import monthrange
                    for month_offset in range(12):
                        # Calculer la date du premier jour du mois cible
                        target_year = today.year
                        target_month = today.month + month_offset
                        # Gérer le dépassement d'année
                        while target_month > 12:
                            target_month -= 12
                            target_year += 1
                        
                        # Pour chaque jour spécifié dans recurrence_days
                        for day in recurrence_days:
                            # Vérifier que le jour existe dans ce mois (ex: pas de 31 février)
                            days_in_month = monthrange(target_year, target_month)[1]
                            if 1 <= day <= days_in_month:
                                execution_date = date(target_year, target_month, day)
                                # Ne créer que les dates futures ou aujourd'hui
                                if execution_date >= today:
                                    execution_dates.append(execution_date)
                else:
                    # Si pas de jours spécifiés, utiliser le jour d'aujourd'hui pour chaque mois
                    for month_offset in range(12):
                        target_year = today.year
                        target_month = today.month + month_offset
                        while target_month > 12:
                            target_month -= 12
                            target_year += 1
                        # Utiliser le jour d'aujourd'hui, ou le dernier jour du mois si le jour n'existe pas
                        from calendar import monthrange
                        days_in_month = monthrange(target_year, target_month)[1]
                        day = min(today.day, days_in_month)
                        execution_date = date(target_year, target_month, day)
                        if execution_date >= today:
                            execution_dates.append(execution_date)
            else:
                # Récurrence "none" ou autre : créer seulement pour aujourd'hui
                execution_dates.append(today)
            
            logger.info(f"Génération de {len(items)} items × {len(execution_dates)} dates = {len(items) * len(execution_dates)} tâches pour le template {template_id}, assigned_to_id={assigned_to_id}")
            
            # Créer une tâche pour chaque item × chaque date
            tasks_created = 0
            for execution_date in execution_dates:
                for index, item in enumerate(items):
                    task = Task(
                        company_id=current_user.company_id,
                        title=item,
                        description=f"Tâche générée depuis la checklist: {template.name}",
                        assigned_to_id=assigned_to_id,
                        type=TaskType.INTERNE,
                        status=TaskStatus.A_FAIRE,
                        priority="normal",  # MVP V1 : priorité par défaut "normal"
                        origin="checklist",
                        is_checklist_item=True,
                        checklist_template_id=template_id,
                        checklist_instance_id=instance.id,  # Lier à l'instance
                        created_by_id=current_user.id,
                        due_date=datetime.combine(execution_date, datetime.min.time()),
                    )
                    db.add(task)
                    tasks_created += 1
            
            db.commit()
            logger.info(f"Commit effectué, {tasks_created} tâches créées pour l'instance {instance.id} ({len(execution_dates)} dates × {len(items)} items)")
        
        # Recharger l'instance avec les relations
        instance = db.query(ChecklistInstance).options(
            joinedload(ChecklistInstance.template),
            joinedload(ChecklistInstance.assigned_to)
        ).filter(ChecklistInstance.id == instance.id).first()
        
        return ChecklistInstanceRead.from_orm_with_relations(instance)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing checklist template: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.patch("/instances/{instance_id}", response_model=ChecklistInstanceRead)
def update_checklist_instance(
    instance_id: int,
    instance_data: ChecklistInstanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour une instance de checklist (marquer des items comme complétés)"""
    _check_company_access(current_user)
    
    instance = db.query(ChecklistInstance).filter(
        ChecklistInstance.id == instance_id,
        ChecklistInstance.company_id == current_user.company_id
    ).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist instance not found"
        )
    
    # Vérifier les permissions (users ne peuvent modifier que leurs instances)
    if current_user.role == "user" and instance.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this checklist instance"
        )
    
    # MVP V1: completed_items non utilisé (sera implémenté en V2)
    # Pour le MVP, on gère uniquement le statut global (en_cours/termine)
    # Les items complétés seront gérés en V2
    # Note: On garde completed_items dans le schéma pour compatibilité future mais on ne l'utilise pas
    
    if instance_data.status is not None:
        instance.status = instance_data.status
        if instance_data.status == "termine" and not instance.completed_at:
            instance.completed_at = datetime.now()
        elif instance_data.status == "en_cours":
            instance.completed_at = None
    
    db.commit()
    db.refresh(instance)
    
    # Recharger avec les relations
    instance = db.query(ChecklistInstance).options(
        joinedload(ChecklistInstance.template),
        joinedload(ChecklistInstance.assigned_to)
    ).filter(ChecklistInstance.id == instance.id).first()
    
    return ChecklistInstanceRead.from_orm_with_relations(instance)


@router.delete("/instances/{instance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_instance(
    instance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime une instance de checklist"""
    _check_company_access(current_user)
    
    instance = db.query(ChecklistInstance).filter(
        ChecklistInstance.id == instance_id,
        ChecklistInstance.company_id == current_user.company_id
    ).first()
    
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist instance not found"
        )
    
    # Vérifier les permissions (users ne peuvent supprimer que leurs instances)
    if current_user.role == "user" and instance.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this checklist instance"
        )
    
    db.delete(instance)
    db.commit()
    
    return None
