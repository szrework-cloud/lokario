import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

// Types frontend
export interface ProjectDocument {
  id: number;
  name: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  uploadedByName?: string;
  createdAt: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  clientId: number;
  clientName?: string;
  status: "Nouveau" | "En cours" | "Terminé";
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  history?: ProjectHistoryEvent[];
  documents?: ProjectDocument[];
}

export interface ProjectHistoryEvent {
  id: number;
  projectId: number;
  userId?: number;
  action: string;
  description?: string;
  createdAt: string;
  userName?: string;
}

// Types API
interface ProjectDocumentAPIResponse {
  id: number;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  document_type: string;
  uploaded_by_name?: string | null;
  created_at: string;
}

interface ProjectAPIResponse {
  id: number;
  name: string;
  description?: string | null;
  client_id: number;
  client_name?: string | null;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  history?: ProjectHistoryEventAPIResponse[];
  documents?: ProjectDocumentAPIResponse[];
}

interface ProjectHistoryEventAPIResponse {
  id: number;
  project_id: number;
  user_id?: number | null;
  action: string;
  description?: string | null;
  created_at: string;
  user_name?: string | null;
}

// Mapper les données de l'API vers le format frontend
function mapDocumentFromAPI(apiDoc: ProjectDocumentAPIResponse): ProjectDocument {
  return {
    id: apiDoc.id,
    name: apiDoc.name,
    filePath: apiDoc.file_path,
    fileType: apiDoc.file_type,
    fileSize: apiDoc.file_size,
    documentType: apiDoc.document_type,
    uploadedByName: apiDoc.uploaded_by_name || undefined,
    createdAt: apiDoc.created_at,
  };
}

function mapProjectFromAPI(apiProject: ProjectAPIResponse): Project {
  return {
    id: apiProject.id,
    name: apiProject.name,
    description: apiProject.description || undefined,
    clientId: apiProject.client_id,
    clientName: apiProject.client_name || undefined,
    status: apiProject.status as "Nouveau" | "En cours" | "Terminé",
    startDate: apiProject.start_date || undefined,
    endDate: apiProject.end_date || undefined,
    notes: apiProject.notes || undefined,
    createdAt: apiProject.created_at,
    updatedAt: apiProject.updated_at,
    history: apiProject.history
      ? apiProject.history.map(mapHistoryEventFromAPI)
      : undefined,
    documents: apiProject.documents
      ? apiProject.documents.map(mapDocumentFromAPI)
      : undefined,
  };
}

function mapHistoryEventFromAPI(
  apiEvent: ProjectHistoryEventAPIResponse
): ProjectHistoryEvent {
  return {
    id: apiEvent.id,
    projectId: apiEvent.project_id,
    userId: apiEvent.user_id || undefined,
    action: apiEvent.action,
    description: apiEvent.description || undefined,
    createdAt: apiEvent.created_at,
    userName: apiEvent.user_name || undefined,
  };
}

/**
 * Récupère tous les projets de l'entreprise
 */
export async function getProjects(
  token: string | null,
  filters?: {
    status?: string;
    clientId?: number;
  }
): Promise<Project[]> {
  if (!token) {
    throw new Error("Token is required");
  }

  const params = new URLSearchParams();
  if (filters?.status) {
    params.append("status", filters.status);
  }
  if (filters?.clientId) {
    params.append("client_id", filters.clientId.toString());
  }

  const queryString = params.toString();
  const url = `/projects${queryString ? `?${queryString}` : ""}`;

  const projects = await apiGet<ProjectAPIResponse[]>(url, token);
  return projects.map(mapProjectFromAPI);
}

/**
 * Récupère un projet par son ID
 */
export async function getProject(
  token: string | null,
  projectId: number
): Promise<Project> {
  if (!token) {
    throw new Error("Token is required");
  }

  const project = await apiGet<ProjectAPIResponse>(`/projects/${projectId}`, token);
  return mapProjectFromAPI(project);
}

/**
 * Crée un nouveau projet
 */
export async function createProject(
  token: string | null,
  projectData: {
    name: string;
    description?: string;
    clientId: number;
    status?: "Nouveau" | "En cours" | "Terminé";
    startDate?: string;
    endDate?: string;
    notes?: string;
  }
): Promise<Project> {
  if (!token) {
    throw new Error("Token is required");
  }

  const project = await apiPost<ProjectAPIResponse>(
    "/projects",
    {
      name: projectData.name,
      description: projectData.description,
      client_id: projectData.clientId,
      status: projectData.status || "Nouveau",
      start_date: projectData.startDate,
      end_date: projectData.endDate,
      notes: projectData.notes,
    },
    token
  );

  return mapProjectFromAPI(project);
}

