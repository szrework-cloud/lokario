#!/usr/bin/env python3
"""
Script de test pour vérifier les relances automatiques avec les délais configurés.
Teste spécifiquement pour adem.gurler47@gmail.com
"""

import sys
import os

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.followup import FollowUp, FollowUpStatus, FollowUpHistory, FollowUpHistoryStatus
from app.db.models.client import Client
from app.db.models.user import User
from app.db.models.company_settings import CompanySettings
from app.db.models.company import Company
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_followup_settings(db: Session, company_id: int):
    """Récupère la configuration IA des relances pour une entreprise"""
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == company_id
    ).first()
    
    if not company_settings:
        return {
            "max_relances": 3,
            "relance_delays": [7, 14, 21],
            "initial_delay_days": 7
        }
    
    settings_dict = company_settings.settings
    followup_settings = settings_dict.get("followups", {})
    
    return {
        "max_relances": followup_settings.get("max_relances", 3),
        "relance_delays": followup_settings.get("relance_delays", [7, 14, 21]),
        "initial_delay_days": followup_settings.get("initial_delay_days", 7)
    }


def test_followup_for_email(email: str):
    """Teste les relances automatiques pour un email donné"""
    db: Session = SessionLocal()
    
    try:
        logger.info(f"🔍 Recherche du client avec l'email: {email}")
        
        # Trouver le client
        client = db.query(Client).filter(Client.email == email).first()
        
        if not client:
            logger.error(f"❌ Client non trouvé pour l'email: {email}")
            return
        
        logger.info(f"✅ Client trouvé: {client.name} (ID: {client.id}, Company: {client.company_id})")
        
        # Récupérer les paramètres de relance
        settings = get_followup_settings(db, client.company_id)
        logger.info(f"📋 Paramètres de relance:")
        logger.info(f"   - Max relances: {settings['max_relances']}")
        logger.info(f"   - Délais: {settings['relance_delays']}")
        logger.info(f"   - Délai initial: {settings['initial_delay_days']} jours")
        
        # Trouver toutes les relances automatiques pour ce client
        followups = db.query(FollowUp).filter(
            FollowUp.client_id == client.id,
            FollowUp.auto_enabled == True
        ).all()
        
        logger.info(f"\n📊 Relances automatiques trouvées: {len(followups)}")
        
        for followup in followups:
            logger.info(f"\n{'='*60}")
            logger.info(f"📌 Relance ID: {followup.id}")
            logger.info(f"   Type: {followup.type}")
            logger.info(f"   Statut: {followup.status}")
            logger.info(f"   Date limite: {followup.due_date}")
            logger.info(f"   Date réelle: {followup.actual_date}")
            logger.info(f"   Source: {followup.source_label}")
            
            # Compter les relances envoyées
            histories = db.query(FollowUpHistory).filter(
                FollowUpHistory.followup_id == followup.id,
                FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE
            ).order_by(FollowUpHistory.sent_at.asc()).all()
            
            logger.info(f"\n   📨 Historique des relances envoyées: {len(histories)}")
            for i, history in enumerate(histories, 1):
                logger.info(f"      {i}. {history.sent_at.strftime('%Y-%m-%d %H:%M:%S')} - {history.message_type} - {history.status}")
            
            # Calculer les prochaines dates de relance
            if followup.status != FollowUpStatus.FAIT:
                total_sent = len(histories)
                remaining = settings['max_relances'] - total_sent
                
                if remaining > 0:
                    logger.info(f"\n   ⏰ Prochaines relances prévues:")
                    current_date = datetime.now()
                    
                    for i in range(remaining):
                        relance_num = total_sent + i + 1
                        delay_index = min(total_sent + i, len(settings['relance_delays']) - 1)
                        delay_days = settings['relance_delays'][delay_index] if delay_index >= 0 else settings['relance_delays'][0]
                        
                        if i == 0:
                            # Prochaine relance
                            if followup.actual_date:
                                next_date = followup.actual_date + timedelta(days=delay_days)
                            else:
                                next_date = current_date + timedelta(days=delay_days)
                        else:
                            # Relances suivantes
                            prev_delay = settings['relance_delays'][min(total_sent + i - 1, len(settings['relance_delays']) - 1)]
                            next_date = next_date + timedelta(days=delay_days)
                        
                        logger.info(f"      Relance #{relance_num}: Dans {delay_days} jours - {next_date.strftime('%Y-%m-%d')}")
                else:
                    logger.info(f"\n   ✅ Toutes les relances ont été envoyées ({settings['max_relances']}/{settings['max_relances']})")
            else:
                logger.info(f"\n   ✅ Relance terminée (statut: Fait)")
        
        # Afficher un résumé
        logger.info(f"\n{'='*60}")
        logger.info(f"📈 RÉSUMÉ:")
        logger.info(f"   Client: {client.name} ({email})")
        logger.info(f"   Relances automatiques actives: {len([f for f in followups if f.status != FollowUpStatus.FAIT])}")
        logger.info(f"   Relances automatiques terminées: {len([f for f in followups if f.status == FollowUpStatus.FAIT])}")
        
        # Vérifier les dates
        logger.info(f"\n🔍 VÉRIFICATION DES DATES:")
        today = date.today()
        for followup in followups:
            if followup.status != FollowUpStatus.FAIT and followup.due_date:
                due_date_only = followup.due_date.date() if hasattr(followup.due_date, 'date') else followup.due_date
                days_diff = (due_date_only - today).days
                
                if days_diff < 0:
                    logger.warning(f"   ⚠️  Relance #{followup.id}: En retard de {abs(days_diff)} jour(s)")
                elif days_diff == 0:
                    logger.info(f"   ✅ Relance #{followup.id}: À envoyer aujourd'hui")
                else:
                    logger.info(f"   📅 Relance #{followup.id}: Dans {days_diff} jour(s)")
        
    except Exception as e:
        logger.error(f"❌ Erreur lors du test: {e}", exc_info=True)
    finally:
        db.close()


if __name__ == "__main__":
    email = "adem.gurler47@gmail.com"
    logger.info(f"🚀 Démarrage du test des relances automatiques pour: {email}\n")
    test_followup_for_email(email)
    logger.info(f"\n✅ Test terminé")
