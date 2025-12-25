import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

// Types frontend
export interface AppointmentType {
  id: number;
  name: string;
  description?: string;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  employeesAllowedIds?: number[];
  isActive: boolean;
}

export interface Appointment {
  id: number;
  clientId: number;
  clientName: string;
  clientConversationId?: number;
  typeId: number;
  typeName: string;
  employeeId?: number;
  employeeName?: string;
  startDateTime: string; // ISO
  endDateTime: string; // ISO
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show" | "reschedule_requested";
  createdAt: string;
  updatedAt: string;
  notesInternal?: string;
}

export interface AppointmentReminderTemplate {
  id: number;
  relance_number: number; // 1, 2, ou 3
  hours_before: number; // Nombre d'heures avant le rendez-vous
  content: string; // Template du message
}

export interface AppointmentSettings {
  autoReminderEnabled: boolean;
  autoReminderOffsetHours: number;
  includeRescheduleLinkInReminder: boolean;
  autoNoShowMessageEnabled: boolean;
  rescheduleBaseUrl?: string;
  maxReminderRelances?: number; // Nombre max de relances (1 à 3)
  reminderRelances?: AppointmentReminderTemplate[]; // Templates pour chaque relance
  // Horaires de travail
  workStartTime?: string; // Heure de début (format HH:MM, ex: "09:00")
  workEndTime?: string; // Heure de fin (format HH:MM, ex: "18:00")
  breaksEnabled?: boolean; // Activer les pauses entre les rendez-vous
  breakCount?: number; // Nombre de pauses (0-5)
  breakDuration?: number; // Durée des pauses en minutes (5-120)
}

// Types API
interface AppointmentTypeAPIResponse {
  id: number;
  name: string;
  description?: string | null;
  duration_minutes: number;
  buffer_before_minutes?: number | null;
  buffer_after_minutes?: number | null;
  employees_allowed_ids?: number[] | string | null; // Peut être une liste (nouveau format) ou une chaîne JSON (ancien format)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AppointmentAPIResponse {
  id: number;
  company_id: number;
  client_id: number;
  client_name?: string | null;
  type_id: number;
  type_name?: string | null;
  employee_id?: number | null;
  employee_name?: string | null;
  conversation_id?: number | null;
  start_date_time: string;
  end_date_time: string;
  status: string;
  notes_internal?: string | null;
  created_by_id?: number | null;
  created_at: string;
  updated_at: string;
}

interface AppointmentSettingsAPIResponse {
  auto_reminder_enabled: boolean;
  auto_reminder_offset_hours: number;
  include_reschedule_link_in_reminder: boolean;
  auto_no_show_message_enabled: boolean;
  reschedule_base_url?: string | null;
  max_reminder_relances?: number;
  reminder_relances?: Array<{
    id: number;
    relance_number: number;
    hours_before: number;
    content: string;
  }>;
  work_start_time?: string;
  work_end_time?: string;
  breaks_enabled?: boolean;
  breaks?: Array<{ start_time: string; end_time: string }>;
}

/**
 * Convertit une réponse API en AppointmentType frontend
 */
function mapAppointmentTypeFromAPI(apiType: AppointmentTypeAPIResponse): AppointmentType {
  let employeesAllowedIds: number[] | undefined;
  
  // employees_allowed_ids peut être une liste (nouveau format) ou une chaîne JSON (ancien format)
  if (apiType.employees_allowed_ids) {
    if (Array.isArray(apiType.employees_allowed_ids)) {
      // Déjà une liste (nouveau format du backend)
      employeesAllowedIds = apiType.employees_allowed_ids;
    } else if (typeof apiType.employees_allowed_ids === 'string') {
      // Chaîne JSON (ancien format)
      try {
        employeesAllowedIds = JSON.parse(apiType.employees_allowed_ids);
      } catch {
        employeesAllowedIds = undefined;
      }
    }
  }

  return {
    id: apiType.id,
    name: apiType.name,
    description: apiType.description || undefined,
    durationMinutes: apiType.duration_minutes,
    bufferBeforeMinutes: apiType.buffer_before_minutes || undefined,
    bufferAfterMinutes: apiType.buffer_after_minutes || undefined,
    employeesAllowedIds,
    isActive: apiType.is_active,
  };
}

