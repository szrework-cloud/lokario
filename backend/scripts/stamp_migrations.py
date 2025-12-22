#!/usr/bin/env python3
"""
Script pour marquer automatiquement les migrations comme complétées
en fonction de l'état actuel de la base de données.

Usage: python scripts/stamp_migrations.py
"""

import sys
import os

# Ajouter le chemin du backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, inspect, text
from app.core.config import settings

# Imports Alembic (peuvent échouer si pas dans le bon environnement)
try:
    from alembic.config import Config as AlembicConfig  # type: ignore[reportMissingImports]
    from alembic import command  # type: ignore[reportMissingImports]
    ALEMBIC_AVAILABLE = True
except ImportError:
    ALEMBIC_AVAILABLE = False
    print("⚠️  Alembic non disponible, utilisation de SQL direct")

def check_column_exists(inspector, table_name, column_name):
    """Vérifie si une colonne existe dans une table"""
    if table_name not in inspector.get_table_names():
        return False
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def check_table_exists(inspector, table_name):
    """Vérifie si une table existe"""
    return table_name in inspector.get_table_names()

def main():
    # Créer la connexion
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    
    # Dictionnaire des migrations et leurs vérifications
    migrations_to_check = {
        '293c5c0a563c': lambda: True,  # Migration initiale, toujours présente
        '20b0fa130fe2': lambda: check_column_exists(inspector, 'companies', 'code'),
        'd0980f4b5082': lambda: (
            check_column_exists(inspector, 'users', 'email_verified') and
            check_column_exists(inspector, 'users', 'email_verification_token')
        ),
        'fe0f2d5eb7e1': lambda: (
            check_column_exists(inspector, 'clients', 'type') and
            check_column_exists(inspector, 'clients', 'tags')
        ),
        '9bae5f6e0708': lambda: (
            check_column_exists(inspector, 'users', 'password_reset_token') and
            check_column_exists(inspector, 'users', 'password_reset_token_expires_at')
        ),
        'bf284875ee6a': lambda: (
            check_table_exists(inspector, 'inbox_folders') and
            check_table_exists(inspector, 'conversations')
        ),
        'f4341aba55a8': lambda: check_table_exists(inspector, 'inbox_integrations'),
        '1328646a3b4b': lambda: check_column_exists(inspector, 'inbox_integrations', 'is_primary'),
        'a1b2c3d4e5f7': lambda: (
            check_table_exists(inspector, 'invoice_lines') and
            check_table_exists(inspector, 'invoice_audit_logs')
        ),
        'add_quote_lines': lambda: check_table_exists(inspector, 'quote_lines'),
        'add_billing_line_templates': lambda: check_table_exists(inspector, 'billing_line_templates'),
        'add_chatbot_tables': lambda: check_table_exists(inspector, 'chatbot_conversations'),
        'add_client_vat_fields': lambda: check_column_exists(inspector, 'clients', 'is_auto_entrepreneur'),
        'add_notifications_table': lambda: check_table_exists(inspector, 'notifications'),
        'd861fea06374': lambda: check_table_exists(inspector, 'tasks'),
        'add_reminder_at_and_checklist_instance_id': lambda: (
            check_column_exists(inspector, 'tasks', 'reminder_at') and
            check_column_exists(inspector, 'tasks', 'checklist_instance_id')
        ),
        'add_pending_auto_reply_content': lambda: check_column_exists(inspector, 'conversations', 'pending_auto_reply_content'),
        'add_recurrence_days_to_tasks': lambda: check_column_exists(inspector, 'tasks', 'recurrence_days'),
        'add_appointments_tables': lambda: check_table_exists(inspector, 'appointment_types'),
        'add_followups_tables': lambda: check_table_exists(inspector, 'followups'),
    }
    
    # Vérifier l'état actuel
    print("🔍 Vérification de l'état de la base de données...\n")
    
    completed_migrations = []
    for revision, check_func in migrations_to_check.items():
        if check_func():
            completed_migrations.append(revision)
            print(f"✅ {revision} - Migration détectée comme complétée")
        else:
            print(f"❌ {revision} - Migration non détectée")
    
    if not completed_migrations:
        print("\n⚠️  Aucune migration détectée. La base de données est peut-être vide.")
        return
    
    # Déterminer la dernière migration de la chaîne principale
    # (Alembic ne peut avoir qu'une seule version active)
    last_migration = completed_migrations[-1]
    
    print(f"\n📌 Dernière migration détectée: {last_migration}")
    print(f"\n🎯 Marquage de la migration {last_migration} comme version actuelle...")
    
    # Utiliser alembic stamp ou SQL direct
    if ALEMBIC_AVAILABLE:
        try:
            # Changer vers le répertoire backend pour trouver alembic.ini
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            original_dir = os.getcwd()
            os.chdir(backend_dir)
            
            alembic_cfg = AlembicConfig("alembic.ini")
            command.stamp(alembic_cfg, last_migration)
            
            os.chdir(original_dir)
            print(f"✅ Migration {last_migration} marquée comme complétée avec Alembic!")
        except Exception as e:
            print(f"⚠️  Erreur avec Alembic: {e}")
            print("🔄 Utilisation de SQL direct...")
            _stamp_with_sql(engine, last_migration)
    else:
        _stamp_with_sql(engine, last_migration)
    
    print("\n💡 Vous pouvez maintenant exécuter: alembic upgrade head")

def _stamp_with_sql(engine, version):
    """Marque la migration avec SQL direct"""
    with engine.connect() as conn:
        # Créer la table si elle n'existe pas
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS alembic_version (
                version_num VARCHAR(32) NOT NULL PRIMARY KEY
            )
        """))
        conn.commit()
        
        # Supprimer toutes les versions et insérer la nouvelle
        conn.execute(text("DELETE FROM alembic_version"))
        conn.execute(text("INSERT INTO alembic_version (version_num) VALUES (:version)"), {"version": version})
        conn.commit()
    
    print(f"✅ Migration {version} marquée comme complétée avec SQL direct!")

if __name__ == "__main__":
    main()

