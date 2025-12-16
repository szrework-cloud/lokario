-- Migration SQL pour ajouter les champs TVA et auto-entrepreneur au modèle Client
-- À exécuter si Alembic n'est pas utilisé

-- Ajouter les colonnes pour la gestion TVA et auto-entrepreneurs
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS is_auto_entrepreneur BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS vat_exempt BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS vat_exemption_reference VARCHAR(100);

-- Commentaires pour documentation
COMMENT ON COLUMN clients.is_auto_entrepreneur IS 'Indique si le client est un auto-entrepreneur (TVA non applicable)';
COMMENT ON COLUMN clients.vat_exempt IS 'Indique si le client est exonéré de TVA';
COMMENT ON COLUMN clients.vat_exemption_reference IS 'Référence de l''article CGI pour l''exonération TVA (ex: "Art. 293 B du CGI")';