/**
 * Convertit une réponse API en Appointment frontend
 */
function mapAppointmentFromAPI(apiAppointment: AppointmentAPIResponse): Appointment {
  return {
    id: apiAppointment.id,
    clientId: apiAppointment.client_id,
    clientName: apiAppointment.client_name || `Client #${apiAppointment.client_id}`,
    clientConversationId: apiAppointment.conversation_id || undefined,
    typeId: apiAppointment.type_id,
    typeName: apiAppointment.type_name || `Type #${apiAppointment.type_id}`,
    employeeId: apiAppointment.employee_id || undefined,
    employeeName: apiAppointment.employee_name || undefined,
    startDateTime: apiAppointment.start_date_time,
    endDateTime: apiAppointment.end_date_time,
    status: apiAppointment.status as Appointment["status"],
    createdAt: apiAppointment.created_at,
    updatedAt: apiAppointment.updated_at,
    notesInternal: apiAppointment.notes_internal || undefined,
  };
}

/**
 * Récupère tous les types de rendez-vous
 */
export async function getAppointmentTypes(
  token: string | null,
  activeOnly?: boolean
): Promise<AppointmentType[]> {
  if (!token) {
    throw new Error("Token is required");
  }

  const params = activeOnly !== undefined ? `?active_only=${activeOnly}` : "";
  const types = await apiGet<AppointmentTypeAPIResponse[]>(
    `/appointments/types${params}`,
    token
  );

  return types.map(mapAppointmentTypeFromAPI);
}

/**
 * Récupère un type de rendez-vous
 */
export async function getAppointmentType(
  token: string | null,
  typeId: number
): Promise<AppointmentType> {
  if (!token) {
    throw new Error("Token is required");
  }

  const type = await apiGet<AppointmentTypeAPIResponse>(
    `/appointments/types/${typeId}`,
    token
  );

  return mapAppointmentTypeFromAPI(type);
}

/**
 * Crée un type de rendez-vous
 */
export async function createAppointmentType(
  token: string | null,
  typeData: Omit<AppointmentType, "id">
): Promise<AppointmentType> {
  if (!token) {
    throw new Error("Token is required");
  }

  const payload: any = {
    name: typeData.name,
    duration_minutes: typeData.durationMinutes,
    is_active: typeData.isActive,
  };
  
  // Ajouter les champs optionnels seulement s'ils sont définis
  if (typeData.description !== undefined) {
    payload.description = typeData.description;
  }
  if (typeData.bufferBeforeMinutes !== undefined) {
    payload.buffer_before_minutes = typeData.bufferBeforeMinutes;
  }
  if (typeData.bufferAfterMinutes !== undefined) {
    payload.buffer_after_minutes = typeData.bufferAfterMinutes;
  }
  if (typeData.employeesAllowedIds !== undefined && typeData.employeesAllowedIds !== null) {
    // Envoyer null si le tableau est vide, sinon le tableau
    payload.employees_allowed_ids = typeData.employeesAllowedIds.length > 0 ? typeData.employeesAllowedIds : null;
  }
  
  const type = await apiPost<AppointmentTypeAPIResponse>(
    "/appointments/types",
    payload,
    token
  );

  return mapAppointmentTypeFromAPI(type);
}

/**
 * Met à jour un type de rendez-vous
 */
export async function updateAppointmentType(
  token: string | null,
  typeId: number,
  updates: Partial<Omit<AppointmentType, "id">>
): Promise<AppointmentType> {
  if (!token) {
    throw new Error("Token is required");
  }

  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.durationMinutes !== undefined) updateData.duration_minutes = updates.durationMinutes;
  if (updates.bufferBeforeMinutes !== undefined) updateData.buffer_before_minutes = updates.bufferBeforeMinutes;
  if (updates.bufferAfterMinutes !== undefined) updateData.buffer_after_minutes = updates.bufferAfterMinutes;
  if (updates.employeesAllowedIds !== undefined && updates.employeesAllowedIds !== null) {
    // Envoyer null si le tableau est vide, sinon le tableau
    updateData.employees_allowed_ids = updates.employeesAllowedIds.length > 0 ? updates.employeesAllowedIds : null;
  } else if (updates.employeesAllowedIds === null) {
    // Permettre d'explicitement définir à null
    updateData.employees_allowed_ids = null;
  }
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const type = await apiPatch<AppointmentTypeAPIResponse>(
    `/appointments/types/${typeId}`,
    updateData,
    token
  );

  return mapAppointmentTypeFromAPI(type);
}

