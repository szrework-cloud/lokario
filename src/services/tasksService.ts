import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { logger } from "@/lib/logger";

// Types frontend
export interface Task {
  id: number;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedToId?: number;
  assignedToAvatar?: string;
  type: string;
  category: string;
  priority?: "normal" | "high" | "critical";  // MVP V1: 3 priorités uniquement
  dueDate?: string;
  dueDateRaw?: string; // Date brute (ISO) pour le filtrage
  dueTime?: string;
  status: string;
  clientId?: number;
  clientName?: string;
  projectId?: number;
  projectName?: string;
  conversationId?: number;
  origin?: "manual" | "checklist";
  checklistName?: string;
  isLate?: boolean;
  checklistTemplateId?: number;
  checklistTemplateName?: string;
  checklistInstanceId?: number;
  isChecklistItem?: boolean;
  recurrence?: string;
  recurrenceDays?: number[];
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

export interface ChecklistTemplate {
  id: number;
  name: string;
  description: string;
  items: string[];
  recurrence?: "daily" | "weekly" | "monthly";
  recurrenceDays?: number[];
  executionTime?: string;
  isActive: boolean;
  defaultAssignedToId?: number;
}

export interface ChecklistInstance {
  id: number;
  templateId: number;
  templateName: string;
  assignedToId?: number;
  assignedToName?: string;
  completedItems: number[];
  totalItems: number;
  status: "en_cours" | "termine";
  startedAt: string;
  completedAt?: string;
  executionTime?: string;
}

export interface TaskStats {
  // MVP V1: Statistiques simplifiées
  total: number;
  completed: number;
  late: number;
}

// Types API backend
interface TaskAPIResponse {
  id: number;
  title: string;
  description?: string | null;
  assigned_to_id?: number | null;
  assigned_to_name?: string | null;
  assigned_to_avatar?: string | null;
  type: string;
  category: string;
  priority?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  status: string;
  client_id?: number | null;
  client_name?: string | null;
  project_id?: number | null;
  project_name?: string | null;
  conversation_id?: number | null;
  origin?: string | null;
  checklist_template_id?: number | null;
  checklist_instance_id?: number | null;
  is_checklist_item?: boolean;
  recurrence?: string | null;
  recurrence_days?: number[] | null;
  created_at: string;
  updated_at: string;
}

interface EmployeeAPIResponse {
  id: number;
  full_name: string;
  email: string;
}

interface ChecklistTemplateAPIResponse {
  id: number;
  company_id: number;
  name: string;
  description: string | null;
  items: string[]; // Array of strings
  recurrence: string | null;
  recurrence_days: number[] | null; // Array of numbers
  execution_time: string | null;
  is_active: boolean;
  default_assigned_to_id: number | null;
  default_assigned_to_name?: string | null;
  created_at: string;
  updated_at: string;
}

interface ChecklistInstanceAPIResponse {
  id: number;
  template_id: number;
  template_name: string;
  company_id: number;
  assigned_to_id: number | null;
  assigned_to_name?: string | null;
  started_at: string;
  completed_at: string | null;
  completed_items: number[]; // Array of item indices
  total_items: number;
  status: string;
  created_at: string;
}


/**
 * Convertit une réponse API en Task frontend
 */
function mapTaskFromAPI(apiTask: TaskAPIResponse): Task {
  // Formater la date - utiliser toujours la vraie date (DD/MM/YYYY) au lieu de "Aujourd'hui"/"Demain"
  let dueDateFormatted: string | undefined;
  if (apiTask.due_date) {
    // Parser la date en ignorant le timezone pour éviter les décalages
    const dateStr = apiTask.due_date;
    // Si c'est une date ISO avec timezone, extraire seulement la partie date
    let date: Date;
    if (dateStr.includes('T')) {
      // Format ISO avec time: extraire seulement la date
      const dateOnly = dateStr.split('T')[0];
      const [year, month, day] = dateOnly.split('-').map(Number);
      date = new Date(year, month - 1, day); // month est 0-indexé
    } else if (dateStr.includes('-')) {
      // Format ISO date seulement: YYYY-MM-DD
      const [year, month, day] = dateStr.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      // Autre format, utiliser le parsing standard
      date = new Date(dateStr);
    }
    
    // Formater en DD/MM/YYYY en utilisant les valeurs locales pour éviter le décalage timezone
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    dueDateFormatted = `${day}/${month}/${year}`;
  }

  // Vérifier si en retard
  const isLate: boolean | undefined = apiTask.status === "En retard" || (apiTask.due_date && new Date(apiTask.due_date) < new Date() && apiTask.status !== "Terminé") ? true : undefined;

  return {
    id: apiTask.id,
    title: apiTask.title,
    description: apiTask.description || undefined,
    assignedTo: apiTask.assigned_to_name || undefined,
    assignedToId: apiTask.assigned_to_id || undefined,
    assignedToAvatar: apiTask.assigned_to_avatar || undefined,
    type: apiTask.type,
    category: apiTask.category,
    priority: apiTask.priority as any || undefined,
    dueDate: dueDateFormatted,
    dueDateRaw: apiTask.due_date || undefined, // Garder la date brute pour le filtrage
    dueTime: apiTask.due_time || undefined,
    status: apiTask.status,
    clientId: apiTask.client_id || undefined,
    clientName: apiTask.client_name || undefined,
    projectId: apiTask.project_id || undefined,
    projectName: apiTask.project_name || undefined,
    conversationId: apiTask.conversation_id || undefined,
    origin: (apiTask.origin as any) || undefined,
    isLate,
    // Ajouter les champs de checklist pour le filtrage
    checklistTemplateId: apiTask.checklist_template_id || undefined,
    checklistInstanceId: apiTask.checklist_instance_id || undefined,
    isChecklistItem: apiTask.is_checklist_item || false,
    // Ajouter les champs de récurrence (ne pas utiliser || undefined pour préserver null)
    recurrence: apiTask.recurrence !== null && apiTask.recurrence !== undefined ? apiTask.recurrence : undefined,
    recurrenceDays: apiTask.recurrence_days !== null && apiTask.recurrence_days !== undefined ? apiTask.recurrence_days : undefined,
  };
}

/**
 * Convertit une réponse API en Employee frontend
 */
function mapEmployeeFromAPI(apiEmployee: EmployeeAPIResponse): Employee {
  // Générer avatar depuis initiales
  let avatar: string | undefined;
  if (apiEmployee.full_name) {
    const names = apiEmployee.full_name.split(" ");
    if (names.length >= 2) {
      avatar = (names[0][0] + names[names.length - 1][0]).toUpperCase();
    } else {
      avatar = names[0][0].toUpperCase();
    }
  } else {
    avatar = apiEmployee.email[0].toUpperCase();
  }

  return {
    id: apiEmployee.id,
    name: apiEmployee.full_name,
    email: apiEmployee.email,
    avatar,
  };
}

/**
 * Convertit une réponse API en ChecklistTemplate frontend
 */
function mapChecklistTemplateFromAPI(apiTemplate: ChecklistTemplateAPIResponse): ChecklistTemplate {
  let items: string[] = [];
  try {
    if (apiTemplate.items) {
      items = typeof apiTemplate.items === "string" ? JSON.parse(apiTemplate.items) : apiTemplate.items;
    }
  } catch (e) {
    console.error("Error parsing items:", e);
  }

  let recurrenceDays: number[] | undefined;
  try {
    if (apiTemplate.recurrence_days) {
      recurrenceDays = typeof apiTemplate.recurrence_days === "string" 
        ? JSON.parse(apiTemplate.recurrence_days) 
        : apiTemplate.recurrence_days;
    }
  } catch (e) {
    console.error("Error parsing recurrence_days:", e);
  }

  return {
    id: apiTemplate.id,
    name: apiTemplate.name,
    description: apiTemplate.description || "",
    items,
    recurrence: apiTemplate.recurrence as any,
    recurrenceDays,
    executionTime: apiTemplate.execution_time || undefined,
    isActive: apiTemplate.is_active,
    defaultAssignedToId: apiTemplate.default_assigned_to_id || undefined,
  };
}

/**
 * Convertit une réponse API en ChecklistInstance frontend
 */
function mapChecklistInstanceFromAPI(apiInstance: ChecklistInstanceAPIResponse): ChecklistInstance {
  let completedItems: number[] = [];
  try {
    if (apiInstance.completed_items) {
      completedItems = typeof apiInstance.completed_items === "string" 
        ? JSON.parse(apiInstance.completed_items) 
        : apiInstance.completed_items;
    }
  } catch (e) {
    console.error("Error parsing completed_items:", e);
  }

  // Calculer totalItems depuis le template
  // On utilise completedItems.length comme approximation
  let totalItems = completedItems.length > 0 ? completedItems.length + 1 : 0;

  return {
    id: apiInstance.id,
    templateId: apiInstance.template_id,
    templateName: apiInstance.template_name || "",
    assignedToId: apiInstance.assigned_to_id || undefined,
    assignedToName: (apiInstance as any).assigned_to_name || undefined,
    completedItems,
    totalItems,
    status: apiInstance.status as "en_cours" | "termine",
    startedAt: apiInstance.started_at,
    completedAt: apiInstance.completed_at || undefined,
  };
}

/**
 * Récupère la liste des tâches
 */
export async function getTasks(
  token: string | null,
  options?: {
    status?: string;
    priority?: string;
    category?: string;
    assigned_to_id?: number;
    search?: string;
  }
): Promise<Task[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getTasks", options);
    return [];
  }

