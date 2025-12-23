from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Enum, Text, Boolean, JSON, UniqueConstraint
from decimal import Decimal
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class QuoteStatus(str, enum.Enum):
    BROUILLON = "brouillon"
    ENVOYE = "envoyé"
    VU = "vu"
    ACCEPTE = "accepté"
    REFUSE = "refusé"


class InvoiceStatus(str, enum.Enum):
    BROUILLON = "brouillon"
    ENVOYEE = "envoyée"
    PAYEE = "payée"
    IMPAYEE = "impayée"
    EN_RETARD = "en retard"
    ANNULEE = "annulée"


class InvoiceType(str, enum.Enum):
    FACTURE = "facture"
    AVOIR = "avoir"


class Quote(Base):
    __tablename__ = "quotes"
    __table_args__ = (
        UniqueConstraint('company_id', 'number', name='uq_quotes_company_number'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    number = Column(String, nullable=False, index=True)  # "DEV-2025-023" - Unicité avec company_id via UniqueConstraint
    amount = Column(Numeric(10, 2), nullable=False)  # Conservé pour compatibilité
    status = Column(Enum(QuoteStatus), nullable=False, default=QuoteStatus.ENVOYE)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    viewed_at = Column(DateTime(timezone=True), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    refused_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    conditions = Column(Text, nullable=True)
    
    # Totaux détaillés
    subtotal_ht = Column(Numeric(10, 2), nullable=True)
    total_tax = Column(Numeric(10, 2), nullable=True)
    total_ttc = Column(Numeric(10, 2), nullable=True)
    
    # Réduction/Escompte
    discount_type = Column(String(20), nullable=True)  # "percentage" ou "fixed"
    discount_value = Column(Numeric(10, 2), nullable=True)  # Valeur de la réduction (en % ou en €)
    discount_label = Column(String(200), nullable=True)  # Libellé de la réduction (ex: "Remise commerciale", "Escompte 2%")
    
    # Signature électronique du client
    client_signature_path = Column(String(500), nullable=True)
    
    # Accès public pour signature
    public_token = Column(String(64), nullable=True, unique=True, index=True)  # Token pour accès public au devis
    public_token_expires_at = Column(DateTime(timezone=True), nullable=True)  # Date d'expiration du token public
    
    # Conformité légale
    valid_until = Column(DateTime(timezone=True), nullable=True)  # Durée de validité du devis
    service_start_date = Column(DateTime(timezone=True), nullable=True)  # Date de début de prestation
    execution_duration = Column(String(200), nullable=True)  # Durée ou délai d'exécution (ex: "30 jours", "2 semaines")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="quotes")
    client = relationship("Client", back_populates="quotes")
    project = relationship("Project", back_populates="quotes")
    lines = relationship("QuoteLine", back_populates="quote", cascade="all, delete-orphan")


class QuoteLine(Base):
    __tablename__ = "quote_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(Text, nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False, default=1)
    unit = Column(String(20), nullable=True)  # Unité de mesure (ex: "heure", "pièce", "kg", etc.)
    unit_price_ht = Column(Numeric(10, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=False)  # 20, 10, 5.5, 2.1, 0
    subtotal_ht = Column(Numeric(10, 2), nullable=False)  # quantity * unit_price_ht
    tax_amount = Column(Numeric(10, 2), nullable=False)  # subtotal_ht * tax_rate / 100
    total_ttc = Column(Numeric(10, 2), nullable=False)  # subtotal_ht + tax_amount
    order = Column(Integer, nullable=False)  # Ordre d'affichage
    
    # Relations
    quote = relationship("Quote", back_populates="lines")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(Text, nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False, default=1)
    unit = Column(String(20), nullable=True)  # Unité de mesure (ex: "heure", "pièce", "kg", etc.)
    unit_price_ht = Column(Numeric(10, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=False)  # 20, 10, 5.5, 2.1, 0
    subtotal_ht = Column(Numeric(10, 2), nullable=False)  # quantity * unit_price_ht
    tax_amount = Column(Numeric(10, 2), nullable=False)  # subtotal_ht * tax_rate / 100
    total_ttc = Column(Numeric(10, 2), nullable=False)  # subtotal_ht + tax_amount
    order = Column(Integer, nullable=False)  # Ordre d'affichage
    
    # Relations
    invoice = relationship("Invoice", backref="lines")


class BillingLineTemplate(Base):
    """
    Modèle pour stocker les lignes de facturation réutilisables (descriptions avec prix et TVA).
    Permet de sauvegarder des lignes fréquemment utilisées pour les réutiliser rapidement.
    """
    __tablename__ = "billing_line_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    description = Column(Text, nullable=False)
    unit = Column(String(20), nullable=True)  # Unité de mesure (ex: "heure", "pièce", "kg", etc.)
    unit_price_ht = Column(Numeric(10, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=False)  # 20, 10, 5.5, 2.1, 0
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="billing_line_templates")


class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True, index=True)
    number = Column(String, nullable=False, unique=True, index=True)  # "FAC-2025-014"
    
    # Type et avoirs
    invoice_type = Column(Enum(InvoiceType), nullable=False, default=InvoiceType.FACTURE, index=True)
    original_invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    credit_amount = Column(Numeric(10, 2), nullable=True)  # Montant crédité (pour avoirs)
    
    # Statut (garder amount pour compatibilité, mais utiliser subtotal_ht, total_tax, total_ttc)
    amount = Column(Numeric(10, 2), nullable=False)  # Conservé pour compatibilité
    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.IMPAYEE)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    
    # Informations vendeur
    seller_name = Column(String(255), nullable=True)
    seller_address = Column(Text, nullable=True)
    seller_siren = Column(String(9), nullable=True)
    seller_siret = Column(String(14), nullable=True)
    seller_vat_number = Column(String(20), nullable=True)  # TVA intracommunautaire
    seller_rcs = Column(String(100), nullable=True)  # RCS avec ville
    seller_legal_form = Column(String(100), nullable=True)
    seller_capital = Column(Numeric(15, 2), nullable=True)
    
    # Informations client étendues
    client_name = Column(String(255), nullable=True)
    client_address = Column(Text, nullable=True)
    client_siren = Column(String(9), nullable=True)  # Obligatoire à partir de 2026
    client_delivery_address = Column(Text, nullable=True)  # Si différente de l'adresse de facturation
    
    # Dates
    issue_date = Column(DateTime(timezone=True), nullable=True)  # Date d'émission
    sale_date = Column(DateTime(timezone=True), nullable=True)  # Date de vente/prestation
    
    # Totaux détaillés
    subtotal_ht = Column(Numeric(10, 2), nullable=True)
    total_tax = Column(Numeric(10, 2), nullable=True)
    total_ttc = Column(Numeric(10, 2), nullable=True)
    
    # Réduction/Escompte
    discount_type = Column(String(20), nullable=True)  # "percentage" ou "fixed"
    discount_value = Column(Numeric(10, 2), nullable=True)  # Valeur de la réduction (en % ou en €)
    discount_label = Column(String(200), nullable=True)  # Libellé de la réduction (ex: "Remise commerciale", "Escompte 2%")
    
    # Conditions
    payment_terms = Column(Text, nullable=True)  # Modalités de paiement
    late_penalty_rate = Column(Numeric(5, 2), nullable=True)  # Taux pénalités de retard
    recovery_fee = Column(Numeric(10, 2), nullable=True)  # Indemnité forfaitaire pour frais de recouvrement
    
    # Mentions spéciales
    vat_on_debit = Column(Boolean, default=False, nullable=False)  # TVA sur les débits
    vat_exemption_reference = Column(Text, nullable=True)  # Référence article CGI
    operation_category = Column(String(50), nullable=True)  # vente, prestation, les deux
    vat_applicable = Column(Boolean, default=True, nullable=False)  # TVA applicable ou non
    
    # Notes
    notes = Column(Text, nullable=True)  # Notes internes
    conditions = Column(Text, nullable=True)  # Conditions générales
    
    # Archivage
    archived_at = Column(DateTime(timezone=True), nullable=True, index=True)
    archived_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Soft delete
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)
    deleted_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    company = relationship("Company", backref="invoices")
    client = relationship("Client", back_populates="invoices")
    project = relationship("Project", back_populates="invoices")
    quote = relationship("Quote", backref="invoices")
    original_invoice = relationship("Invoice", remote_side=[id], backref="credit_notes")
    archived_by = relationship("User", foreign_keys=[archived_by_id])
    deleted_by = relationship("User", foreign_keys=[deleted_by_id])


class QuoteSignature(Base):
    """
    Métadonnées de signature électronique pour un devis.
    Stocke toutes les informations nécessaires pour prouver l'intégrité et l'authenticité de la signature.
    """
    __tablename__ = "quote_signatures"
    
    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False, unique=True, index=True)
    
    # Identification du signataire
    signer_email = Column(String(255), nullable=False)  # Email minimum requis
    signer_name = Column(String(255), nullable=True)  # Nom optionnel
    
    # Informations techniques de signature
    signature_hash = Column(String(64), nullable=False)  # SHA-256 hash du PDF signé
    document_hash_before_signature = Column(String(64), nullable=False)  # Hash du PDF avant signature
    signed_pdf_path = Column(String(500), nullable=True)  # Chemin vers le PDF signé archivé (non modifiable)
    
    # Horodatage
    signed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Informations de contexte
    ip_address = Column(String(45), nullable=True)  # IPv4 ou IPv6
    user_agent = Column(String(500), nullable=True)  # Navigateur/device
    
    # Consentement
    consent_given = Column(Boolean, default=True, nullable=False)  # Consentement explicite
    consent_text = Column(Text, nullable=True)  # Texte du consentement affiché
    
    # Métadonnées supplémentaires (JSON pour flexibilité)
    extra_metadata = Column(JSON, nullable=True)  # Informations additionnelles
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    quote = relationship("Quote", backref="signature_metadata")


class InvoicePayment(Base):
    """
    Modèle pour stocker les paiements d'une facture.
    Permet de gérer les paiements partiels et multiples.
    """
    __tablename__ = "invoice_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    
    # Montant du paiement
    amount = Column(Numeric(10, 2), nullable=False)
    
    # Date du paiement
    payment_date = Column(DateTime(timezone=True), nullable=False)
    
    # Mode de paiement
    payment_method = Column(String(50), nullable=False)  # "virement", "cheque", "especes", "carte", etc.
    
    # Référence du paiement (ex: numéro de chèque, référence virement)
    reference = Column(String(255), nullable=True)
    
    # Notes optionnelles
    notes = Column(Text, nullable=True)
    
    # Qui a enregistré le paiement
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    invoice = relationship("Invoice", backref="payments")
    created_by = relationship("User", foreign_keys=[created_by_id])


class QuoteSignatureAuditLog(Base):
    """
    Journal d'audit pour toutes les actions liées à la signature d'un devis.
    Trace complète de qui, quand, comment.
    """
    __tablename__ = "quote_signature_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False, index=True)
    
    # Événement
    event_type = Column(String(50), nullable=False)  # "viewed", "signature_started", "signature_completed", "pdf_generated", etc.
    event_description = Column(Text, nullable=True)  # Description détaillée
    
    # Qui
    user_email = Column(String(255), nullable=True)  # Email de l'utilisateur (peut être différent du signataire)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Si utilisateur connecté
    
    # Quand
    event_timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Comment
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Métadonnées supplémentaires
    extra_metadata = Column(JSON, nullable=True)  # Informations additionnelles sur l'événement
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    quote = relationship("Quote", backref="signature_audit_logs")
    user = relationship("User", foreign_keys=[user_id])

