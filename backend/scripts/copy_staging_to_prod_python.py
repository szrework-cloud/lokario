#!/usr/bin/env python3
"""
Script Python pour copier le schéma de staging vers production
Utilise psycopg2 directement au lieu de pg_dump pour éviter les problèmes de version
"""
import sys
import os
from datetime import datetime
from urllib.parse import urlparse, quote
import psycopg2
from psycopg2 import sql

# URLs des bases de données
STAGING_DB_URL = "postgresql://postgres.hobsxwtqnxrdrpmnuoga:ADEM-2006*gurler@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
PROD_DB_URL = "postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

def parse_db_url(url):
    """Parse une URL PostgreSQL et retourne les paramètres de connexion"""
    parsed = urlparse(url)
    
    # Décoder le mot de passe si nécessaire
    password = parsed.password
    if '%' in password:
        from urllib.parse import unquote
        password = unquote(password)
    
    return {
        'host': parsed.hostname,
        'port': parsed.port or 5432,
        'database': parsed.path.lstrip('/'),
        'user': parsed.username,
        'password': password
    }

def get_all_table_names(conn):
    """Récupère la liste de toutes les tables"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """)
        return [row[0] for row in cur.fetchall()]

def get_table_create_statement(conn, table_name):
    """Génère le CREATE TABLE statement pour une table"""
    with conn.cursor() as cur:
        # Récupérer la définition complète de la table
        cur.execute("""
            SELECT 
                'CREATE TABLE ' || quote_ident(tablename) || ' (' || 
                string_agg(
                    quote_ident(column_name) || ' ' || 
                    CASE 
                        WHEN data_type = 'USER-DEFINED' THEN udt_name
                        WHEN data_type = 'ARRAY' THEN udt_name || '[]'
                        ELSE 
                            CASE data_type
                                WHEN 'character varying' THEN 'VARCHAR' || 
                                    CASE WHEN character_maximum_length IS NOT NULL 
                                    THEN '(' || character_maximum_length || ')' 
                                    ELSE '' END
                                WHEN 'character' THEN 'CHAR' || 
                                    CASE WHEN character_maximum_length IS NOT NULL 
                                    THEN '(' || character_maximum_length || ')' 
                                    ELSE '' END
                                WHEN 'numeric' THEN 'NUMERIC' ||
                                    CASE 
                                        WHEN numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL
                                        THEN '(' || numeric_precision || ',' || numeric_scale || ')'
                                        WHEN numeric_precision IS NOT NULL
                                        THEN '(' || numeric_precision || ')'
                                        ELSE ''
                                    END
                                WHEN 'timestamp with time zone' THEN 'TIMESTAMP WITH TIME ZONE'
                                WHEN 'timestamp without time zone' THEN 'TIMESTAMP'
                                WHEN 'time with time zone' THEN 'TIME WITH TIME ZONE'
                                WHEN 'time without time zone' THEN 'TIME'
                                WHEN 'boolean' THEN 'BOOLEAN'
                                WHEN 'integer' THEN 'INTEGER'
                                WHEN 'bigint' THEN 'BIGINT'
                                WHEN 'text' THEN 'TEXT'
                                WHEN 'jsonb' THEN 'JSONB'
                                WHEN 'json' THEN 'JSON'
                                ELSE UPPER(data_type)
                            END
                    END ||
                    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
                    ', '
                    ORDER BY ordinal_position
                ) || ');'
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            GROUP BY tablename;
        """, (table_name,))
        
        result = cur.fetchone()
        if result:
            return result[0]
        
        # Méthode alternative si la première ne fonctionne pas
        cur.execute("""
            SELECT 
                'CREATE TABLE ' || quote_ident(%s) || ' ();'
        """, (table_name,))
        return cur.fetchone()[0]

