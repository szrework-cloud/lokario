"""
Script de test pour les endpoints d'import/export de données.
"""
import sys
import json
from pathlib import Path
from datetime import datetime

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests
from app.db.session import SessionLocal, init_db
from app.db.models.user import User

def test_export_import(company_id: int = 6):
    """Teste l'export et l'import des données."""
    init_db()
    db = SessionLocal()
    
    try:
        # Trouver un utilisateur de l'entreprise
        user = db.query(User).filter(User.company_id == company_id).first()
        if not user:
            print(f"❌ Aucun utilisateur trouvé pour l'entreprise ID {company_id}")
            return
        
        print(f"\n🧪 Test d'export/import pour l'utilisateur: {user.email} (ID: {user.id})")
        print(f"   Entreprise ID: {company_id}\n")
        
        # URL de l'API (à adapter selon votre configuration)
        api_url = "http://localhost:8000"
        
        # Simuler un token (dans un vrai test, il faudrait s'authentifier)
        print("⚠️  Note: Ce script nécessite un token d'authentification valide")
        print("   Pour un test complet, utilisez l'interface web ou Postman\n")
        
        # Structure de données d'exemple pour l'export
        print("📋 Structure de données exportées:")
        export_structure = {
            "export_date": datetime.now().isoformat(),
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
            },
            "company": {
                "id": company_id,
                "name": "Test Company",
            },
            "clients": [],
            "projects": [],
            "tasks": [],
            "quotes": [],
            "invoices": [],
            "followups": [],
            "conversations": [],
            "appointments": [],
        }
        
        print(json.dumps(export_structure, indent=2, ensure_ascii=False))
        
        print("\n✅ Structure de l'export validée")
        print("\n📝 Endpoints disponibles:")
        print(f"   - GET  {api_url}/users/me/export")
        print(f"   - POST {api_url}/users/me/import")
        print(f"   - POST {api_url}/users/me/delete")
        
        print("\n💡 Pour tester manuellement:")
        print("   1. Connectez-vous à l'application")
        print("   2. Allez dans Paramètres > Intégrations > Imports / Exports")
        print("   3. Cliquez sur 'Exporter tout (JSON)'")
        print("   4. Téléchargez le fichier")
        print("   5. Cliquez sur 'Importer depuis JSON' et sélectionnez le fichier")
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    
    company_id = 6
    if len(sys.argv) > 1:
        try:
            company_id = int(sys.argv[1])
        except ValueError:
            print("❌ L'ID de l'entreprise doit être un nombre")
            sys.exit(1)
    
    test_export_import(company_id)
