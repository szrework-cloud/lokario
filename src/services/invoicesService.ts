import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export interface InvoiceLine {
  id?: number;
  invoice_id?: number;
  description: string;
  quantity: number;
  unit?: string;
  unit_price_ht: number;
  tax_rate: number;
  subtotal_ht?: number;
  tax_amount?: number;
  total_ttc?: number;
  order: number;
}

export interface Invoice {
  id: number;
  company_id: number;
  client_id: number;
  project_id?: number;
  quote_id?: number;
  number: string;
  invoice_type: "facture" | "avoir";
  original_invoice_id?: number;
  credit_amount?: number;
  
  // Statut
  status: "brouillon" | "envoyée" | "payée" | "impayée" | "en retard" | "annulée";
  amount: number;
  subtotal_ht?: number;
  total_tax?: number;
  total_ttc?: number;
  sent_at?: string;
  paid_at?: string;
  due_date?: string;
  
  // Informations vendeur
  seller_name?: string;
  seller_address?: string;
  seller_siren?: string;
  seller_siret?: string;
  seller_vat_number?: string;
  seller_rcs?: string;
  seller_legal_form?: string;
  seller_capital?: number;
  
  // Informations client
  client_name?: string;
  client_address?: string;
  client_siren?: string;
  client_delivery_address?: string;
  
  // Dates
  issue_date?: string;
  sale_date?: string;
  
  // Conditions
  payment_terms?: string;
  late_penalty_rate?: number;
  recovery_fee?: number;
  
  // Mentions spéciales
  vat_on_debit: boolean;
  vat_exemption_reference?: string;
  operation_category?: string;
  vat_applicable: boolean;
  
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
  updated_at: string;
  
  // Relations
  lines: InvoiceLine[];
  
  // Calculés côté backend
  amount_paid?: number;
  amount_remaining?: number;
  credit_remaining?: number;
}

export interface InvoiceCreate {
  client_id: number;
  project_id?: number;
  quote_id?: number;
  invoice_type?: "facture" | "avoir";
  original_invoice_id?: number;
  credit_amount?: number;
  
  // Informations vendeur
  seller_name?: string;
  seller_address?: string;
  seller_siren?: string;
  seller_siret?: string;
  seller_vat_number?: string;
  seller_rcs?: string;
  seller_legal_form?: string;
  seller_capital?: number;
  
  // Informations client
  client_name?: string;
  client_address?: string;
  client_siren?: string;
  client_delivery_address?: string;
  
  // Dates
  issue_date?: string;
  sale_date?: string;
  due_date?: string;
  
  // Conditions
  payment_terms?: string;
  late_penalty_rate?: number;
  recovery_fee?: number;
  
  // Mentions spéciales
  vat_on_debit?: boolean;
  vat_exemption_reference?: string;
  operation_category?: "vente" | "prestation" | "les deux";
  vat_applicable?: boolean;
  
  // Notes
  notes?: string;
  conditions?: string;
  
  // Lignes
  lines: InvoiceLine[];
}

export interface InvoiceUpdate {
  client_id?: number;
  project_id?: number;
  
  // Informations vendeur
  seller_name?: string;
  seller_address?: string;
  seller_siren?: string;
  seller_siret?: string;
  seller_vat_number?: string;
  seller_rcs?: string;
  seller_legal_form?: string;
  seller_capital?: number;
  
  // Informations client
  client_name?: string;
  client_address?: string;
  client_siren?: string;
  client_delivery_address?: string;
  
  // Dates
  issue_date?: string;
  sale_date?: string;
  due_date?: string;
  
  // Conditions
  payment_terms?: string;
  late_penalty_rate?: number;
  recovery_fee?: number;
  
  // Mentions spéciales
  vat_on_debit?: boolean;
  vat_exemption_reference?: string;
  operation_category?: "vente" | "prestation" | "les deux";
  vat_applicable?: boolean;
  
  // Notes
  notes?: string;
  conditions?: string;
  
  // Lignes
  lines?: InvoiceLine[];
}

export interface CreditNoteCreate {
  original_invoice_id: number;
  credit_amount: number;
  reason?: string;
  lines: InvoiceLine[];
  notes?: string;
  conditions?: string;
}

export interface InvoiceAuditLog {
  id: number;
  invoice_id: number;
  user_id: number;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  user_name?: string;
}

// ============================================================================
// API Functions
// ============================================================================

