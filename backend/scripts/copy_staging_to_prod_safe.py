#!/usr/bin/env python3
"""
Script Python pour copier la base de données de staging vers production
Version plus sûre avec gestion des erreurs et encodage correct des URLs
"""
import os
import sys
import subprocess
import shlex
from datetime import datetime
from urllib.parse import quote, urlparse, urlunparse

# URLs des bases de données
STAGING_DB_URL = "postgresql://postgres.hobsxwtqnxrdrpmnuoga:ADEM-2006*gurler@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
PROD_DB_URL = "postgresql://postgres.ufnncdjjzkbsemtrxjep:full33%26AZERT@aws-1-eu-west-3.pooler.supabase.com:6543/postgres"

def encode_db_url(url):
    """Encode correctement l'URL de base de données pour pg_dump/psql"""
    parsed = urlparse(url)
    if '@' in parsed.netloc:
        user_pass, host_port = parsed.netloc.rsplit('@', 1)
        if ':' in user_pass:
            user, password = user_pass.split(':', 1)
            # Décoder si nécessaire, puis ré-encoder
            if '%' in password:
                password = urlparse(f"//{password}").path or password
            # Encoder les caractères spéciaux
            encoded_password = quote(password, safe='')
            encoded_netloc = f"{user}:{encoded_password}@{host_port}"
            return urlunparse((parsed.scheme, encoded_netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
    return url

def run_command(cmd, description):
    """Exécute une commande et gère les erreurs"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        print(f"✅ {description} - Succès")
        if result.stdout:
            print(f"   Output: {result.stdout[:200]}...")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - Erreur")
        print(f"   Erreur: {e.stderr}")
        return False

def main():
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
    
    # Créer le répertoire de backup
    backup_dir = "./backups"
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    prod_backup_file = f"{backup_dir}/prod_backup_{timestamp}.sql"
    staging_dump_file = f"{backup_dir}/staging_dump_{timestamp}.sql"
    
    # Demander confirmation
    confirmation = input("Voulez-vous continuer ? (oui/non): ").strip().lower()
    if confirmation != "oui":
        print("❌ Opération annulée")
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("📦 Étape 1: Backup de production")
    print("=" * 60)
    
    # Encoder les URLs
    prod_url_encoded = encode_db_url(PROD_DB_URL)
    staging_url_encoded = encode_db_url(STAGING_DB_URL)
    
    # Backup de production (schéma seulement)
    backup_cmd = f'pg_dump "{prod_url_encoded}" --clean --if-exists --schema-only -f "{prod_backup_file}"'
    if run_command(backup_cmd, "Backup de production"):
        size = os.path.getsize(prod_backup_file) / (1024 * 1024)  # Taille en MB
        print(f"   Fichier: {prod_backup_file}")
        print(f"   Taille: {size:.2f} MB")
    else:
        print("⚠️  Échec du backup (peut être normal si la DB est vide)")
    
    print()
    print("=" * 60)
    print("📥 Étape 2: Export du schéma de staging (sans données)")
    print("=" * 60)
    
    # Dump de staging (schéma seulement, sans données)
    dump_cmd = f'pg_dump "{staging_url_encoded}" --clean --if-exists --schema-only -f "{staging_dump_file}"'
    if not run_command(dump_cmd, "Export de staging"):
        print("❌ Impossible de créer le dump de staging")
        sys.exit(1)
    
    size = os.path.getsize(staging_dump_file) / (1024 * 1024)  # Taille en MB
    print(f"   Fichier: {staging_dump_file}")
    print(f"   Taille: {size:.2f} MB")
    
    print()
    print("=" * 60)
    print("📤 Étape 3: Import du schéma dans production (base vide)")
    print("=" * 60)
    
    # Dernière confirmation
    final_confirmation = input("⚠️  DERNIÈRE CONFIRMATION: Tapez 'CONFIRMER' pour continuer: ").strip()
    if final_confirmation != "CONFIRMER":
        print("❌ Opération annulée")
        sys.exit(1)
    
    # Import dans production
    import_cmd = f'psql "{prod_url_encoded}" -f "{staging_dump_file}"'
    if not run_command(import_cmd, "Import dans production"):
        print()
        print("❌ Erreur lors de l'import")
        print()
        print("💡 Pour restaurer le backup de production:")
        print(f'   psql "{prod_url_encoded}" -f "{prod_backup_file}"')
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("✅ COPIE TERMINÉE AVEC SUCCÈS")
    print("=" * 60)
    print()
    print("📁 Fichiers créés:")
    print(f"   - Backup production: {prod_backup_file}")
    print(f"   - Dump staging: {staging_dump_file}")
    print()
    print("⚠️  Note: Gardez le backup de production au cas où")

if __name__ == "__main__":
    main()

