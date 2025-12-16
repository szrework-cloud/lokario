#!/usr/bin/env python3
"""
Script pour supprimer tous les devis, factures et avoirs d'un utilisateur spécifique.
⚠️ ATTENTION : Cette action est irréversible !
"""

import sys
import os

# Ajouter le répertoire parent au path pour importer les modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import SessionLocal
from app.db.models.user import User

def delete_user_billing_data(email: str, confirm: bool = False):
    """
    Supprime tous les devis, factures et avoirs d'un utilisateur spécifique.
    """
    db: Session = SessionLocal()
    
    try:
        # Trouver l'utilisateur par email
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ Utilisateur avec l'email '{email}' introuvable.")
            return
        
        if not user.company_id:
            print(f"❌ L'utilisateur '{email}' n'est pas associé à une entreprise.")
            return
        
        company_id = user.company_id
        print(f"📋 Utilisateur trouvé : {user.full_name} ({user.email})")
        print(f"🏢 Entreprise ID : {company_id}")
        print(f"\n⚠️  ATTENTION : Vous allez supprimer TOUS les devis, factures et avoirs de cette entreprise !")
        
        if not confirm:
            try:
                response = input("Êtes-vous sûr ? Tapez 'OUI' en majuscules pour confirmer: ")
                if response != "OUI":
                    print("❌ Suppression annulée.")
                    return
            except EOFError:
                print("❌ Mode non-interactif détecté. Utilisez --yes pour confirmer automatiquement.")
                return
        
        # Compter les éléments à supprimer avec SQL direct
        quotes_count = db.execute(text("SELECT COUNT(*) FROM quotes WHERE company_id = :company_id"), {"company_id": company_id}).scalar()
        invoices_count = db.execute(text("SELECT COUNT(*) FROM invoices WHERE company_id = :company_id"), {"company_id": company_id}).scalar()
        quote_lines_count = db.execute(text("SELECT COUNT(*) FROM quote_lines WHERE quote_id IN (SELECT id FROM quotes WHERE company_id = :company_id)"), {"company_id": company_id}).scalar()
        invoice_lines_count = db.execute(text("SELECT COUNT(*) FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id = :company_id)"), {"company_id": company_id}).scalar()
        signatures_count = db.execute(text("SELECT COUNT(*) FROM quote_signatures WHERE quote_id IN (SELECT id FROM quotes WHERE company_id = :company_id)"), {"company_id": company_id}).scalar()
        signature_audits_count = db.execute(text("SELECT COUNT(*) FROM quote_signature_audit_logs WHERE quote_id IN (SELECT id FROM quotes WHERE company_id = :company_id)"), {"company_id": company_id}).scalar()
        otps_count = db.execute(text("SELECT COUNT(*) FROM quote_otps WHERE quote_id IN (SELECT id FROM quotes WHERE company_id = :company_id)"), {"company_id": company_id}).scalar()
        
        print(f"\n📊 Éléments à supprimer :")
        print(f"   - {quotes_count} devis")
        print(f"   - {quote_lines_count} lignes de devis")
        print(f"   - {invoices_count} factures/avoirs")
        print(f"   - {invoice_lines_count} lignes de facture")
        print(f"   - {signatures_count} signatures de devis")
        print(f"   - {signature_audits_count} logs d'audit de signature")
        print(f"   - {otps_count} codes OTP de devis")
        
        # Supprimer avec SQL direct (dans l'ordre des dépendances)
        print(f"\n🗑️  Suppression des signatures et audits...")
        db.execute(text("DELETE FROM quote_signature_audit_logs WHERE quote_id IN (SELECT id FROM quotes WHERE company_id = :company_id)"), {"company_id": company_id})
        
        print(f"🗑️  Suppression des signatures...")
        db.execute(text("DELETE FROM quote_signatures WHERE quote_id IN (SELECT id FROM quotes WHERE company_id = :company_id)"), {"company_id": company_id})
        
        print(f"🗑️  Suppression des codes OTP...")
        db.execute(text("DELETE FROM quote_otps WHERE quote_id IN (SELECT id FROM quotes WHERE company_id = :company_id)"), {"company_id": company_id})
        
        print(f"🗑️  Suppression des lignes de facture...")
        db.execute(text("DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id = :company_id)"), {"company_id": company_id})
        
        print(f"🗑️  Suppression des factures et avoirs...")
        db.execute(text("DELETE FROM invoices WHERE company_id = :company_id"), {"company_id": company_id})
        
        print(f"🗑️  Suppression des lignes de devis...")
        db.execute(text("DELETE FROM quote_lines WHERE quote_id IN (SELECT id FROM quotes WHERE company_id = :company_id)"), {"company_id": company_id})
        
        print(f"🗑️  Suppression des devis...")
        db.execute(text("DELETE FROM quotes WHERE company_id = :company_id"), {"company_id": company_id})
        
        db.commit()
        
        print(f"\n✅ Suppression terminée avec succès !")
        print(f"   - {quotes_count} devis supprimés")
        print(f"   - {quote_lines_count} lignes de devis supprimées")
        print(f"   - {invoices_count} factures/avoirs supprimés")
        print(f"   - {invoice_lines_count} lignes de facture supprimées")
        print(f"   - {signatures_count} signatures supprimées")
        print(f"   - {signature_audits_count} logs d'audit supprimés")
        print(f"   - {otps_count} codes OTP supprimés")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la suppression : {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Supprimer tous les devis, factures et avoirs d'un utilisateur")
    parser.add_argument(
        "email",
        type=str,
        help="Email de l'utilisateur"
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Confirmer automatiquement sans demander de confirmation"
    )
    
    args = parser.parse_args()
    
    delete_user_billing_data(args.email, confirm=args.yes)
