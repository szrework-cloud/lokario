import { Appointment, AppointmentSettings } from "./types";

// Map pour tracker les rappels déjà envoyés (en mémoire, à remplacer par backend si nécessaire)
// Structure: Map<appointmentId, Set<relanceNumber>>
const sentReminders = new Map<number, Set<number>>();
const sentNoShowMessages = new Map<number, boolean>();

export function shouldTriggerReminder(
  appointment: Appointment,
  settings: AppointmentSettings,
  now: Date
): { shouldTrigger: boolean; relanceNumber?: number; template?: { hours_before: number; content: string } } {
  // Vérifier si les rappels automatiques sont activés
  if (!settings.autoReminderEnabled) {
    return { shouldTrigger: false };
  }

  // Vérifier le statut
  if (appointment.status !== "scheduled" && appointment.status !== "confirmed") {
    return { shouldTrigger: false };
  }

  // Calculer le temps jusqu'au RDV
  const appointmentDate = new Date(appointment.startDateTime);
  const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilAppointment <= 0) {
    return { shouldTrigger: false }; // RDV déjà passé
  }

  // Récupérer les relances configurées
  const maxRelances = settings.maxReminderRelances || 1;
  const reminderRelances = settings.reminderRelances || [];

  // Vérifier chaque relance configurée
  for (let relanceNum = 1; relanceNum <= maxRelances; relanceNum++) {
    const template = reminderRelances.find(r => r.relance_number === relanceNum);
    if (!template) continue;

    // Vérifier si cette relance a déjà été envoyée
    const sentForAppointment = sentReminders.get(appointment.id) || new Set<number>();
    if (sentForAppointment.has(relanceNum)) {
      continue; // Cette relance a déjà été envoyée
    }

    // Vérifier si on est dans la fenêtre de cette relance
    const reminderWindowStart = template.hours_before;
    const reminderWindowEnd = template.hours_before + 1; // Fenêtre de 1h

    if (
      hoursUntilAppointment >= reminderWindowStart &&
      hoursUntilAppointment <= reminderWindowEnd
    ) {
      return {
        shouldTrigger: true,
        relanceNumber: relanceNum,
        template: {
          hours_before: template.hours_before,
          content: template.content,
        },
      };
    }
  }

  return { shouldTrigger: false };
}

export function buildReminderMessage(
  appointment: Appointment,
  settings: AppointmentSettings,
  companySlug?: string,
  template?: { hours_before: number; content: string }
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

  // Si un template personnalisé est fourni, l'utiliser
  if (template && template.content) {
    let message = template.content;
    
    // Remplacer les variables
    message = message.replace(/{client_name}/g, appointment.clientName || "Client");
    message = message.replace(/{appointment_date}/g, dateStr);
    message = message.replace(/{appointment_time}/g, timeStr);
    message = message.replace(/{appointment_type}/g, appointment.typeName || "");
    message = message.replace(/{employee_name}/g, appointment.employeeName || "");
    message = message.replace(/{company_name}/g, "Notre entreprise"); // Sera remplacé côté serveur
    message = message.replace(/{company_email}/g, ""); // Sera remplacé côté serveur
    message = message.replace(/{company_phone}/g, ""); // Sera remplacé côté serveur
    
    // Gérer l'URL de reprogrammation
    if (settings.includeRescheduleLinkInReminder && settings.rescheduleBaseUrl) {
      const slug = companySlug || "mon-entreprise";
      let rescheduleUrl = settings.rescheduleBaseUrl
        .replace(/{slugEntreprise}/g, slug)
        .replace(/%7BslugEntreprise%7D/g, slug);
      
      if (!rescheduleUrl.includes("{slugEntreprise}") && !rescheduleUrl.includes("%7BslugEntreprise%7D")) {
        rescheduleUrl += `?appointmentId=${appointment.id}`;
        message = message.replace(/{reschedule_url}/g, rescheduleUrl);
      }
    } else {
      message = message.replace(/{reschedule_url}/g, "");
    }
    
    return message;
  }

  // Fallback : message par défaut (ancien comportement)
  let message = `Bonjour ${appointment.clientName}, petit rappel pour votre rendez-vous "${appointment.typeName}" ${dateStr} à ${timeStr}.`;

  if (appointment.employeeName) {
    message += ` Votre rendez-vous est prévu avec ${appointment.employeeName}.`;
  }

  if (settings.includeRescheduleLinkInReminder && settings.rescheduleBaseUrl) {
    const slug = companySlug || "mon-entreprise";
    let rescheduleUrl = settings.rescheduleBaseUrl
      .replace(/{slugEntreprise}/g, slug)
      .replace(/%7BslugEntreprise%7D/g, slug);
    
    if (!rescheduleUrl.includes("{slugEntreprise}") && !rescheduleUrl.includes("%7BslugEntreprise%7D")) {
      rescheduleUrl += `?appointmentId=${appointment.id}`;
      message += `\n\nSi ce créneau ne vous convient plus, vous pouvez le reprogrammer ici : ${rescheduleUrl}`;
    }
  }

  return message;
}

export function buildNoShowMessage(
  appointment: Appointment,
  settings: AppointmentSettings,
  companySlug?: string
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
    // Utiliser le slug fourni ou une valeur par défaut
    const slug = companySlug || "mon-entreprise";
    // Remplacer le placeholder (même s'il est encodé en URL)
    let rescheduleUrl = settings.rescheduleBaseUrl
      .replace(/{slugEntreprise}/g, slug)
      .replace(/%7BslugEntreprise%7D/g, slug);
    
    // Vérifier que le placeholder a bien été remplacé
    if (rescheduleUrl.includes("{slugEntreprise}") || rescheduleUrl.includes("%7BslugEntreprise%7D")) {
      console.warn("[Appointment Automation] Le placeholder {slugEntreprise} n'a pas été remplacé dans l'URL de reprogrammation. Slug fourni:", slug);
      // Ne pas ajouter l'URL si le placeholder n'a pas été remplacé
      return message;
    }
    
    rescheduleUrl += `?appointmentId=${appointment.id}`;
    message += `\n\nSi vous souhaitez le reprogrammer, vous pouvez le faire ici : ${rescheduleUrl}`;
  }

  return message;
}

export function markReminderSent(appointmentId: number, relanceNumber?: number): void {
  const sentForAppointment = sentReminders.get(appointmentId) || new Set<number>();
  if (relanceNumber !== undefined) {
    sentForAppointment.add(relanceNumber);
  } else {
    // Si pas de numéro spécifié, marquer toutes les relances comme envoyées (compatibilité)
    sentForAppointment.add(1);
  }
  sentReminders.set(appointmentId, sentForAppointment);
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

