import { Appointment, AppointmentSettings } from "./types";

// Map pour tracker les rappels déjà envoyés (mock, à remplacer par backend)
const sentReminders = new Map<number, boolean>();
const sentNoShowMessages = new Map<number, boolean>();

export function shouldTriggerReminder(
  appointment: Appointment,
  settings: AppointmentSettings,
  now: Date
): boolean {
  // Vérifier si les rappels automatiques sont activés
  if (!settings.autoReminderEnabled) {
    return false;
  }

  // Vérifier le statut
  if (appointment.status !== "scheduled" && appointment.status !== "confirmed") {
    return false;
  }

  // Vérifier si on a déjà envoyé un rappel
  if (sentReminders.get(appointment.id)) {
    return false;
  }

  // Calculer le temps jusqu'au RDV
  const appointmentDate = new Date(appointment.startDateTime);
  const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Vérifier si on est dans la fenêtre de rappel (ex: 4h avant)
  const reminderWindowStart = settings.autoReminderOffsetHours;
  const reminderWindowEnd = settings.autoReminderOffsetHours + 1; // Fenêtre de 1h

  return (
    hoursUntilAppointment >= reminderWindowStart &&
    hoursUntilAppointment <= reminderWindowEnd &&
    hoursUntilAppointment > 0 // Pas encore passé
  );
}

export function buildReminderMessage(
  appointment: Appointment,
  settings: AppointmentSettings
): string {
  const appointmentDate = new Date(appointment.startDateTime);
  const timeStr = appointmentDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = appointmentDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  let message = `Bonjour ${appointment.clientName}, petit rappel pour votre rendez-vous "${appointment.typeName}" ${dateStr} à ${timeStr}.`;

  if (appointment.employeeName) {
    message += ` Votre rendez-vous est prévu avec ${appointment.employeeName}.`;
  }

  if (settings.includeRescheduleLinkInReminder && settings.rescheduleBaseUrl) {
    const rescheduleUrl = settings.rescheduleBaseUrl.replace(
      "{slugEntreprise}",
      "mon-entreprise"
    ) + `?appointmentId=${appointment.id}`;
    message += `\n\nSi ce créneau ne vous convient plus, vous pouvez le reprogrammer ici : ${rescheduleUrl}`;
  }

  return message;
}

export function buildNoShowMessage(
  appointment: Appointment,
  settings: AppointmentSettings
): string {
  if (!settings.autoNoShowMessageEnabled) {
    return "";
  }

  const appointmentDate = new Date(appointment.startDateTime);
  const timeStr = appointmentDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = appointmentDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let message = `Bonjour ${appointment.clientName}, nous avons constaté que vous n'avez pas pu venir à votre rendez-vous "${appointment.typeName}" le ${dateStr} à ${timeStr}.`;

  if (settings.rescheduleBaseUrl) {
    const rescheduleUrl = settings.rescheduleBaseUrl.replace(
      "{slugEntreprise}",
      "mon-entreprise"
    ) + `?appointmentId=${appointment.id}`;
    message += `\n\nSi vous souhaitez le reprogrammer, vous pouvez le faire ici : ${rescheduleUrl}`;
  }

  return message;
}

export function markReminderSent(appointmentId: number): void {
  sentReminders.set(appointmentId, true);
}

export function markNoShowMessageSent(appointmentId: number): void {
  sentNoShowMessages.set(appointmentId, true);
}

export function shouldSendNoShowMessage(
  appointment: Appointment,
  settings: AppointmentSettings
): boolean {
  if (!settings.autoNoShowMessageEnabled) {
    return false;
  }

  if (appointment.status !== "no_show") {
    return false;
  }

  // Vérifier si on a déjà envoyé un message
  if (sentNoShowMessages.get(appointment.id)) {
    return false;
  }

  return true;
}

// TODO: Une fois l'API Inbox prête, appeler ici une fonction createInboxMessage({
//   conversationId: appointment.clientConversationId,
//   body: reminderMessage,
//   metadata: { source: "appointment_reminder", appointmentId: appointment.id }
// })

