"""
Script pour changer le rôle d'un utilisateur.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal
from app.db.models.user import User


def change_user_role(email: str, new_role: str):
    """
    Change le rôle d'un utilisateur.
    
    Args:
        email: Email de l'utilisateur
        new_role: Nouveau rôle ('owner', 'user', ou 'super_admin')
    """
    if new_role not in ['owner', 'user', 'super_admin']:
        print(f"❌ Rôle invalide: {new_role}")
        print("Rôles valides: owner, user, super_admin")
        return
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ Utilisateur avec l'email '{email}' non trouvé")
            return
        
        old_role = user.role
        user.role = new_role
        
        # Si on passe à super_admin, enlever le company_id
        if new_role == "super_admin":
            user.company_id = None
            print(f"⚠️  Attention: super_admin n'a pas d'entreprise (company_id mis à None)")
        
        db.commit()
        
        print(f"✅ Rôle changé avec succès!")
        print(f"   Email: {email}")
        print(f"   Ancien rôle: {old_role}")
        print(f"   Nouveau rôle: {new_role}")
        print(f"   Company ID: {user.company_id}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python change_user_role.py <email> <role>")
        print("Exemple: python change_user_role.py user@example.com user")
        print("\nRôles disponibles: owner, user, super_admin")
        sys.exit(1)
    
    email = sys.argv[1]
    role = sys.argv[2]
    
    change_user_role(email, role)

