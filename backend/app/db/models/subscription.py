"""
Modèles pour la gestion des abonnements Stripe
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class SubscriptionStatus(str, enum.Enum):
    """Statuts possibles d'un abonnement"""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    UNPAID = "unpaid"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    TRIALING = "trialing"
    PAUSED = "paused"


class SubscriptionPlan(str, enum.Enum):
    """Plans d'abonnement disponibles"""
    STARTER = "starter"  # Plan de base
    PROFESSIONAL = "professional"  # Plan professionnel
    ENTERPRISE = "enterprise"  # Plan entreprise


class Subscription(Base):
    """Modèle pour les abonnements Stripe"""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, unique=True)
    
    # Identifiants Stripe
    stripe_subscription_id = Column(String, unique=True, nullable=True, index=True)
    stripe_customer_id = Column(String, unique=True, nullable=True, index=True)
    stripe_price_id = Column(String, nullable=True)  # ID du prix Stripe
    
    # Informations de l'abonnement
    plan = Column(SQLEnum(SubscriptionPlan), nullable=False, default=SubscriptionPlan.STARTER)
    status = Column(SQLEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.INCOMPLETE)
    
    # Dates importantes
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    trial_start = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    
    # Informations de facturation
    amount = Column(Numeric(10, 2), nullable=False, default=0)  # Montant en euros
    currency = Column(String(3), default="eur")
    
    # Métadonnées (renommé car 'metadata' est réservé dans SQLAlchemy)
    metadata_json = Column(Text, nullable=True)  # JSON pour stocker des infos supplémentaires
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relations
    company = relationship("Company", back_populates="subscription")
    invoices = relationship("SubscriptionInvoice", back_populates="subscription", cascade="all, delete-orphan")
    payment_methods = relationship("SubscriptionPaymentMethod", back_populates="subscription", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Subscription(id={self.id}, company_id={self.company_id}, plan={self.plan}, status={self.status})>"


class SubscriptionInvoice(Base):
    """Modèle pour les factures Stripe"""
    __tablename__ = "subscription_invoices"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    
    # Identifiants Stripe
    stripe_invoice_id = Column(String, unique=True, nullable=False, index=True)
    stripe_charge_id = Column(String, nullable=True)
    
    # Informations de la facture
    invoice_number = Column(String, nullable=True)  # Numéro de facture lisible
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="eur")
    status = Column(String, nullable=False)  # paid, open, void, uncollectible
    
    # Dates
    invoice_date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    
    # PDF
    invoice_pdf_url = Column(Text, nullable=True)  # URL du PDF Stripe
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relations
    subscription = relationship("Subscription", back_populates="invoices")
    
    def __repr__(self):
        return f"<SubscriptionInvoice(id={self.id}, stripe_invoice_id={self.stripe_invoice_id}, status={self.status})>"


class SubscriptionPaymentMethod(Base):
    """Modèle pour les méthodes de paiement Stripe"""
    __tablename__ = "subscription_payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    
    # Identifiants Stripe
    stripe_payment_method_id = Column(String, unique=True, nullable=False, index=True)
    
    # Informations de la carte
    type = Column(String, nullable=False)  # card, bank_account, etc.
    card_brand = Column(String, nullable=True)  # visa, mastercard, etc.
    card_last4 = Column(String(4), nullable=True)
    card_exp_month = Column(Integer, nullable=True)
    card_exp_year = Column(Integer, nullable=True)
    
    # Statut
    is_default = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relations
    subscription = relationship("Subscription", back_populates="payment_methods")
    
    def __repr__(self):
        return f"<SubscriptionPaymentMethod(id={self.id}, type={self.type}, last4={self.card_last4})>"


class SubscriptionEvent(Base):
    """Modèle pour logger les événements Stripe (webhooks)"""
    __tablename__ = "subscription_events"

    id = Column(Integer, primary_key=True, index=True)
    
    # Identifiants Stripe
    stripe_event_id = Column(String, unique=True, nullable=False, index=True)
    event_type = Column(String, nullable=False)  # customer.subscription.created, invoice.paid, etc.
    
    # Données de l'événement
    event_data = Column(Text, nullable=False)  # JSON de l'événement complet
    
    # Statut de traitement
    processed = Column(Boolean, default=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<SubscriptionEvent(id={self.id}, event_type={self.event_type}, processed={self.processed})>"

