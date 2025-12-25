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

export interface AppointmentReminderTemplate {
  id: number;
  relance_number: number; // 1, 2, ou 3
  hours_before: number; // Nombre d'heures avant le rendez-vous
  content: string; // Template du message
}

export interface WorkBreak {
  startTime: string; // Heure de début de la pause (format HH:MM, ex: "12:00")
  endTime: string; // Heure de fin de la pause (format HH:MM, ex: "13:00")
}

export interface AppointmentSettings {
  autoReminderEnabled: boolean; // Activer le rappel 4h avant
  autoReminderOffsetHours: number; // ex : 4 (pour compatibilité, sera remplacé par reminderRelances)
  includeRescheduleLinkInReminder: boolean;
  autoNoShowMessageEnabled: boolean; // Message auto après no_show
  rescheduleBaseUrl?: string; // ex: "https://mon-saas.com/r/{slugEntreprise}"
  maxReminderRelances?: number; // Nombre max de relances (1 à 3)
  reminderRelances?: AppointmentReminderTemplate[]; // Templates pour chaque relance
  // Horaires de travail
  workStartTime?: string; // Heure de début (format HH:MM, ex: "09:00")
  workEndTime?: string; // Heure de fin (format HH:MM, ex: "18:00")
  breaksEnabled?: boolean; // Activer les pauses entre les rendez-vous
  breaks?: WorkBreak[]; // Liste des pauses avec heure de début et de fin
}
