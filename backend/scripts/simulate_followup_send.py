#!/usr/bin/env python3
"""
Script pour simuler l'envoi d'une relance et vérifier que les dates sont mises à jour correctement.
"""

import sys
import os

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.followup import FollowUp, FollowUpStatus, FollowUpHistory, FollowUpHistoryStatus
from app.db.models.client import Client
from app.db.models.company_settings import CompanySettings
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def simulate_send_followup(followup_id: int):
    """Simule l'envoi d'une relance et met à jour les dates selon les délais"""
    db: Session = SessionLocal()
    
    try:
        # Récupérer la relance
        followup = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
        
        if not followup:
            logger.error(f"❌ Relance {followup_id} non trouvée")
            return
        
        logger.info(f"📌 Relance trouvée: ID {followup.id}, Type: {followup.type}")
        logger.info(f"   Statut actuel: {followup.status}")
        logger.info(f"   Date limite actuelle: {followup.due_date}")
        logger.info(f"   Date réelle actuelle: {followup.actual_date}")
        logger.info(f"   Automatique: {followup.auto_enabled}")
        
        # Compter les relances déjà envoyées
        total_sent = db.query(FollowUpHistory).filter(
            FollowUpHistory.followup_id == followup_id,
            FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE
        ).count()
        
        logger.info(f"\n📊 Relances déjà envoyées: {total_sent}")
        
        # Créer une entrée d'historique simulée
        history = FollowUpHistory(
            followup_id=followup_id,
            company_id=followup.company_id,
            message="Message de test simulé",
            message_type="email",
            status=FollowUpHistoryStatus.ENVOYE,
            sent_by_id=None,
            sent_by_name="Système (test)",
            sent_at=datetime.now()
        )
        db.add(history)
        db.commit()
        db.refresh(history)
        
        total_sent += 1
        logger.info(f"✅ Historique créé (ID: {history.id}), Total envoyées: {total_sent}")
        
        # Mettre à jour le statut selon la logique
        if not followup.auto_enabled:
            if total_sent == 1:
                followup.status = FollowUpStatus.FAIT
                logger.info(f"✅ Relance manuelle (première) → Statut: 'Fait'")
            else:
                logger.info(f"ℹ️  Relance manuelle (multiple) → Statut inchangé")
        else:
            # Relance automatique
            company_settings = db.query(CompanySettings).filter(
                CompanySettings.company_id == followup.company_id
            ).first()
            
            if company_settings:
                settings_dict = company_settings.settings
                followup_settings = settings_dict.get("followups", {})
                max_relances = followup_settings.get("max_relances", 3)
                relance_delays = followup_settings.get("relance_delays", [7, 14, 21])
                
                remaining_relances = max_relances - total_sent
                
                logger.info(f"\n⚙️  Configuration:")
                logger.info(f"   Max relances: {max_relances}")
                logger.info(f"   Délais: {relance_delays}")
                logger.info(f"   Relances restantes: {remaining_relances}")
                
                if remaining_relances > 0:
                    # Calculer le délai pour la prochaine relance
                    delay_index = min(total_sent - 1, len(relance_delays) - 1)
                    next_delay_days = relance_delays[delay_index] if delay_index >= 0 else relance_delays[0]
                    
                    # Mettre à jour la due_date pour la prochaine relance
                    next_due_date = datetime.now() + timedelta(days=next_delay_days)
                    followup.due_date = next_due_date
                    followup.actual_date = datetime.now()
                    followup.status = FollowUpStatus.A_FAIRE
                    
                    logger.info(f"\n✅ Relance automatique #{total_sent}/{max_relances}")
                    logger.info(f"   Prochaine relance dans: {next_delay_days} jours")
                    logger.info(f"   Nouvelle date limite: {next_due_date.strftime('%Y-%m-%d %H:%M:%S')}")
                    logger.info(f"   Nouvelle date réelle: {followup.actual_date.strftime('%Y-%m-%d %H:%M:%S')}")
                    logger.info(f"   Statut: {followup.status}")
                else:
                    followup.status = FollowUpStatus.FAIT
                    logger.info(f"\n✅ Toutes les relances ont été envoyées → Statut: 'Fait'")
            else:
                logger.warning(f"⚠️  Pas de paramètres de relance automatique")
        
        db.commit()
        db.refresh(followup)
        
        logger.info(f"\n{'='*60}")
        logger.info(f"📋 ÉTAT FINAL:")
        logger.info(f"   Statut: {followup.status}")
        logger.info(f"   Date limite: {followup.due_date}")
        logger.info(f"   Date réelle: {followup.actual_date}")
        logger.info(f"   Total envoyées: {total_sent}")
        
    except Exception as e:
        logger.error(f"❌ Erreur: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    # Trouver la relance de test pour adem.gurler47@gmail.com
    db = SessionLocal()
    try:
        client = db.query(Client).filter(Client.email == "adem.gurler47@gmail.com").first()
        if client:
            followup = db.query(FollowUp).filter(
                FollowUp.client_id == client.id,
                FollowUp.auto_enabled == True
            ).first()
            if followup:
                logger.info(f"🚀 Simulation de l'envoi de la relance ID: {followup.id}\n")
                simulate_send_followup(followup.id)
            else:
                logger.error("❌ Aucune relance automatique trouvée")
        else:
            logger.error("❌ Client non trouvé")
    finally:
        db.close()
    
    logger.info(f"\n✅ Simulation terminée")