/**
 * Supprime un type de rendez-vous
 */
export async function deleteAppointmentType(
  token: string | null,
  typeId: number
): Promise<void> {
  if (!token) {
    throw new Error("Token is required");
  }

  await apiDelete(`/appointments/types/${typeId}`, token);
}

/**
 * Récupère tous les rendez-vous avec filtres optionnels
 */
export async function getAppointments(
  token: string | null,
  filters?: {
    clientId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: number;
  }
): Promise<Appointment[]> {
  if (!token) {
    throw new Error("Token is required");
  }

  const params = new URLSearchParams();
  if (filters?.clientId) params.append("client_id", filters.clientId.toString());
  if (filters?.status) params.append("status", filters.status);
  if (filters?.startDate) params.append("start_date", filters.startDate);
  if (filters?.endDate) params.append("end_date", filters.endDate);
  if (filters?.employeeId) params.append("employee_id", filters.employeeId.toString());

  const queryString = params.toString();
  const url = queryString ? `/appointments?${queryString}` : "/appointments";

  const appointments = await apiGet<AppointmentAPIResponse[]>(url, token);

  return appointments.map(mapAppointmentFromAPI);
}

/**
 * Récupère un rendez-vous
 */
export async function getAppointment(
  token: string | null,
  appointmentId: number
): Promise<Appointment> {
  if (!token) {
    throw new Error("Token is required");
  }

  const appointment = await apiGet<AppointmentAPIResponse>(
    `/appointments/${appointmentId}`,
    token
  );

  return mapAppointmentFromAPI(appointment);
}

/**
 * Crée un rendez-vous
 */
export async function createAppointment(
  token: string | null,
  appointmentData: Omit<Appointment, "id" | "createdAt" | "updatedAt">
): Promise<Appointment> {
  if (!token) {
    throw new Error("Token is required");
  }

  const appointment = await apiPost<AppointmentAPIResponse>(
    "/appointments",
    {
      client_id: appointmentData.clientId,
      type_id: appointmentData.typeId,
      employee_id: appointmentData.employeeId,
      conversation_id: appointmentData.clientConversationId,
      start_date_time: appointmentData.startDateTime,
      end_date_time: appointmentData.endDateTime,
      status: appointmentData.status,
      notes_internal: appointmentData.notesInternal,
    },
    token
  );

  return mapAppointmentFromAPI(appointment);
}

/**
 * Met à jour un rendez-vous
 */
export async function updateAppointment(
  token: string | null,
  appointmentId: number,
  updates: Partial<Omit<Appointment, "id" | "createdAt" | "updatedAt">>
): Promise<Appointment> {
  if (!token) {
    throw new Error("Token is required");
  }

  const updateData: any = {};
  if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
  if (updates.typeId !== undefined) updateData.type_id = updates.typeId;
  if (updates.employeeId !== undefined) updateData.employee_id = updates.employeeId;
  if (updates.clientConversationId !== undefined) updateData.conversation_id = updates.clientConversationId;
  if (updates.startDateTime !== undefined) updateData.start_date_time = updates.startDateTime;
  if (updates.endDateTime !== undefined) updateData.end_date_time = updates.endDateTime;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.notesInternal !== undefined) updateData.notes_internal = updates.notesInternal;

  const appointment = await apiPatch<AppointmentAPIResponse>(
    `/appointments/${appointmentId}`,
    updateData,
    token
  );

  return mapAppointmentFromAPI(appointment);
}

/**
 * Supprime un rendez-vous
 */
export async function deleteAppointment(
  token: string | null,
  appointmentId: number
): Promise<void> {
  if (!token) {
    throw new Error("Token is required");
  }

  await apiDelete(`/appointments/${appointmentId}`, token);
}

