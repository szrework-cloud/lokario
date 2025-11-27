// Types pour le module Devis & Factures

export type QuoteStatus = "brouillon" | "envoyé" | "accepté" | "refusé";
export type InvoiceStatus = "brouillon" | "envoyée" | "payée" | "en_retard";

export interface BillingLine {
  id: number;
  description: string;
  quantity: number;
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
  created_at: string;
  sent_at?: string;
  accepted_at?: string;
  refused_at?: string;
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
  lines: BillingLine[];
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  amount_remaining: number;
  notes?: string;
  conditions?: string;
  created_at: string;
  sent_at?: string;
  due_date: string;
  paid_at?: string;
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

