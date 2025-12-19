from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel as PydanticBaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func as sql_func
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.db.session import get_db
from app.db.retry import execute_with_retry
from app.db.models.followup import FollowUp, FollowUpType, FollowUpStatus, FollowUpHistory, FollowUpHistoryStatus
from app.db.models.user import User
from app.db.models.client import Client
from app.api.schemas.followup import (
    FollowUpCreate, FollowUpUpdate, FollowUpRead,
    FollowUpHistoryRead, FollowUpStats, WeeklyFollowUpData, FollowUpMessageTemplate,
    FollowUpSettings, FollowUpSettingsUpdate, FollowUpStopConditions,
    GenerateMessageRequest, GenerateMessageResponse
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/followups", tags=["followups"])


def _check_company_access(current_user: User):
    """Vérifier que l'utilisateur est attaché à une entreprise"""
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )


def stop_followups_for_source(db: Session, source_type: str, source_id: int, company_id: int):
    """
    Arrête toutes les relances actives pour une source donnée (devis accepté ou facture payée).
    Marque les relances comme "FAIT" pour qu'elles ne soient plus actives.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Trouver toutes les relances actives pour cette source
        active_followups = db.query(FollowUp).filter(
            FollowUp.source_type == source_type,
            FollowUp.source_id == source_id,
            FollowUp.company_id == company_id,
            FollowUp.status == FollowUpStatus.A_FAIRE
        ).all()
        
        if active_followups:
            # Marquer toutes les relances comme "FAIT"
            for followup in active_followups:
                followup.status = FollowUpStatus.FAIT
                logger.info(f"[FOLLOWUP STOP] Relance {followup.id} marquée comme FAIT (source: {source_type} {source_id})")
            
            db.commit()
            logger.info(f"[FOLLOWUP STOP] ✅ {len(active_followups)} relance(s) arrêtée(s) pour {source_type} {source_id}")
            return len(active_followups)
        else:
            logger.info(f"[FOLLOWUP STOP] Aucune relance active trouvée pour {source_type} {source_id}")
            return 0
            
    except Exception as e:
        logger.error(f"[FOLLOWUP STOP] ❌ Erreur lors de l'arrêt des relances pour {source_type} {source_id}: {e}", exc_info=True)
        try:
            db.rollback()
        except:
            pass
        return 0


def _followup_to_dict(followup: FollowUp, db: Optional[Session] = None) -> dict:
    """Convertir un objet FollowUp en dictionnaire pour FollowUpRead"""
    # Compter les relances déjà envoyées
    total_sent = 0
    remaining_relances = None
    next_relance_number = None
    has_been_sent = False
    
    if db is not None:
        total_sent = db.query(FollowUpHistory).filter(
            FollowUpHistory.followup_id == followup.id,
            FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE
        ).count()
        
        has_been_sent = total_sent > 0
        
        # Pour les relances automatiques, calculer les relances restantes
        if followup.auto_enabled:
            # Récupérer max_relances depuis les settings
            from app.db.models.company_settings import CompanySettings
            company_settings = db.query(CompanySettings).filter(
                CompanySettings.company_id == followup.company_id
            ).first()
            
            if company_settings:
                settings_dict = company_settings.settings
                followup_settings = settings_dict.get("followups", {})
                max_relances = followup_settings.get("max_relances", 3)
                
                remaining_relances = max(0, max_relances - total_sent)
                # Le numéro de la prochaine relance est total_sent + 1 (ou None si terminé)
                if remaining_relances > 0:
                    next_relance_number = total_sent + 1
                else:
                    next_relance_number = None
    
    return {
        "id": int(followup.id),
        "company_id": int(followup.company_id),
        "type": followup.type,
        "client_id": int(followup.client_id),
        "client_name": followup.client.name if followup.client else "",
        "source_type": str(followup.source_type),
        "source_id": int(followup.source_id) if followup.source_id is not None else None,
        "source_label": str(followup.source_label),
        "due_date": followup.due_date,
        "actual_date": followup.actual_date,
        "status": followup.status,
        "amount": float(followup.amount) if followup.amount else None,
        "auto_enabled": bool(followup.auto_enabled),
        "auto_frequency_days": int(followup.auto_frequency_days) if followup.auto_frequency_days is not None else None,
        "auto_stop_on_response": bool(followup.auto_stop_on_response),
        "auto_stop_on_paid": bool(followup.auto_stop_on_paid),
        "auto_stop_on_refused": bool(followup.auto_stop_on_refused),
        "created_at": followup.created_at,
        "updated_at": followup.updated_at,
        "total_sent": total_sent,
        "remaining_relances": remaining_relances,
        "next_relance_number": next_relance_number,
        "has_been_sent": has_been_sent,
    }


@router.get("", response_model=List[FollowUpRead])
def get_followups(
    status_filter: Optional[str] = Query(None, alias="status", description="Filtrer par statut"),
    type_filter: Optional[str] = Query(None, alias="type", description="Filtrer par type"),
    client_id: Optional[int] = Query(None, description="Filtrer par client"),
    source_type: Optional[str] = Query(None, description="Filtrer par type de source"),
    source_id: Optional[int] = Query(None, description="Filtrer par ID de source"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère la liste des relances avec filtres"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"[FOLLOWUP GET] Début - User: {current_user.id}, Company: {current_user.company_id}")
        logger.info(f"[FOLLOWUP GET] Filtres - status: {status_filter}, type: {type_filter}, client_id: {client_id}, source_type: {source_type}, source_id: {source_id}")
        
        _check_company_access(current_user)
        
        query = db.query(FollowUp).filter(FollowUp.company_id == current_user.company_id)
        
        # Filtrer par statut
        if status_filter and status_filter != "all":
            try:
                status_enum = FollowUpStatus(status_filter)
                query = query.filter(FollowUp.status == status_enum)
                logger.info(f"[FOLLOWUP GET] Filtre statut appliqué: {status_filter}")
            except ValueError:
                logger.warning(f"[FOLLOWUP GET] Statut invalide ignoré: {status_filter}")
                pass
        
        # Filtrer par type
        if type_filter and type_filter != "all":
            type_map = {
                "devis": [FollowUpType.DEVIS_NON_REPONDU],
                "factures": [FollowUpType.FACTURE_IMPAYEE],
                "infos": [FollowUpType.INFO_MANQUANTE],
                "rdv": [FollowUpType.RAPPEL_RDV],
            }
            if type_filter in type_map:
                query = query.filter(FollowUp.type.in_(type_map[type_filter]))
                logger.info(f"[FOLLOWUP GET] Filtre type appliqué: {type_filter}")
        
        # Filtrer par client
        if client_id is not None:
            query = query.filter(FollowUp.client_id == client_id)
            logger.info(f"[FOLLOWUP GET] Filtre client_id appliqué: {client_id}")
        
        # Filtrer par source
        if source_type:
            query = query.filter(FollowUp.source_type == source_type)
            logger.info(f"[FOLLOWUP GET] Filtre source_type appliqué: {source_type}")
        if source_id is not None:
            query = query.filter(FollowUp.source_id == source_id)
            logger.info(f"[FOLLOWUP GET] Filtre source_id appliqué: {source_id}")
        
        # Charger les relations
        query = query.options(
            joinedload(FollowUp.client),
            joinedload(FollowUp.created_by)
        )
        
        # Utiliser retry pour gérer les erreurs de connexion SSL
        followups = execute_with_retry(
            db,
            lambda: query.order_by(FollowUp.due_date.asc()).all(),
            max_retries=3
        )
        
        logger.info(f"[FOLLOWUP GET] ✅ {len(followups)} relance(s) trouvée(s)")
        
        # Mapper vers FollowUpRead avec client_name
        result = [FollowUpRead(**(_followup_to_dict(f, db))) for f in followups]
        
        return result
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur dans get_followups: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des relances: {str(e)}"
        )


@router.get("/stats", response_model=FollowUpStats)
async def get_followup_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère les KPIs des relances"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"[FOLLOWUP STATS] Début - User: {current_user.id}, Company: {current_user.company_id}")
        _check_company_access(current_user)
        
        # Toutes les relances actives (non faites)
        active = db.query(FollowUp).filter(
            FollowUp.company_id == current_user.company_id,
            FollowUp.status != FollowUpStatus.FAIT
        ).all()
        
        logger.info(f"[FOLLOWUP STATS] Relances actives trouvées: {len(active)}")
        
        # Filtrer par type
        invoices = [f for f in active if f.type == FollowUpType.FACTURE_IMPAYEE]
        quotes = [f for f in active if f.type == FollowUpType.DEVIS_NON_REPONDU]
        
        logger.info(f"[FOLLOWUP STATS] Factures: {len(invoices)}, Devis: {len(quotes)}")
        
        # Calculer les en retard
        today = date.today()
        late = [f for f in active if f.actual_date is not None and f.actual_date.date() < today]
        
        logger.info(f"[FOLLOWUP STATS] En retard: {len(late)}")
        
        # Montant total des factures impayées
        total_amount = sum(float(f.amount) for f in invoices if f.amount) if invoices else 0.0
        
        logger.info(f"[FOLLOWUP STATS] Montant total calculé: {total_amount} (type: {type(total_amount).__name__})")
        
        # S'assurer que tous les types sont des types Python natifs
        # Convertir explicitement en types Python natifs pour éviter les problèmes de sérialisation
        total_amount_float = float(total_amount) if total_amount else 0.0
        
        logger.info(f"[FOLLOWUP STATS] Montant converti: {total_amount_float} (type: {type(total_amount_float).__name__})")
        
        # Créer le dictionnaire avec des types garantis
        stats_dict = {
            "total": int(len(active)),
            "invoices": int(len(invoices)),
            "quotes": int(len(quotes)),
            "late": int(len(late)),
            "total_amount": total_amount_float
        }
        
        logger.info(f"[FOLLOWUP STATS] Dictionnaire créé: {stats_dict}")
        logger.info(f"[FOLLOWUP STATS] Types des valeurs: {[(k, type(v).__name__, v) for k, v in stats_dict.items()]}")
        
        # Utiliser l'instanciation directe et forcer la sérialisation
        try:
            stats = FollowUpStats(**stats_dict)
            logger.info(f"[FOLLOWUP STATS] ✅ FollowUpStats créé avec succès")
            logger.info(f"[FOLLOWUP STATS] Données sérialisées: {stats.model_dump()}")
            
            # Vérifier que la sérialisation JSON fonctionne
            import json
            try:
                json_str = json.dumps(stats.model_dump())
                logger.info(f"[FOLLOWUP STATS] ✅ Sérialisation JSON réussie ({len(json_str)} caractères)")
            except Exception as json_error:
                logger.error(f"[FOLLOWUP STATS] ❌ Erreur sérialisation JSON: {json_error}")
                raise
            
            return stats
        except Exception as validation_error:
            # Logger l'erreur de validation pour debug
            logger.error(f"[FOLLOWUP STATS] ❌ Erreur de validation FollowUpStats: {validation_error}")
            logger.error(f"[FOLLOWUP STATS] Type d'erreur: {type(validation_error).__name__}")
            logger.error(f"[FOLLOWUP STATS] Données envoyées: {stats_dict}")
            logger.error(f"[FOLLOWUP STATS] Types des valeurs: {[(k, type(v).__name__, repr(v)) for k, v in stats_dict.items()]}")
            
            # Afficher les détails de l'erreur Pydantic si disponible
            if hasattr(validation_error, 'errors'):
                logger.error(f"[FOLLOWUP STATS] Erreurs Pydantic: {validation_error.errors()}")
            if hasattr(validation_error, 'model'):
                logger.error(f"[FOLLOWUP STATS] Modèle attendu: {validation_error.model}")
            
            import traceback
            logger.error(f"[FOLLOWUP STATS] Traceback complet:\n{traceback.format_exc()}")
            raise
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur dans get_followup_stats: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des statistiques: {str(e)}"
        )


@router.get("/weekly", response_model=List[WeeklyFollowUpData])
async def get_weekly_followups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère les données pour le graphique hebdomadaire"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"[FOLLOWUP WEEKLY] Début - User: {current_user.id}, Company: {current_user.company_id}")
        _check_company_access(current_user)
        
        # Calculer le début de la semaine (lundi)
        today = date.today()
        days_since_monday = today.weekday()  # 0 = lundi, 6 = dimanche
        week_start = today - timedelta(days=days_since_monday)
        
        logger.info(f"[FOLLOWUP WEEKLY] Semaine calculée - Début: {week_start}, Aujourd'hui: {today}")
        
        # Récupérer les relances ENVOYÉES cette semaine (basé sur FollowUpHistory.sent_at)
        # au lieu de compter par due_date
        week_end = week_start + timedelta(days=6)
        week_start_dt = datetime.combine(week_start, datetime.min.time())
        week_end_dt = datetime.combine(week_end, datetime.max.time())
        
        # Récupérer toutes les relances envoyées cette semaine
        histories = db.query(FollowUpHistory).filter(
            FollowUpHistory.company_id == current_user.company_id,
            FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE,
            FollowUpHistory.sent_at >= week_start_dt,
            FollowUpHistory.sent_at <= week_end_dt
        ).all()
        
        logger.info(f"[FOLLOWUP WEEKLY] {len(histories)} relance(s) envoyée(s) cette semaine")
        
        # Grouper par jour de la semaine selon la date d'envoi
        days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        counts = [0] * 7
        
        for history in histories:
            sent_date = history.sent_at.date()
            day_index = sent_date.weekday()  # 0 = lundi
            if 0 <= day_index < 7:
                counts[day_index] += 1
        
        logger.info(f"[FOLLOWUP WEEKLY] Répartition: {dict(zip(days, counts))}")
        
        # Retourner les données en s'assurant que count est bien un int Python natif
        # Utiliser l'instanciation directe comme pour les tasks (évite les problèmes de validation stricts)
        weekly_data = []
        for i in range(7):
            # S'assurer que count est un int Python, pas un numpy.int64 ou autre
            count_value = int(counts[i])
            # Créer un dictionnaire et utiliser l'instanciation directe
            data_dict = {"day": days[i], "count": count_value}
            weekly_data.append(WeeklyFollowUpData(**data_dict))
        
        logger.info(f"[FOLLOWUP WEEKLY] ✅ Données hebdomadaires générées avec succès - {len(weekly_data)} éléments")
        
        # Vérifier que la sérialisation JSON fonctionne
        import json
        try:
            json_data = [item.model_dump() for item in weekly_data]
            json_str = json.dumps(json_data)
            logger.info(f"[FOLLOWUP WEEKLY] ✅ Sérialisation JSON réussie ({len(json_str)} caractères)")
        except Exception as json_error:
            logger.error(f"[FOLLOWUP WEEKLY] ❌ Erreur sérialisation JSON: {json_error}")
            logger.error(f"[FOLLOWUP WEEKLY] Données: {weekly_data}")
            raise
        
        return weekly_data
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur dans get_weekly_followups: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des données hebdomadaires: {str(e)}"
        )


def get_default_followup_templates() -> List[FollowUpMessageTemplate]:
    """Génère les templates par défaut pour chaque type de relance"""
    return [
        FollowUpMessageTemplate(
            id=1,
            type="Devis non répondu",
            content="Bonjour {client_name},\n\nNous vous contactons concernant votre devis {source_label}.\n\nNous n'avons pas encore reçu de retour de votre part. Nous serions ravis de répondre à vos questions ou de vous accompagner dans votre projet.\n\nN'hésitez pas à nous contacter si vous souhaitez discuter de ce devis.\n\nCordialement,\n{company_name}\n{company_email}"
        ),
        FollowUpMessageTemplate(
            id=2,
            type="Facture impayée",
            content="Bonjour {client_name},\n\nNous vous contactons concernant votre facture {source_label} d'un montant de {amount} €.\n\nCette facture est en attente de règlement. Nous vous remercions de bien vouloir régulariser votre situation dans les plus brefs délais.\n\nPour toute question, n'hésitez pas à nous contacter.\n\nCordialement,\n{company_name}\n{company_email}"
        ),
        FollowUpMessageTemplate(
            id=3,
            type="Info manquante",
            content="Bonjour {client_name},\n\nNous avons besoin d'informations complémentaires concernant {source_label}.\n\nPourriez-vous nous fournir ces informations afin que nous puissions avancer sur votre dossier ?\n\nMerci de votre collaboration.\n\nCordialement,\n{company_name}\n{company_email}"
        ),
        FollowUpMessageTemplate(
            id=4,
            type="Rappel RDV",
            content="Bonjour {client_name},\n\nNous vous rappelons votre rendez-vous concernant {source_label}.\n\nNous vous attendons et restons à votre disposition pour toute question.\n\nÀ bientôt,\n{company_name}\n{company_email}\n{company_phone}"
        ),
        FollowUpMessageTemplate(
            id=5,
            type="Client inactif",
            content="Bonjour {client_name},\n\nNous n'avons pas eu de nouvelles de votre part depuis quelque temps concernant {source_label}.\n\nNous serions ravis de reprendre contact avec vous et de voir comment nous pouvons vous accompagner.\n\nN'hésitez pas à nous contacter.\n\nCordialement,\n{company_name}\n{company_email}"
        ),
        FollowUpMessageTemplate(
            id=6,
            type="Projet en attente",
            content="Bonjour {client_name},\n\nNous vous contactons concernant votre projet {source_label}.\n\nCe projet semble être en attente. Nous serions ravis de discuter avec vous de la suite à donner.\n\nN'hésitez pas à nous contacter pour planifier la prochaine étape.\n\nCordialement,\n{company_name}\n{company_email}"
        ),
    ]


@router.get("/settings", response_model=FollowUpSettings)
def get_followup_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère la configuration IA des relances"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"[FOLLOWUP SETTINGS GET] Début - User: {current_user.id}, Company: {current_user.company_id}")
        _check_company_access(current_user)
        
        from app.db.models.company_settings import CompanySettings
        
        # Templates par défaut
        default_templates = get_default_followup_templates()
        
        default_settings = FollowUpSettings(
            initial_delay_days=7,
            max_relances=3,
            relance_delays=[7, 14, 21],
            relance_methods=["email", "email", "whatsapp"],
            stop_conditions=FollowUpStopConditions(
                stop_on_client_response=True,
                stop_on_invoice_paid=True,
                stop_on_quote_refused=True,
            ),
            messages=default_templates,
            enable_relances_before=False,
            days_before_due=None,
            hours_before_due=None,
        )
        
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        if not company_settings:
            logger.info(f"[FOLLOWUP SETTINGS GET] ✅ Paramètres par défaut retournés (avec templates)")
            return default_settings
        
        settings_dict = company_settings.settings
        followup_settings = settings_dict.get("followups", {})
        
        if not followup_settings:
            logger.info(f"[FOLLOWUP SETTINGS GET] ✅ Paramètres par défaut retournés (pas de config followups, avec templates)")
            return default_settings
        
        # Fusionner avec les valeurs par défaut
        try:
            merged = default_settings.model_dump()
            merged.update(followup_settings)
            
            # Vérifier et compléter les templates manquants
            existing_messages = merged.get("messages", [])
            existing_types = {msg.get("type") if isinstance(msg, dict) else (msg.type if hasattr(msg, "type") else None) for msg in existing_messages if msg}
            default_types = {t.type for t in default_templates}
            
            # Ajouter les templates manquants
            missing_types = default_types - existing_types
            if missing_types:
                logger.info(f"[FOLLOWUP SETTINGS GET] Ajout de {len(missing_types)} template(s) manquant(s): {missing_types}")
                templates_added = False
                for template in default_templates:
                    if template.type in missing_types:
                        existing_messages.append({
                            "id": template.id,
                            "type": template.type,
                            "content": template.content
                        })
                        templates_added = True
                
                if templates_added:
                    merged["messages"] = existing_messages
                    # Sauvegarder automatiquement les templates manquants
                    try:
                        followup_settings["messages"] = existing_messages
                        settings_dict["followups"] = followup_settings
                        company_settings.settings = settings_dict
                        db.commit()
                        logger.info(f"[FOLLOWUP SETTINGS GET] ✅ Templates par défaut sauvegardés automatiquement")
                    except Exception as save_error:
                        logger.warning(f"[FOLLOWUP SETTINGS GET] ⚠️ Erreur lors de la sauvegarde automatique des templates: {save_error}")
                        db.rollback()
            
            result = FollowUpSettings(**merged)
            logger.info(f"[FOLLOWUP SETTINGS GET] ✅ Paramètres récupérés avec succès ({len(result.messages)} templates)")
            return result
        except Exception as e:
            logger.warning(f"[FOLLOWUP SETTINGS GET] ⚠️ Erreur de validation, retour des valeurs par défaut: {e}")
            # En cas d'erreur de validation, retourner les valeurs par défaut
            return default_settings
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur dans get_followup_settings: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des paramètres: {str(e)}"
        )


@router.patch("/settings", response_model=FollowUpSettings)
def update_followup_settings(
    settings_data: FollowUpSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour la configuration IA des relances"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"[FOLLOWUP SETTINGS PATCH] Début - User: {current_user.id}, Company: {current_user.company_id}")
        _check_company_access(current_user)
        
        from app.db.models.company_settings import CompanySettings
        
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        if not company_settings:
            company_settings = CompanySettings(
                company_id=current_user.company_id,
                settings={}
            )
            db.add(company_settings)
            db.commit()
            db.refresh(company_settings)
        
        settings_dict = company_settings.settings
        if "followups" not in settings_dict:
            settings_dict["followups"] = {}
        
        # Mettre à jour uniquement les champs fournis
        update_data = settings_data.model_dump(exclude_unset=True)
        
        logger.info(f"[FOLLOWUP SETTINGS PATCH] Données reçues: {list(update_data.keys())}")
        
        # Mettre à jour tous les champs fournis (délais, méthodes, conditions d'arrêt, messages, etc.)
        for key, value in update_data.items():
            settings_dict["followups"][key] = value
            logger.info(f"[FOLLOWUP SETTINGS PATCH] Sauvegarde de '{key}': {value}")
        
        # Forcer SQLAlchemy à détecter les changements dans le champ JSON
        from sqlalchemy.orm.attributes import flag_modified
        company_settings.settings = settings_dict
        flag_modified(company_settings, "settings")
        
        db.commit()
        logger.info(f"[FOLLOWUP SETTINGS PATCH] ✅ Configuration sauvegardée avec succès")
        logger.info(f"[FOLLOWUP SETTINGS PATCH] - initial_delay_days: {settings_dict.get('followups', {}).get('initial_delay_days', 'N/A')}")
        logger.info(f"[FOLLOWUP SETTINGS PATCH] - max_relances: {settings_dict.get('followups', {}).get('max_relances', 'N/A')}")
        logger.info(f"[FOLLOWUP SETTINGS PATCH] - relance_delays: {settings_dict.get('followups', {}).get('relance_delays', 'N/A')}")
        logger.info(f"[FOLLOWUP SETTINGS PATCH] - relance_methods: {settings_dict.get('followups', {}).get('relance_methods', 'N/A')}")
        logger.info(f"[FOLLOWUP SETTINGS PATCH] - Templates: {len(settings_dict.get('followups', {}).get('messages', []))} template(s)")
        db.refresh(company_settings)
        
        # Retourner les paramètres complets (directement depuis settings_dict, pas depuis merged)
        # pour s'assurer qu'on retourne les vraies valeurs sauvegardées
        followup_settings = settings_dict.get("followups", {})
        default_settings = FollowUpSettings(
            initial_delay_days=7,
            max_relances=3,
            relance_delays=[7, 14, 21],
            relance_methods=["email", "email", "whatsapp"],
            stop_conditions=FollowUpStopConditions(
                stop_on_client_response=True,
                stop_on_invoice_paid=True,
                stop_on_quote_refused=True,
            ),
            messages=[],
            enable_relances_before=False,
            days_before_due=None,
            hours_before_due=None,
        )
        
        try:
            # Fusionner avec les valeurs par défaut pour les champs manquants
            merged = default_settings.model_dump()
            merged.update(followup_settings)
            
            # S'assurer que les valeurs sauvegardées sont bien présentes
            logger.info(f"[FOLLOWUP SETTINGS PATCH] Vérification des valeurs sauvegardées:")
            logger.info(f"[FOLLOWUP SETTINGS PATCH] - initial_delay_days dans merged: {merged.get('initial_delay_days')}")
            logger.info(f"[FOLLOWUP SETTINGS PATCH] - relance_delays dans merged: {merged.get('relance_delays')}")
            
            result = FollowUpSettings(**merged)
            logger.info(f"[FOLLOWUP SETTINGS PATCH] ✅ Paramètres mis à jour avec succès et retournés")
            return result
        except Exception as e:
            logger.warning(f"[FOLLOWUP SETTINGS PATCH] ⚠️ Erreur de validation, retour des valeurs par défaut: {e}")
            import traceback
            logger.error(f"[FOLLOWUP SETTINGS PATCH] Traceback: {traceback.format_exc()}")
            return default_settings
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur dans update_followup_settings: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise à jour des paramètres: {str(e)}"
        )


@router.get("/{followup_id}", response_model=FollowUpRead)
def get_followup(
    followup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère les détails d'une relance"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[FOLLOWUP GET/{followup_id}] Début - User: {current_user.id}, Company: {current_user.company_id}")
    _check_company_access(current_user)
    
    followup = db.query(FollowUp).options(
        joinedload(FollowUp.client),
        joinedload(FollowUp.created_by)
    ).filter(
        FollowUp.id == followup_id,
        FollowUp.company_id == current_user.company_id
    ).first()
    
    if not followup:
        logger.warning(f"[FOLLOWUP GET/{followup_id}] ❌ Relance non trouvée")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    logger.info(f"[FOLLOWUP GET/{followup_id}] ✅ Relance trouvée - Type: {followup.type}, Status: {followup.status}, Client: {followup.client_id}")
    return FollowUpRead(**(_followup_to_dict(followup, db)))


@router.post("", response_model=FollowUpRead, status_code=status.HTTP_201_CREATED)
def create_followup(
    followup_data: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée une nouvelle relance"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[FOLLOWUP CREATE] Début - User: {current_user.id}, Company: {current_user.company_id}")
    logger.info(f"[FOLLOWUP CREATE] Données - Type: {followup_data.type}, Client: {followup_data.client_id}, Source: {followup_data.source_label}, Due: {followup_data.due_date}")
    
    _check_company_access(current_user)
    
    # Vérifier que le client existe et appartient à l'entreprise
    client = db.query(Client).filter(
        Client.id == followup_data.client_id,
        Client.company_id == current_user.company_id
    ).first()
    
    if not client:
        logger.warning(f"[FOLLOWUP CREATE] ❌ Client {followup_data.client_id} non trouvé")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    logger.info(f"[FOLLOWUP CREATE] Client trouvé: {client.name}")
    
    # Si c'est une relance automatique, calculer la due_date en fonction de initial_delay_days
    due_date = followup_data.due_date
    if followup_data.auto_enabled:
        from app.db.models.company_settings import CompanySettings
        from datetime import timedelta
        
        # Récupérer les paramètres de relance automatique
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        if company_settings:
            settings_dict = company_settings.settings
            followup_settings = settings_dict.get("followups", {})
            relance_delays = followup_settings.get("relance_delays", [7, 14, 21])
            
            # Utiliser le premier délai de relance_delays pour la première relance
            # Si relance_delays est vide, utiliser initial_delay_days comme fallback
            if relance_delays and len(relance_delays) > 0:
                initial_delay_days = relance_delays[0]
            else:
                initial_delay_days = followup_settings.get("initial_delay_days", 7)
            
            # Calculer la due_date en fonction du délai initial
            due_date = datetime.now() + timedelta(days=initial_delay_days)
            logger.info(f"[FOLLOWUP CREATE] Relance automatique - due_date calculée: {due_date.strftime('%Y-%m-%d')} (dans {initial_delay_days} jours, depuis relance_delays[0] = {relance_delays[0] if relance_delays else 'N/A'})")
        else:
            # Valeur par défaut si pas de configuration
            due_date = datetime.now() + timedelta(days=7)
            logger.info(f"[FOLLOWUP CREATE] Relance automatique - due_date par défaut: {due_date.strftime('%Y-%m-%d')} (dans 7 jours)")
    
    # Créer la relance
    followup = FollowUp(
        company_id=current_user.company_id,
        client_id=followup_data.client_id,
        type=followup_data.type,
        source_type=followup_data.source_type,
        source_id=followup_data.source_id,
        source_label=followup_data.source_label,
        due_date=due_date,
        actual_date=due_date,  # Par défaut, actual_date = due_date
        status=followup_data.status,
        amount=followup_data.amount,
        auto_enabled=followup_data.auto_enabled,
        auto_frequency_days=followup_data.auto_frequency_days,
        auto_stop_on_response=followup_data.auto_stop_on_response,
        auto_stop_on_paid=followup_data.auto_stop_on_paid,
        auto_stop_on_refused=followup_data.auto_stop_on_refused,
        created_by_id=current_user.id
    )
    
    db.add(followup)
    db.commit()
    db.refresh(followup)
    
    logger.info(f"[FOLLOWUP CREATE] ✅ Relance créée avec succès - ID: {followup.id}")
    
    # Charger les relations
    followup = db.query(FollowUp).options(
        joinedload(FollowUp.client),
        joinedload(FollowUp.created_by)
    ).filter(FollowUp.id == followup.id).first()
    
    return FollowUpRead(**(_followup_to_dict(followup, db)))


@router.patch("/{followup_id}", response_model=FollowUpRead)
def update_followup(
    followup_id: int,
    followup_data: FollowUpUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour une relance"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[FOLLOWUP UPDATE/{followup_id}] Début - User: {current_user.id}, Company: {current_user.company_id}")
    _check_company_access(current_user)
    
    followup = db.query(FollowUp).filter(
        FollowUp.id == followup_id,
        FollowUp.company_id == current_user.company_id
    ).first()
    
    if not followup:
        logger.warning(f"[FOLLOWUP UPDATE/{followup_id}] ❌ Relance non trouvée")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    # Mettre à jour les champs fournis
    update_dict = followup_data.model_dump(exclude_unset=True)
    logger.info(f"[FOLLOWUP UPDATE/{followup_id}] Champs à mettre à jour: {list(update_dict.keys())}")
    
    # Détecter si on active l'automatisation (passage de manuel à automatique)
    was_manual = not followup.auto_enabled
    will_be_auto = update_dict.get("auto_enabled", followup.auto_enabled)
    activating_automation = was_manual and will_be_auto
    
    logger.info(f"[FOLLOWUP UPDATE/{followup_id}] État automatisation - Avant: {followup.auto_enabled}, Après: {will_be_auto}, Activation: {activating_automation}")
    
    # Si on active l'automatisation, réinitialiser comme une relance automatique créée depuis le début
    if activating_automation:
        logger.info(f"[FOLLOWUP UPDATE/{followup_id}] 🔄 Activation de l'automatisation - Réinitialisation comme relance automatique")
        
        # Récupérer les paramètres de relance
        from app.db.models.company_settings import CompanySettings
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        if company_settings:
            settings_dict = company_settings.settings
            followup_settings = settings_dict.get("followups", {})
            relance_delays = followup_settings.get("relance_delays", [7, 14, 21])
            max_relances = followup_settings.get("max_relances", 3)
            
            # Compter les relances déjà envoyées (dans l'historique)
            total_sent = db.query(FollowUpHistory).filter(
                FollowUpHistory.followup_id == followup_id,
                FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE
            ).count()
            
            logger.info(f"[FOLLOWUP UPDATE/{followup_id}] Relances déjà envoyées: {total_sent}/{max_relances}")
            
            if total_sent == 0:
                # Aucune relance envoyée : utiliser le premier délai (comme à la création)
                if relance_delays and len(relance_delays) > 0:
                    initial_delay_days = relance_delays[0]
                else:
                    initial_delay_days = followup_settings.get("initial_delay_days", 7)
                
                due_date = datetime.now() + timedelta(days=initial_delay_days)
                followup.due_date = due_date
                followup.actual_date = due_date
                followup.status = FollowUpStatus.A_FAIRE
                
                logger.info(f"[FOLLOWUP UPDATE/{followup_id}] ✅ Relance automatique initialisée - due_date: {due_date.strftime('%Y-%m-%d')} (dans {initial_delay_days} jours)")
            else:
                # Des relances ont déjà été envoyées : calculer la prochaine date selon le nombre de relances restantes
                remaining_relances = max_relances - total_sent
                
                if remaining_relances > 0:
                    # Calculer le délai pour la prochaine relance
                    delay_index = min(total_sent - 1, len(relance_delays) - 1)
                    next_delay_days = relance_delays[delay_index] if delay_index >= 0 else relance_delays[0]
                    
                    next_due_date = datetime.now() + timedelta(days=next_delay_days)
                    followup.due_date = next_due_date
                    followup.actual_date = datetime.now()
                    followup.status = FollowUpStatus.A_FAIRE
                    
                    logger.info(f"[FOLLOWUP UPDATE/{followup_id}] ✅ Relance automatique activée - Prochaine relance dans {next_delay_days} jours (le {next_due_date.strftime('%Y-%m-%d')})")
                else:
                    # Toutes les relances ont été envoyées
                    followup.status = FollowUpStatus.FAIT
                    logger.info(f"[FOLLOWUP UPDATE/{followup_id}] ✅ Toutes les relances ont été envoyées, statut: 'Fait'")
            
            # Mettre à jour les champs d'automatisation si fournis
            if "auto_frequency_days" not in update_dict:
                # Utiliser le premier délai comme fréquence par défaut
                if relance_delays and len(relance_delays) > 0:
                    followup.auto_frequency_days = relance_delays[0]
            
            if "auto_stop_on_response" not in update_dict:
                followup.auto_stop_on_response = followup_settings.get("stop_conditions", {}).get("stop_on_client_response", True)
            
            if "auto_stop_on_paid" not in update_dict:
                followup.auto_stop_on_paid = followup_settings.get("stop_conditions", {}).get("stop_on_invoice_paid", True)
            
            if "auto_stop_on_refused" not in update_dict:
                followup.auto_stop_on_refused = followup_settings.get("stop_conditions", {}).get("stop_on_quote_refused", True)
    
    # Mettre à jour tous les autres champs
    for field, value in update_dict.items():
        setattr(followup, field, value)
    
    db.commit()
    db.refresh(followup)
    
    logger.info(f"[FOLLOWUP UPDATE/{followup_id}] ✅ Relance mise à jour - Status: {followup.status}, Due: {followup.due_date}, Auto: {followup.auto_enabled}")
    
    # Charger les relations
    followup = db.query(FollowUp).options(
        joinedload(FollowUp.client),
        joinedload(FollowUp.created_by)
    ).filter(FollowUp.id == followup.id).first()
    
    return FollowUpRead(**(_followup_to_dict(followup, db)))


def get_default_followup_templates() -> List[FollowUpMessageTemplate]:
    """Génère les templates par défaut pour chaque type de relance"""
    return [
        FollowUpMessageTemplate(
            id=1,
            type="Devis non répondu",
            content="Bonjour {client_name},\n\nNous vous contactons concernant votre devis {source_label}.\n\nNous n'avons pas encore reçu de retour de votre part. Nous serions ravis de répondre à vos questions ou de vous accompagner dans votre projet.\n\nN'hésitez pas à nous contacter si vous souhaitez discuter de ce devis.\n\nCordialement,\n{company_name}\n{company_email}"
        ),
        FollowUpMessageTemplate(
            id=2,
            type="Facture impayée",
            content="Bonjour {client_name},\n\nNous vous contactons concernant votre facture {source_label} d'un montant de {amount} €.\n\nCette facture est en attente de règlement. Nous vous remercions de bien vouloir régulariser votre situation dans les plus brefs délais.\n\nPour toute question, n'hésitez pas à nous contacter.\n\nCordialement,\n{company_name}\n{company_email}"
        ),
        FollowUpMessageTemplate(
            id=3,
            type="Info manquante",
            content="Bonjour {client_name},\n\nNous avons besoin d'informations complémentaires concernant {source_label}.\n\nPourriez-vous nous fournir ces informations afin que nous puissions avancer sur votre dossier ?\n\nMerci de votre collaboration.\n\nCordialement,\n{company_name}\n{company_email}"
        ),
        FollowUpMessageTemplate(
            id=4,
            type="Rappel RDV",
            content="Bonjour {client_name},\n\nNous vous rappelons votre rendez-vous concernant {source_label}.\n\nNous vous attendons et restons à votre disposition pour toute question.\n\nÀ bientôt,\n{company_name}\n{company_email}\n{company_phone}"
        ),
        FollowUpMessageTemplate(
            id=5,
            type="Client inactif",
            content="Bonjour {client_name},\n\nNous n'avons pas eu de nouvelles de votre part depuis quelque temps concernant {source_label}.\n\nNous serions ravis de reprendre contact avec vous et de voir comment nous pouvons vous accompagner.\n\nN'hésitez pas à nous contacter.\n\nCordialement,\n{company_name}\n{company_email}"
        ),
        FollowUpMessageTemplate(
            id=6,
            type="Projet en attente",
            content="Bonjour {client_name},\n\nNous vous contactons concernant votre projet {source_label}.\n\nCe projet semble être en attente. Nous serions ravis de discuter avec vous de la suite à donner.\n\nN'hésitez pas à nous contacter pour planifier la prochaine étape.\n\nCordialement,\n{company_name}\n{company_email}"
        ),
    ]


@router.patch("/{followup_id}/mark-done", response_model=FollowUpRead)
def mark_followup_done(
    followup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Marque une relance comme faite"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[FOLLOWUP MARK-DONE/{followup_id}] Début - User: {current_user.id}, Company: {current_user.company_id}")
    _check_company_access(current_user)
    
    followup = db.query(FollowUp).filter(
        FollowUp.id == followup_id,
        FollowUp.company_id == current_user.company_id
    ).first()
    
    if not followup:
        logger.warning(f"[FOLLOWUP MARK-DONE/{followup_id}] ❌ Relance non trouvée")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    logger.info(f"[FOLLOWUP MARK-DONE/{followup_id}] Ancien statut: {followup.status}")
    followup.status = FollowUpStatus.FAIT
    db.commit()
    db.refresh(followup)
    
    logger.info(f"[FOLLOWUP MARK-DONE/{followup_id}] ✅ Relance marquée comme faite")
    
    # Charger les relations
    followup = db.query(FollowUp).options(
        joinedload(FollowUp.client),
        joinedload(FollowUp.created_by)
    ).filter(FollowUp.id == followup.id).first()
    
    return FollowUpRead(**(_followup_to_dict(followup, db)))


@router.delete("/{followup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_followup(
    followup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime une relance"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[FOLLOWUP DELETE/{followup_id}] Début - User: {current_user.id}, Company: {current_user.company_id}")
    _check_company_access(current_user)
    
    followup = db.query(FollowUp).filter(
        FollowUp.id == followup_id,
        FollowUp.company_id == current_user.company_id
    ).first()
    
    if not followup:
        logger.warning(f"[FOLLOWUP DELETE/{followup_id}] ❌ Relance non trouvée")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    logger.info(f"[FOLLOWUP DELETE/{followup_id}] Suppression - Type: {followup.type}, Client: {followup.client_id}, Source: {followup.source_label}")
    db.delete(followup)
    db.commit()
    
    logger.info(f"[FOLLOWUP DELETE/{followup_id}] ✅ Relance supprimée avec succès")


class SendFollowUpRequest(PydanticBaseModel):
    message: Optional[str] = None
    method: str = "email"


@router.post("/{followup_id}/send", response_model=FollowUpHistoryRead, status_code=status.HTTP_201_CREATED)
def send_followup(
    followup_id: int,
    request: SendFollowUpRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Envoie une relance (génère et envoie le message)"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Récupérer le message depuis la requête
    message = request.message
    
    logger.info(f"[FOLLOWUP SEND/{followup_id}] ========== DÉBUT ENVOI RELANCE ==========")
    logger.info(f"[FOLLOWUP SEND/{followup_id}] User: {current_user.id}, Company: {current_user.company_id}")
    logger.info(f"[FOLLOWUP SEND/{followup_id}] Method demandée: {request.method}")
    _check_company_access(current_user)
    
    followup = db.query(FollowUp).filter(
        FollowUp.id == followup_id,
        FollowUp.company_id == current_user.company_id
    ).first()
    
    if not followup:
        logger.warning(f"[FOLLOWUP SEND/{followup_id}] ❌ Relance non trouvée")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    # Toujours générer le message depuis les templates configurés pour garantir les vraies valeurs
    # (même si un message est fourni, on le régénère pour avoir les infos entreprise à jour)
    logger.info(f"[FOLLOWUP SEND/{followup_id}] Génération du message depuis les templates configurés (ignorant le message fourni si présent)")
    from app.db.models.company_settings import CompanySettings
    from app.db.models.inbox_integration import InboxIntegration
    
    client_name = followup.client.name if followup.client else "Client"
    amount = float(followup.amount) if followup.amount else None
    
    # Récupérer les informations de l'entreprise et le template en une seule requête
    # Priorité : settings.company_info > intégrations inbox > valeurs par défaut
    company_name = current_user.company.name if current_user.company else "Notre entreprise"
    company_email = None
    company_phone = None
    company_info = {}
    template_content = None
    
    try:
        # Récupérer company_settings une seule fois pour tout
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        if company_settings:
            settings_dict = company_settings.settings
            company_info = settings_dict.get("company_info", {})
            
            # Email depuis settings (priorité 1)
            if company_info.get("email"):
                company_email = company_info.get("email")
            
            # Téléphone depuis settings (priorité 1)
            if company_info.get("phone"):
                company_phone = company_info.get("phone")
            
            # Récupérer le template pour ce type de relance
            followup_settings = settings_dict.get("followups", {})
            messages = followup_settings.get("messages", [])
            
            # Chercher le template correspondant au type de relance
            for msg_template in messages:
                if isinstance(msg_template, dict) and msg_template.get("type") == followup.type:
                    template_content = msg_template.get("content")
                    break
        
        # Si pas d'email dans settings, utiliser l'intégration inbox principale (priorité 2)
        if not company_email:
            primary_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == current_user.company_id,
                InboxIntegration.is_primary == True,
                InboxIntegration.is_active == True,
                InboxIntegration.integration_type == "imap"
            ).first()
            
            if primary_integration and primary_integration.email_address:
                company_email = primary_integration.email_address
        
        # Si pas de téléphone dans settings, utiliser l'intégration WhatsApp/Vonage (priorité 2)
        if not company_phone:
            vonage_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == current_user.company_id,
                InboxIntegration.integration_type == "whatsapp",
                InboxIntegration.is_active == True
            ).first()
            
            if vonage_integration and vonage_integration.phone_number:
                company_phone = vonage_integration.phone_number
        
        # Si aucun template trouvé, utiliser le template par défaut pour ce type
        if not template_content:
            logger.info(f"[FOLLOWUP SEND/{followup_id}] Aucun template configuré pour '{followup.type}', utilisation du template par défaut")
            default_templates = get_default_followup_templates()
            for default_template in default_templates:
                if default_template.type == followup.type:
                    template_content = default_template.content
                    break
    except Exception as e:
        logger.warning(f"[FOLLOWUP SEND/{followup_id}] Erreur lors de la récupération des infos entreprise/template: {e}")
    
    logger.info(f"[FOLLOWUP SEND/{followup_id}] Infos entreprise - Nom: {company_name}, Email: {company_email or 'N/A'}, Phone: {company_phone or 'N/A'}")
    
    # Utiliser le template ou un message par défaut
    if template_content:
        # Générer un label descriptif basé sur le type de relance si source_label contient juste l'email/téléphone
        source_label = followup.source_label
        if not source_label or source_label.startswith("Relance manuelle -") or "@" in source_label or (len(source_label) > 0 and source_label.replace("+", "").replace(" ", "").replace("-", "").isdigit()):
            # Générer un label approprié selon le type
            if "devis" in followup.type.lower() or "Devis" in followup.type:
                source_label = "votre devis"
            elif "facture" in followup.type.lower() or "Facture" in followup.type:
                source_label = "votre facture"
            elif "info" in followup.type.lower() or "Info" in followup.type:
                source_label = "votre dossier"
            elif "rdv" in followup.type.lower() or "RDV" in followup.type or "rendez-vous" in followup.type.lower():
                source_label = "votre rendez-vous"
            elif "projet" in followup.type.lower() or "Projet" in followup.type:
                source_label = "votre projet"
            elif "client" in followup.type.lower() or "Client" in followup.type:
                source_label = "votre dossier"
            else:
                source_label = "votre dossier"
        
        # Remplacer les variables dans le template
        message = template_content
        message = message.replace("{client_name}", client_name)
        message = message.replace("{source_label}", source_label)
        message = message.replace("{company_name}", company_name)
        message = message.replace("{company_email}", company_email or "")
        message = message.replace("{company_phone}", company_phone or "")
        
        # Récupérer les informations supplémentaires depuis company_info
        company_info = {}
        try:
            company_settings = db.query(CompanySettings).filter(
                CompanySettings.company_id == current_user.company_id
            ).first()
            if company_settings:
                settings_dict = company_settings.settings
                company_info = settings_dict.get("company_info", {})
        except Exception as e:
            logger.warning(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] Erreur lors de la récupération de company_info: {e}")
        
        # Remplacer les variables supplémentaires
        message = message.replace("{company_address}", company_info.get("address") or "")
        message = message.replace("{company_city}", company_info.get("city") or "")
        message = message.replace("{company_postal_code}", company_info.get("postal_code") or "")
        message = message.replace("{company_country}", company_info.get("country") or "")
        message = message.replace("{company_siren}", company_info.get("siren") or "")
        message = message.replace("{company_siret}", company_info.get("siret") or "")
        message = message.replace("{company_vat_number}", company_info.get("vat_number") or "")
        
        # Si company_phone n'était pas défini, essayer depuis company_info
        if not company_phone and company_info.get("phone"):
            company_phone = company_info.get("phone")
            message = message.replace("{company_phone}", company_phone)
        if amount:
            message = message.replace("{amount}", f"{amount:.2f}")
        else:
            message = message.replace("{amount}", "")
        
        # Remplacer {signature_link} si c'est une relance de devis
        if "{signature_link}" in message and followup.source_type == "quote" and followup.source_id:
            try:
                from app.db.models.billing import Quote
                from app.core.config import settings
                
                quote = db.query(Quote).filter(Quote.id == followup.source_id).first()
                if quote and quote.public_token:
                    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                    signature_link = f"{frontend_url}/quote/{quote.public_token}"
                    message = message.replace("{signature_link}", signature_link)
                    logger.info(f"[FOLLOWUP SEND/{followup_id}] Lien de signature ajouté pour devis {quote.number}: {signature_link}")
                else:
                    # Si pas de token, enlever la variable
                    message = message.replace("{signature_link}", "")
            except Exception as e:
                logger.warning(f"[FOLLOWUP SEND/{followup_id}] Erreur lors de la récupération du lien de signature: {e}")
                message = message.replace("{signature_link}", "")
        
        logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Message généré depuis le template pour le type: {followup.type}")
    else:
        # Message par défaut si pas de template
        logger.info(f"[FOLLOWUP SEND/{followup_id}] ⚠️ Aucun template trouvé, utilisation d'un message par défaut")
        if "devis" in followup.type.lower() or "Devis" in followup.type:
            message = f"Bonjour {client_name},\n\nNous vous rappelons que votre devis concernant {followup.source_label} est en attente de réponse.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n{company_name}"
        elif "facture" in followup.type.lower() or "Facture" in followup.type:
            amount_str = f" d'un montant de {amount} €" if amount else ""
            message = f"Bonjour {client_name},\n\nNous vous rappelons que votre facture concernant {followup.source_label}{amount_str} est en attente de règlement.\n\nMerci de régulariser votre situation dans les plus brefs délais.\n\nCordialement,\n{company_name}"
        else:
            message = f"Bonjour {client_name},\n\nNous vous contactons concernant {followup.source_label}.\n\nCordialement,\n{company_name}"
    
    logger.info(f"[FOLLOWUP SEND/{followup_id}] Message final généré ({len(message)} caractères)")
    
    # Envoyer la relance via inbox (cela créera automatiquement la conversation et enverra le message)
    conversation_id = None
    email_sent = False
    sms_sent = False
    try:
        from app.db.models.conversation import Conversation, InboxMessage
        
        # Récupérer le client
        if followup.client:
            # Chercher une conversation existante avec ce client pour cette source
            existing_conversation = db.query(Conversation).filter(
                Conversation.company_id == current_user.company_id,
                Conversation.client_id == followup.client_id,
                Conversation.source == request.method  # email, sms, whatsapp
            ).order_by(Conversation.created_at.desc()).first()
            
            # Utiliser la conversation existante ou en créer une nouvelle
            if existing_conversation:
                conversation = existing_conversation
                conversation_id = conversation.id
                logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Conversation existante trouvée: {conversation_id} (client: {followup.client_id}, source: {request.method})")
            else:
                # Créer une nouvelle conversation
                conversation = Conversation(
                    company_id=current_user.company_id,
                    client_id=followup.client_id,
                    subject=f"Relance - {followup.source_label}",
                    status="À répondre",
                    source=request.method,  # email, sms, whatsapp
                    unread_count=0,  # Message de l'entreprise, donc pas de non-lu
                    last_message_at=datetime.now()
                )
                db.add(conversation)
                db.flush()
                conversation_id = conversation.id
                logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Nouvelle conversation créée: {conversation_id} (client: {followup.client_id}, source: {request.method})")
            
            # Récupérer l'adresse email ou téléphone de l'expéditeur depuis l'intégration
            from app.db.models.inbox_integration import InboxIntegration
            from_email = None
            from_phone = None
            from_name = current_user.full_name or "Système"
            primary_integration = None
            vonage_integration = None
            
            # Mettre à jour la source de la conversation si elle ne correspond pas à la méthode de la requête
            if conversation.source != request.method:
                logger.info(f"[FOLLOWUP SEND/{followup_id}] Mise à jour de la source de la conversation: {conversation.source} -> {request.method}")
                conversation.source = request.method
            
            if request.method == "email":
                primary_integration = db.query(InboxIntegration).filter(
                    InboxIntegration.company_id == current_user.company_id,
                    InboxIntegration.is_primary == True,
                    InboxIntegration.is_active == True,
                    InboxIntegration.integration_type == "imap"
                ).first()
                if primary_integration:
                    from_email = primary_integration.email_address
                    from_name = primary_integration.name or from_name
                    logger.info(f"[FOLLOWUP SEND/{followup_id}] Intégration email trouvée: {from_email}")
                else:
                    logger.warning(f"[FOLLOWUP SEND/{followup_id}] ⚠️ Aucune intégration email active trouvée")
            elif request.method in ["sms", "whatsapp"]:
                vonage_integration = db.query(InboxIntegration).filter(
                    InboxIntegration.company_id == current_user.company_id,
                    InboxIntegration.integration_type == "whatsapp",
                    InboxIntegration.is_active == True
                ).first()
                if vonage_integration:
                    from_phone = vonage_integration.phone_number
                    logger.info(f"[FOLLOWUP SEND/{followup_id}] Intégration SMS/WhatsApp trouvée: {from_phone}")
                else:
                    logger.warning(f"[FOLLOWUP SEND/{followup_id}] ⚠️ Aucune intégration SMS/WhatsApp active trouvée")
            
            # Créer directement le message dans la conversation (pas besoin de MessageCreate ici)
            inbox_message = InboxMessage(
                conversation_id=conversation_id,
                from_name=from_name,
                from_email=from_email,
                from_phone=from_phone,
                content=message,
                source=request.method,
                is_from_client=False,  # C'est l'entreprise qui envoie
                read=True,  # Déjà lu car c'est l'entreprise qui l'a envoyé
                external_id=None,
                external_metadata=None
            )
            db.add(inbox_message)
            db.flush()
            
            # Mettre à jour la conversation (last_message_at pour qu'elle apparaisse en haut dans inbox)
            conversation.last_message_at = datetime.now()
            db.commit()  # Commit pour s'assurer que le message est sauvegardé avant l'envoi
            logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Message créé et conversation {conversation_id} mise à jour (last_message_at)")
            
            # Envoyer l'email/SMS via la logique inbox (comme dans create_message)
            # Le système inbox enverra automatiquement car is_from_client=False
            from app.core.smtp_service import send_email_smtp, get_smtp_config
            from app.core.vonage_service import VonageSMSService
            from app.core.encryption_service import get_encryption_service
            
            if request.method == "email":
                try:
                    if not primary_integration:
                        logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Impossible d'envoyer l'email: aucune intégration email trouvée")
                    elif not primary_integration.email_address:
                        logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Impossible d'envoyer l'email: pas d'adresse email dans l'intégration")
                    elif not primary_integration.email_password:
                        logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Impossible d'envoyer l'email: pas de mot de passe dans l'intégration")
                    elif not followup.client or not followup.client.email:
                        logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Impossible d'envoyer l'email: pas d'email client")
                    else:
                        to_email = followup.client.email
                        encryption_service = get_encryption_service()
                        email_password = encryption_service.decrypt(primary_integration.email_password) if primary_integration.email_password else None
                        
                        if not email_password:
                            logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Impossible de décrypter le mot de passe email")
                        else:
                            smtp_config = get_smtp_config(primary_integration.email_address)
                            logger.info(f"[FOLLOWUP SEND/{followup_id}] 📧 Envoi de l'email de {primary_integration.email_address} à {to_email}")
                            send_email_smtp(
                                smtp_server=smtp_config["smtp_server"],
                                smtp_port=smtp_config["smtp_port"],
                                email_address=primary_integration.email_address,
                                password=email_password,
                                to_email=to_email,
                                subject=conversation.subject or "Relance",
                                content=message,
                                use_tls=smtp_config["use_tls"],
                                from_name=from_name
                            )
                            email_sent = True
                            logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Email envoyé avec succès à {to_email}")
                except Exception as e:
                    logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Erreur lors de l'envoi de l'email: {e}", exc_info=True)
            
            elif request.method in ["sms", "whatsapp"]:
                try:
                    if not vonage_integration:
                        logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Impossible d'envoyer le SMS: aucune intégration WhatsApp trouvée")
                    elif not vonage_integration.api_key:
                        logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Impossible d'envoyer le SMS: pas de clé API dans l'intégration")
                    elif not followup.client or not followup.client.phone:
                        logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Impossible d'envoyer le SMS: pas de téléphone client")
                    else:
                        encryption_service = get_encryption_service()
                        api_key = encryption_service.decrypt(vonage_integration.api_key) if vonage_integration.api_key else None
                        api_secret = encryption_service.decrypt(vonage_integration.webhook_secret) if vonage_integration.webhook_secret else None
                        
                        if not api_key or not api_secret:
                            logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Impossible de décrypter les credentials Vonage")
                        else:
                            vonage_service = VonageSMSService(api_key=api_key, api_secret=api_secret)
                            logger.info(f"[FOLLOWUP SEND/{followup_id}] 📱 Envoi du SMS de {vonage_integration.phone_number} à {followup.client.phone}")
                            result = vonage_service.send_sms(
                                to=followup.client.phone,
                                message=message,
                                from_number=vonage_integration.phone_number
                            )
                            if result.get("success"):
                                inbox_message.external_id = result.get("message_id")
                                inbox_message.external_metadata = {"vonage_message_id": result.get("message_id"), "provider": "vonage"}
                                db.commit()  # Sauvegarder l'external_id
                                sms_sent = True
                                logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ SMS envoyé avec succès à {followup.client.phone}")
                            else:
                                logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Échec de l'envoi SMS: {result.get('error', 'Erreur inconnue')}")
                except Exception as e:
                    logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Erreur lors de l'envoi du SMS: {e}", exc_info=True)
            
            logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Message ajouté à la conversation inbox: {conversation_id}")
            send_failed = False
            if request.method == "email" and not email_sent:
                logger.warning(f"[FOLLOWUP SEND/{followup_id}] ⚠️ ATTENTION: La conversation a été créée mais l'email n'a PAS été envoyé")
                send_failed = True
            elif request.method in ["sms", "whatsapp"] and not sms_sent:
                logger.warning(f"[FOLLOWUP SEND/{followup_id}] ⚠️ ATTENTION: La conversation a été créée mais le SMS n'a PAS été envoyé")
                send_failed = True
            
            # Créer une notification si l'envoi a échoué
            if send_failed:
                try:
                    from app.core.notifications import create_notification
                    from app.db.models.notification import NotificationType
                    from app.core.config import settings
                    
                    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                    create_notification(
                        db=db,
                        company_id=current_user.company_id,
                        notification_type=NotificationType.FOLLOWUP_FAILED,
                        title="Échec d'envoi de relance",
                        message=f"La relance pour {followup.source_label} n'a pas pu être envoyée via {request.method}",
                        link_url=f"{frontend_url}/app/relances",
                        link_text="Voir les relances",
                        source_type="followup",
                        source_id=followup_id,
                    )
                    logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Notification créée pour échec d'envoi")
                except Exception as e:
                    logger.warning(f"[FOLLOWUP SEND/{followup_id}] Erreur lors de la création de la notification d'échec: {e}")
            
            logger.info(f"[FOLLOWUP SEND/{followup_id}] ========== FIN ENVOI RELANCE ==========")
            
        else:
            logger.warning(f"[FOLLOWUP SEND/{followup_id}] ❌ Pas de client associé, impossible de créer une conversation inbox")
            logger.info(f"[FOLLOWUP SEND/{followup_id}] ========== FIN ENVOI RELANCE (ÉCHEC) ==========")
            
            # Créer une notification pour l'échec (pas de client)
            try:
                from app.core.notifications import create_notification
                from app.db.models.notification import NotificationType
                from app.core.config import settings
                
                frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                create_notification(
                    db=db,
                    company_id=current_user.company_id,
                    notification_type=NotificationType.FOLLOWUP_FAILED,
                    title="Échec d'envoi de relance",
                    message=f"La relance pour {followup.source_label} n'a pas pu être envoyée (pas de client associé)",
                    link_url=f"{frontend_url}/app/relances",
                    link_text="Voir les relances",
                    source_type="followup",
                    source_id=followup_id,
                )
                logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Notification créée pour échec d'envoi (pas de client)")
            except Exception as e:
                logger.warning(f"[FOLLOWUP SEND/{followup_id}] Erreur lors de la création de la notification d'échec: {e}")
    except Exception as e:
        logger.error(f"[FOLLOWUP SEND/{followup_id}] ❌ Erreur lors de la création de la conversation inbox: {e}", exc_info=True)
        # Ne pas faire échouer l'envoi si la création de conversation échoue
        # On continue sans conversation_id
    
    # Créer l'entrée d'historique (toujours, même si la conversation n'a pas pu être créée)
    history = FollowUpHistory(
        followup_id=followup_id,
        company_id=current_user.company_id,
        message=message,
        message_type=request.method,
        status=FollowUpHistoryStatus.ENVOYE,
        sent_by_id=current_user.id,
        sent_by_name=current_user.full_name,
        sent_at=datetime.now(),
        conversation_id=conversation_id  # Lier à la conversation si elle a été créée
    )
    
    db.add(history)
    db.commit()
    db.refresh(history)
    
    logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Historique créé - ID: {history.id}, Type: {request.method}, Conversation: {conversation_id or 'N/A'}")
    
    # Mettre à jour le statut de la relance
    # Compter le nombre de relances envoyées (manuelles + automatiques)
    total_sent = db.query(FollowUpHistory).filter(
        FollowUpHistory.followup_id == followup_id,
        FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE
    ).count()
    
    logger.info(f"[FOLLOWUP SEND/{followup_id}] Nombre total de relances envoyées: {total_sent}")
    
    # Si c'est une relance manuelle (pas automatique) et c'est la première, marquer comme "Fait"
    if not followup.auto_enabled:
        if total_sent == 1:
            followup.status = FollowUpStatus.FAIT
            logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Relance manuelle (première) marquée comme 'Fait'")
            
            # Créer une notification pour la relance complétée
            try:
                from app.core.notifications import create_notification
                from app.db.models.notification import NotificationType
                from app.core.config import settings
                
                frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                create_notification(
                    db=db,
                    company_id=current_user.company_id,
                    notification_type=NotificationType.FOLLOWUP_COMPLETED,
                    title="Relance complétée",
                    message=f"La relance pour {followup.source_label} a été envoyée avec succès",
                    link_url=f"{frontend_url}/app/relances",
                    link_text="Voir les relances",
                    source_type="followup",
                    source_id=followup_id,
                )
                logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Notification créée pour relance complétée")
            except Exception as e:
                logger.warning(f"[FOLLOWUP SEND/{followup_id}] Erreur lors de la création de la notification: {e}")
        else:
            # Si plusieurs relances manuelles, garder "À faire" pour permettre d'autres envois
            logger.info(f"[FOLLOWUP SEND/{followup_id}] Relance manuelle (multiple), statut inchangé")
    else:
        # Si c'est automatique, calculer la prochaine date de relance
        from app.db.models.company_settings import CompanySettings
        from datetime import timedelta
        
        # Récupérer les paramètres de relance automatique
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        if company_settings:
            settings_dict = company_settings.settings
            followup_settings = settings_dict.get("followups", {})
            max_relances = followup_settings.get("max_relances", 3)
            relance_delays = followup_settings.get("relance_delays", [7, 14, 21])
            
            # Calculer le nombre de relances restantes
            remaining_relances = max_relances - total_sent
            
            if remaining_relances > 0:
                # Calculer le délai pour la prochaine relance
                # total_sent = nombre de relances déjà envoyées (1, 2, 3...)
                # La prochaine relance sera la (total_sent + 1)ème
                # Le délai à utiliser est relance_delays[total_sent - 1] (index 0 pour la 2ème relance)
                delay_index = min(total_sent - 1, len(relance_delays) - 1)
                next_delay_days = relance_delays[delay_index] if delay_index >= 0 else relance_delays[0]
                
                logger.info(f"[FOLLOWUP SEND/{followup_id}] Configuration des délais:")
                logger.info(f"[FOLLOWUP SEND/{followup_id}] - total_sent: {total_sent}, delay_index: {delay_index}")
                logger.info(f"[FOLLOWUP SEND/{followup_id}] - relance_delays configurés: {relance_delays}")
                logger.info(f"[FOLLOWUP SEND/{followup_id}] - Délai utilisé pour la prochaine relance: {next_delay_days} jours")
                
                # Mettre à jour la due_date pour la prochaine relance
                next_due_date = datetime.now() + timedelta(days=next_delay_days)
                followup.due_date = next_due_date
                followup.actual_date = datetime.now()
                followup.status = FollowUpStatus.A_FAIRE  # Garder "À faire" pour les relances automatiques
                
                logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Relance automatique #{total_sent}/{max_relances}, prochaine relance dans {next_delay_days} jours (le {next_due_date.strftime('%Y-%m-%d')})")
            else:
                # Toutes les relances ont été envoyées
                followup.status = FollowUpStatus.FAIT
                logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Toutes les relances automatiques ont été envoyées, statut: 'Fait'")
                
                # Créer une notification pour la relance complétée
                try:
                    from app.core.notifications import create_notification
                    from app.db.models.notification import NotificationType
                    from app.core.config import settings
                    
                    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                    create_notification(
                        db=db,
                        company_id=current_user.company_id,
                        notification_type=NotificationType.FOLLOWUP_COMPLETED,
                        title="Relance complétée",
                        message=f"Toutes les relances automatiques pour {followup.source_label} ont été envoyées",
                        link_url=f"{frontend_url}/app/relances",
                        link_text="Voir les relances",
                        source_type="followup",
                        source_id=followup_id,
                    )
                    logger.info(f"[FOLLOWUP SEND/{followup_id}] ✅ Notification créée pour relance complétée")
                except Exception as e:
                    logger.warning(f"[FOLLOWUP SEND/{followup_id}] Erreur lors de la création de la notification: {e}")
        else:
            # Pas de paramètres, utiliser des valeurs par défaut
            followup.status = FollowUpStatus.A_FAIRE
            logger.info(f"[FOLLOWUP SEND/{followup_id}] ⚠️ Pas de paramètres de relance automatique, statut inchangé")
    
    db.commit()
    db.refresh(followup)
    
    history_dict = {
        "id": history.id,
        "followup_id": history.followup_id,
        "message": history.message,
        "message_type": history.message_type,
        "status": history.status,
        "sent_by_name": history.sent_by_name,
        "sent_at": history.sent_at,
    }
    
    return FollowUpHistoryRead(**history_dict)


@router.post("/{followup_id}/generate-message", response_model=GenerateMessageResponse)
def generate_followup_message(
    followup_id: int,
    request: GenerateMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Génère un message de relance avec IA"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] Début - User: {current_user.id}, Company: {current_user.company_id}")
    logger.info(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] Contexte fourni: {request.context[:100] if request.context else 'Aucun'}")
    
    _check_company_access(current_user)
    
    followup = db.query(FollowUp).options(
        joinedload(FollowUp.client)
    ).filter(
        FollowUp.id == followup_id,
        FollowUp.company_id == current_user.company_id
    ).first()
    
    if not followup:
        logger.warning(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] ❌ Relance non trouvée")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    # Récupérer le template de message pour ce type de relance
    from app.db.models.company_settings import CompanySettings
    from app.db.models.inbox_integration import InboxIntegration
    
    client_name = followup.client.name if followup.client else "Client"
    amount = float(followup.amount) if followup.amount else None
    
    # Récupérer les informations de l'entreprise
    # Priorité : settings.company_info > intégrations inbox > valeurs par défaut
    company_name = current_user.company.name if current_user.company else "Notre entreprise"
    company_email = None
    company_phone = None
    
    try:
        # D'abord, essayer de récupérer depuis les settings (company_info)
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        if company_settings:
            settings_dict = company_settings.settings
            company_info = settings_dict.get("company_info", {})
            
            # Email depuis settings (priorité 1)
            if company_info.get("email"):
                company_email = company_info.get("email")
            
            # Téléphone depuis settings si disponible (à ajouter plus tard)
            if company_info.get("phone"):
                company_phone = company_info.get("phone")
        
        # Si pas d'email dans settings, utiliser l'intégration inbox principale (priorité 2)
        if not company_email:
            primary_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == current_user.company_id,
                InboxIntegration.is_primary == True,
                InboxIntegration.is_active == True,
                InboxIntegration.integration_type == "imap"
            ).first()
            
            if primary_integration and primary_integration.email_address:
                company_email = primary_integration.email_address
                # Ne pas écraser le nom de l'entreprise avec primary_integration.name
                # Le nom doit venir de company.name
        
        # Si pas de téléphone dans settings, utiliser l'intégration WhatsApp/Vonage (priorité 2)
        if not company_phone:
            vonage_integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == current_user.company_id,
                InboxIntegration.integration_type == "whatsapp",
                InboxIntegration.is_active == True
            ).first()
            
            if vonage_integration and vonage_integration.phone_number:
                company_phone = vonage_integration.phone_number
    except Exception as e:
        logger.warning(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] Erreur lors de la récupération des infos entreprise: {e}")
    
    logger.info(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] Infos entreprise - Nom: {company_name}, Email: {company_email or 'N/A'}, Phone: {company_phone or 'N/A'}")
    
    # Récupérer le template pour ce type de relance
    template_content = None
    try:
        company_settings = db.query(CompanySettings).filter(
            CompanySettings.company_id == current_user.company_id
        ).first()
        
        if company_settings:
            settings_dict = company_settings.settings
            followup_settings = settings_dict.get("followups", {})
            messages = followup_settings.get("messages", [])
            
            # Chercher le template correspondant au type de relance
            for msg_template in messages:
                if isinstance(msg_template, dict) and msg_template.get("type") == followup.type:
                    template_content = msg_template.get("content")
                    break
            
            # Si aucun template trouvé, utiliser le template par défaut pour ce type
            if not template_content:
                logger.info(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] Aucun template configuré pour '{followup.type}', utilisation du template par défaut")
                default_templates = get_default_followup_templates()
                for default_template in default_templates:
                    if default_template.type == followup.type:
                        template_content = default_template.content
                        # Sauvegarder automatiquement le template par défaut pour éviter de le chercher à chaque fois
                        try:
                            messages.append({
                                "id": default_template.id,
                                "type": default_template.type,
                                "content": default_template.content
                            })
                            followup_settings["messages"] = messages
                            settings_dict["followups"] = followup_settings
                            company_settings.settings = settings_dict
                            db.commit()
                            logger.info(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] ✅ Template par défaut sauvegardé pour '{followup.type}'")
                        except Exception as save_error:
                            logger.warning(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] Erreur lors de la sauvegarde du template par défaut: {save_error}")
                        break
    except Exception as e:
        logger.warning(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] Erreur lors de la récupération du template: {e}")
    
    # Utiliser le template ou un message par défaut
    if template_content:
        # Générer un label descriptif basé sur le type de relance si source_label contient juste l'email/téléphone
        source_label = followup.source_label
        if not source_label or source_label.startswith("Relance manuelle -") or "@" in source_label or (len(source_label) > 0 and source_label.replace("+", "").replace(" ", "").replace("-", "").isdigit()):
            # Générer un label approprié selon le type
            if "devis" in followup.type.lower() or "Devis" in followup.type:
                source_label = "votre devis"
            elif "facture" in followup.type.lower() or "Facture" in followup.type:
                source_label = "votre facture"
            elif "info" in followup.type.lower() or "Info" in followup.type:
                source_label = "votre dossier"
            elif "rdv" in followup.type.lower() or "RDV" in followup.type or "rendez-vous" in followup.type.lower():
                source_label = "votre rendez-vous"
            elif "projet" in followup.type.lower() or "Projet" in followup.type:
                source_label = "votre projet"
            elif "client" in followup.type.lower() or "Client" in followup.type:
                source_label = "votre dossier"
            else:
                source_label = "votre dossier"
        
        # Remplacer les variables dans le template
        message = template_content
        message = message.replace("{client_name}", client_name)
        message = message.replace("{source_label}", source_label)
        message = message.replace("{company_name}", company_name)
        message = message.replace("{company_email}", company_email or "")
        message = message.replace("{company_phone}", company_phone or "")
        
        # Récupérer les informations supplémentaires depuis company_info
        company_info = {}
        try:
            company_settings = db.query(CompanySettings).filter(
                CompanySettings.company_id == current_user.company_id
            ).first()
            if company_settings:
                settings_dict = company_settings.settings
                company_info = settings_dict.get("company_info", {})
        except Exception as e:
            logger.warning(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] Erreur lors de la récupération de company_info: {e}")
        
        # Remplacer les variables supplémentaires
        message = message.replace("{company_address}", company_info.get("address") or "")
        message = message.replace("{company_city}", company_info.get("city") or "")
        message = message.replace("{company_postal_code}", company_info.get("postal_code") or "")
        message = message.replace("{company_country}", company_info.get("country") or "")
        message = message.replace("{company_siren}", company_info.get("siren") or "")
        message = message.replace("{company_siret}", company_info.get("siret") or "")
        message = message.replace("{company_vat_number}", company_info.get("vat_number") or "")
        
        # Si company_phone n'était pas défini, essayer depuis company_info
        if not company_phone and company_info.get("phone"):
            company_phone = company_info.get("phone")
            message = message.replace("{company_phone}", company_phone)
        if amount:
            message = message.replace("{amount}", f"{amount:.2f}")
        else:
            message = message.replace("{amount}", "")
        
        # Remplacer {signature_link} si c'est une relance de devis
        if "{signature_link}" in message and followup.source_type == "quote" and followup.source_id:
            try:
                from app.db.models.billing import Quote
                from app.core.config import settings
                
                quote = db.query(Quote).filter(Quote.id == followup.source_id).first()
                if quote and quote.public_token:
                    frontend_url = settings.FRONTEND_URL or "http://localhost:3000"
                    signature_link = f"{frontend_url}/quote/{quote.public_token}"
                    message = message.replace("{signature_link}", signature_link)
                    logger.info(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] Lien de signature ajouté pour devis {quote.number}: {signature_link}")
                else:
                    # Si pas de token, enlever la variable
                    message = message.replace("{signature_link}", "")
            except Exception as e:
                logger.warning(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] Erreur lors de la récupération du lien de signature: {e}")
                message = message.replace("{signature_link}", "")
        
        logger.info(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] ✅ Template utilisé pour le type: {followup.type}, source_label: {source_label}")
    else:
        # Message par défaut si pas de template
        logger.info(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] ⚠️ Aucun template trouvé pour le type '{followup.type}', utilisation d'un message par défaut")
        if "devis" in followup.type.lower() or "Devis" in followup.type:
            message = f"Bonjour {client_name},\n\nNous vous rappelons que votre devis concernant {followup.source_label} est en attente de réponse.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n{company_name}"
        elif "facture" in followup.type.lower() or "Facture" in followup.type:
            amount_str = f" d'un montant de {amount} €" if amount else ""
            message = f"Bonjour {client_name},\n\nNous vous rappelons que votre facture concernant {followup.source_label}{amount_str} est en attente de règlement.\n\nMerci de régulariser votre situation dans les plus brefs délais.\n\nCordialement,\n{company_name}"
        else:
            message = f"Bonjour {client_name},\n\nNous vous contactons concernant {followup.source_label}.\n\n{request.context or ''}\n\nCordialement,\n{company_name}"
    
    logger.info(f"[FOLLOWUP GENERATE-MESSAGE/{followup_id}] ✅ Message généré ({len(message)} caractères)")
    
    return GenerateMessageResponse(message=message)


@router.get("/{followup_id}/history", response_model=List[FollowUpHistoryRead])
def get_followup_history(
    followup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère l'historique d'une relance"""
    _check_company_access(current_user)
    
    # Vérifier que la relance existe et appartient à l'entreprise
    followup = db.query(FollowUp).filter(
        FollowUp.id == followup_id,
        FollowUp.company_id == current_user.company_id
    ).first()
    
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found"
        )
    
    history = db.query(FollowUpHistory).filter(
        FollowUpHistory.followup_id == followup_id
    ).order_by(FollowUpHistory.sent_at.desc()).all()
    
    result = []
    for h in history:
        history_dict = {
            "id": h.id,
            "followup_id": h.followup_id,
            "message": h.message,
            "message_type": h.message_type,
            "status": h.status,
            "sent_by_name": h.sent_by_name,
            "sent_at": h.sent_at,
        }
        result.append(FollowUpHistoryRead(**history_dict))
    
    return result


