#!/usr/bin/env python3
"""
Script pour comparer les schémas de tables entre staging et production.
"""
import sys
from sqlalchemy import create_engine, inspect, text
from urllib.parse import urlparse, unquote

def get_tables_and_columns(db_url, env_name):
    """Récupère la liste des tables et leurs colonnes."""
    try:
        # Si l'URL contient des caractères spéciaux non encodés, les encoder
        # Mais si elle contient déjà %26 (encodé), la laisser telle quelle
        from urllib.parse import quote, urlparse, urlunparse, unquote
        from urllib.parse import parse_qs
        
        # Si l'URL contient déjà des caractères encodés (comme %26), ne pas la modifier
        if '%' in db_url and '%26' in db_url or '%2A' in db_url or '%2D' in db_url:
            # L'URL est déjà encodée, l'utiliser telle quelle
            pass
        else:
            # Encoder les caractères spéciaux si nécessaire
            parsed = urlparse(db_url)
            if '@' in parsed.netloc:
                user_pass, host_port = parsed.netloc.rsplit('@', 1)
                if ':' in user_pass:
                    user, password = user_pass.split(':', 1)
                    # Encoder uniquement les caractères spéciaux qui ne sont pas déjà encodés
                    if '*' in password or '-' in password:
                        encoded_password = quote(password, safe='')
                        encoded_netloc = f"{user}:{encoded_password}@{host_port}"
                        db_url = urlunparse((parsed.scheme, encoded_netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
        
        engine = create_engine(db_url)
        inspector = inspect(engine)
        tables = sorted(inspector.get_table_names())
        
        tables_info = {}
        for table_name in tables:
            columns = inspector.get_columns(table_name)
            tables_info[table_name] = {
                'columns': {col['name']: {
                    'type': str(col['type']),
                    'nullable': col['nullable'],
                    'default': col.get('default'),
                } for col in columns},
                'primary_keys': [pk for pk in inspector.get_pk_constraint(table_name).get('constrained_columns', [])],
                'indexes': [idx['name'] for idx in inspector.get_indexes(table_name)],
            }
        
        return tables_info, None
    except Exception as e:
        import traceback
        return None, f"{str(e)}\n{traceback.format_exc()}"

def compare_databases(staging_url, production_url):
    """Compare les schémas entre staging et production."""
    print("=" * 80)
    print("📊 COMPARAISON DES TABLES ENTRE STAGING ET PRODUCTION")
    print("=" * 80)
    print()
    
    # Récupérer les informations de staging
    print("🔍 Connexion à STAGING...")
    staging_tables, staging_error = get_tables_and_columns(staging_url, "STAGING")
    if staging_error:
        print(f"❌ Erreur lors de la connexion à STAGING: {staging_error}")
        return
    print(f"✅ STAGING: {len(staging_tables)} tables trouvées")
    
    # Récupérer les informations de production
    print("\n🔍 Connexion à PRODUCTION...")
    prod_tables, prod_error = get_tables_and_columns(production_url, "PRODUCTION")
    if prod_error:
        print(f"❌ Erreur lors de la connexion à PRODUCTION: {prod_error}")
        return
    print(f"✅ PRODUCTION: {len(prod_tables)} tables trouvées")
    
    print("\n" + "=" * 80)
    print("📋 RÉSULTATS DE LA COMPARAISON")
    print("=" * 80)
    
    staging_table_names = set(staging_tables.keys())
    prod_table_names = set(prod_tables.keys())
    
    # Tables présentes uniquement en staging
    only_staging = staging_table_names - prod_table_names
    if only_staging:
        print(f"\n⚠️  Tables présentes uniquement en STAGING ({len(only_staging)}):")
        for table in sorted(only_staging):
            print(f"   - {table}")
    
    # Tables présentes uniquement en production
    only_prod = prod_table_names - staging_table_names
    if only_prod:
        print(f"\n⚠️  Tables présentes uniquement en PRODUCTION ({len(only_prod)}):")
        for table in sorted(only_prod):
            print(f"   - {table}")
    
    # Tables communes - comparer les colonnes
    common_tables = staging_table_names & prod_table_names
    if common_tables:
        print(f"\n🔍 Comparaison des tables communes ({len(common_tables)}):")
        print()
        
        differences_found = False
        for table in sorted(common_tables):
            staging_cols = staging_tables[table]['columns']
            prod_cols = prod_tables[table]['columns']
            
            staging_col_names = set(staging_cols.keys())
            prod_col_names = set(prod_cols.keys())
            
            # Colonnes manquantes en production
            missing_in_prod = staging_col_names - prod_col_names
            # Colonnes manquantes en staging
            missing_in_staging = prod_col_names - staging_col_names
            
            # Colonnes avec différences
            common_cols = staging_col_names & prod_col_names
            col_differences = []
            for col_name in common_cols:
                staging_col = staging_cols[col_name]
                prod_col = prod_cols[col_name]
                
                if (staging_col['type'] != prod_col['type'] or
                    staging_col['nullable'] != prod_col['nullable']):
                    col_differences.append({
                        'name': col_name,
                        'staging': staging_col,
                        'production': prod_col,
                    })
            
            if missing_in_prod or missing_in_staging or col_differences:
                differences_found = True
                print(f"📌 Table: {table}")
                
                if missing_in_prod:
                    print(f"   ❌ Colonnes manquantes en PRODUCTION:")
                    for col in sorted(missing_in_prod):
                        col_info = staging_cols[col]
                        print(f"      - {col}: {col_info['type']} (nullable: {col_info['nullable']})")
                
                if missing_in_staging:
                    print(f"   ❌ Colonnes manquantes en STAGING:")
                    for col in sorted(missing_in_staging):
                        col_info = prod_cols[col]
                        print(f"      - {col}: {col_info['type']} (nullable: {col_info['nullable']})")
                
                if col_differences:
                    print(f"   ⚠️  Colonnes avec différences:")
                    for diff in col_differences:
                        print(f"      - {diff['name']}:")
                        print(f"         STAGING: {diff['staging']['type']} (nullable: {diff['staging']['nullable']})")
                        print(f"         PROD:    {diff['production']['type']} (nullable: {diff['production']['nullable']})")
                
                print()
        
        if not differences_found:
            print("✅ Toutes les tables communes ont les mêmes colonnes !")
    
    print("\n" + "=" * 80)
    print("✅ Comparaison terminée")
    print("=" * 80)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python compare_databases.py <STAGING_DATABASE_URL> <PRODUCTION_DATABASE_URL>")
        print("\nExemple:")
        print("  python compare_databases.py 'postgresql://...' 'postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres'")
        sys.exit(1)
    
    staging_url = sys.argv[1]
    production_url = sys.argv[2]
    
    compare_databases(staging_url, production_url)

