"""
Test direct de l'API OpenAI avec une requête simple.
"""
import os
import sys

# Charger la clé API depuis .env
def load_env_file():
    """Charge les variables d'environnement depuis .env"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value.strip('"').strip("'")

# Charger .env
load_env_file()

# Import après chargement de .env
from openai import OpenAI

def test_openai_simple():
    """Test très simple de l'API OpenAI."""
    print("="*60)
    print("🧪 TEST DIRECT DE L'API OPENAI")
    print("="*60)
    
    # Récupérer la clé API
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("❌ OPENAI_API_KEY non trouvée dans .env")
        return False
    
    print(f"✅ Clé API trouvée: {api_key[:15]}...{api_key[-4:]}")
    
    # Test direct
    print("\n🤖 Modèle utilisé: gpt-4o-mini")
    print("📝 Test avec le message: 'jaimerais prendre un rdv demain !'")
    print("-"*60)
    
    try:
        client = OpenAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Tu es un assistant qui classe les messages dans les bons dossiers."
                },
                {
                    "role": "user",
                    "content": """Message: "jaimerais prendre un rdv demain !"

Dossiers disponibles:
- ID 1: Important (Demandes de rendez-vous)
- ID 2: Autre

Dans quel dossier dois-je classer ce message? Réponds uniquement avec l'ID (1 ou 2) ou NONE."""
                }
            ],
            temperature=0.3,
            max_tokens=50
        )
        
        result = response.choices[0].message.content.strip()
        print(f"✅ Réponse de l'IA: {result}")
        
        if "1" in result:
            print("\n✅ SUCCESS! Le message serait classé dans le dossier Important (ID: 1)")
            print("✅ L'IA fonctionne correctement!")
            return True
        else:
            print(f"\n⚠️  Réponse inattendue: {result}")
            return False
            
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_openai_simple()
    print("\n" + "="*60)
    if success:
        print("✅ TOUT FONCTIONNE !")
    else:
        print("❌ PROBLÈME DÉTECTÉ")
    print("="*60)

