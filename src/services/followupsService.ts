import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

// ==================== TYPES ====================

export type FollowUpType = 
  | "Devis non répondu"
  | "Facture impayée"
  | "Info manquante"
  | "Rappel RDV"
  | "Client inactif"
  | "Projet en attente";

export type FollowUpStatus = "À faire" | "Fait" | "En attente";

export interface FollowUpItem {
  id: number;
  type: FollowUpType;
  client: string;
  clientId?: number;
  source: string;
  dueDate: string;
  status: FollowUpStatus;
  amount?: number;
  actualDate?: string;
  autoEnabled?: boolean;
  autoFrequencyDays?: number | null;
  autoStopOnResponse?: boolean;
  autoStopOnPaid?: boolean;
  autoStopOnRefused?: boolean;
}

export interface FollowUpHistoryItem {
  id: number;
  date: string;
  message: string;
  status: "envoyé" | "lu" | "répondu";
  sentBy?: string;
}

export interface FollowUpStats {
  total: number;
  invoices: number;
  quotes: number;
  late: number;
  total_amount: number;
}

export interface WeeklyFollowUpData {
  day: string;
  count: number;
}

// ==================== API RESPONSE TYPES ====================

interface FollowUpReadResponse {
  id: number;
  company_id: number;
  type: string;
  client_id: number;
  client_name: string;
  source_type: string;
  source_id: number | null;
  source_label: string;
  due_date: string;
  actual_date: string | null;
  status: string;
  amount: number | null;
  auto_enabled: boolean;
  auto_frequency_days: number | null;
  auto_stop_on_response: boolean;
  auto_stop_on_paid: boolean;
  auto_stop_on_refused: boolean;
  created_at: string;
  updated_at: string;
  // Informations sur les relances envoyées
  total_sent?: number;
  remaining_relances?: number | null;
  next_relance_number?: number | null;
  has_been_sent?: boolean;
}

interface FollowUpHistoryReadResponse {
  id: number;
  followup_id: number;
  message: string;
  message_type: string;
  status: string;
  sent_by_name: string | null;
  sent_at: string;
}

// ==================== HELPER FUNCTIONS ====================

function mapFollowUpResponse(item: FollowUpReadResponse): FollowUpItem {
  return {
    id: item.id,
    type: item.type as FollowUpType,
    client: item.client_name,
    clientId: item.client_id,
    source: item.source_label,
    // Pour les relances automatiques, garder la date ISO complète pour les calculs
    // Pour les autres, formater la date
    dueDate: item.auto_enabled ? item.due_date : formatDueDate(item.due_date),
    status: item.status as FollowUpStatus,
    amount: item.amount ? parseFloat(item.amount.toString()) : undefined,
    actualDate: item.actual_date || item.due_date, // Garder la date ISO complète pour les calculs
    autoEnabled: item.auto_enabled,
    autoFrequencyDays: item.auto_frequency_days,
    autoStopOnResponse: item.auto_stop_on_response,
    autoStopOnPaid: item.auto_stop_on_paid,
    autoStopOnRefused: item.auto_stop_on_refused,
    // Informations sur les relances envoyées (optionnelles, utilisées via as any dans les composants)
  };
}

// ==================== API FUNCTIONS ====================

