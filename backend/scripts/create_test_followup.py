#!/usr/bin/env python3
"""
Script pour créer une relance automatique de test pour adem.gurler47@gmail.com
"""

import sys
import os

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.followup import FollowUp, FollowUpStatus, FollowUpType
from app.db.models.client import Client
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_test_followup(email: str):
    """Crée une relance automatique de test pour un email donné"""
    db: Session = SessionLocal()
    
    try:
        logger.info(f"🔍 Recherche du client avec l'email: {email}")
        
        # Trouver le client
        client = db.query(Client).filter(Client.email == email).first()
        
        if not client:
            logger.error(f"❌ Client non trouvé pour l'email: {email}")
            return
        
        logger.info(f"✅ Client trouvé: {client.name} (ID: {client.id}, Company: {client.company_id})")
        
        # Vérifier si une relance automatique existe déjà
        existing = db.query(FollowUp).filter(
            FollowUp.client_id == client.id,
            FollowUp.auto_enabled == True,
            FollowUp.type == FollowUpType.INFO_MANQUANTE
        ).first()
        
        if existing:
            logger.info(f"ℹ️  Relance automatique existante trouvée (ID: {existing.id})")
            logger.info(f"   Statut: {existing.status}")
            logger.info(f"   Date limite: {existing.due_date}")
            logger.info(f"   Date réelle: {existing.actual_date}")
            return existing
        
        # Créer une nouvelle relance automatique de test
        now = datetime.now()
        due_date = now + timedelta(days=7)  # Délai initial de 7 jours
        
        followup = FollowUp(
            company_id=client.company_id,
            client_id=client.id,
            type=FollowUpType.INFO_MANQUANTE,
            source_type="manual",
            source_id=None,
            source_label="Test relance automatique",
            due_date=due_date,
            actual_date=now,
            status=FollowUpStatus.A_FAIRE,
            auto_enabled=True,
            auto_frequency_days=7,
            auto_stop_on_response=True,
            auto_stop_on_paid=False,
            auto_stop_on_refused=False,
            created_by_id=None  # Système
        )
        
        db.add(followup)
        db.commit()
        db.refresh(followup)
        
        logger.info(f"✅ Relance automatique de test créée:")
        logger.info(f"   ID: {followup.id}")
        logger.info(f"   Type: {followup.type}")
        logger.info(f"   Statut: {followup.status}")
        logger.info(f"   Date limite: {followup.due_date}")
        logger.info(f"   Date réelle: {followup.actual_date}")
        logger.info(f"   Automatique: {followup.auto_enabled}")
        
        return followup
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la création: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    email = "adem.gurler47@gmail.com"
    logger.info(f"🚀 Création d'une relance automatique de test pour: {email}\n")
    create_test_followup(email)
    logger.info(f"\n✅ Script terminé")
