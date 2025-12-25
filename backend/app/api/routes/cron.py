from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.db.session import get_db

router = APIRouter(prefix="/cron", tags=["cron"])


@router.post("/check-overdue-and-reminders")
@router.get("/check-overdue-and-reminders")
def check_overdue_and_reminders_endpoint(
    secret: Optional[str] = Query(None, description="Secret pour protéger l'endpoint (variable CRON_SECRET)"),
    db: Session = Depends(get_db)
):
    """
    Endpoint pour déclencher la vérification des éléments en retard et des rappels.
    
    Cet endpoint peut être appelé :
    - Manuellement via POST/GET /api/cron/check-overdue-and-reminders?secret=YOUR_CRON_SECRET
    - Via un service externe de cron (cron-job.org, EasyCron, etc.) toutes les heures
    - Via un webhook périodique
    
    Protection : Nécessite le paramètre 'secret' qui doit correspondre à CRON_SECRET
    
    Ce cron vérifie :
    - Les factures en retard et crée des notifications
    - Les tâches en retard et crée des notifications
    - Les tâches critiques à venir et crée des notifications
    - Les rendez-vous à venir et crée des rappels
    """
    import logging
    from app.core.config import settings
    
    logger = logging.getLogger(__name__)
    
    # Vérifier le secret si configuré
    if settings.CRON_SECRET:
        if not secret or secret != settings.CRON_SECRET:
            logger.warning("Tentative d'accès à /check-overdue-and-reminders sans secret valide")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid secret. Provide ?secret=YOUR_CRON_SECRET"
            )
    else:
        # En développement, log un avertissement si pas de secret configuré
        logger.warning("CRON_SECRET non configuré - l'endpoint est accessible sans protection")
    
    try:
        # Importer directement depuis le script
        import sys
        from pathlib import Path
        
        # Ajouter le répertoire backend au path si nécessaire
        backend_dir = Path(__file__).parent.parent.parent
        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))
        
        # Importer depuis le script
        from scripts.check_overdue_and_reminders import main as check_overdue_main
        
        logger.info("🔄 Déclenchement de la vérification des éléments en retard et des rappels via API...")
        
        # Exécuter le traitement (le script gère sa propre session DB)
        check_overdue_main()
        
        return {
            "success": True,
            "message": "Vérification des éléments en retard et des rappels terminée avec succès",
            "timestamp": datetime.now().isoformat()
        }
        
    except ImportError as e:
        logger.error(f"❌ Erreur d'import lors de la vérification des éléments en retard: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur d'import: {str(e)}. Vérifiez que le script check_overdue_and_reminders.py existe."
        )
    except Exception as e:
        logger.error(f"❌ Erreur lors de la vérification des éléments en retard: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la vérification: {str(e)}"
        )

