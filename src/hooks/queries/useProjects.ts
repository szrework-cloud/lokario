import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getProjects, Project, getProject } from "@/services/projectsService";

interface UseProjectsParams {
  status?: string;
  clientId?: number;
}

/**
 * Hook pour récupérer la liste des projets avec cache automatique
 */
export function useProjects(params: UseProjectsParams = {}) {
  const { token } = useAuth();

  return useQuery<Project[]>({
    queryKey: ["projects", params],
    queryFn: () => getProjects(token, params),
    enabled: !!token,
    staleTime: 1000 * 60 * 2, // 2 minutes - les projets changent peu fréquemment
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook pour récupérer un projet spécifique par ID avec cache automatique
 */
export function useProject(projectId: number | undefined) {
  const { token } = useAuth();

  return useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => getProject(token, projectId!),
    enabled: !!token && !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

