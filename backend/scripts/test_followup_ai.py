#!/usr/bin/env python3
"""
Script pour tester la génération de messages de relance avec l'IA OpenAI.
"""

import sys
import os

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.ai_reply_service import ai_reply_service
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_followup_message_generation():
    """Test la génération d'un message de relance avec l'IA"""
    
    print("\n" + "="*80)
    print("🧪 TEST DE GÉNÉRATION DE MESSAGE DE RELANCE AVEC L'IA")
    print("="*80 + "\n")
    
    # Vérifier si le service est disponible
    if not ai_reply_service.enabled:
        print("❌ Service IA non disponible")
        print("\nVérifications:")
        print("  1. Vérifiez que OPENAI_API_KEY est configuré dans .env")
        print("  2. Vérifiez que la bibliothèque 'openai' est installée: pip install openai")
        return False
    
    print("✅ Service IA initialisé avec succès\n")
    
    # Test 1: Relance pour un devis
    print("📝 Test 1: Génération d'un message pour un devis non répondu")
    print("-" * 80)
    message1 = ai_reply_service.generate_followup_message(
        followup_type="Devis non répondu",
        client_name="Jean Dupont",
        source_label="Devis #2025-023",
        context="Le client a demandé un devis il y a 2 semaines mais n'a pas encore répondu. Le devis concerne une rénovation de bureau.",
        amount=None
    )
    
    if message1:
        print("✅ Message généré avec succès:")
        print(f"\n{message1}\n")
    else:
        print("❌ Échec de génération du message\n")
        return False
    
    # Test 2: Relance pour une facture
    print("📝 Test 2: Génération d'un message pour une facture impayée")
    print("-" * 80)
    message2 = ai_reply_service.generate_followup_message(
        followup_type="Facture impayée",
        client_name="Marie Martin",
        source_label="Facture #2025-156",
        context="La facture est en retard de 15 jours. Le client est généralement ponctuel.",
        amount=1250.50
    )
    
    if message2:
        print("✅ Message généré avec succès:")
        print(f"\n{message2}\n")
    else:
        print("❌ Échec de génération du message\n")
        return False
    
    # Test 3: Relance avec prompt personnalisé
    print("📝 Test 3: Génération avec un prompt personnalisé")
    print("-" * 80)
    custom_prompt = """Tu es un assistant qui rédige des messages de relance professionnels en français.
Sois concis, courtois et direct. Utilise le vouvoiement."""
    
    message3 = ai_reply_service.generate_followup_message(
        followup_type="Info manquante",
        client_name="Pierre Durand",
        source_label="Projet #PROJ-2025-01",
        context="Il manque les coordonnées bancaires pour finaliser le projet.",
        amount=None,
        custom_prompt=custom_prompt
    )
    
    if message3:
        print("✅ Message généré avec succès:")
        print(f"\n{message3}\n")
    else:
        print("❌ Échec de génération du message\n")
        return False
    
    print("="*80)
    print("✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !")
    print("="*80 + "\n")
    
    return True


if __name__ == "__main__":
    success = test_followup_message_generation()
    sys.exit(0 if success else 1)
