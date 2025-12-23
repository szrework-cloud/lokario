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
        
        # Utiliser autocommit pour éviter les problèmes de transactions
        with engine.connect() as conn:
            # Désactiver l'autobegin en utilisant autocommit
            conn = conn.execution_options(autocommit=True)
            print("🗑️  Suppression des données...")
            
            # Ordre de suppression (en respectant les contraintes de clés étrangères)
            # IMPORTANT: Supprimer les tables enfants AVANT les tables parents
            tables_to_delete = [
                # Tables enfants (supprimer en premier)
                "quote_signature_audit_logs",  # Référence quote_signatures
                "quote_signatures",  # Référence quotes
                "quote_lines",  # Référence quotes
                "invoice_lines",  # Référence invoices
                "invoice_audit_logs",  # Référence invoices
                "message_attachments",  # Référence inbox_messages
                "inbox_messages",  # Référence conversations (IMPORTANT: avant conversations)
                "followups",  # Peut référencer conversations
                "appointments",  # Peut référencer conversations
                "tasks",  # Peut référencer conversations
                "checklist_instances",  # Référence checklist_templates
                "chatbot_conversations",  # Référence companies, users
                # Tables parents (supprimer après les enfants)
                "quotes",  # Référence companies, clients
                "invoices",  # Référence companies, clients
                "conversations",  # Référence companies, clients (après inbox_messages)
                "appointment_types",  # Référence companies
                "checklist_templates",  # Référence companies
                "inbox_integrations",  # Référence companies
                "inbox_folders",  # Référence companies
                "notifications",  # Référence users
                "billing_line_templates",  # Référence companies
                "projects",  # Référence companies
                "clients",  # Référence companies
                "company_settings",  # Référence companies
                "users",  # Référence companies
                "companies",  # Table racine (supprimer en dernier)
            ]
            
            # D'abord, vérifier quelles tables existent
            print("   🔍 Vérification des tables existantes...")
            check_tables = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            existing_tables = [row[0] for row in conn.execute(check_tables).fetchall()]
            print(f"   📊 Tables trouvées: {len(existing_tables)}")
            
            # Supprimer table par table dans des transactions séparées pour éviter les problèmes
            for table in tables_to_delete:
                if table not in existing_tables:
                    print(f"   ⏭️  {table}: Table n'existe pas, ignorée")
                    continue
                
                # Transaction séparée pour chaque table
                try:
                    # Compter d'abord combien de lignes il y a
                    count_query = text(f"SELECT COUNT(*) FROM {table}")
                    count_before = conn.execute(count_query).scalar()
                    
                    if count_before == 0:
                        print(f"   ⏭️  {table}: Déjà vide (0 ligne)")
                        continue
                    
                    # Supprimer les données (autocommit est activé)
                    result = conn.execute(text(f"DELETE FROM {table}"))
                    count_deleted = result.rowcount
                    
                    # Vérifier après suppression
                    count_after = conn.execute(count_query).scalar()
                    
                    if count_after == 0:
                        print(f"   ✅ {table}: {count_deleted} ligne(s) supprimée(s)")
                    else:
                        print(f"   ⚠️  {table}: {count_deleted} supprimée(s), mais {count_after} restante(s)")
                        
                except Exception as e:
                    print(f"   ❌ {table}: Erreur - {str(e)}")
                    # Continuer avec les autres tables même en cas d'erreur
                    continue
            
            # Réinitialiser les séquences (pour PostgreSQL)
            print()
            print("   🔄 Réinitialisation des séquences...")
            sequences_to_reset = ['companies', 'users', 'clients', 'quotes', 'invoices', 'tasks', 'projects', 'conversations']
            for seq_table in sequences_to_reset:
                try:
                    seq_query = text(f"SELECT setval(pg_get_serial_sequence('{seq_table}', 'id'), 1, false)")
                    conn.execute(seq_query)
                    print(f"   ✅ Séquence {seq_table} réinitialisée")
                except Exception as e:
                    # La séquence peut ne pas exister, c'est OK
                    if "does not exist" not in str(e).lower():
                        print(f"   ⚠️  Séquence {seq_table}: {str(e)}")
            
            print()
            print("✅ Toutes les données ont été supprimées avec succès !")
            return 0
                
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())