  // Construire les query params
  const params = new URLSearchParams();
  if (options?.status) params.append("status", options.status);
  if (options?.priority) params.append("priority", options.priority);
  if (options?.category) params.append("category", options.category);
  if (options?.assigned_to_id) params.append("assigned_to_id", options.assigned_to_id.toString());
  if (options?.search) params.append("search", options.search);

  const queryString = params.toString();
  const path = `/tasks${queryString ? `?${queryString}` : ""}`;
  
  const tasks = await apiGet<TaskAPIResponse[]>(path, token);
  return tasks.map(mapTaskFromAPI);
}

/**
 * Récupère une tâche spécifique
 */
export async function getTask(token: string | null, taskId: number): Promise<Task> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getTask", taskId);
    throw new Error("Tasks module is disabled in mock mode");
  }

  const task = await apiGet<TaskAPIResponse>(`/tasks/${taskId}`, token);
  return mapTaskFromAPI(task);
}

/**
 * Récupère les tâches du jour
 */
export async function getTodayTasks(token: string | null): Promise<Task[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getTodayTasks");
    return [];
  }

  const tasks = await apiGet<TaskAPIResponse[]>(`/tasks/today`, token);
  return tasks.map(mapTaskFromAPI);
}

/**
 * Récupère les tâches récemment créées
 */
