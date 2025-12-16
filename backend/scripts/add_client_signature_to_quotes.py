"""
Script pour ajouter la colonne client_signature_path à la table quotes.
"""
import sqlite3
import sys
from pathlib import Path

# Ajouter le chemin du backend au PYTHONPATH
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def add_client_signature_column():
    """Ajoute la colonne client_signature_path à la table quotes."""
    db_path = backend_dir / "app.db"
    
    if not db_path.exists():
        print(f"❌ Base de données non trouvée: {db_path}")
        return False
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Vérifier si la colonne existe déjà
        cursor.execute("PRAGMA table_info(quotes)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "client_signature_path" in columns:
            print("✅ La colonne client_signature_path existe déjà")
            return True
        
        # Ajouter la colonne
        cursor.execute("""
            ALTER TABLE quotes 
            ADD COLUMN client_signature_path VARCHAR(500)
        """)
        
        conn.commit()
        print("✅ Colonne client_signature_path ajoutée avec succès")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de l'ajout de la colonne: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    add_client_signature_column()

