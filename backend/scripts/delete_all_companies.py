#!/usr/bin/env python3
"""
Script pour supprimer toutes les entreprises et toutes leurs données.
⚠️  ATTENTION: Cette opération est IRRÉVERSIBLE !
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.config import settings

def main():
    print("=" * 70)
    print("⚠️  SUPPRESSION DE TOUTES LES ENTREPRISES ET LEURS DONNÉES")
    print("=" * 70)
    print()
    print("Cette opération va supprimer:")
    print("  - Toutes les entreprises")
    print("  - Tous les utilisateurs")
    print("  - Tous les clients")
    print("  - Tous les devis")
    print("  - Toutes les factures")
    print("  - Toutes les tâches")
    print("  - Toutes les conversations")
    print("  - Toutes les autres données associées")
    print()
    print("⚠️  CETTE OPÉRATION EST IRRÉVERSIBLE !")
    print()
    
    confirmation = input("Tapez 'SUPPRIMER TOUT' pour confirmer: ")
    
    if confirmation != "SUPPRIMER TOUT":
        print("❌ Opération annulée")
        return 1
    
    print()
    print("🔄 Connexion à la base de données...")
    
    try:
        engine = create_engine(settings.DATABASE_URL)
        
        with engine.connect() as conn:
            trans = conn.begin()
            
            try:
                print("🗑️  Suppression des données...")
                
                # Ordre de suppression (en respectant les contraintes de clés étrangères)
                tables_to_delete = [
                    # Tables avec dépendances (supprimer en premier)
                    "quote_signature_audit_logs",
                    "quote_signatures",
                    "quote_lines",
                    "quotes",
                    "invoice_lines",
                    "invoice_audit_logs",
                    "invoices",
                    "followups",
                    "appointments",
                    "appointment_types",
                    "tasks",
                    "checklist_instances",
                    "checklist_templates",
                    "conversations",
                    "inbox_messages",
                    "message_attachments",
                    "inbox_integrations",
                    "inbox_folders",
                    "notifications",
                    "chatbot_conversations",
                    "billing_line_templates",
                    "project_clients",
                    "projects",
                    "clients",
                    "company_settings",
                    "users",
                    "companies",
                ]
                
                for table in tables_to_delete:
                    try:
                        result = conn.execute(text(f"DELETE FROM {table}"))
                        count = result.rowcount
                        if count > 0:
                            print(f"   ✅ {table}: {count} ligne(s) supprimée(s)")
                    except Exception as e:
                        print(f"   ⚠️  {table}: {str(e)}")
                
                # Réinitialiser les séquences (pour PostgreSQL)
                try:
                    conn.execute(text("""
                        SELECT setval(pg_get_serial_sequence('companies', 'id'), 1, false);
                        SELECT setval(pg_get_serial_sequence('users', 'id'), 1, false);
                        SELECT setval(pg_get_serial_sequence('clients', 'id'), 1, false);
                        SELECT setval(pg_get_serial_sequence('quotes', 'id'), 1, false);
                        SELECT setval(pg_get_serial_sequence('invoices', 'id'), 1, false);
                    """))
                    print("   ✅ Séquences réinitialisées")
                except Exception as e:
                    print(f"   ⚠️  Réinitialisation des séquences: {str(e)}")
                
                trans.commit()
                print()
                print("✅ Toutes les données ont été supprimées avec succès !")
                return 0
                
            except Exception as e:
                trans.rollback()
                print(f"❌ Erreur lors de la suppression: {e}")
                import traceback
                traceback.print_exc()
                return 1
                
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

