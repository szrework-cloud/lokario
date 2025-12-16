"""
Tests de conformité pour le module factures.
Valide les règles strictes : numérotation, protection, TVA, audit log.
"""
import pytest
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.db.models.billing import Invoice, InvoiceLine, InvoiceStatus, InvoiceType
from app.core.invoice_service import (
    generate_invoice_number,
    validate_invoice_totals,
    calculate_line_totals,
    can_modify_invoice,
    can_delete_invoice,
    validate_tax_rate,
    recalculate_invoice_totals,
)


class TestTaxRateValidation:
    """Tests de validation des taux de TVA."""
    
    def test_valid_tax_rates(self):
        """Test que les taux de TVA autorisés sont acceptés."""
        assert validate_tax_rate(Decimal('0')) is True
        assert validate_tax_rate(Decimal('2.1')) is True
        assert validate_tax_rate(Decimal('5.5')) is True
        assert validate_tax_rate(Decimal('10')) is True
        assert validate_tax_rate(Decimal('20')) is True
    
    def test_invalid_tax_rates(self):
        """Test que les taux de TVA non autorisés sont rejetés."""
        assert validate_tax_rate(Decimal('15')) is False
        assert validate_tax_rate(Decimal('25')) is False
        assert validate_tax_rate(Decimal('1')) is False
        assert validate_tax_rate(Decimal('100')) is False


class TestLineTotalsCalculation:
    """Tests de calcul des totaux de ligne avec arrondis corrects."""
    
    def test_calculate_line_totals_simple(self):
        """Test calcul simple d'une ligne."""
        result = calculate_line_totals(
            quantity=Decimal('2'),
            unit_price=Decimal('100'),
            tax_rate=Decimal('20')
        )
        
        assert result['subtotal_ht'] == Decimal('200.00')
        assert result['tax_amount'] == Decimal('40.00')
        assert result['total_ttc'] == Decimal('240.00')
    
    def test_calculate_line_totals_rounding(self):
        """Test que les arrondis sont corrects."""
        # Cas avec arrondi nécessaire
        result = calculate_line_totals(
            quantity=Decimal('1.333'),
            unit_price=Decimal('100'),
            tax_rate=Decimal('20')
        )
        
        # Vérifier que les arrondis sont à 2 décimales
        assert result['subtotal_ht'].as_tuple().exponent == -2
        assert result['tax_amount'].as_tuple().exponent == -2
        assert result['total_ttc'].as_tuple().exponent == -2
    
    def test_calculate_line_totals_zero_tax(self):
        """Test calcul avec TVA à 0%."""
        result = calculate_line_totals(
            quantity=Decimal('1'),
            unit_price=Decimal('100'),
            tax_rate=Decimal('0')
        )
        
        assert result['subtotal_ht'] == Decimal('100.00')
        assert result['tax_amount'] == Decimal('0.00')
        assert result['total_ttc'] == Decimal('100.00')


class TestInvoiceModificationProtection:
    """Tests de protection contre la modification des factures validées."""
    
    def test_can_modify_draft_invoice(self):
        """Test qu'une facture en brouillon peut être modifiée."""
        invoice = Invoice(status=InvoiceStatus.BROUILLON)
        assert can_modify_invoice(invoice) is True
    
    def test_cannot_modify_sent_invoice(self):
        """Test qu'une facture envoyée ne peut pas être modifiée."""
        invoice = Invoice(status=InvoiceStatus.ENVOYEE)
        assert can_modify_invoice(invoice) is False
    
    def test_cannot_modify_paid_invoice(self):
        """Test qu'une facture payée ne peut pas être modifiée."""
        invoice = Invoice(status=InvoiceStatus.PAYEE)
        assert can_modify_invoice(invoice) is False
    
    def test_can_delete_draft_invoice(self):
        """Test qu'une facture en brouillon peut être supprimée."""
        invoice = Invoice(status=InvoiceStatus.BROUILLON)
        assert can_delete_invoice(invoice) is True
    
    def test_cannot_delete_sent_invoice(self):
        """Test qu'une facture envoyée ne peut pas être supprimée."""
        invoice = Invoice(status=InvoiceStatus.ENVOYEE)
        assert can_delete_invoice(invoice) is False