export async function getInvoices(
  token: string,
  params?: {
    skip?: number;
    limit?: number;
    status?: string;
    client_id?: number;
    search?: string;
  }
): Promise<Invoice[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) queryParams.append("limit", params.limit.toString());
  if (params?.status) queryParams.append("status_filter", params.status);
  if (params?.client_id) queryParams.append("client_id", params.client_id.toString());
  if (params?.search) queryParams.append("search", params.search);
  
  const queryString = queryParams.toString();
  const url = `/invoices${queryString ? `?${queryString}` : ""}`;
  
  return apiGet<Invoice[]>(url, token);
}

export async function getInvoice(token: string, invoiceId: number): Promise<Invoice> {
  return apiGet<Invoice>(`/invoices/${invoiceId}`, token);
}

export async function createInvoice(token: string, data: InvoiceCreate): Promise<Invoice> {
  return apiPost<Invoice>("/invoices", data, token);
}

export async function updateInvoice(
  token: string,
  invoiceId: number,
  data: InvoiceUpdate
): Promise<Invoice> {
  return apiPut<Invoice>(`/invoices/${invoiceId}`, data, token);
}

export async function deleteInvoice(token: string, invoiceId: number): Promise<void> {
  return apiDelete(`/invoices/${invoiceId}`, token);
}

export async function validateInvoice(
  token: string,
  invoiceId: number,
  newStatus: string
): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${invoiceId}/validate?new_status=${encodeURIComponent(newStatus)}`, {}, token);
}

export async function createCreditNote(
  token: string,
  invoiceId: number,
  data: CreditNoteCreate
): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${invoiceId}/credit-note`, data, token);
}

export async function cancelInvoice(token: string, invoiceId: number, amount?: number): Promise<Invoice> {
  const body = amount ? { amount } : {};
  return apiPost<Invoice>(`/invoices/${invoiceId}/cancel`, body, token);
}

export interface RelatedDocument {
  type: "quote" | "credit_note" | "invoice";
  id: number;
  number: string;
  status: string;
  total?: number;
  credit_amount?: number;
  created_at: string | null;
}

export interface RelatedDocumentsResponse {
  invoice_id: number;
  related_documents: RelatedDocument[];
}

export async function getRelatedDocuments(token: string, invoiceId: number): Promise<RelatedDocumentsResponse> {
  return apiGet<RelatedDocumentsResponse>(`/invoices/${invoiceId}/related-documents`, token);
}

export async function archiveInvoice(token: string, invoiceId: number): Promise<Invoice> {
  return apiPost<Invoice>(`/invoices/${invoiceId}/archive`, {}, token);
}

export async function generatePDF(token: string, invoiceId: number): Promise<Blob> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/invoices/${invoiceId}/pdf`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Erreur lors de la génération du PDF" }));
    throw new Error(error.detail || "Erreur lors de la génération du PDF");
  }
  
  return response.blob();
}

export async function getInvoiceAuditLogs(
  token: string,
  invoiceId: number
): Promise<InvoiceAuditLog[]> {
  return apiGet<InvoiceAuditLog[]>(`/invoices/${invoiceId}/audit-logs`, token);
}

export interface InvoiceEmailData {
  subject: string;
  content: string;
  additional_recipients?: string[];
  additional_attachments?: File[];
}

export async function sendInvoiceEmail(
  token: string,
  invoiceId: number,
  emailData: InvoiceEmailData
): Promise<{ success: boolean; sent_count: number; total_recipients: number; message: string }> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  // Créer FormData pour envoyer les fichiers
  const formData = new FormData();
  formData.append("subject", emailData.subject);
  formData.append("content", emailData.content);
  
  // S'assurer que les destinataires supplémentaires sont bien sérialisés
  const recipients = emailData.additional_recipients || [];
  formData.append("additional_recipients", JSON.stringify(recipients));
  
  // Ajouter les fichiers uploadés
  if (emailData.additional_attachments && emailData.additional_attachments.length > 0) {
    emailData.additional_attachments.forEach((file, index) => {
      formData.append(`attachment_${index}`, file);
    });
  }
  
  const response = await fetch(`${API_URL}/invoices/${invoiceId}/send-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    let message = "Erreur serveur";
    try {
      const errorBody = await response.json();
      if (errorBody.detail) {
        message = Array.isArray(errorBody.detail)
          ? errorBody.detail[0].msg ?? message
          : errorBody.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  
  return await response.json();
}