/**
 * Récupère les paramètres de rendez-vous
 */
export async function getAppointmentSettings(
  token: string | null
): Promise<AppointmentSettings> {
  if (!token) {
    throw new Error("Token is required");
  }

    // Valeurs par défaut
    const defaultSettings: AppointmentSettings = {
      autoReminderEnabled: true,
      autoReminderOffsetHours: 4,
      includeRescheduleLinkInReminder: true,
      autoNoShowMessageEnabled: true,
      rescheduleBaseUrl: undefined,
      maxReminderRelances: 1,
      reminderRelances: [],
      workStartTime: "09:00",
      workEndTime: "18:00",
      breaksEnabled: false,
      breaks: [],
    };

  try {
    const settings = await apiGet<any>(
      "/appointments/settings",
      token
    );

    // Si la réponse est vide (cas où l'erreur 422 a été gérée dans apiGet)
    if (!settings || Object.keys(settings).length === 0) {
      return defaultSettings;
    }

    // Le backend retourne maintenant directement un dictionnaire
    // avec les clés en snake_case
    return {
      autoReminderEnabled: settings.auto_reminder_enabled ?? true,
      autoReminderOffsetHours: typeof settings.auto_reminder_offset_hours === 'number' 
        ? settings.auto_reminder_offset_hours 
        : (settings.auto_reminder_offset_hours ? parseInt(String(settings.auto_reminder_offset_hours)) || 4 : 4),
      includeRescheduleLinkInReminder: settings.include_reschedule_link_in_reminder ?? true,
      autoNoShowMessageEnabled: settings.auto_no_show_message_enabled ?? true,
      rescheduleBaseUrl: settings.reschedule_base_url || undefined,
      maxReminderRelances: settings.max_reminder_relances ?? 1,
      reminderRelances: (settings.reminder_relances || []).map((r: any) => ({
        id: r.id || 0,
        relance_number: r.relance_number || r.relanceNumber || 1,
        hours_before: r.hours_before || r.hoursBefore || 4,
        content: r.content || "",
      })),
      workStartTime: settings.work_start_time || "09:00",
      workEndTime: settings.work_end_time || "18:00",
      breaksEnabled: settings.breaks_enabled ?? false,
      breaks: (settings.breaks || []).map((b: any) => ({
        startTime: b.start_time || b.startTime || "12:00",
        endTime: b.end_time || b.endTime || "13:00",
      })),
    };
  } catch (error: any) {
    // Pour les erreurs 422, utiliser les valeurs par défaut sans logger d'erreur
    if (error.message && error.message.includes("valid integer")) {
      console.warn("Erreur de validation sur les paramètres (utilisation des valeurs par défaut)");
      return defaultSettings;
    }
    console.error("Erreur lors de la récupération des paramètres:", error);
    // Retourner les valeurs par défaut en cas d'erreur
    return defaultSettings;
  }
}

/**
 * Met à jour les paramètres de rendez-vous
 */
export async function updateAppointmentSettings(
  token: string | null,
  settings: AppointmentSettings
): Promise<AppointmentSettings> {
  if (!token) {
    throw new Error("Token is required");
  }

  const updated = await apiPatch<AppointmentSettingsAPIResponse>(
    "/appointments/settings",
    {
      auto_reminder_enabled: settings.autoReminderEnabled,
      max_reminder_relances: settings.maxReminderRelances,
      reminder_relances: settings.reminderRelances?.map(r => ({
        id: r.id,
        relance_number: r.relance_number,
        hours_before: r.hours_before,
        content: r.content,
      })),
      auto_reminder_offset_hours: settings.autoReminderOffsetHours,
      include_reschedule_link_in_reminder: settings.includeRescheduleLinkInReminder,
      auto_no_show_message_enabled: settings.autoNoShowMessageEnabled,
      reschedule_base_url: settings.rescheduleBaseUrl,
      work_start_time: settings.workStartTime,
      work_end_time: settings.workEndTime,
      breaks_enabled: settings.breaksEnabled,
      breaks: settings.breaks?.map((b) => ({
        start_time: b.startTime,
        end_time: b.endTime,
      })) || [],
    },
    token
  );

  return {
    autoReminderEnabled: updated.auto_reminder_enabled,
    autoReminderOffsetHours: updated.auto_reminder_offset_hours,
    includeRescheduleLinkInReminder: updated.include_reschedule_link_in_reminder,
    autoNoShowMessageEnabled: updated.auto_no_show_message_enabled,
    rescheduleBaseUrl: updated.reschedule_base_url || undefined,
    maxReminderRelances: updated.max_reminder_relances,
    reminderRelances: (updated.reminder_relances || []).map((r: any) => ({
      id: r.id || 0,
      relance_number: r.relance_number || r.relanceNumber || 1,
      hours_before: r.hours_before || r.hoursBefore || 4,
      content: r.content || "",
    })),
    workStartTime: updated.work_start_time || "09:00",
    workEndTime: updated.work_end_time || "18:00",
    breaksEnabled: updated.breaks_enabled ?? false,
    breaks: (updated.breaks || []).map((b: any) => ({
      startTime: b.start_time || b.startTime || "12:00",
      endTime: b.end_time || b.endTime || "13:00",
    })),
  };
}

