-- Script SQL pour créer la table quote_lines et ajouter les champs manquants à quotes
-- À exécuter manuellement si la migration Alembic ne fonctionne pas

-- 1. Ajouter le champ conditions à quotes si il n'existe pas
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='quotes' AND column_name='conditions'
    ) THEN
        ALTER TABLE quotes ADD COLUMN conditions TEXT;
    END IF;
END $$;

-- 2. Ajouter les champs de totaux à quotes si ils n'existent pas
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='quotes' AND column_name='subtotal_ht'
    ) THEN
        ALTER TABLE quotes ADD COLUMN subtotal_ht NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='quotes' AND column_name='total_tax'
    ) THEN
        ALTER TABLE quotes ADD COLUMN total_tax NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='quotes' AND column_name='total_ttc'
    ) THEN
        ALTER TABLE quotes ADD COLUMN total_ttc NUMERIC(10, 2);
    END IF;
END $$;

-- 3. Créer la table quote_lines si elle n'existe pas
CREATE TABLE IF NOT EXISTS quote_lines (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 3) NOT NULL DEFAULT 1,
    unit_price_ht NUMERIC(10, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) NOT NULL,
    subtotal_ht NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) NOT NULL,
    total_ttc NUMERIC(10, 2) NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT fk_quote_lines_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

-- 4. Créer l'index si il n'existe pas
CREATE INDEX IF NOT EXISTS ix_quote_lines_quote_id ON quote_lines(quote_id);

-- 5. Ajouter 'brouillon' à l'enum QuoteStatus si il n'existe pas
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'brouillon' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'quotestatus')
    ) THEN
        ALTER TYPE quotestatus ADD VALUE IF NOT EXISTS 'brouillon' BEFORE 'envoyé';
    END IF;
END $$;
