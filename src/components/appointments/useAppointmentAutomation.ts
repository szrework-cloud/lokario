"use client";

import { useEffect, useCallback } from "react";
import { Appointment, AppointmentSettings } from "./types";
import {
  shouldTriggerReminder,
  buildReminderMessage,
  buildNoShowMessage,
  shouldSendNoShowMessage,
  markReminderSent,
  markNoShowMessageSent,
} from "./automation";

interface UseAppointmentAutomationProps {
  appointments: Appointment[];
  settings: AppointmentSettings;
  companySlug?: string;
  onSendMessage?: (appointment: Appointment, message: string, type: "reminder" | "no_show") => void;
}

export function useAppointmentAutomation({
  appointments,
  settings,
  companySlug,
  onSendMessage,
}: UseAppointmentAutomationProps) {
  const checkAndSendReminders = useCallback(() => {
    const now = new Date();
    
    appointments.forEach((appointment) => {
      // Vérifier les rappels (retourne maintenant { shouldTrigger, relanceNumber, template })
      const reminderCheck = shouldTriggerReminder(appointment, settings, now);
      if (reminderCheck.shouldTrigger && reminderCheck.relanceNumber && reminderCheck.template) {
        const message = buildReminderMessage(
          appointment,
          settings,
          companySlug,
          reminderCheck.template
        );
        
        // Marquer cette relance spécifique comme envoyée
        markReminderSent(appointment.id, reminderCheck.relanceNumber);
        
        // Appeler le callback pour envoyer le message
        if (onSendMessage) {
          onSendMessage(appointment, message, "reminder");
        } else {
          // Fallback : log dans la console (normalement onSendMessage devrait toujours être fourni)
          console.warn("[Appointment Automation] Rappel à envoyer mais onSendMessage non fourni:", {
            appointmentId: appointment.id,
            clientName: appointment.clientName,
            relanceNumber: reminderCheck.relanceNumber,
            message,
          });
        }
      }
      
      // Vérifier les messages no_show
      if (shouldSendNoShowMessage(appointment, settings)) {
        const message = buildNoShowMessage(appointment, settings, companySlug);
        
        if (message) {
          // Marquer comme envoyé
          markNoShowMessageSent(appointment.id);
          
          // Appeler le callback pour envoyer le message
          if (onSendMessage) {
            onSendMessage(appointment, message, "no_show");
          } else {
            // Fallback : log dans la console (normalement onSendMessage devrait toujours être fourni)
            console.warn("[Appointment Automation] Message no_show à envoyer mais onSendMessage non fourni:", {
              appointmentId: appointment.id,
              clientName: appointment.clientName,
              message,
            });
          }
        }
      }
    });
  }, [appointments, settings, companySlug, onSendMessage]);

  // Vérifier toutes les minutes
  useEffect(() => {
    // Vérifier immédiatement
    checkAndSendReminders();
    
    // Puis toutes les minutes
    const interval = setInterval(() => {
      checkAndSendReminders();
    }, 60 * 1000); // 1 minute
    
    return () => clearInterval(interval);
  }, [checkAndSendReminders]);

  return { checkAndSendReminders };
}