export async function getRecentTasks(token: string | null, limit: number = 10): Promise<Task[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getRecentTasks");
    return [];
  }

  const tasks = await apiGet<TaskAPIResponse[]>(`/tasks/recent?limit=${limit}`, token);
  return tasks.map(mapTaskFromAPI);
}

/**
 * Récupère les tâches groupées par priorité
 */
export async function getPriorityTasks(token: string | null): Promise<Record<string, Task[]>> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getPriorityTasks");
    return { critical: [], high: [], normal: [] };  // MVP V1: 3 priorités uniquement
  }

  const response = await apiGet<Record<string, TaskAPIResponse[] | { critical_not_done?: number; late_count?: number; routines_not_done?: number }>>(`/tasks/priorities`, token);
  
  // Convertir chaque groupe de tâches (ignorer admin_alerts qui est un objet, pas un tableau)
  const result: Record<string, Task[]> = {
    critical: [],
    high: [],
    normal: [],
  };
  
  for (const [priority, tasks] of Object.entries(response)) {
    // Ignorer admin_alerts qui est un objet, pas un tableau de tâches
    if (priority === "admin_alerts") {
      continue;
    }
    // Vérifier que tasks est bien un tableau avant de mapper
    if (Array.isArray(tasks)) {
      // S'assurer que la priorité est une clé valide (critical, high, normal)
      if (priority === "critical" || priority === "high" || priority === "normal") {
        result[priority] = tasks.map(mapTaskFromAPI);
      }
    }
  }
  
  return result;
}

/**
 * Récupère les statistiques des tâches
 */
export async function getTaskStats(token: string | null): Promise<TaskStats> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getTaskStats");
    return {
      total: 0,
      completed: 0,
      late: 0,
    };
  }

  return await apiGet<TaskStats>(`/tasks/stats`, token);
}

/**
 * Récupère la liste des employés
 */
export async function getEmployees(token: string | null): Promise<Employee[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getEmployees");
    return [];
  }

  const employees = await apiGet<EmployeeAPIResponse[]>(`/tasks/employees`, token);
  return employees.map(mapEmployeeFromAPI);
}

/**
 * Crée une nouvelle tâche
 */
