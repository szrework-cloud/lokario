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
from alembic.config import Config
from alembic import command
from app.core.config import settings

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
    
    # Utiliser alembic stamp pour marquer la migration
    alembic_cfg = Config("alembic.ini")
    command.stamp(alembic_cfg, last_migration)
    
    print(f"✅ Migration {last_migration} marquée comme complétée!")
    print("\n💡 Vous pouvez maintenant exécuter: alembic upgrade head")

if __name__ == "__main__":
    main()

