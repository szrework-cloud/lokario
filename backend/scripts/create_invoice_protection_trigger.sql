-- Trigger PostgreSQL pour empêcher la modification d'une facture validée
-- Ce trigger vérifie que seules les factures en statut "brouillon" peuvent être modifiées

-- Fonction pour empêcher la modification
CREATE OR REPLACE FUNCTION prevent_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier si le statut change de "brouillon" à autre chose (autorisé)
    -- ou si on essaie de modifier une facture qui n'est plus en brouillon (interdit)
    IF OLD.status != 'brouillon' AND (
        -- Si on essaie de modifier autre chose que le statut
        (OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'brouillon') OR
        -- Si on essaie de modifier d'autres champs
        (OLD.status = NEW.status AND (
            OLD.number IS DISTINCT FROM NEW.number OR
            OLD.client_id IS DISTINCT FROM NEW.client_id OR
            OLD.subtotal_ht IS DISTINCT FROM NEW.subtotal_ht OR
            OLD.total_tax IS DISTINCT FROM NEW.total_tax OR
            OLD.total_ttc IS DISTINCT FROM NEW.total_ttc OR
            OLD.seller_name IS DISTINCT FROM NEW.seller_name OR
            OLD.seller_address IS DISTINCT FROM NEW.seller_address OR
            OLD.client_name IS DISTINCT FROM NEW.client_name OR
            OLD.client_address IS DISTINCT FROM NEW.client_address
            -- Note: On permet la modification de certains champs comme sent_at, paid_at, archived_at
            -- qui sont gérés par les routes spécifiques
        ))
    ) THEN
        RAISE EXCEPTION 'Impossible de modifier une facture avec le statut %. Créez un avoir pour corriger une facture validée.', OLD.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS check_invoice_status_before_update ON invoices;

CREATE TRIGGER check_invoice_status_before_update
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION prevent_invoice_modification();

-- Commentaire pour documentation
COMMENT ON FUNCTION prevent_invoice_modification() IS 
'Protège les factures validées contre les modifications. Seules les factures en statut "brouillon" peuvent être modifiées.';
