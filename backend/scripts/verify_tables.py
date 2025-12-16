#!/usr/bin/env python3
"""Script pour vérifier que toutes les tables sont créées."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, inspect
from app.db.base import Base
from app.db.models import *  # noqa: F401, F403

import os

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("❌ DATABASE_URL non défini")
    sys.exit(1)

engine = create_engine(database_url)
inspector = inspect(engine)

# Tables dans la base de données
existing_tables = set(inspector.get_table_names())

# Tables attendues (définies dans les modèles)
expected_tables = set(Base.metadata.tables.keys())

print(f"📊 Tables créées dans Supabase: {len(existing_tables)}")
print(f"📊 Tables attendues (définies dans les modèles): {len(expected_tables)}")
print()

# Vérifier les tables manquantes
missing = expected_tables - existing_tables
if missing:
    print(f"⚠️  Tables manquantes ({len(missing)}):")
    for t in sorted(missing):
        print(f"   - {t}")
    print()

# Vérifier les tables supplémentaires
extra = existing_tables - expected_tables
if extra:
    print(f"ℹ️  Tables supplémentaires ({len(extra)}):")
    for t in sorted(extra):
        print(f"   - {t}")
    print()

# Résultat final
if not missing and not extra:
    print("✅ Toutes les tables sont présentes!")
    print()
    print("📋 Liste complète des tables:")
    for t in sorted(existing_tables):
        print(f"   - {t}")
    sys.exit(0)
elif missing:
    print(f"❌ Il manque {len(missing)} table(s)")
    sys.exit(1)
else:
    print("✅ Toutes les tables attendues sont présentes")
    sys.exit(0)