export async function createTask(
  token: string | null,
  taskData: {
    title: string;
    description?: string;
    category?: string;
    type?: string;
    priority?: string;
    assigned_to_id?: number;
    client_id?: number;
    project_id?: number;
    conversation_id?: number;
    due_date?: string;
    due_time?: string;
    recurrence?: string;
    recurrence_days?: number[];
    is_mandatory?: boolean;
  }
): Promise<Task> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] createTask", taskData);
    throw new Error("Tasks module is disabled in mock mode");
  }

  const task = await apiPost<TaskAPIResponse>(`/tasks`, taskData, token);
  return mapTaskFromAPI(task);
}

/**
 * Met à jour une tâche
 */
export async function updateTask(
  token: string | null,
  taskId: number,
  taskData: {
    title?: string;
    description?: string;
    category?: string;
    type?: string;
    priority?: string;
    status?: string;
    assigned_to_id?: number;
    client_id?: number;
    project_id?: number;
    conversation_id?: number;
    due_date?: string;
    due_time?: string;
    recurrence?: string;
    is_mandatory?: boolean;
  }
): Promise<Task> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] updateTask", taskId, taskData);
    throw new Error("Tasks module is disabled in mock mode");
  }

  const task = await apiPatch<TaskAPIResponse>(`/tasks/${taskId}`, taskData, token);
  return mapTaskFromAPI(task);
}

/**
 * Marque une tâche comme terminée
 */
export async function completeTask(token: string | null, taskId: number): Promise<Task> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] completeTask", taskId);
    throw new Error("Tasks module is disabled in mock mode");
  }

  const task = await apiPatch<TaskAPIResponse>(`/tasks/${taskId}/complete`, {}, token);
  return mapTaskFromAPI(task);
}

/**
 * Supprime une tâche
 */
export async function deleteTask(token: string | null, taskId: number): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] deleteTask", taskId);
    return;
  }

  await apiDelete(`/tasks/${taskId}`, token);
}

/**
 * Supprime toutes les occurrences d'une tâche récurrente
 */
export async function deleteAllTaskOccurrences(
  token: string | null,
  taskId: number
): Promise<{ deleted_count: number; message: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] deleteAllTaskOccurrences", taskId);
    return { deleted_count: 0, message: "Mock mode" };
  }

  try {
    const response = await apiDelete<{ deleted_count: number; message: string }>(
      `/tasks/${taskId}/all-occurrences`,
      token
    );
    return response;
  } catch (error: any) {
    console.error("Erreur lors de la suppression de toutes les occurrences:", error);
    throw new Error(
      error.message || "Erreur lors de la suppression de toutes les occurrences"
    );
  }
}

/**
 * Récupère la liste des templates de checklist
 */
export async function getChecklistTemplates(token: string | null): Promise<ChecklistTemplate[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getChecklistTemplates");
    return [];
  }

  try {
    const response = await apiGet<ChecklistTemplateAPIResponse[]>(
      `/checklists/templates`,
      token
    );

    return response.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description || "",
      items: template.items,
      recurrence: template.recurrence as "daily" | "weekly" | "monthly" | undefined,
      recurrenceDays: template.recurrence_days || undefined,
      executionTime: template.execution_time || undefined,
      isActive: template.is_active,
      defaultAssignedToId: template.default_assigned_to_id || undefined,
    }));
  } catch (error: any) {
    console.error("Erreur lors de la récupération des templates:", error);
    throw new Error(
      error.message || "Erreur lors de la récupération des templates de checklist"
    );
  }
}

/**
 * Crée un template de checklist
 */
export async function createChecklistTemplate(
  token: string | null,
  templateData: {
    name: string;
    description: string;
    items: string[];
    recurrence?: string;
    recurrenceDays?: number[];
    executionTime?: string;
    isActive?: boolean;
    defaultAssignedToId?: number;
  }
): Promise<ChecklistTemplate> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] createChecklistTemplate", templateData);
    throw new Error("Tasks module is disabled in mock mode");
  }

  try {
    const response = await apiPost<ChecklistTemplateAPIResponse>(
      `/checklists/templates`,
      {
        name: templateData.name,
        description: templateData.description,
        items: templateData.items,
        recurrence: templateData.recurrence || "none",
        recurrence_days: templateData.recurrenceDays,
        is_active: templateData.isActive !== undefined ? templateData.isActive : true,
        default_assigned_to_id: templateData.defaultAssignedToId,
      },
      token
    );

    return {
      id: response.id,
      name: response.name,
      description: response.description || "",
      items: response.items,
      recurrence: response.recurrence as "daily" | "weekly" | "monthly" | undefined,
      recurrenceDays: response.recurrence_days || undefined,
      isActive: response.is_active,
      defaultAssignedToId: response.default_assigned_to_id || undefined,
    };
  } catch (error: any) {
    console.error("Erreur lors de la création du template:", error);
    throw new Error(
      error.message || "Erreur lors de la création du template de checklist"
    );
  }
}

