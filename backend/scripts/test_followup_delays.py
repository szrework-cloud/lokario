#!/usr/bin/env python3
"""
Script pour tester que les délais configurés sont bien utilisés.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.followup import FollowUp, FollowUpHistory, FollowUpHistoryStatus
from app.db.models.company_settings import CompanySettings

def test_delays():
    """Teste que les délais configurés sont bien utilisés"""
    db: Session = SessionLocal()
    
    try:
        # Récupérer les paramètres de relance
        company_settings = db.query(CompanySettings).first()
        
        if not company_settings:
            print("❌ Aucune configuration trouvée")
            return
        
        settings_dict = company_settings.settings
        followup_settings = settings_dict.get("followups", {})
        
        print("📋 Configuration actuelle:")
        print(f"  - initial_delay_days: {followup_settings.get('initial_delay_days', 'N/A')}")
        print(f"  - max_relances: {followup_settings.get('max_relances', 'N/A')}")
        print(f"  - relance_delays: {followup_settings.get('relance_delays', 'N/A')}")
        print(f"  - relance_methods: {followup_settings.get('relance_methods', 'N/A')}")
        
        # Trouver une relance automatique
        followup = db.query(FollowUp).filter(
            FollowUp.auto_enabled == True
        ).first()
        
        if not followup:
            print("❌ Aucune relance automatique trouvée")
            return
        
        print(f"\n📧 Relance trouvée: ID {followup.id}, Type: {followup.type}")
        print(f"  - due_date actuelle: {followup.due_date}")
        print(f"  - actual_date: {followup.actual_date}")
        print(f"  - status: {followup.status}")
        
        # Compter les relances envoyées
        histories = db.query(FollowUpHistory).filter(
            FollowUpHistory.followup_id == followup.id,
            FollowUpHistory.status == FollowUpHistoryStatus.ENVOYE
        ).order_by(FollowUpHistory.sent_at.asc()).all()
        
        total_sent = len(histories)
        print(f"\n📊 Historique:")
        print(f"  - Nombre de relances envoyées: {total_sent}")
        
        for i, history in enumerate(histories, 1):
            print(f"    {i}. Envoyée le {history.sent_at.strftime('%Y-%m-%d %H:%M')} via {history.message_type}")
        
        # Calculer la prochaine date attendue
        max_relances = followup_settings.get("max_relances", 3)
        relance_delays = followup_settings.get("relance_delays", [7, 14, 21])
        
        if total_sent < max_relances:
            delay_index = min(total_sent - 1, len(relance_delays) - 1)
            next_delay_days = relance_delays[delay_index] if delay_index >= 0 else relance_delays[0]
            
            # Calculer la date de la dernière relance
            if histories:
                last_sent = histories[-1].sent_at
            else:
                last_sent = followup.created_at
            
            expected_next_date = last_sent + timedelta(days=next_delay_days)
            
            print(f"\n🔮 Prochaine relance attendue:")
            print(f"  - Délai configuré: {next_delay_days} jours (index {delay_index} dans {relance_delays})")
            print(f"  - Date attendue: {expected_next_date.strftime('%Y-%m-%d')}")
            print(f"  - Date actuelle dans due_date: {followup.due_date.strftime('%Y-%m-%d') if followup.due_date else 'N/A'}")
            
            if followup.due_date:
                diff = (followup.due_date.date() - expected_next_date.date()).days
                if diff == 0:
                    print(f"  ✅ Les dates correspondent parfaitement!")
                else:
                    print(f"  ⚠️ Différence de {diff} jour(s)")
        else:
            print(f"\n✅ Toutes les relances ont été envoyées ({total_sent}/{max_relances})")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_delays()