class TestInvoiceTotalsValidation:
    """Tests de validation de la cohérence des totaux."""
    
    def test_valid_totals(self):
        """Test que des totaux cohérents sont validés."""
        invoice = Invoice(
            subtotal_ht=Decimal('200.00'),
            total_tax=Decimal('40.00'),
            total_ttc=Decimal('240.00'),
            amount=Decimal('240.00')
        )
        
        line1 = InvoiceLine(
            subtotal_ht=Decimal('100.00'),
            tax_amount=Decimal('20.00'),
            total_ttc=Decimal('120.00')
        )
        line2 = InvoiceLine(
            subtotal_ht=Decimal('100.00'),
            tax_amount=Decimal('20.00'),
            total_ttc=Decimal('120.00')
        )
        invoice.lines = [line1, line2]
        
        is_valid, error_msg = validate_invoice_totals(invoice)
        assert is_valid is True
        assert error_msg is None
    
    def test_invalid_totals(self):
        """Test que des totaux incohérents sont rejetés."""
        invoice = Invoice(
            subtotal_ht=Decimal('200.00'),
            total_tax=Decimal('40.00'),
            total_ttc=Decimal('250.00'),  # Incohérent (devrait être 240)
            amount=Decimal('250.00')
        )
        
        line1 = InvoiceLine(
            subtotal_ht=Decimal('100.00'),
            tax_amount=Decimal('20.00'),
            total_ttc=Decimal('120.00')
        )
        line2 = InvoiceLine(
            subtotal_ht=Decimal('100.00'),
            tax_amount=Decimal('20.00'),
            total_ttc=Decimal('120.00')
        )
        invoice.lines = [line1, line2]
        
        is_valid, error_msg = validate_invoice_totals(invoice)
        assert is_valid is False
        assert error_msg is not None
        assert "Total TTC incohérent" in error_msg


class TestInvoiceNumberGeneration:
    """Tests de génération de numéros de facture séquentiels."""
    
    def test_generate_first_invoice_number(self, db_session: Session):
        """Test génération du premier numéro de facture."""
        # Simuler une entreprise sans factures
        number = generate_invoice_number(db_session, company_id=1, invoice_type=InvoiceType.FACTURE)
        
        current_year = datetime.now().year
        assert number == f"FAC-{current_year}-0001"
    
    def test_generate_credit_note_number(self, db_session: Session):
        """Test génération d'un numéro d'avoir."""
        number = generate_invoice_number(db_session, company_id=1, invoice_type=InvoiceType.AVOIR)
        
        current_year = datetime.now().year
        assert number == f"FAC-{current_year}-0001-AVOIR"
    
    def test_invoice_number_format(self, db_session: Session):
        """Test que le format du numéro est correct."""
        number = generate_invoice_number(db_session, company_id=1, invoice_type=InvoiceType.FACTURE)
        
        # Format: FAC-YYYY-NNNN
        parts = number.split('-')
        assert len(parts) == 3
        assert parts[0] == "FAC"
        assert len(parts[1]) == 4  # Année
        assert len(parts[2]) == 4  # Numéro séquentiel


class TestInvoiceRecalculation:
    """Tests de recalcul des totaux d'une facture."""
    
    def test_recalculate_totals_from_lines(self):
        """Test que les totaux sont recalculés correctement depuis les lignes."""
        invoice = Invoice(
            subtotal_ht=Decimal('0'),
            total_tax=Decimal('0'),
            total_ttc=Decimal('0'),
            amount=Decimal('0')
        )
        
        line1 = InvoiceLine(
            subtotal_ht=Decimal('100.00'),
            tax_amount=Decimal('20.00'),
            total_ttc=Decimal('120.00')
        )
        line2 = InvoiceLine(
            subtotal_ht=Decimal('50.00'),
            tax_amount=Decimal('10.00'),
            total_ttc=Decimal('60.00')
        )
        invoice.lines = [line1, line2]
        
        recalculate_invoice_totals(invoice)
        
        assert invoice.subtotal_ht == Decimal('150.00')
        assert invoice.total_tax == Decimal('30.00')
        assert invoice.total_ttc == Decimal('180.00')
        assert invoice.amount == Decimal('180.00')  # amount = total_ttc pour compatibilité


# Note: Ces tests nécessitent pytest et une session de base de données configurée
# Pour exécuter: pytest backend/tests/test_invoice_conformity.py
