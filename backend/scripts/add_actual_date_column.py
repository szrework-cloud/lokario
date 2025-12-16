#!/usr/bin/env python3
"""
Script pour ajouter la colonne actual_date à la table followups si elle n'existe pas.
"""
import sqlite3
import os
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings

def add_actual_date_column():
    """Ajoute la colonne actual_date si elle n'existe pas"""
    # Extraire le chemin du fichier SQLite depuis DATABASE_URL
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
        # Si c'est un chemin relatif, le rendre absolu depuis le répertoire backend
        if not os.path.isabs(db_path):
            backend_dir = Path(__file__).resolve().parents[1]
            db_path = backend_dir / db_path
    else:
        print(f"❌ DATABASE_URL non supporté: {db_url}")
        return False
    
    if not os.path.exists(db_path):
        print(f"❌ Base de données non trouvée: {db_path}")
        return False
    
    print(f"📁 Base de données: {db_path}")
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Vérifier si la colonne existe déjà
        cursor.execute("PRAGMA table_info(followups)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "actual_date" in columns:
            print("✅ La colonne 'actual_date' existe déjà dans la table 'followups'")
            conn.close()
            return True
        
        print("➕ Ajout de la colonne 'actual_date' à la table 'followups'...")
        
        # Ajouter la colonne
        cursor.execute("""
            ALTER TABLE followups 
            ADD COLUMN actual_date DATETIME
        """)
        
        conn.commit()
        conn.close()
        
        print("✅ Colonne 'actual_date' ajoutée avec succès!")
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Erreur SQLite: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

if __name__ == "__main__":
    success = add_actual_date_column()
    sys.exit(0 if success else 1)
