#!/usr/bin/env python3
"""
Script pour ajouter les colonnes manquantes à la table invoices dans SQLite.
"""

import sqlite3
import sys
from pathlib import Path

# Chemin vers la base de données
db_path = Path(__file__).parent.parent / "app.db"

if not db_path.exists():
    print(f"❌ Base de données non trouvée: {db_path}")
    sys.exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Liste des colonnes à ajouter avec leur type SQLite
columns_to_add = [
    ("invoice_type", "VARCHAR(20) DEFAULT 'facture'"),
    ("original_invoice_id", "INTEGER"),
    ("credit_amount", "NUMERIC(10, 2)"),
    ("seller_name", "VARCHAR(255)"),
    ("seller_address", "TEXT"),
    ("seller_siren", "VARCHAR(9)"),
    ("seller_siret", "VARCHAR(14)"),
    ("seller_vat_number", "VARCHAR(20)"),
    ("seller_rcs", "VARCHAR(100)"),
    ("seller_legal_form", "VARCHAR(100)"),
    ("seller_capital", "NUMERIC(15, 2)"),
    ("client_name", "VARCHAR(255)"),
    ("client_address", "TEXT"),
    ("client_siren", "VARCHAR(9)"),
    ("client_delivery_address", "TEXT"),
    ("issue_date", "DATETIME"),
    ("sale_date", "DATETIME"),
    ("subtotal_ht", "NUMERIC(10, 2)"),
    ("total_tax", "NUMERIC(10, 2)"),
    ("total_ttc", "NUMERIC(10, 2)"),
    ("payment_terms", "TEXT"),
    ("late_penalty_rate", "NUMERIC(5, 2)"),
    ("recovery_fee", "NUMERIC(10, 2)"),
    ("vat_on_debit", "BOOLEAN DEFAULT 0"),
    ("vat_exemption_reference", "VARCHAR(255)"),
    ("operation_category", "VARCHAR(100)"),
    ("vat_applicable", "BOOLEAN DEFAULT 1"),
    ("conditions", "TEXT"),
    ("archived_at", "DATETIME"),
    ("archived_by_id", "INTEGER"),
    ("deleted_at", "DATETIME"),
    ("deleted_by_id", "INTEGER"),
]

# Récupérer les colonnes existantes
cursor.execute("PRAGMA table_info(invoices)")
existing_columns = [row[1] for row in cursor.fetchall()]

print(f"📋 Colonnes existantes: {len(existing_columns)}")
print(f"📋 Colonnes à ajouter: {len(columns_to_add)}")

# Ajouter les colonnes manquantes
added_count = 0
for column_name, column_type in columns_to_add:
    if column_name not in existing_columns:
        try:
            # SQLite ne supporte pas ALTER TABLE ADD COLUMN avec DEFAULT pour certaines contraintes
            # On utilise une syntaxe simplifiée
            sql = f"ALTER TABLE invoices ADD COLUMN {column_name} {column_type}"
            cursor.execute(sql)
            print(f"✅ Colonne ajoutée: {column_name} ({column_type})")
            added_count += 1
        except sqlite3.OperationalError as e:
            print(f"⚠️  Erreur lors de l'ajout de {column_name}: {e}")
    else:
        print(f"⏭️  Colonne déjà présente: {column_name}")

# Commit les changements
conn.commit()

# Vérifier le résultat
cursor.execute("PRAGMA table_info(invoices)")
final_columns = [row[1] for row in cursor.fetchall()]
print(f"\n✅ Migration terminée!")
print(f"📊 Total de colonnes après migration: {len(final_columns)}")
print(f"📊 Colonnes ajoutées: {added_count}")

conn.close()

print("\n✅ Migration terminée avec succès!")
