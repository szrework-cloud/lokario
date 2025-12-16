"use client";

import { useState } from "react";
import { Appointment } from "./types";

interface AppointmentsWeeklyCalendarProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

export function AppointmentsWeeklyCalendar({
  appointments,
  onAppointmentClick,
}: AppointmentsWeeklyCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semaine actuelle, -1 = semaine précédente, +1 = semaine suivante

  // Obtenir le lundi de la semaine en cours
  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour que lundi = 1
    return new Date(d.setDate(diff));
  };

  const today = new Date();
  const currentWeekMonday = getMondayOfWeek(today);
  
  // Calculer le lundi de la semaine à afficher selon l'offset
  const monday = new Date(currentWeekMonday);
  monday.setDate(currentWeekMonday.getDate() + (weekOffset * 7));
  
  // Générer les 7 jours de la semaine (Lundi à Dimanche)
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    weekDays.push(day);
  }

  // Formater une date en YYYY-MM-DD (sans timezone pour éviter les décalages)
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Vérifier si une date est aujourd'hui
  const isToday = (date: Date): boolean => {
    const todayStr = formatDateKey(today);
    const dateStr = formatDateKey(date);
    return todayStr === dateStr;
  };

  // Obtenir le nom du jour (Lun, Mar, etc.)
  const getDayName = (date: Date): string => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[date.getDay()];
  };

  // Obtenir le numéro du jour
  const getDayNumber = (date: Date): number => {
    return date.getDate();
  };

  // Obtenir le nom du mois
  const getMonthName = (date: Date): string => {
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    return months[date.getMonth()];
  };

  // Vérifier si un rendez-vous appartient à un jour donné
  const appointmentBelongsToDay = (appointment: Appointment, dayDate: Date): boolean => {
    try {
      const appointmentDate = new Date(appointment.startDateTime);
      const dayKey = formatDateKey(dayDate);
      const appointmentKey = formatDateKey(appointmentDate);
      return dayKey === appointmentKey;
    } catch {
      return false;
    }
  };

  // Trier les rendez-vous par heure
  const sortAppointmentsByTime = (appointments: Appointment[]): Appointment[] => {
    return [...appointments].sort((a, b) => {
      const dateA = new Date(a.startDateTime);
      const dateB = new Date(b.startDateTime);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Grouper les rendez-vous par jour
  const appointmentsByDay: Record<string, Appointment[]> = {};

  weekDays.forEach((day) => {
    const dayKey = formatDateKey(day);
    appointmentsByDay[dayKey] = [];
  });

  // Calculer les dates limites de la semaine affichée
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekStartKey = formatDateKey(weekStart);
  const weekEndKey = formatDateKey(weekEnd);

  appointments.forEach((appointment) => {
    const appointmentDate = new Date(appointment.startDateTime);
    const appointmentKey = formatDateKey(appointmentDate);
    
    // Vérifier si le rendez-vous est dans la semaine affichée
    if (appointmentKey >= weekStartKey && appointmentKey <= weekEndKey) {
      weekDays.forEach((day) => {
        const dayKey = formatDateKey(day);
        if (appointmentKey === dayKey) {
          if (!appointmentsByDay[dayKey]) {
            appointmentsByDay[dayKey] = [];
          }
          appointmentsByDay[dayKey].push(appointment);
        }
      });
    }
  });

  // Obtenir la couleur selon le statut
  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800 border-blue-200",
      confirmed: "bg-green-100 text-green-800 border-green-200",
      completed: "bg-gray-100 text-gray-800 border-gray-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      no_show: "bg-orange-100 text-orange-800 border-orange-200",
      reschedule_requested: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Formater l'heure (HH:MM)
  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  // Obtenir l'heure d'un rendez-vous (0-23)
  const getAppointmentHour = (appointment: Appointment): number => {
    try {
      const date = new Date(appointment.startDateTime);
      return date.getHours();
    } catch {
      return 0;
    }
  };

  // Obtenir les minutes d'un rendez-vous (0-59)
  const getAppointmentMinutes = (appointment: Appointment): number => {
    try {
      const date = new Date(appointment.startDateTime);
      return date.getMinutes();
    } catch {
      return 0;
    }
  };

  // Calculer la position verticale d'un rendez-vous (en pixels depuis le haut)
  const getAppointmentTopPosition = (appointment: Appointment): number => {
    const hour = getAppointmentHour(appointment);
    const minutes = getAppointmentMinutes(appointment);
    // Position basée sur les heures de 8h à 20h
    const startHour = 8;
    const hourHeight = 60; // Chaque heure fait 60px
    
    // Position en pixels depuis le haut
    const hoursFromStart = hour - startHour;
    const minutesOffset = (minutes / 60) * hourHeight;
    const position = hoursFromStart * hourHeight + minutesOffset;
    
    // Limiter entre 0 et la hauteur totale
    return Math.max(0, position);
  };

  // Calculer la hauteur d'un rendez-vous (basée sur la durée en pixels)
  const getAppointmentHeight = (appointment: Appointment): number => {
    try {
      const start = new Date(appointment.startDateTime);
      const end = new Date(appointment.endDateTime);
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      
      const hourHeight = 60; // Chaque heure fait 60px
      const height = (durationMinutes / 60) * hourHeight;
      
      // Minimum 20px pour la visibilité
      return Math.max(20, height);
    } catch {
      return 30; // Hauteur par défaut
    }
  };

  // Générer les heures de la journée (8h à 20h)
  const generateHours = (): number[] => {
    const hours: number[] = [];
    for (let h = 8; h <= 20; h++) {
      hours.push(h);
    }
    return hours;
  };

  const hours = generateHours();

  // Rendre un rendez-vous positionné absolument
  const renderAppointment = (appointment: Appointment, dayKey: string) => {
    const statusColor = getStatusColor(appointment.status);
    const time = formatTime(appointment.startDateTime);
    const isCompleted = appointment.status === "completed" || appointment.status === "cancelled";
    const top = getAppointmentTopPosition(appointment);
    const height = getAppointmentHeight(appointment);

    return (
      <div
        key={appointment.id}
        onClick={(e) => {
          e.stopPropagation();
          onAppointmentClick(appointment);
        }}
        className={`absolute left-1 right-1 p-1.5 rounded text-xs cursor-pointer hover:opacity-90 hover:shadow-md transition-all border ${statusColor} ${
          isCompleted ? "opacity-60" : ""
        }`}
        style={{
          top: `${top}px`,
          height: `${height}px`,
          zIndex: 10,
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="font-semibold text-[10px]">{time}</span>
            {appointment.employeeName && (
              <span className="text-[10px] text-[#64748B]">• {appointment.employeeName}</span>
            )}
          </div>
          <span className="truncate block font-medium text-[11px]">{appointment.clientName}</span>
          <span className="truncate block text-[10px] text-[#64748B]">{appointment.typeName}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* En-tête avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Semaine précédente"
          >
            <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-[#0F172A] min-w-[300px] text-center">
            Semaine du {getDayNumber(weekDays[0])} au {getDayNumber(weekDays[6])} {getMonthName(weekDays[0])} {weekDays[0].getFullYear()}
          </h2>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Semaine suivante"
          >
            <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-sm text-[#64748B] hover:text-[#0F172A] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
            >
              Aujourd'hui
            </button>
          )}
        </div>
      </div>

      {/* Calendrier hebdomadaire avec timeline */}
      <div className="flex gap-2 overflow-x-auto">
        {/* Colonne des heures à gauche */}
        <div className="flex-shrink-0 w-16 pt-8">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-[60px] border-b border-gray-200 flex items-start justify-end pr-2"
            >
              <span className="text-xs text-[#64748B] font-medium">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Colonnes des jours */}
        <div className="flex gap-2 flex-1">
          {weekDays.map((day) => {
            const dayKey = formatDateKey(day);
            const dayAppointments = sortAppointmentsByTime(appointmentsByDay[dayKey] || []);
            const isTodayDay = isToday(day);

            return (
              <div
                key={dayKey}
                className={`flex-1 border rounded-lg min-w-[150px] ${
                  isTodayDay
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                {/* En-tête du jour */}
                <div className="sticky top-0 z-20 bg-inherit border-b border-gray-200 p-2 rounded-t-lg">
                  <div className="text-xs text-[#64748B] font-medium">
                    {getDayName(day)}
                  </div>
                  <div className={`text-lg font-bold ${isTodayDay ? "text-orange-600" : "text-[#0F172A]"}`}>
                    {getDayNumber(day)}
                  </div>
                  {dayAppointments.length > 0 && (
                    <div className="text-xs text-[#64748B] mt-1">
                      {dayAppointments.length} RDV{dayAppointments.length > 1 ? "" : ""}
                    </div>
                  )}
                </div>

                {/* Zone des rendez-vous avec grille d'heures */}
                <div className="relative" style={{ height: `${hours.length * 60}px` }}>
                  {/* Lignes horizontales pour chaque heure */}
                  {hours.map((hour, index) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-b border-gray-200"
                      style={{
                        top: `${index * 60}px`,
                      }}
                    />
                  ))}

                  {/* Rendez-vous positionnés absolument */}
                  {dayAppointments.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xs text-[#64748B] text-center">
                        Aucun RDV
                      </div>
                    </div>
                  ) : (
                    dayAppointments.map((appointment) => renderAppointment(appointment, dayKey))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