/**
 * Met à jour un projet
 */
export async function updateProject(
  token: string | null,
  projectId: number,
  updates: {
    name?: string;
    description?: string;
    clientId?: number;
    status?: "Nouveau" | "En cours" | "Terminé";
    startDate?: string;
    endDate?: string;
    notes?: string;
  }
): Promise<Project> {
  if (!token) {
    throw new Error("Token is required");
  }

  const project = await apiPatch<ProjectAPIResponse>(
    `/projects/${projectId}`,
    {
      name: updates.name,
      description: updates.description,
      client_id: updates.clientId,
      status: updates.status,
      start_date: updates.startDate,
      end_date: updates.endDate,
      notes: updates.notes,
    },
    token
  );

  return mapProjectFromAPI(project);
}

/**
 * Supprime un projet
 */
export async function deleteProject(
  token: string | null,
  projectId: number
): Promise<void> {
  if (!token) {
    throw new Error("Token is required");
  }

  await apiDelete(`/projects/${projectId}`, token);
}

/**
 * Ajoute un événement à l'historique d'un projet
 */
export async function addProjectHistory(
  token: string | null,
  projectId: number,
  action: string,
  description?: string
): Promise<ProjectHistoryEvent> {
  if (!token) {
    throw new Error("Token is required");
  }

  const event = await apiPost<ProjectHistoryEventAPIResponse>(
    `/projects/${projectId}/history`,
    {
      action,
      description: description || null,
    },
    token
  );

  return mapHistoryEventFromAPI(event);
}

/**
 * Supprime un événement de l'historique d'un projet
 */
export async function deleteProjectHistory(
  token: string | null,
  historyId: number
): Promise<void> {
  if (!token) {
    throw new Error("Token is required");
  }

  await apiDelete(`/projects/history/${historyId}`, token);
}

/**
 * Récupère tous les documents d'un projet
 */
export async function getProjectDocuments(
  token: string | null,
  projectId: number
): Promise<ProjectDocument[]> {
  if (!token) {
    throw new Error("Token is required");
  }

  const documents = await apiGet<ProjectDocumentAPIResponse[]>(
    `/projects/${projectId}/documents`,
    token
  );
  return documents.map(mapDocumentFromAPI);
}

/**
 * Upload un document pour un projet
 */
export async function uploadProjectDocument(
  token: string | null,
  projectId: number,
  file: File,
  documentType: string = "autre"
): Promise<ProjectDocument> {
  if (!token) {
    throw new Error("Token is required");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("document_type", documentType);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  const response = await fetch(`${API_URL}/projects/${projectId}/documents/upload`, {
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

  const document = await response.json();
  return mapDocumentFromAPI(document);
}

/**
 * Télécharge un document d'un projet
 */
export async function downloadProjectDocument(
  token: string | null,
  documentId: number
): Promise<Blob> {
  if (!token) {
    throw new Error("Token is required");
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  const response = await fetch(`${API_URL}/projects/documents/${documentId}/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
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

  return await response.blob();
}

/**
 * Récupère l'URL de prévisualisation d'un document (pour affichage inline)
 */
export async function previewProjectDocument(
  token: string | null,
  documentId: number
): Promise<string> {
  if (!token) {
    throw new Error("Token is required");
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  // Retourner l'URL directe vers l'endpoint de prévisualisation
  // Le navigateur gérera automatiquement l'authentification via les headers
  return `${API_URL}/projects/documents/${documentId}/preview?token=${encodeURIComponent(token)}`;
}

/**
 * Récupère un blob pour la prévisualisation (pour les images notamment)
 */
export async function previewProjectDocumentAsBlob(
  token: string | null,
  documentId: number
): Promise<Blob> {
  if (!token) {
    throw new Error("Token is required");
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  const response = await fetch(`${API_URL}/projects/documents/${documentId}/preview`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
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

  return await response.blob();
}

/**
 * Supprime un document d'un projet
 */
export async function deleteProjectDocument(
  token: string | null,
  documentId: number
): Promise<void> {
  if (!token) {
    throw new Error("Token is required");
  }

  await apiDelete(`/projects/documents/${documentId}`, token);
}