/**
 * Met à jour un template de checklist
 */
export async function updateChecklistTemplate(
  token: string | null,
  templateId: number,
  templateData: {
    name?: string;
    description?: string;
    items?: string[];
    recurrence?: string;
    recurrenceDays?: number[];
    executionTime?: string;
    isActive?: boolean;
    defaultAssignedToId?: number;
  }
): Promise<ChecklistTemplate> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] updateChecklistTemplate", templateId, templateData);
    throw new Error("Tasks module is disabled in mock mode");
  }

  try {
    const response = await apiPatch<ChecklistTemplateAPIResponse>(
      `/checklists/templates/${templateId}`,
      {
        name: templateData.name,
        description: templateData.description,
        items: templateData.items,
        recurrence: templateData.recurrence,
        recurrence_days: templateData.recurrenceDays,
        is_active: templateData.isActive,
        default_assigned_to_id: templateData.defaultAssignedToId,
      },
      token
    );

    return {
      id: response.id,
      name: response.name,
      description: response.description || "",
      items: response.items,
      recurrence: response.recurrence as "daily" | "weekly" | "monthly" | undefined,
      recurrenceDays: response.recurrence_days || undefined,
      isActive: response.is_active,
      defaultAssignedToId: response.default_assigned_to_id || undefined,
    };
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour du template:", error);
    throw new Error(
      error.message || "Erreur lors de la mise à jour du template de checklist"
    );
  }
}

/**
 * Exécute un template de checklist (génère les tâches)
 */
export async function executeChecklistTemplate(
  token: string | null,
  templateId: number,
  assignedToId?: number
): Promise<ChecklistInstance> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] executeChecklistTemplate", templateId);
    throw new Error("Tasks module is disabled in mock mode");
  }

  try {
    const response = await apiPost<ChecklistInstanceAPIResponse>(
      `/checklists/templates/${templateId}/execute`,
      assignedToId ? { assigned_to_id: assignedToId } : {},
      token
    );

    return {
      id: response.id,
      templateId: response.template_id,
      templateName: response.template_name,
      assignedToId: response.assigned_to_id || undefined,
      assignedToName: response.assigned_to_name || undefined,
      completedItems: response.completed_items,
      totalItems: response.total_items,
      status: response.status as "en_cours" | "termine",
      startedAt: response.started_at,
      completedAt: response.completed_at || undefined,
    };
  } catch (error: any) {
    console.error("Erreur lors de l'exécution du template:", error);
    throw new Error(
      error.message || "Erreur lors de l'exécution du template de checklist"
    );
  }
}

/**
 * Supprime un template de checklist
 */
export async function deleteChecklistTemplate(
  token: string | null,
  templateId: number
): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] deleteChecklistTemplate", templateId);
    throw new Error("Tasks module is disabled in mock mode");
  }

  try {
    await apiDelete(`/checklists/templates/${templateId}`, token);
  } catch (error: any) {
    console.error("Erreur lors de la suppression du template:", error);
    throw new Error(
      error.message || "Erreur lors de la suppression du template de checklist"
    );
  }
}

/**
 * Récupère la liste des checklists actives
 */
export async function getChecklists(token: string | null, status?: string): Promise<ChecklistInstance[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getChecklists", status);
    return [];
  }

  try {
    const params = status ? `?status=${status}` : "";
    const response = await apiGet<ChecklistInstanceAPIResponse[]>(
      `/checklists/instances${params}`,
      token
    );

    return response.map((instance) => ({
      id: instance.id,
      templateId: instance.template_id,
      templateName: instance.template_name,
      assignedToId: instance.assigned_to_id || undefined,
      assignedToName: instance.assigned_to_name || undefined,
      completedItems: instance.completed_items,
      totalItems: instance.total_items,
      status: instance.status as "en_cours" | "termine",
      startedAt: instance.started_at,
      completedAt: instance.completed_at || undefined,
    }));
  } catch (error: any) {
    console.error("Erreur lors de la récupération des checklists:", error);
    throw new Error(
      error.message || "Erreur lors de la récupération des checklists"
    );
  }
}
