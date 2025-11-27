export type FollowUpType = "Devis non répondu" | "Facture impayée" | "Info manquante" | "Rappel RDV" | "Client inactif" | "Projet en attente";

export type FollowUpStatus = "À faire" | "Fait" | "En attente";

export interface FollowUpItem {
  id: number;
  type: FollowUpType;
  client: string;
  clientId?: number; // Pour lier à Inbox
  source: string;
  dueDate: string; // Format: "YYYY-MM-DD" ou "Aujourd'hui", "Demain", etc.
  status: FollowUpStatus;
  amount?: number;
  // Pour calculer les badges
  actualDate?: string; // Date réelle en format ISO pour les calculs
}

