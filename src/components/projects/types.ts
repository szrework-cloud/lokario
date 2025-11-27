export interface Project {
  id: number;
  name: string;
  client: string;
  status: "Nouveau" | "En attente" | "En cours" | "Terminé";
  startDate: string;
  endDate?: string;
  tasks?: Task[];
  notes?: string;
  timeline?: TimelineEvent[];
  history?: ProjectHistoryEvent[];
  previousStatus?: "Nouveau" | "En attente" | "En cours" | "Terminé"; // Pour tracker les changements de statut
}

export interface Task {
  id: number;
  title: string;
  completed: boolean;
}

export interface TimelineEvent {
  title: string;
  date: string;
  description?: string;
}

export interface ProjectHistoryEvent {
  id: number;
  timestamp: string;
  action: string;
  description?: string;
  user: string;
}

