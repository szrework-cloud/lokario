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
  onSendMessage?: (appointment: Appointment, message: string, type: "reminder" | "no_show") => void;
}

export function useAppointmentAutomation({
  appointments,
  settings,
  onSendMessage,
}: UseAppointmentAutomationProps) {
  const checkAndSendReminders = useCallback(() => {
    const now = new Date();
    
    appointments.forEach((appointment) => {
      // Vérifier les rappels
      if (shouldTriggerReminder(appointment, settings, now)) {
        const message = buildReminderMessage(appointment, settings);
        
        // Marquer comme envoyé
        markReminderSent(appointment.id);
        
        // Appeler le callback pour envoyer le message
        if (onSendMessage) {
          onSendMessage(appointment, message, "reminder");
        } else {
          // Fallback : log dans la console
          console.log("[Appointment Automation] Rappel à envoyer:", {
            appointmentId: appointment.id,
            clientName: appointment.clientName,
            message,
          });
          
          // TODO: Une fois l'API Inbox prête, appeler ici :
          // createInboxMessage({
          //   conversationId: appointment.clientConversationId,
          //   body: message,
          //   metadata: { source: "appointment_reminder", appointmentId: appointment.id }
          // })
        }
      }
      
      // Vérifier les messages no_show
      if (shouldSendNoShowMessage(appointment, settings)) {
        const message = buildNoShowMessage(appointment, settings);
        
        if (message) {
          // Marquer comme envoyé
          markNoShowMessageSent(appointment.id);
          
          // Appeler le callback pour envoyer le message
          if (onSendMessage) {
            onSendMessage(appointment, message, "no_show");
          } else {
            // Fallback : log dans la console
            console.log("[Appointment Automation] Message no_show à envoyer:", {
              appointmentId: appointment.id,
              clientName: appointment.clientName,
              message,
            });
            
            // TODO: Une fois l'API Inbox prête, appeler ici :
            // createInboxMessage({
            //   conversationId: appointment.clientConversationId,
            //   body: message,
            //   metadata: { source: "appointment_no_show", appointmentId: appointment.id }
            // })
          }
        }
      }
    });
  }, [appointments, settings, onSendMessage]);

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

