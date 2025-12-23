import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

export interface Client {
  id: number;
  name: string;
  type: "Client" | "Fournisseur";
  sector?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  siret?: string;
  tags?: ("VIP" | "régulier" | "nouveau")[];
  lastContact?: string;
  tasksCount?: number;
  remindersCount?: number;
  invoicesCount?: number;
  totalInvoiced?: number;
  totalPaid?: number;
  openProjects?: number;
}

export interface ClientCreate {
  name: string;
  type?: "Client" | "Fournisseur";
  sector?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  siret?: string;
  notes?: string;
  tags?: string[];
}

export interface ClientUpdate {
  name?: string;
  type?: "Client" | "Fournisseur";
  sector?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  siret?: string;
  notes?: string;
  tags?: string[];
}

// Backend API response type
interface ClientAPIResponse {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  sector?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  siret?: string | null;
  notes?: string | null;
  type?: string | null;
  tags?: string[] | null;
  company_id: number;
  created_at: string;
  updated_at: string;
}

/**
 * Convertit une réponse API en Client frontend
 */
function mapClientFromAPI(apiClient: ClientAPIResponse): Client {
  return {
    id: apiClient.id,
    name: apiClient.name,
    type: (apiClient.type as "Client" | "Fournisseur") || "Client",
    sector: apiClient.sector || undefined,
    contactEmail: apiClient.email || undefined,
    contactPhone: apiClient.phone || undefined,
    address: apiClient.address || undefined,
    city: apiClient.city || undefined,
    postalCode: apiClient.postal_code || undefined,
    country: apiClient.country || undefined,
    siret: apiClient.siret || undefined,
    tags: (apiClient.tags as ("VIP" | "régulier" | "nouveau")[]) || undefined,
    // Les stats seront calculées plus tard via d'autres endpoints
    tasksCount: 0,
    remindersCount: 0,
    invoicesCount: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    openProjects: 0,
  };
}

/**
 * Récupère la liste des clients de l'entreprise
 */
export async function getClients(
  token: string | null,
  search?: string
): Promise<Client[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    // Mode mock : retourner des données mockées
    logger.log("[MOCK] getClients", search);
    return [
      {
        id: 1,
        name: "Boulangerie Soleil",
        type: "Client",
        sector: "Commerce",
        contactEmail: "contact@boulangerie-soleil.fr",
        contactPhone: "01 23 45 67 89",
        tags: ["VIP", "régulier"],
        lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        tasksCount: 2,
        remindersCount: 1,
        invoicesCount: 5,
        totalInvoiced: 12500,
        totalPaid: 10000,
        openProjects: 1,
      },
      {
        id: 2,
        name: "Fournisseur Boissons SA",
        type: "Fournisseur",
        sector: "Distribution",
        contactEmail: "commercial@boissons-sa.fr",
        contactPhone: "01 98 76 54 32",
        tags: ["régulier"],
        lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        tasksCount: 0,
        remindersCount: 0,
        invoicesCount: 3,
        totalInvoiced: 8500,
        totalPaid: 8500,
      },
    ];
  }

  // Mode avec backend
  const searchParam = search ? `?search=${encodeURIComponent(search)}` : "";
  const clients = await apiGet<ClientAPIResponse[]>(`/clients${searchParam}`, token);
  return clients.map(mapClientFromAPI);
}

/**
 * Récupère un client par son ID
 */
export async function getClient(
  clientId: number,
  token: string | null
): Promise<Client> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getClient", clientId);
    return {
      id: clientId,
      name: "Boulangerie Soleil",
      type: "Client",
      sector: "Commerce",
      contactEmail: "contact@boulangerie-soleil.fr",
      contactPhone: "01 23 45 67 89",
      address: "123 Rue de la Boulangerie, 75001 Paris",
      tags: ["VIP", "régulier"],
      lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      tasksCount: 2,
      remindersCount: 1,
      invoicesCount: 5,
      totalInvoiced: 12500,
      totalPaid: 10000,
      openProjects: 1,
    };
  }

  const client = await apiGet<ClientAPIResponse>(`/clients/${clientId}`, token);
  return mapClientFromAPI(client);
}

/**
 * Crée un nouveau client
 */
export async function createClient(
  clientData: ClientCreate,
  token: string | null
): Promise<Client> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] createClient", clientData);
    return {
      id: Date.now(),
      name: clientData.name,
      type: clientData.type || "Client",
      sector: clientData.sector,
      contactEmail: clientData.email,
      contactPhone: clientData.phone,
      address: clientData.address,
      tags: clientData.tags as ("VIP" | "régulier" | "nouveau")[] | undefined,
    };
  }

  const payload = {
    name: clientData.name,
    type: clientData.type || "Client",
    sector: clientData.sector,
    email: clientData.email,
    phone: clientData.phone,
    address: clientData.address,
    notes: clientData.notes,
    tags: (clientData.tags as ("VIP" | "régulier" | "nouveau")[]) || [],
  };

  const client = await apiPost<ClientAPIResponse>("/clients", payload, token);
  return mapClientFromAPI(client);
}

/**
 * Met à jour un client
 */
export async function updateClient(
  clientId: number,
  clientData: ClientUpdate,
  token: string | null
): Promise<Client> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] updateClient", clientId, clientData);
    return {
      id: clientId,
      name: clientData.name || "Client mis à jour",
      type: clientData.type || "Client",
      sector: clientData.sector,
      contactEmail: clientData.email,
      contactPhone: clientData.phone,
      address: clientData.address,
      tags: clientData.tags as ("VIP" | "régulier" | "nouveau")[] | undefined,
    };
  }

  const payload: any = {};
  if (clientData.name !== undefined) payload.name = clientData.name;
  if (clientData.type !== undefined) payload.type = clientData.type;
  if (clientData.sector !== undefined) payload.sector = clientData.sector;
  if (clientData.email !== undefined) payload.email = clientData.email;
  if (clientData.phone !== undefined) payload.phone = clientData.phone;
  if (clientData.address !== undefined) payload.address = clientData.address;
  if (clientData.city !== undefined) payload.city = clientData.city;
  if (clientData.postal_code !== undefined) payload.postal_code = clientData.postal_code;
  if (clientData.country !== undefined) payload.country = clientData.country;
  if (clientData.siret !== undefined) payload.siret = clientData.siret;
  if (clientData.notes !== undefined) payload.notes = clientData.notes;
  if (clientData.tags !== undefined) payload.tags = clientData.tags;

  const client = await apiPatch<ClientAPIResponse>(`/clients/${clientId}`, payload, token);
  return mapClientFromAPI(client);
}

/**
 * Supprime un client
 */
export async function deleteClient(
  clientId: number,
  token: string | null
): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] deleteClient", clientId);
    return;
  }

  await apiDelete(`/clients/${clientId}`, token);
}

