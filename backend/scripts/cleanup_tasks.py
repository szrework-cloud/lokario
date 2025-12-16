"""
Script pour supprimer toutes les tâches fictives d'une entreprise.
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, init_db
from app.db.models.task import Task


def cleanup_tasks(company_id: int = 6):
    """Supprime toutes les tâches de l'entreprise."""
    init_db()
    db = SessionLocal()
    
    try:
        print(f"\n🧹 Suppression des tâches pour l'entreprise ID {company_id}...")
        
        # Supprimer toutes les tâches
        all_tasks = db.query(Task).filter(Task.company_id == company_id).all()
        
        for task in all_tasks:
            db.delete(task)
        
        db.commit()
        
        print(f"  ✅ {len(all_tasks)} tâches supprimées")
        print("\n✅ Nettoyage terminé avec succès !")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors du nettoyage: {e}")
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
    
    cleanup_tasks(company_id)
