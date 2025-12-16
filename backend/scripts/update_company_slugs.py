#!/usr/bin/env python3
"""Script pour mettre à jour les slugs des entreprises"""
import sqlite3
import re

def generate_slug(name: str) -> str:
    """Génère un slug à partir du nom de l'entreprise"""
    # Convertir en minuscules et remplacer les caractères spéciaux par des tirets
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower())
    # Supprimer les tirets en début et fin
    slug = slug.strip('-')
    return slug

def main():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    # Récupérer toutes les entreprises
    cursor.execute('SELECT id, name FROM companies')
    companies = cursor.fetchall()
    
    updated_count = 0
    for company_id, name in companies:
        slug = generate_slug(name)
        
        # Vérifier si le slug existe déjà
        cursor.execute('SELECT id FROM companies WHERE slug = ? AND id != ?', (slug, company_id))
        existing = cursor.fetchone()
        
        if existing:
            # Si le slug existe déjà, ajouter l'ID pour le rendre unique
            slug = f"{slug}-{company_id}"
        
        cursor.execute('UPDATE companies SET slug = ? WHERE id = ?', (slug, company_id))
        updated_count += 1
        print(f"Updated company {company_id} ({name}) with slug: {slug}")
    
    conn.commit()
    conn.close()
    print(f"\n✅ Updated {updated_count} companies with slugs")

if __name__ == "__main__":
    main()
