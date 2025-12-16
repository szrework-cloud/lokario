/**
 * Service pour gérer les intégrations Inbox (boîtes mail)
 */
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { logger } from "@/lib/logger";

export interface InboxIntegration {
  id: number;
  company_id: number;
  integration_type: "imap" | "sendgrid" | "mailgun" | "whatsapp" | "messenger" | "sms";
  name: string;
  is_active: boolean;
  is_primary?: boolean;  // Boîte mail principale pour l'envoi
  sync_interval_minutes: number;
  imap_server?: string;
  imap_port?: number;
  email_address?: string;
  email_password?: string; // Masqué dans les réponses API
  use_ssl?: boolean;
  api_key?: string; // Masqué dans les réponses API
  webhook_url?: string;
  webhook_secret?: string; // Masqué dans les réponses API
  account_id?: string;
  phone_number?: string;
  last_sync_at?: string;
  last_sync_status?: "success" | "error" | "partial" | null;
  last_sync_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InboxIntegrationCreate {
  integration_type: "imap" | "sendgrid" | "mailgun" | "whatsapp" | "messenger" | "sms";
  name: string;
  is_active?: boolean;
  is_primary?: boolean;  // Marquer comme boîte principale
  sync_interval_minutes?: number;
  imap_server?: string;
  imap_port?: number;
  email_address?: string;
  email_password?: string;
  use_ssl?: boolean;
  api_key?: string;
  webhook_url?: string;
  webhook_secret?: string;
  account_id?: string;
  phone_number?: string;
}

export interface InboxIntegrationUpdate {
  name?: string;
  is_active?: boolean;
  is_primary?: boolean;  // Marquer comme boîte principale
  sync_interval_minutes?: number;
  imap_server?: string;
  imap_port?: number;
  email_address?: string;
  email_password?: string;
  use_ssl?: boolean;
  api_key?: string;
  webhook_url?: string;
  webhook_secret?: string;
  account_id?: string;
  phone_number?: string;
}

const isMockMode = !process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL.trim() === "";

// Mock data pour le développement
let mockIntegrations: InboxIntegration[] = [
  {
    id: 1,
    company_id: 1,
    integration_type: "imap",
    name: "Boîte principale Gmail",
    is_active: true,
    sync_interval_minutes: 5,
    imap_server: "imap.gmail.com",
    imap_port: 993,
    email_address: "contact@example.com",
    use_ssl: true,
    last_sync_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    last_sync_status: "success",
    last_sync_error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function getIntegrations(token: string | null): Promise<InboxIntegration[]> {
  if (isMockMode) {
    logger.log("[MOCK] getIntegrations");
    return Promise.resolve(mockIntegrations);
  }
  return apiGet<InboxIntegration[]>("/inbox/integrations", token);
}

export async function createIntegration(
  data: InboxIntegrationCreate,
  token: string | null
): Promise<InboxIntegration> {
  if (isMockMode) {
    logger.log("[MOCK] createIntegration", data);
    const newIntegration: InboxIntegration = {
      id: Date.now(),
      company_id: 1,
      ...data,
      is_active: data.is_active ?? true,
      sync_interval_minutes: data.sync_interval_minutes ?? 5,
      last_sync_at: undefined,
      last_sync_status: null,
      last_sync_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockIntegrations.push(newIntegration);
    return Promise.resolve(newIntegration);
  }
  return apiPost<InboxIntegration>("/inbox/integrations", data, token);
}

export async function updateIntegration(
  id: number,
  data: InboxIntegrationUpdate,
  token: string | null
): Promise<InboxIntegration> {
  if (isMockMode) {
    logger.log("[MOCK] updateIntegration", id, data);
    const index = mockIntegrations.findIndex((i) => i.id === id);
    if (index === -1) throw new Error("Integration not found");
    mockIntegrations[index] = { ...mockIntegrations[index], ...data, updated_at: new Date().toISOString() };
    return Promise.resolve(mockIntegrations[index]);
  }
  return apiPatch<InboxIntegration>(`/inbox/integrations/${id}`, data, token);
}

export async function deleteIntegration(id: number, token: string | null): Promise<void> {
  if (isMockMode) {
    logger.log("[MOCK] deleteIntegration", id);
    const index = mockIntegrations.findIndex((i) => i.id === id);
    if (index === -1) throw new Error("Integration not found");
    mockIntegrations.splice(index, 1);
    return Promise.resolve();
  }
  await apiDelete(`/inbox/integrations/${id}`, token);
}

export async function syncIntegration(id: number, token: string | null): Promise<{
  status: string;
  processed: number;
  total: number;
  errors: any[];
}> {
  if (isMockMode) {
    logger.log("[MOCK] syncIntegration", id);
    return Promise.resolve({
      status: "success",
      processed: 3,
      total: 3,
      errors: [],
    });
  }
  return apiPost<{
    status: string;
    processed: number;
    total: number;
    errors: any[];
  }>(`/inbox/integrations/${id}/sync`, {}, token);
}

