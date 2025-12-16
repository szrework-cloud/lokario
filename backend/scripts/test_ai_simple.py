#!/usr/bin/env python3
"""
Script de test simple pour vérifier que l'IA fonctionne.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.ai_reply_service import ai_reply_service

print("=" * 60)
print("TEST DE L'IA - Génération de Réponse")
print("=" * 60)
    
# Vérifier si le service est activé
if not ai_reply_service.enabled:
    print("❌ Service IA non activé")
    print("   Vérifiez que OPENAI_API_KEY est configuré dans .env")
    sys.exit(1)
    
print("✅ Service IA activé")
print()
    
    # Test simple
test_messages = [
    {"content": "Bonjour, j'aimerais avoir des informations sur vos services.", "is_from_client": True},
    {"content": "Bonjour, je serais ravi de vous aider. Que souhaitez-vous savoir ?", "is_from_client": False},
    {"content": "Quels sont vos tarifs ?", "is_from_client": True},
    ]
    
print("📝 Messages de test:")
for msg in test_messages:
    print(f"   {'Client' if msg['is_from_client'] else 'Vous'}: {msg['content']}")
print()

try:
    print("🔄 Génération de la réponse...")
    reply = ai_reply_service.generate_reply(
        conversation_messages=test_messages,
        client_name="Test Client",
        custom_prompt="Répondez de manière professionnelle et amicale."
        )
        
    if reply:
        print("✅ Réponse générée avec succès:")
        print("-" * 60)
        print(reply)
        print("-" * 60)
        else:
        print("❌ Aucune réponse générée")
            
    except Exception as e:
    print(f"❌ Erreur lors de la génération: {e}")
        import traceback
        traceback.print_exc()
    
print()
print("=" * 60)
