"""
Script pour vérifier les prompts IA dans les settings d'une entreprise.
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal
from app.db.models.company_settings import CompanySettings

def check_prompts():
    db = SessionLocal()
    try:
        # Récupérer tous les settings d'entreprises
        all_settings = db.query(CompanySettings).all()
        
        print(f"Nombre d'entreprises avec settings: {len(all_settings)}")
        print("=" * 80)
        
        for setting in all_settings:
            print(f"\nEntreprise ID: {setting.company_id}")
            settings_dict = setting.settings
            
            # Vérifier la structure
            print(f"Structure complète des settings:")
            print(f"  - modules: {list(settings_dict.get('modules', {}).keys())}")
            print(f"  - ia: {list(settings_dict.get('ia', {}).keys())}")
            print(f"  - integrations: {list(settings_dict.get('integrations', {}).keys())}")
            
            # Vérifier les prompts IA
            ia_settings = settings_dict.get('ia', {})
            inbox_settings = ia_settings.get('inbox', {})
            
            print(f"\nPrompts IA pour l'inbox:")
            reply_prompt = inbox_settings.get('reply_prompt')
            summary_prompt = inbox_settings.get('summary_prompt')
            
            if reply_prompt:
                print(f"  ✅ reply_prompt: {reply_prompt[:50]}... (longueur: {len(reply_prompt)} caractères)")
            else:
                print(f"  ❌ reply_prompt: Aucun")
            
            if summary_prompt:
                print(f"  ✅ summary_prompt: {summary_prompt[:50]}... (longueur: {len(summary_prompt)} caractères)")
            else:
                print(f"  ❌ summary_prompt: Aucun")
            
            print("=" * 80)
    finally:
        db.close()

if __name__ == "__main__":
    check_prompts()

