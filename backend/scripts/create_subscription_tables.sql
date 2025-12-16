-- Script SQL pour créer les tables d'abonnements Stripe
-- À exécuter si la migration Alembic ne fonctionne pas

-- Table des abonnements
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL UNIQUE,
    stripe_subscription_id VARCHAR UNIQUE,
    stripe_customer_id VARCHAR UNIQUE,
    stripe_price_id VARCHAR,
    plan VARCHAR NOT NULL DEFAULT 'starter',
    status VARCHAR NOT NULL DEFAULT 'incomplete',
    current_period_start DATETIME,
    current_period_end DATETIME,
    trial_start DATETIME,
    trial_end DATETIME,
    canceled_at DATETIME,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'eur',
    metadata_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Table des factures d'abonnement
CREATE TABLE IF NOT EXISTS subscription_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    stripe_invoice_id VARCHAR NOT NULL UNIQUE,
    stripe_charge_id VARCHAR,
    invoice_number VARCHAR,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'eur',
    status VARCHAR NOT NULL,
    invoice_date DATETIME NOT NULL,
    due_date DATETIME,
    paid_at DATETIME,
    invoice_pdf_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_subscription_id ON subscription_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_stripe_invoice_id ON subscription_invoices(stripe_invoice_id);

-- Table des méthodes de paiement
CREATE TABLE IF NOT EXISTS subscription_payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    stripe_payment_method_id VARCHAR NOT NULL UNIQUE,
    type VARCHAR NOT NULL,
    card_brand VARCHAR,
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscription_payment_methods_subscription_id ON subscription_payment_methods(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payment_methods_stripe_payment_method_id ON subscription_payment_methods(stripe_payment_method_id);

-- Table des événements webhook
CREATE TABLE IF NOT EXISTS subscription_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_event_id VARCHAR NOT NULL UNIQUE,
    event_type VARCHAR NOT NULL,
    event_data TEXT NOT NULL,
    processed BOOLEAN DEFAULT 0,
    processed_at DATETIME,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_processed ON subscription_events(processed);

