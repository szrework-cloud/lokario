"""
Test simple de l'API OpenAI pour vérifier que tout fonctionne.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import os
from openai import OpenAI
from app.core.config import settings

def test_openai():
    """Test simple de l'API OpenAI."""
    print("="*60)
    print("🧪 TEST SIMPLE DE L'API OPENAI")
    print("="*60)
    
    # Récupérer la clé API
    api_key = os.getenv("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", None)
    
    if not api_key:
        print("❌ OPENAI_API_KEY non configurée")
        print("   Vérifiez que la clé est dans backend/.env")
        return False
    
    print(f"✅ Clé API trouvée: {api_key[:10]}...{api_key[-4:]}")
    
    # Créer le client OpenAI
    try:
        client = OpenAI(api_key=api_key)
        print("✅ Client OpenAI créé")
    except Exception as e:
        print(f"❌ Erreur lors de la création du client: {e}")
        return False
    
    # Test simple avec gpt-4o-mini (le modèle utilisé dans le code)
    print("\n🤖 Test de classification avec gpt-4o-mini...")
    print("-" * 60)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Tu es un assistant qui classe les messages dans les bons dossiers."
                },
                {
                    "role": "user",
                    "content": """Message à classifier:

Contenu: jaimerais prendre un rdv demain !

Dossiers disponibles:
- ID 1: Important
  Description: Messages importants nécessitant une attention rapide : Demandes de rendez-vous (rdv, rendez-vous, disponibilité)

Instructions:
Analyse le message et choisis le dossier le plus approprié.
Réponds UNIQUEMENT avec l'ID du dossier (exemple: 1).
Si aucun dossier ne correspond, réponds: NONE"""
                }
            ],
            temperature=0.3,
            max_tokens=150
        )
        
        result = response.choices[0].message.content.strip()
        print(f"✅ Réponse reçue: {result}")
        
        # Vérifier la réponse
        if "1" in result or "IMPORTANT" in result.upper():
            print("✅ Test réussi ! Le message serait classé dans le dossier Important")
            return True
        elif "NONE" in result.upper():
            print("⚠️  L'IA n'a pas trouvé de dossier approprié")
            return False
        else:
            print(f"⚠️  Réponse inattendue: {result}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors de l'appel à l'API: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_openai()
    print("\n" + "="*60)
    if success:
        print("✅ TOUT FONCTIONNE ! L'IA est opérationnelle.")
    else:
        print("❌ Il y a un problème. Vérifiez les erreurs ci-dessus.")
    print("="*60)