export async function getFollowUps(
  token: string | null,
  filters?: {
    status?: string;
    type?: string;
    clientId?: number;
    sourceType?: string;
    sourceId?: number;
  }
): Promise<FollowUpItem[]> {
  if (!token) {
    throw new Error("Token is required");
  }

  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.type) params.append("type", filters.type);
  if (filters?.clientId) params.append("client_id", filters.clientId.toString());
  if (filters?.sourceType) params.append("source_type", filters.sourceType);
  if (filters?.sourceId) params.append("source_id", filters.sourceId.toString());

  const url = `/followups${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await apiGet<FollowUpReadResponse[]>(url, token);

  return response.map(mapFollowUpResponse);
}

export async function getFollowUp(
  followupId: number,
  token: string | null
): Promise<FollowUpItem> {
  if (!token) {
    throw new Error("Token is required");
  }

  const response = await apiGet<FollowUpReadResponse>(`/followups/${followupId}`, token);
  return mapFollowUpResponse(response);
}

export async function getFollowUpStats(
  token: string | null
): Promise<FollowUpStats> {
  if (!token) {
    throw new Error("Token is required");
  }

  return await apiGet<FollowUpStats>("/followups/stats", token);
}

export async function getWeeklyFollowUps(
  token: string | null
): Promise<WeeklyFollowUpData[]> {
  if (!token) {
    throw new Error("Token is required");
  }

  return await apiGet<WeeklyFollowUpData[]>("/followups/weekly", token);
}

export async function createFollowUp(
  data: {
    type: FollowUpType;
    clientId: number;
    sourceType: string;
    sourceId?: number;
    sourceLabel: string;
    dueDate: string;
    status?: FollowUpStatus;
    amount?: number;
    autoEnabled?: boolean;
    autoFrequencyDays?: number;
  },
  token: string | null
): Promise<FollowUpItem> {
  if (!token) {
    throw new Error("Token is required");
  }

  const response = await apiPost<FollowUpReadResponse>(
    "/followups",
    {
      type: data.type,
      client_id: data.clientId,
      source_type: data.sourceType,
      source_id: data.sourceId,
      source_label: data.sourceLabel,
      due_date: data.dueDate,
      status: data.status || "À faire",
      amount: data.amount,
      auto_enabled: data.autoEnabled || false,
      auto_frequency_days: data.autoFrequencyDays,
    },
    token
  );

  return mapFollowUpResponse(response);
}

export async function updateFollowUp(
  followupId: number,
  data: {
    status?: FollowUpStatus;
    dueDate?: string;
    actualDate?: string;
    autoEnabled?: boolean;
    autoFrequencyDays?: number | null;
    autoStopOnResponse?: boolean;
    autoStopOnPaid?: boolean;
    autoStopOnRefused?: boolean;
  },
  token: string | null
): Promise<FollowUpItem> {
  if (!token) {
    throw new Error("Token is required");
  }

  const updateData: any = {};
  if (data.status) updateData.status = data.status;
  if (data.dueDate) updateData.due_date = data.dueDate;
  if (data.actualDate) updateData.actual_date = data.actualDate;
  if (data.autoEnabled !== undefined) updateData.auto_enabled = data.autoEnabled;
  if (data.autoFrequencyDays !== undefined) updateData.auto_frequency_days = data.autoFrequencyDays;
  if (data.autoStopOnResponse !== undefined) updateData.auto_stop_on_response = data.autoStopOnResponse;
  if (data.autoStopOnPaid !== undefined) updateData.auto_stop_on_paid = data.autoStopOnPaid;
  if (data.autoStopOnRefused !== undefined) updateData.auto_stop_on_refused = data.autoStopOnRefused;

  const response = await apiPatch<FollowUpReadResponse>(
    `/followups/${followupId}`,
    updateData,
    token
  );

  return mapFollowUpResponse(response);
}

export async function markFollowUpAsDone(
  followupId: number,
  token: string | null
): Promise<FollowUpItem> {
  if (!token) {
    throw new Error("Token is required");
  }

  const response = await apiPatch<FollowUpReadResponse>(
    `/followups/${followupId}/mark-done`,
    {},
    token
  );

  return mapFollowUpResponse(response);
}

export async function deleteFollowUp(
  followupId: number,
  token: string | null
): Promise<void> {
  if (!token) {
    throw new Error("Token is required");
  }

  await apiDelete(`/followups/${followupId}`, token);
}

export async function sendFollowUp(
  followupId: number,
  data: {
    message?: string;
    method?: "email" | "whatsapp" | "sms" | "call";
  },
  token: string | null
): Promise<FollowUpHistoryItem> {
  if (!token) {
    throw new Error("Token is required");
  }

  const response = await apiPost<FollowUpHistoryReadResponse>(
    `/followups/${followupId}/send`,
    {
      message: data.message,
      method: data.method || "email",
    },
    token
  );

  return {
    id: response.id,
    date: response.sent_at,
    message: response.message,
    status: response.status as "envoyé" | "lu" | "répondu",
    sentBy: response.sent_by_name || undefined,
  };
}

export async function generateFollowUpMessage(
  followupId: number,
  token: string | null,
  context?: string
): Promise<string> {
  if (!token) {
    throw new Error("Token is required");
  }

  const response = await apiPost<{ message: string }>(
    `/followups/${followupId}/generate-message`,
    { context },
    token
  );

  return response.message;
}

export async function getFollowUpHistory(
  followupId: number,
  token: string | null
): Promise<FollowUpHistoryItem[]> {
  if (!token) {
    throw new Error("Token is required");
  }

  const response = await apiGet<FollowUpHistoryReadResponse[]>(
    `/followups/${followupId}/history`,
    token
  );

  return response.map((item) => ({
    id: item.id,
    date: item.sent_at,
    message: item.message,
    status: item.status as "envoyé" | "lu" | "répondu",
    sentBy: item.sent_by_name || undefined,
  }));
}

// ==================== SETTINGS TYPES ====================

export interface FollowUpSettings {
  initial_delay_days: number;
  max_relances: number;
  relance_delays: number[];
  relance_methods: string[];
  stop_conditions: {
    stop_on_client_response: boolean;
    stop_on_invoice_paid: boolean;
    stop_on_quote_refused: boolean;
  };
  messages: Array<{
    id: number;
    type: string;
    content: string;
  }>;
  enable_relances_before?: boolean;
  days_before_due?: number | null;
  hours_before_due?: number | null;
}

export interface FollowUpSettingsUpdate {
  initial_delay_days?: number;
  max_relances?: number;
  relance_delays?: number[];
  relance_methods?: string[];
  stop_conditions?: {
    stop_on_client_response?: boolean;
    stop_on_invoice_paid?: boolean;
    stop_on_quote_refused?: boolean;
  };
  messages?: Array<{
    id: number;
    type: string;
    content: string;
  }>;
  enable_relances_before?: boolean;
  days_before_due?: number | null;
  hours_before_due?: number | null;
}

// ==================== SETTINGS API FUNCTIONS ====================

export async function getFollowUpSettings(
  token: string | null
): Promise<FollowUpSettings> {
  if (!token) {
    throw new Error("Token is required");
  }

  return await apiGet<FollowUpSettings>("/followups/settings", token);
}

export async function updateFollowUpSettings(
  settings: FollowUpSettingsUpdate,
  token: string | null
): Promise<FollowUpSettings> {
  if (!token) {
    throw new Error("Token is required");
  }

  return await apiPatch<FollowUpSettings>(
    "/followups/settings",
    settings,
    token
  );
}

// ==================== HELPER FUNCTIONS ====================

function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return `En retard de ${daysLate} jour${daysLate > 1 ? "s" : ""}`;
  } else if (diffDays === 0) {
    return "Aujourd'hui";
  } else if (diffDays === 1) {
    return "Demain";
  } else if (diffDays <= 7) {
    return `Dans ${diffDays} jours`;
  } else {
    // Retourner la date formatée
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
}
