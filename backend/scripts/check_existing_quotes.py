#!/usr/bin/env python3
"""
Script pour vérifier les devis existants pour une entreprise et comprendre pourquoi le numéro commence à 7.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.config import settings

def main():
    print("🔍 Vérification des devis existants...\n")
    
    try:
        engine = create_engine(settings.DATABASE_URL)
        
        with engine.connect() as conn:
            # Demander l'ID de l'entreprise
            company_id = input("Entrez l'ID de l'entreprise (ou appuyez sur Entrée pour toutes les entreprises): ").strip()
            
            if company_id:
                try:
                    company_id = int(company_id)
                    query = text("""
                        SELECT id, number, company_id, created_at, status
                        FROM quotes
                        WHERE company_id = :company_id
                        ORDER BY number, created_at
                    """)
                    result = conn.execute(query, {"company_id": company_id})
                    quotes = result.fetchall()
                    
                    print(f"\n📊 Devis pour l'entreprise {company_id}:")
                except ValueError:
                    print("❌ ID d'entreprise invalide")
                    return 1
            else:
                # Toutes les entreprises
                query = text("""
                    SELECT id, number, company_id, created_at, status
                    FROM quotes
                    ORDER BY company_id, number, created_at
                """)
                result = conn.execute(query)
                quotes = result.fetchall()
                
                print(f"\n📊 Tous les devis:")
            
            if not quotes:
                print("   Aucun devis trouvé")
                return 0
            
            # Grouper par entreprise et année
            current_year = 2025
            companies_quotes = {}
            
            for quote in quotes:
                q_id, number, comp_id, created_at, status = quote
                if comp_id not in companies_quotes:
                    companies_quotes[comp_id] = []
                companies_quotes[comp_id].append({
                    'id': q_id,
                    'number': number,
                    'created_at': created_at,
                    'status': status
                })
            
            for comp_id, comp_quotes in companies_quotes.items():
                print(f"\n🏢 Entreprise {comp_id}:")
                
                # Filtrer par année 2025
                quotes_2025 = [q for q in comp_quotes if '2025' in q['number'] or (q['created_at'] and '2025' in str(q['created_at']))]
                
                if quotes_2025:
                    print(f"   Devis 2025 ({len(quotes_2025)}):")
                    for q in sorted(quotes_2025, key=lambda x: x['number']):
                        print(f"      - {q['number']} (ID: {q['id']}, Status: {q['status']}, Créé: {q['created_at']})")
                    
                    # Extraire les numéros séquentiels
                    numbers = []
                    for q in quotes_2025:
                        try:
                            num_part = int(q['number'].split('-')[-1])
                            numbers.append(num_part)
                        except (ValueError, IndexError):
                            pass
                    
                    if numbers:
                        max_num = max(numbers)
                        print(f"\n   📈 Numéro maximum: {max_num:03d}")
                        print(f"   📈 Prochain numéro attendu: {max_num + 1:03d}")
                else:
                    print("   Aucun devis pour 2025")
                
                # Afficher aussi les autres années
                other_quotes = [q for q in comp_quotes if q not in quotes_2025]
                if other_quotes:
                    print(f"\n   Autres années ({len(other_quotes)}):")
                    for q in sorted(other_quotes, key=lambda x: x['number'])[:10]:
                        print(f"      - {q['number']} (ID: {q['id']}, Status: {q['status']})")
                    if len(other_quotes) > 10:
                        print(f"      ... et {len(other_quotes) - 10} autres")
                
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

