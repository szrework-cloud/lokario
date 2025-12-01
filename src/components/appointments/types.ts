export type AppointmentStatus =
  | "scheduled" // programmé
  | "confirmed" // optionnel
  | "completed" // terminé
  | "cancelled" // annulé
  | "no_show" // client non venu
  | "reschedule_requested"; // demande de reprogrammation

export interface AppointmentType {
  id: number;
  name: string; // "Coupe + brushing", "RDV administratif", etc.
  description?: string;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  employeesAllowedIds?: number[]; // optionnel
  isActive: boolean;
}

export interface Appointment {
  id: number;
  clientId: number;
  clientName: string;
  clientConversationId?: number; // id de conversation Inbox pour générer les messages
  typeId: number;
  typeName: string;
  employeeId?: number;
  employeeName?: string;
  startDateTime: string; // ISO
  endDateTime: string; // ISO
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  notesInternal?: string;
}

export interface AppointmentSettings {
  autoReminderEnabled: boolean; // Activer le rappel 4h avant
  autoReminderOffsetHours: number; // ex : 4
  includeRescheduleLinkInReminder: boolean;
  autoNoShowMessageEnabled: boolean; // Message auto après no_show
  rescheduleBaseUrl?: string; // ex: "https://mon-saas.com/r/{slugEntreprise}"
}