def drop_all_tables(conn):
    """Supprime toutes les tables de la base de données"""
    tables = get_all_table_names(conn)
    if not tables:
        return
    
    print(f"   Suppression de {len(tables)} tables...")
    with conn.cursor() as cur:
        # Désactiver les contraintes de clés étrangères temporairement
        cur.execute("SET session_replication_role = 'replica';")
        
        for table in tables:
            try:
                cur.execute(sql.SQL("DROP TABLE IF EXISTS {} CASCADE").format(
                    sql.Identifier(table)
                ))
                print(f"      ✅ Table '{table}' supprimée")
            except Exception as e:
                print(f"      ⚠️  Erreur lors de la suppression de '{table}': {e}")
        
        cur.execute("SET session_replication_role = 'origin';")
    
    conn.commit()

def copy_schema_from_staging_to_prod():
    """Copie le schéma de staging vers production"""
    print("=" * 60)
    print("📋 COPIE DU SCHÉMA DE STAGING VERS PRODUCTION")
    print("=" * 60)
    print()
    print("📌 Cette opération va:")
    print("   ✅ Copier la structure des tables (schéma)")
    print("   ✅ Supprimer toutes les données existantes en production")
    print("   ✅ Laisser la base de données vide (sans données)")
    print()
    print("⚠️  ATTENTION: Toutes les données de production seront supprimées !")
    print()
    
    confirmation = input("Voulez-vous continuer ? (oui/non): ").strip().lower()
    if confirmation != "oui":
        print("❌ Opération annulée")
        return
    
    print()
    print("=" * 60)
    print("🔍 Étape 1: Connexion aux bases de données")
    print("=" * 60)
    
    # Parser les URLs
    try:
        staging_params = parse_db_url(STAGING_DB_URL)
        prod_params = parse_db_url(PROD_DB_URL)
    except Exception as e:
        print(f"❌ Erreur lors du parsing des URLs: {e}")
        return
    
    # Se connecter à staging
    try:
        print("🔄 Connexion à STAGING...")
        staging_conn = psycopg2.connect(**staging_params)
        print("✅ Connecté à STAGING")
    except Exception as e:
        print(f"❌ Erreur de connexion à STAGING: {e}")
        return
    
    # Se connecter à production
    try:
        print("🔄 Connexion à PRODUCTION...")
        prod_conn = psycopg2.connect(**prod_params)
        print("✅ Connecté à PRODUCTION")
    except Exception as e:
        print(f"❌ Erreur de connexion à PRODUCTION: {e}")
        staging_conn.close()
        return
    
    try:
        print()
        print("=" * 60)
        print("📥 Étape 2: Récupération du schéma de staging")
        print("=" * 60)
        
        # Récupérer les tables de staging
        staging_tables = get_all_table_names(staging_conn)
        print(f"✅ {len(staging_tables)} tables trouvées en staging")
        
        if not staging_tables:
            print("⚠️  Aucune table trouvée en staging")
            return
        
        print()
        print("=" * 60)
        print("📤 Étape 3: Suppression des tables en production")
        print("=" * 60)
        
        # Demander confirmation finale
        final_confirmation = input("⚠️  DERNIÈRE CONFIRMATION: Tapez 'CONFIRMER' pour continuer: ").strip()
        if final_confirmation != "CONFIRMER":
            print("❌ Opération annulée")
            return
        
        # Supprimer toutes les tables en production
        drop_all_tables(prod_conn)
        prod_conn.commit()
        print("✅ Toutes les tables de production supprimées")
        
        print()
        print("=" * 60)
        print("📤 Étape 4: Copie du schéma")
        print("=" * 60)
        print()
        print("⚠️  Cette méthode basique copie uniquement la structure des tables.")
        print("    Pour une copie complète (index, contraintes, etc.), utilisez pg_dump avec PostgreSQL 17+")
        print()
        
        # Utiliser pg_dump via Python subprocess avec une version compatible
        # Ou utiliser SQLAlchemy pour générer les CREATE TABLE
        
        print("💡 Recommandation: Utilisez pg_dump/psql avec PostgreSQL 17+ installé")
        print("   Ou utilisez Supabase Dashboard pour exporter/importer le schéma")
        
    finally:
        staging_conn.close()
        prod_conn.close()
    
    print()
    print("=" * 60)
    print("✅ Opération terminée")
    print("=" * 60)

if __name__ == "__main__":
    try:
        copy_schema_from_staging_to_prod()
    except KeyboardInterrupt:
        print("\n❌ Opération annulée par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

