#!/usr/bin/env python3
"""
Script pour extraire les unités des descriptions existantes au format "description<&unité"
et les enregistrer dans la colonne 'unit'.
"""

import sys
import os
import re

# Ajouter le répertoire parent au path pour importer les modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import SessionLocal

def extract_unit_from_description(description: str) -> tuple[str, str]:
    """
    Extrait l'unité d'une description au format "description<&unité".
    Retourne (description_nettoyée, unité) ou (description, None) si pas d'unité.
    """
    # Pattern pour trouver "description<&unité"
    pattern = r'^(.+)<&(.+)$'
    match = re.match(pattern, description)
    
    if match:
        description_clean = match.group(1).strip()
        unit = match.group(2).strip()
        return description_clean, unit
    
    return description, None

def extract_units():
    """
    Extrait les unités des descriptions et les enregistre dans la colonne 'unit'.
    """
    db = SessionLocal()
    
    try:
        print("🔄 Extraction des unités des descriptions...")
        
        # Traiter quote_lines
        quote_lines = db.execute(text("SELECT id, description FROM quote_lines WHERE unit IS NULL")).fetchall()
        updated_quotes = 0
        for line in quote_lines:
            description, unit = extract_unit_from_description(line.description)
            if unit:
                db.execute(
                    text("UPDATE quote_lines SET description = :desc, unit = :unit WHERE id = :id"),
                    {"desc": description, "unit": unit, "id": line.id}
                )
                updated_quotes += 1
        
        print(f"✅ {updated_quotes} lignes de devis mises à jour")
        
        # Traiter invoice_lines
        invoice_lines = db.execute(text("SELECT id, description FROM invoice_lines WHERE unit IS NULL")).fetchall()
        updated_invoices = 0
        for line in invoice_lines:
            description, unit = extract_unit_from_description(line.description)
            if unit:
                db.execute(
                    text("UPDATE invoice_lines SET description = :desc, unit = :unit WHERE id = :id"),
                    {"desc": description, "unit": unit, "id": line.id}
                )
                updated_invoices += 1
        
        print(f"✅ {updated_invoices} lignes de facture mises à jour")
        
        # Traiter billing_line_templates
        templates = db.execute(text("SELECT id, description FROM billing_line_templates WHERE unit IS NULL")).fetchall()
        updated_templates = 0
        for template in templates:
            description, unit = extract_unit_from_description(template.description)
            if unit:
                db.execute(
                    text("UPDATE billing_line_templates SET description = :desc, unit = :unit WHERE id = :id"),
                    {"desc": description, "unit": unit, "id": template.id}
                )
                updated_templates += 1
        
        print(f"✅ {updated_templates} templates de lignes mises à jour")
        
        db.commit()
        print(f"\n✅ Extraction terminée : {updated_quotes + updated_invoices + updated_templates} lignes mises à jour")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de l'extraction : {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    extract_units()