/**
 * Récupère les paramètres de rendez-vous d'une entreprise (endpoint public)
 */
export async function getPublicAppointmentSettings(slug: string): Promise<{
  workStartTime: string;
  workEndTime: string;
  breaksEnabled: boolean;
  breaks: Array<{ startTime: string; endTime: string }>;
}> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/appointments/public/settings?slug=${encodeURIComponent(slug)}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch appointment settings: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    workStartTime: data.work_start_time || "09:00",
    workEndTime: data.work_end_time || "18:00",
    breaksEnabled: data.breaks_enabled || false,
    breaks: (data.breaks || []).map((b: any) => ({
      startTime: b.start_time || b.startTime || "12:00",
      endTime: b.end_time || b.endTime || "13:00",
    })),
  };
}

// ==================== PUBLIC ENDPOINTS (sans authentification) ====================

/**
 * Récupère les types de rendez-vous actifs d'une entreprise (endpoint public)
 */
export async function getPublicAppointmentTypes(
  slug: string
): Promise<AppointmentType[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${API_URL}/appointments/public/types?slug=${encodeURIComponent(slug)}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch appointment types: ${response.statusText}`);
  }
  
  const types = await response.json();
  return types.map(mapAppointmentTypeFromAPI);
}

/**
 * Récupère les rendez-vous d'une entreprise pour calculer les créneaux disponibles (endpoint public)
 */
export async function getPublicAppointments(
  slug: string,
  filters?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<Appointment[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const params = new URLSearchParams();
  params.append("slug", slug);
  if (filters?.startDate) params.append("start_date", filters.startDate);
  if (filters?.endDate) params.append("end_date", filters.endDate);
  
  const response = await fetch(`${API_URL}/appointments/public/appointments?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch appointments: ${response.statusText}`);
  }
  
  const appointments = await response.json();
  return appointments.map(mapAppointmentFromAPI);
}

/**
 * Récupère les employés d'une entreprise (endpoint public)
 */
export async function getPublicEmployees(
  slug: string
): Promise<Array<{ id: number; name: string; email: string }>> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${API_URL}/appointments/public/employees?slug=${encodeURIComponent(slug)}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch employees: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Crée un rendez-vous public (sans authentification)
 */
export async function createPublicAppointment(
  slug: string,
  appointmentData: {
    typeId: number;
    employeeId?: number;
    startDateTime: string;
    endDateTime: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    notesInternal?: string;
  }
): Promise<Appointment> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${API_URL}/appointments/public/appointments?slug=${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type_id: appointmentData.typeId,
      employee_id: appointmentData.employeeId,
      start_date_time: appointmentData.startDateTime,
      end_date_time: appointmentData.endDateTime,
      client_name: appointmentData.clientName,
      client_email: appointmentData.clientEmail,
      client_phone: appointmentData.clientPhone,
      notes_internal: appointmentData.notesInternal,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Failed to create appointment: ${response.statusText}`);
  }
  
  const appointment = await response.json();
  return mapAppointmentFromAPI(appointment);
}


