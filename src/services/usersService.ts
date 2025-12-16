import { apiGet, apiPatch } from "@/lib/api";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: "super_admin" | "owner" | "user";
  company_id: number | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  can_edit_tasks?: boolean;
  can_delete_tasks?: boolean;
  can_create_tasks?: boolean;
}

export interface UserPermissions {
  can_edit_tasks?: boolean;
  can_delete_tasks?: boolean;
  can_create_tasks?: boolean;
}

/**
 * Récupère tous les utilisateurs de l'entreprise de l'utilisateur connecté
 */
export async function getCompanyUsers(token: string | null): Promise<User[]> {
  if (!token) {
    throw new Error("Token is required");
  }
  
  const users = await apiGet<User[]>(`/users/company`, token);
  return users;
}

/**
 * Met à jour les permissions d'un utilisateur
 */
export async function updateUserPermissions(
  token: string | null,
  userId: number,
  permissions: UserPermissions
): Promise<User> {
  if (!token) {
    throw new Error("Token is required");
  }
  
  const updatedUser = await apiPatch<User>(`/users/${userId}/permissions`, permissions, token);
  return updatedUser;
}
