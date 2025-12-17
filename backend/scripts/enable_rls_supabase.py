#!/usr/bin/env python3
"""
Script pour activer Row Level Security (RLS) sur toutes les tables Supabase.
Ce script :
1. Active RLS sur toutes les tables
2. Crée des politiques qui permettent au service_role (votre backend) d'accéder à tout
3. Protège contre les accès non autorisés tout en gardant votre backend fonctionnel
"""
import os
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, text, inspect
from app.db.base import Base
from app.db.models import *  # noqa: F401, F403 - Import tous les modèles

def get_all_table_names(engine):
    """Récupère tous les noms de tables de la base de données."""
    inspector = inspect(engine)
    # Exclure les tables système de PostgreSQL/Supabase
    system_tables = {
        'schema_migrations', 'spatial_ref_sys', '_prisma_migrations',
        'pg_stat_statements', 'pg_stat_statements_info'
    }
    tables = [t for t in inspector.get_table_names() if t not in system_tables]
    return sorted(tables)

def enable_rls_on_table(conn, table_name):
    """Active RLS sur une table spécifique."""
    try:
        conn.execute(text(f'ALTER TABLE "{table_name}" ENABLE ROW LEVEL SECURITY;'))
        return True
    except Exception as e:
        print(f"   ⚠️  Erreur lors de l'activation RLS sur {table_name}: {e}")
        return False

def create_service_role_policy(conn, table_name):
    """Crée une politique qui permet au service_role de tout faire."""
    policy_name = f"service_role_all_access_{table_name}"
    
    # Vérifier si la politique existe déjà
    check_sql = text(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = :table_name 
            AND policyname = :policy_name
        );
    """)
    exists = conn.execute(check_sql, {"table_name": table_name, "policy_name": policy_name}).scalar()
    
    if exists:
        print(f"   ⏭️  Politique déjà existante pour {table_name}")
        return True
    
    # Créer la politique pour permettre au service_role d'accéder à tout
    # Le service_role dans Supabase est le rôle 'service_role' ou 'postgres'
    policy_sql = text(f"""
        CREATE POLICY "{policy_name}"
        ON "{table_name}"
        FOR ALL
        USING (
            current_setting('role') = 'service_role' 
            OR current_setting('role') = 'postgres'
            OR current_user = 'service_role'
            OR current_user = 'postgres'
        );
    """)
    
    try:
        conn.execute(policy_sql)
        return True
    except Exception as e:
        print(f"   ⚠️  Erreur lors de la création de la politique pour {table_name}: {e}")
        return False

def enable_rls_all_tables(database_url: str, dry_run: bool = False):
    """Active RLS sur toutes les tables."""
    try:
        print(f"🔗 Connexion à Supabase...")
        engine = create_engine(database_url, echo=False)
        
        with engine.connect() as conn:
            # Démarrer une transaction
            trans = conn.begin()
            
            try:
                # Récupérer toutes les tables
                print(f"\n📊 Récupération de la liste des tables...")
                tables = get_all_table_names(engine)
                print(f"✅ {len(tables)} tables trouvées\n")
                
                if dry_run:
                    print("🔍 MODE DRY RUN - Aucune modification ne sera effectuée\n")
                
                enabled_count = 0
                policy_count = 0
                
                for table_name in tables:
                    print(f"🔒 Table: {table_name}")
                    
                    if not dry_run:
                        # Activer RLS
                        if enable_rls_on_table(conn, table_name):
                            enabled_count += 1
                            print(f"   ✅ RLS activé")
                        else:
                            print(f"   ❌ Échec activation RLS")
                            continue
                        
                        # Créer la politique pour service_role
                        if create_service_role_policy(conn, table_name):
                            policy_count += 1
                            print(f"   ✅ Politique service_role créée")
                        else:
                            print(f"   ⚠️  Politique service_role non créée")
                    else:
                        print(f"   🔍 RLS serait activé")
                        print(f"   🔍 Politique service_role serait créée")
                    
                    print()
                
                if not dry_run:
                    # Commit la transaction
                    trans.commit()
                    print(f"\n✅ Succès !")
                    print(f"   - RLS activé sur {enabled_count}/{len(tables)} tables")
                    print(f"   - Politiques créées pour {policy_count}/{len(tables)} tables")
                    print(f"\n🛡️  Vos tables sont maintenant protégées par RLS !")
                    print(f"   Votre backend continuera de fonctionner grâce aux politiques service_role.")
                else:
                    trans.rollback()
                    print(f"\n🔍 DRY RUN terminé - Aucune modification effectuée")
                    print(f"   Pour appliquer les changements, relancez sans --dry-run")
                
                return True
                
            except Exception as e:
                trans.rollback()
                print(f"\n❌ Erreur lors de l'exécution: {e}")
                import traceback
                traceback.print_exc()
                return False
                
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Active Row Level Security (RLS) sur toutes les tables Supabase"
    )
    parser.add_argument(
        "--database-url",
        type=str,
        help="URL de connexion à la base de données (ou utilisez DATABASE_URL env var)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simule l'exécution sans modifier la base de données"
    )
    
    args = parser.parse_args()
    
    # Récupérer DATABASE_URL
    database_url = args.database_url or os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ Erreur: DATABASE_URL non fourni")
        print("\nUsage:")
        print("  python enable_rls_supabase.py --database-url 'postgresql://...'")
        print("  OU")
        print("  export DATABASE_URL='postgresql://...'")
        print("  python enable_rls_supabase.py")
        print("\nOptions:")
        print("  --dry-run  : Simule sans modifier (recommandé pour tester)")
        sys.exit(1)
    
    # Avertissement de sécurité
    if not args.dry_run:
        print("⚠️  ATTENTION: Vous allez activer RLS sur toutes vos tables !")
        print("   Cela peut affecter les accès directs à la base de données.")
        print("\n   Si vous utilisez uniquement votre backend FastAPI avec service_role,")
        print("   cela devrait fonctionner sans problème grâce aux politiques créées.")
        print("\n   Appuyez sur Ctrl+C pour annuler, ou Entrée pour continuer...")
        try:
            input()
        except KeyboardInterrupt:
            print("\n❌ Annulé")
            sys.exit(0)
    
    success = enable_rls_all_tables(database_url, dry_run=args.dry_run)
    sys.exit(0 if success else 1)
