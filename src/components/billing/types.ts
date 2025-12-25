// Types pour le module Devis & Factures

export type QuoteStatus = "brouillon" | "envoyé" | "accepté" | "refusé" | "vu";
export type InvoiceStatus = "brouillon" | "envoyée" | "payée" | "impayée" | "en retard" | "annulée";
export type InvoiceType = "facture" | "avoir";

export interface BillingLine {
  id: number;
  description: string;
  quantity: number;
  unit?: string; // Unité de mesure (ex: "heure", "pièce", "kg", etc.)
  unitPrice: number;
  taxRate: number; // En pourcentage (ex: 20 pour 20%)
  total?: number; // Calculé automatiquement
}

export interface BillingTimelineEvent {
  id: number;
  timestamp: string;
  action: string;
  description?: string;
  user: string;
}

export interface BillingHistoryEvent {
  id: number;
  timestamp: string;
  action: string;
  description?: string;
  user: string;
}

export interface Quote {
  id: number;
  number: string; // DEV-2025-001
  client_id: number;
  client_name: string;
  project_id?: number;
  project_name?: string;
  status: QuoteStatus;
  lines: BillingLine[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  conditions?: string;
  valid_until?: string;
  service_start_date?: string;
  execution_duration?: string;
  discount_type?: "percentage" | "fixed" | null;
  discount_value?: number | null;
  discount_label?: string | null;
  created_at: string;
  updated_at?: string; // Pour optimistic locking
  sent_at?: string;
  accepted_at?: string;
  refused_at?: string;
  client_signature_path?: string;
  client_email?: string; // Email du client pour le formulaire d'envoi
  public_token?: string; // Token pour la signature publique
  public_token_expires_at?: string; // Date d'expiration du token
  timeline: BillingTimelineEvent[];
  history: BillingHistoryEvent[];
  linked_followups?: number[]; // IDs des relances associées
}

export interface Invoice {
  id: number;
  number: string; // FAC-2025-001
  quote_id?: number; // Si converti depuis un devis
  client_id: number;
  client_name: string;
  project_id?: number;
  project_name?: string;
  status: InvoiceStatus;
  invoice_type?: InvoiceType; // "facture" ou "avoir"
  original_invoice_id?: number; // Pour les avoirs
  credit_amount?: number; // Montant crédité (pour avoirs)
  
  // Informations vendeur
  seller_name?: string;
  seller_address?: string;
  seller_siren?: string;
  seller_siret?: string;
  seller_vat_number?: string; // TVA intracommunautaire
  seller_rcs?: string; // RCS avec ville
  seller_legal_form?: string;
  seller_capital?: number;
  
  // Informations client étendues
  client_address?: string;
  client_siren?: string; // Obligatoire à partir de 2026
  client_delivery_address?: string; // Si différente de l'adresse de facturation
  
  // Dates
  issue_date?: string; // Date d'émission
  sale_date?: string; // Date de vente/prestation
  due_date: string;
  
  // Totaux
  lines: BillingLine[];
  subtotal: number;
  tax: number;
  total: number;
  amount: number; // Conservé pour compatibilité
  amount_paid: number;
  amount_remaining: number;
  
  // Conditions
  payment_terms?: string; // Modalités de paiement
  late_penalty_rate?: number; // Taux pénalités de retard
  recovery_fee?: number; // Indemnité forfaitaire pour frais de recouvrement
  
  // Mentions spéciales
  vat_on_debit?: boolean; // TVA sur les débits
  vat_exemption_reference?: string; // Référence article CGI
  operation_category?: "vente" | "prestation" | "les deux"; // Obligatoire à partir de 2026
  vat_applicable?: boolean; // TVA applicable ou non
  
  // Notes
  notes?: string;
  conditions?: string;
  
  // Archivage
  archived_at?: string;
  archived_by_id?: number;
  
  // Soft delete
  deleted_at?: string;
  deleted_by_id?: number;
  
  created_at: string;
  updated_at?: string;
  sent_at?: string;
  paid_at?: string;
  client_email?: string; // Email du client pour le formulaire d'envoi
  timeline: BillingTimelineEvent[];
  history: BillingHistoryEvent[];
  linked_followups?: number[]; // IDs des relances associées
  payments?: Payment[];
}

export interface Payment {
  id: number;
  amount: number;
  date: string;
  method: "virement" | "chèque" | "espèces" | "carte" | "autre";
  reference?: string;
  notes?: string;
}

// Pour la numérotation automatique
export interface BillingNumbering {
  last_quote_number: number;
  last_invoice_number: number;
  year: number;
}

// ============================================================================
// Types pour les avoirs (Credit Notes)
// ============================================================================

export interface CreditNoteCreate {
  original_invoice_id: number;
  credit_amount: number;
  reason?: string;
  lines: BillingLine[];
  notes?: string;
  conditions?: string;
}

// ============================================================================
// Types pour l'audit log
// ============================================================================

export interface InvoiceAuditLog {
  id: number;
  invoice_id: number;
  user_id: number;
  action: string; // 'created', 'updated', 'status_changed', 'deleted', 'archived', etc.
  field_name?: string; // Champ modifié
  old_value?: string; // Ancienne valeur (JSON string)
  new_value?: string; // Nouvelle valeur (JSON string)
  description?: string; // Description lisible de l'action
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  user_name?: string; // Nom de l'utilisateur (ajouté côté frontend)
}

