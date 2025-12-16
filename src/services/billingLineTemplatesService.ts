import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export interface BillingLineTemplate {
  id: number;
  company_id: number;
  description: string;
  unit?: string;
  unit_price_ht: number;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

export interface BillingLineTemplateCreate {
  description: string;
  unit?: string;
  unit_price_ht: number;
  tax_rate: number;
}

export interface BillingLineTemplateUpdate {
  description?: string;
  unit?: string;
  unit_price_ht?: number;
  tax_rate?: number;
}

export async function getBillingLineTemplates(token: string): Promise<BillingLineTemplate[]> {
  return apiGet<BillingLineTemplate[]>("/billing-line-templates", token);
}

export async function createBillingLineTemplate(
  token: string,
  data: BillingLineTemplateCreate
): Promise<BillingLineTemplate> {
  return apiPost<BillingLineTemplate>("/billing-line-templates", data, token);
}

export async function updateBillingLineTemplate(
  token: string,
  id: number,
  data: BillingLineTemplateUpdate
): Promise<BillingLineTemplate> {
  return apiPut<BillingLineTemplate>(`/billing-line-templates/${id}`, data, token);
}

export async function deleteBillingLineTemplate(
  token: string,
  id: number
): Promise<void> {
  return apiDelete<void>(`/billing-line-templates/${id}`, token);
}

