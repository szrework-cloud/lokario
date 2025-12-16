#!/usr/bin/env python3
"""
Script pour déplacer les colonnes TVA de clients vers companies dans SQLite.
L'auto-entrepreneur est l'entreprise qui crée les factures, pas le client.
"""

import sqlite3
import sys
import os

# Ajouter le répertoire parent au path pour importer les modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def get_db_path():
    """Récupère le chemin de la base de données SQLite."""
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        path = db_url.replace("sqlite:///", "")
        if path.startswith("./"):
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            path = os.path.join(backend_dir, path[2:])
        return os.path.abspath(path)
    else:
        raise ValueError(f"URL de base de données non supportée: {db_url}")

def column_exists(cursor, table_name, column_name):
    """Vérifie si une colonne existe dans une table SQLite."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns

def move_columns():
    """Déplace les colonnes TVA de clients vers companies."""
    db_path = get_db_path()
    
    if not os.path.exists(db_path):
        print(f"❌ Erreur: La base de données n'existe pas: {db_path}")
        return False
    
    print(f"📂 Base de données: {db_path}")
    print("")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. Ajouter les colonnes à companies si elles n'existent pas
        print("📋 Étape 1: Ajout des colonnes à la table companies...")
        
        if not column_exists(cursor, "companies", "is_auto_entrepreneur"):
            print("➕ Ajout de 'is_auto_entrepreneur' à companies...")
            cursor.execute("""
                ALTER TABLE companies 
                ADD COLUMN is_auto_entrepreneur BOOLEAN NOT NULL DEFAULT 0
            """)
            print("   ✅ Colonne ajoutée")
        else:
            print("   ℹ️  Colonne 'is_auto_entrepreneur' existe déjà dans companies")
        
        if not column_exists(cursor, "companies", "vat_exempt"):
            print("➕ Ajout de 'vat_exempt' à companies...")
            cursor.execute("""
                ALTER TABLE companies 
                ADD COLUMN vat_exempt BOOLEAN NOT NULL DEFAULT 0
            """)
            print("   ✅ Colonne ajoutée")
        else:
            print("   ℹ️  Colonne 'vat_exempt' existe déjà dans companies")
        
        if not column_exists(cursor, "companies", "vat_exemption_reference"):
            print("➕ Ajout de 'vat_exemption_reference' à companies...")
            cursor.execute("""
                ALTER TABLE companies 
                ADD COLUMN vat_exemption_reference VARCHAR(100)
            """)
            print("   ✅ Colonne ajoutée")
        else:
            print("   ℹ️  Colonne 'vat_exemption_reference' existe déjà dans companies")
        
        # 2. Si les colonnes existent dans clients, copier les données vers companies
        # (Note: En général, les clients n'ont pas ces valeurs, mais on vérifie au cas où)
        if column_exists(cursor, "clients", "is_auto_entrepreneur"):
            print("")
            print("📋 Étape 2: Vérification des données dans clients...")
            cursor.execute("SELECT COUNT(*) FROM clients WHERE is_auto_entrepreneur = 1 OR vat_exempt = 1")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"   ⚠️  Attention: {count} client(s) ont des valeurs TVA définies")
                print("   ℹ️  Ces valeurs ne seront pas copiées (les clients ne sont pas auto-entrepreneurs)")
            else:
                print("   ✅ Aucune donnée TVA dans clients (normal)")
        
        # 3. Supprimer les colonnes de clients
        print("")
        print("📋 Étape 3: Suppression des colonnes de la table clients...")
        
        # SQLite ne supporte pas DROP COLUMN directement, il faut recréer la table
        # Mais pour simplifier, on va juste vérifier et informer
        if column_exists(cursor, "clients", "is_auto_entrepreneur"):
            print("   ⚠️  SQLite ne supporte pas DROP COLUMN directement")
            print("   ℹ️  Les colonnes resteront dans clients mais ne seront plus utilisées")
            print("   💡 Pour les supprimer proprement, il faudrait recréer la table")
        else:
            print("   ✅ Les colonnes n'existent pas dans clients")
        
        conn.commit()
        print("")
        print("✅ Migration terminée avec succès !")
        print("")
        print("📝 Note: Les colonnes dans clients ne sont pas supprimées (limitation SQLite)")
        print("   Elles ne seront simplement plus utilisées par le code.")
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Erreur SQLite: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Déplacement des colonnes TVA vers companies")
    print("=" * 60)
    print("")
    print("ℹ️  L'auto-entrepreneur est l'ENTREPRISE qui crée les factures,")
    print("   pas le client. Les colonnes sont donc déplacées vers companies.")
    print("")
    
    success = move_columns()
    
    if success:
        print("🎉 Vous pouvez maintenant redémarrer le backend.")
        sys.exit(0)
    else:
        print("")
        print("❌ La migration a échoué. Vérifiez les erreurs ci-dessus.")
        sys.exit(1)
