import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface QuoteLine {
  id?: number;
  quote_id?: number;
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

export interface Quote {
  id: number;
  company_id: number;
  client_id: number;
  project_id?: number;
  number: string;
  status: "brouillon" | "envoyé" | "vu" | "accepté" | "refusé";
  client_name?: string;
  project_name?: string;
  amount: number;
  subtotal_ht?: number;
  total_tax?: number;
  total_ttc?: number;
  sent_at?: string;
  viewed_at?: string;
  accepted_at?: string;
  refused_at?: string;
  notes?: string;
  conditions?: string;
  valid_until?: string;
  service_start_date?: string;
  execution_duration?: string;
  discount_type?: "percentage" | "fixed" | null;
  discount_value?: number | null;
  discount_label?: string | null;
  client_signature_path?: string;
  public_token?: string;
  public_token_expires_at?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  lines: QuoteLine[];
  client_name?: string;
  project_name?: string;
}

export interface QuoteCreate {
  client_id: number;
  project_id?: number;
  status?: "brouillon" | "envoyé";
  notes?: string;
  conditions?: string;
  valid_until?: Date | string;
  service_start_date?: Date | string;
  execution_duration?: string;
  discount_type?: "percentage" | "fixed" | null;
  discount_value?: number | null;
  discount_label?: string | null;
  lines: QuoteLine[];
}

export interface QuoteUpdate {
  client_id?: number;
  project_id?: number;
  status?: "brouillon" | "envoyé" | "vu" | "accepté" | "refusé";
  notes?: string;
  conditions?: string;
  valid_until?: Date | string;
  service_start_date?: Date | string;
  execution_duration?: string;
  discount_type?: "percentage" | "fixed" | null;
  discount_value?: number | null;
  discount_label?: string | null;
  lines?: QuoteLine[];
}

// ============================================================================
// API Functions
// ============================================================================

export async function getQuotes(
  token: string,
  params?: {
    skip?: number;
    limit?: number;
    status?: string;
    client_id?: number;
    search?: string;
  }
): Promise<Quote[]> {
  const queryParams = new URLSearchParams();
  if (params?.skip !== undefined) queryParams.append("skip", params.skip.toString());
  if (params?.limit !== undefined) queryParams.append("limit", params.limit.toString());
  if (params?.status) queryParams.append("status_filter", params.status);
  if (params?.client_id) queryParams.append("client_id", params.client_id.toString());
  if (params?.search) queryParams.append("search", params.search);
  
  const queryString = queryParams.toString();
  const url = `/quotes${queryString ? `?${queryString}` : ""}`;
  
  return apiGet<Quote[]>(url, token);
}

export async function getQuote(token: string, quoteId: number): Promise<Quote> {
  return apiGet<Quote>(`/quotes/${quoteId}`, token);
}

export async function createQuote(token: string, data: QuoteCreate): Promise<Quote> {
  return apiPost<Quote>("/quotes", data, token);
}

export async function updateQuote(
  token: string,
  quoteId: number,
  data: QuoteUpdate
): Promise<Quote> {
  return apiPut<Quote>(`/quotes/${quoteId}`, data, token);
}

export async function deleteQuote(token: string, quoteId: number): Promise<void> {
  return apiDelete(`/quotes/${quoteId}`, token);
}

export async function validateQuote(
  token: string,
  quoteId: number,
  newStatus: string
): Promise<Quote> {
  return apiPost<Quote>(`/quotes/${quoteId}/validate?new_status=${encodeURIComponent(newStatus)}`, {}, token);
}

export async function downloadQuotePDF(token: string, quoteId: number): Promise<Blob> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${API_URL}/quotes/${quoteId}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Erreur lors du téléchargement du PDF: ${response.statusText}`);
  }
  
  return response.blob();
}

export async function convertQuoteToInvoice(token: string, quoteId: number): Promise<import("./invoicesService").Invoice> {
  const { apiPost } = await import("@/lib/api");
  return apiPost<import("./invoicesService").Invoice>(`/quotes/${quoteId}/convert-to-invoice`, {}, token);
}

export async function uploadClientSignature(
  token: string,
  quoteId: number,
  signatureDataUrl: string
): Promise<Quote> {
  const { apiPost } = await import("@/lib/api");
  return apiPost<Quote>(
    `/quotes/${quoteId}/client-signature`,
    { signature: signatureDataUrl },
    token
  );
}

export interface QuoteEmailData {
  subject: string;
  content: string;
  additional_recipients?: string[];
  additional_attachments?: File[];
}

export async function sendQuoteEmail(
  token: string,
  quoteId: number,
  emailData: QuoteEmailData
): Promise<{ success: boolean; sent_count: number; total_recipients: number; message: string }> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  // Créer FormData pour envoyer les fichiers
  const formData = new FormData();
  formData.append("subject", emailData.subject);
  formData.append("content", emailData.content);
  
  // S'assurer que les destinataires supplémentaires sont bien sérialisés
  const recipients = emailData.additional_recipients || [];
  logger.log(`[SEND EMAIL] Destinataires supplémentaires avant envoi:`, recipients);
  formData.append("additional_recipients", JSON.stringify(recipients));
  
  // Ajouter les fichiers uploadés
  if (emailData.additional_attachments && emailData.additional_attachments.length > 0) {
    logger.log(`[SEND EMAIL] Ajout de ${emailData.additional_attachments.length} fichier(s)`);
    emailData.additional_attachments.forEach((file, index) => {
      logger.log(`[SEND EMAIL] Fichier ${index}: ${file.name}, taille: ${file.size} bytes`);
      formData.append(`attachment_${index}`, file);
    });
  } else {
    logger.log("[SEND EMAIL] Aucun fichier supplémentaire à ajouter");
  }
  
  logger.log(`[SEND EMAIL] Destinataires supplémentaires: ${recipients.length}`);
  
  const response = await fetch(`${API_URL}/quotes/${quoteId}/send-email`, {
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
  
  return response.json();
}
