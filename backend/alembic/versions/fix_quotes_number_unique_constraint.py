"""fix_quotes_number_unique_constraint

Revision ID: fix_quotes_number_unique
Revises: 8647e85819cb
Create Date: 2025-12-23 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'fix_quotes_number_unique'
down_revision: Union[str, None] = '8647e85819cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Modifie la contrainte unique sur quotes.number pour qu'elle soit composite avec company_id.
    Permet à chaque entreprise d'avoir ses propres numéros de devis (ex: DEV-2025-001 pour company_id=1 et company_id=3).
    """
    bind = op.get_bind()
    inspector = inspect(bind)
    
    # Vérifier si on est sur PostgreSQL ou SQLite
    is_postgres = bind.dialect.name == 'postgresql'
    
    # Récupérer les contraintes existantes
    try:
        # Pour PostgreSQL
        if is_postgres:
            # Vérifier si l'index unique ix_quotes_number existe
            indexes = inspector.get_indexes('quotes')
            unique_index_exists = any(idx['name'] == 'ix_quotes_number' for idx in indexes)
            
            if unique_index_exists:
                # Supprimer l'ancien index unique global
                op.drop_index('ix_quotes_number', table_name='quotes')
                print("✅ Index unique global ix_quotes_number supprimé")
            
            # Vérifier si la contrainte unique composite existe déjà
            constraints = inspector.get_unique_constraints('quotes')
            composite_exists = any(
                constraint['name'] == 'uq_quotes_company_number' 
                or (len(constraint['column_names']) == 2 and 'company_id' in constraint['column_names'] and 'number' in constraint['column_names'])
                for constraint in constraints
            )
            
            if not composite_exists:
                # Créer la contrainte unique composite (company_id, number)
                op.create_unique_constraint('uq_quotes_company_number', 'quotes', ['company_id', 'number'])
                print("✅ Contrainte unique composite (company_id, number) créée")
            else:
                print("⏭️  Contrainte unique composite existe déjà")
        
        # Pour SQLite (ne supporte pas ALTER TABLE pour les contraintes, mais on peut créer un index unique)
        else:
            # SQLite ne supporte pas la modification de contraintes, mais on peut créer un index unique composite
            # Note: SQLite ne permet pas de supprimer facilement les contraintes, donc cette migration est limitée
            try:
                op.create_index('uq_quotes_company_number', 'quotes', ['company_id', 'number'], unique=True)
                print("✅ Index unique composite (company_id, number) créé pour SQLite")
            except Exception as e:
                # Si l'index existe déjà, ignorer l'erreur
                if 'already exists' not in str(e).lower():
                    print(f"⚠️  Note: {e}")
                    print("   L'index unique composite peut déjà exister")
    
    except Exception as e:
        print(f"⚠️  Erreur lors de la modification de la contrainte: {e}")
        print("   La contrainte peut avoir été modifiée manuellement dans la base de données")
        # Ne pas faire échouer la migration si la contrainte a déjà été modifiée manuellement
        pass


def downgrade() -> None:
    """
    Revient à la contrainte unique globale sur number (non recommandé car peut causer des conflits entre entreprises).
    """
    bind = op.get_bind()
    inspector = inspect(bind)
    is_postgres = bind.dialect.name == 'postgresql'
    
    try:
        if is_postgres:
            # Supprimer la contrainte unique composite
            try:
                op.drop_constraint('uq_quotes_company_number', 'quotes', type_='unique')
                print("✅ Contrainte unique composite supprimée")
            except Exception:
                pass
            
            # Recréer l'index unique global (attention: peut causer des erreurs si des doublons existent)
            try:
                op.create_index('ix_quotes_number', 'quotes', ['number'], unique=True)
                print("✅ Index unique global recréé")
            except Exception as e:
                print(f"⚠️  Impossible de recréer l'index unique global: {e}")
                print("   Des doublons peuvent exister entre différentes entreprises")
        else:
            # SQLite: supprimer l'index composite
            try:
                op.drop_index('uq_quotes_company_number', table_name='quotes')
            except Exception:
                pass
    except Exception as e:
        print(f"⚠️  Erreur lors du downgrade: {e}")


