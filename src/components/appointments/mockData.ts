import { Appointment, AppointmentType, AppointmentSettings } from "./types";

// Mock employés (réutilisé depuis inbox)
export const mockEmployees = [
  { id: 1, name: "Jean Dupont" },
  { id: 2, name: "Marie Martin" },
  { id: 3, name: "Sophie Durand" },
];

// Mock types de RDV
export const mockAppointmentTypes: AppointmentType[] = [
  {
    id: 1,
    name: "Coupe + brushing",
    description: "Coupe de cheveux avec brushing",
    durationMinutes: 45,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 10,
    employeesAllowedIds: [1, 2],
    isActive: true,
  },
  {
    id: 2,
    name: "Coupe simple",
    description: "Coupe de cheveux uniquement",
    durationMinutes: 30,
    bufferBeforeMinutes: 5,
    bufferAfterMinutes: 5,
    employeesAllowedIds: [1, 2, 3],
    isActive: true,
  },
  {
    id: 3,
    name: "Coloration",
    description: "Coloration complète",
    durationMinutes: 120,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 15,
    employeesAllowedIds: [2],
    isActive: true,
  },
  {
    id: 4,
    name: "RDV administratif",
    description: "Rendez-vous pour questions administratives",
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    employeesAllowedIds: [1],
    isActive: false,
  },
];

// Mock rendez-vous
export const mockAppointments: Appointment[] = [
  {
    id: 1,
    clientId: 1,
    clientName: "Boulangerie Soleil",
    clientConversationId: 1,
    typeId: 1,
    typeName: "Coupe + brushing",
    employeeId: 1,
    employeeName: "Jean Dupont",
    startDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Dans 2h
    endDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    status: "scheduled",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notesInternal: "Client régulier, préfère le matin",
  },
  {
    id: 2,
    clientId: 2,
    clientName: "Mme Dupont",
    clientConversationId: 2,
    typeId: 2,
    typeName: "Coupe simple",
    employeeId: 2,
    employeeName: "Marie Martin",
    startDateTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // Dans 5h
    endDateTime: new Date(Date.now() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    status: "confirmed",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    clientId: 3,
    clientName: "M. Martin",
    clientConversationId: 3,
    typeId: 3,
    typeName: "Coloration",
    employeeId: 2,
    employeeName: "Marie Martin",
    startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Demain
    endDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 120 * 60 * 1000).toISOString(),
    status: "scheduled",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    clientId: 1,
    clientName: "Boulangerie Soleil",
    clientConversationId: 1,
    typeId: 1,
    typeName: "Coupe + brushing",
    employeeId: 1,
    employeeName: "Jean Dupont",
    startDateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Il y a 2 jours
    endDateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    status: "completed",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    clientId: 4,
    clientName: "Nouveau Client",
    typeId: 2,
    typeName: "Coupe simple",
    employeeId: 3,
    employeeName: "Sophie Durand",
    startDateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Hier
    endDateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    status: "no_show",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock settings par défaut
export const mockAppointmentSettings: AppointmentSettings = {
  autoReminderEnabled: true,
  autoReminderOffsetHours: 4,
  includeRescheduleLinkInReminder: true,
  autoNoShowMessageEnabled: true,
  rescheduleBaseUrl: "https://lokario.fr/r/{slugEntreprise}",
};