@router.post("/process-automatic")
@router.get("/process-automatic")
def process_automatic_followups_endpoint(
    secret: Optional[str] = Query(None, description="Secret pour protéger l'endpoint (variable CRON_SECRET)"),
    db: Session = Depends(get_db)
):
    """
    Endpoint pour déclencher le traitement des relances automatiques.
    
    Cet endpoint peut être appelé :
    - Manuellement via POST/GET /api/followups/process-automatic?secret=YOUR_CRON_SECRET
    - Via un service externe de cron (cron-job.org, EasyCron, etc.)
    - Via un webhook périodique
    
    Protection : Nécessite le paramètre 'secret' qui doit correspondre à CRON_SECRET
    """
    import logging
    from app.core.config import settings
    
    logger = logging.getLogger(__name__)
    
    # Vérifier le secret si configuré
    if settings.CRON_SECRET:
        if not secret or secret != settings.CRON_SECRET:
            logger.warning("Tentative d'accès à /process-automatic sans secret valide")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid secret. Provide ?secret=YOUR_CRON_SECRET"
            )
    else:
        # En développement, log un avertissement si pas de secret configuré
        logger.warning("CRON_SECRET non configuré - l'endpoint est accessible sans protection")
    
    try:
        # Importer directement les fonctions du script (elles sont dans le même projet)
        import sys
        from pathlib import Path
        
        # Ajouter le répertoire backend au path si nécessaire
        backend_dir = Path(__file__).parent.parent.parent
        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))
        
        # Importer depuis le script (le script gère déjà ses propres imports)
        from scripts.send_automatic_followups import process_automatic_followups
        
        logger.info("🔄 Déclenchement du traitement des relances automatiques via API...")
        
        # Exécuter le traitement (le script gère sa propre session DB)
        process_automatic_followups()
        
        return {
            "success": True,
            "message": "Traitement des relances automatiques terminé avec succès",
            "timestamp": datetime.now().isoformat()
        }
        
    except ImportError as e:
        logger.error(f"❌ Erreur d'import lors du traitement des relances automatiques: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur d'import: {str(e)}. Vérifiez que le script send_automatic_followups.py existe."
        )
    except Exception as e:
        logger.error(f"❌ Erreur lors du traitement des relances automatiques: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du traitement: {str(e)}"
        )
