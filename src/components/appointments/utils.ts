import { Appointment, AppointmentType } from "./types";

export interface TimeSlot {
  start: Date;
  end: Date;
  employeeId?: number;
  employeeName?: string;
  isAvailable: boolean;
}

/**
 * Calcule les créneaux disponibles pour un type de RDV donné
 */
export function calculateAvailableSlots(
  appointmentType: AppointmentType,
  existingAppointments: Appointment[],
  employees: Array<{ id: number; name: string }>,
  date: Date,
  workHours: { start: number; end: number } = { start: 9, end: 18 } // 9h-18h par défaut
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const totalDuration = 
    (appointmentType.bufferBeforeMinutes || 0) +
    appointmentType.durationMinutes +
    (appointmentType.bufferAfterMinutes || 0);

  // Déterminer les employés disponibles pour ce type
  const availableEmployees = appointmentType.employeesAllowedIds && appointmentType.employeesAllowedIds.length > 0
    ? employees.filter((emp) => appointmentType.employeesAllowedIds!.includes(emp.id))
    : employees;

  if (availableEmployees.length === 0) {
    return []; // Aucun employé disponible
  }

  // Créer des créneaux pour chaque employé
  availableEmployees.forEach((employee) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(workHours.start, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(workHours.end, 0, 0, 0);

    let currentTime = new Date(startOfDay);

    while (currentTime.getTime() + totalDuration * 60 * 1000 <= endOfDay.getTime()) {
      const slotStart = new Date(currentTime);
      const slotEnd = new Date(currentTime.getTime() + totalDuration * 60 * 1000);

      // Vérifier si le créneau est disponible (pas de conflit avec un RDV existant)
      const hasConflict = existingAppointments.some((apt) => {
        if (apt.status === "cancelled") return false; // Les RDV annulés ne bloquent pas
        if (apt.employeeId && apt.employeeId !== employee.id) return false; // Pas le même employé

        const aptStart = new Date(apt.startDateTime);
        const aptEnd = new Date(apt.endDateTime);

        // Vérifier le chevauchement
        return (
          (slotStart >= aptStart && slotStart < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (slotStart <= aptStart && slotEnd >= aptEnd)
        );
      });

      if (!hasConflict) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          employeeId: employee.id,
          employeeName: employee.name,
          isAvailable: true,
        });
      }

      // Passer au créneau suivant (toutes les 15 minutes)
      currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
    }
  });

  // Trier par heure de début
  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Formate une date pour l'affichage
 */
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formate une heure pour l'affichage
 */
export function formatTimeForDisplay(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

