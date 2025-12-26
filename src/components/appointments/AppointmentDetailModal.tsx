"use client";

import { useState } from "react";
import { Appointment, AppointmentStatus } from "./types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onStatusChange: (appointmentId: number, newStatus: AppointmentStatus) => void;
}

export function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  onStatusChange,
}: AppointmentDetailModalProps) {
  const router = useRouter();

  if (!isOpen || !appointment) return null;

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const dateTime = formatDateTime(appointment.startDateTime);
  const endTime = new Date(appointment.endDateTime).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, { label: string; className: string }> = {
      scheduled: { label: "Programmé", className: "bg-blue-100 text-blue-800" },
      confirmed: { label: "Confirmé", className: "bg-green-100 text-green-800" },
      completed: { label: "Terminé", className: "bg-gray-100 text-gray-800" },
      cancelled: { label: "Annulé", className: "bg-red-100 text-red-800" },
      no_show: { label: "No show", className: "bg-orange-100 text-orange-800" },
      reschedule_requested: { label: "Reprogrammation demandée", className: "bg-yellow-100 text-yellow-800" },
    };
    const variant = variants[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${variant.className}`}>
        {variant.label}
      </span>
    );
  };

  const handleStatusChange = (newStatus: AppointmentStatus) => {
    if (appointment) {
      onStatusChange(appointment.id, newStatus);
      onClose();
    }
  };

  const handleOpenConversation = () => {
    if (appointment.clientConversationId) {
      router.push(`/app/inbox?conversationId=${appointment.clientConversationId}`);
    } else {
      router.push(`/app/inbox`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">Détail du rendez-vous</h2>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A]"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Infos principales */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#64748B]">Client</label>
              <p className="text-sm font-medium text-[#0F172A] mt-1">{appointment.clientName}</p>
              {appointment.clientEmail && (
                <p className="text-xs text-[#64748B] mt-1">
                  <a
                    href={`mailto:${appointment.clientEmail}`}
                    className="text-[#F97316] hover:underline"
                  >
                    📧 {appointment.clientEmail}
                  </a>
                </p>
              )}
              {appointment.clientPhone && (
                <p className="text-xs text-[#64748B] mt-1">
                  <a
                    href={`tel:${appointment.clientPhone}`}
                    className="text-[#F97316] hover:underline"
                  >
                    📞 {appointment.clientPhone}
                  </a>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-[#64748B]">Type de rendez-vous</label>
              <p className="text-sm text-[#0F172A] mt-1">{appointment.typeName}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-[#64748B]">Date et heure</label>
              <p className="text-sm text-[#0F172A] mt-1">
                {dateTime.date} de {dateTime.time} à {endTime}
              </p>
            </div>

            {appointment.employeeName && (
              <div>
                <label className="text-xs font-medium text-[#64748B]">Employé</label>
                <p className="text-sm text-[#0F172A] mt-1">{appointment.employeeName}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[#64748B]">Statut</label>
              <div className="mt-1">{getStatusBadge(appointment.status)}</div>
            </div>

            {appointment.notesInternal && (
              <div>
                <label className="text-xs font-medium text-[#64748B]">Notes internes</label>
                <p className="text-sm text-[#0F172A] mt-1 whitespace-pre-wrap">
                  {appointment.notesInternal}
                </p>
              </div>
            )}
          </div>

          {/* Historique simple */}
          <div className="pt-4 border-t border-[#E5E7EB]">
            <label className="text-xs font-medium text-[#64748B]">Historique</label>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-[#64748B]">
                RDV créé le {new Date(appointment.createdAt).toLocaleDateString("fr-FR")}
              </p>
              {appointment.updatedAt !== appointment.createdAt && (
                <p className="text-xs text-[#64748B]">
                  Dernière modification le {new Date(appointment.updatedAt).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#E5E7EB] space-y-3">
            <div className="flex flex-wrap gap-2">
              {appointment.status !== "completed" && appointment.status !== "cancelled" && (
                <button
                  onClick={() => handleStatusChange("completed")}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                >
                  Marquer comme terminé
                </button>
              )}

              {appointment.status !== "no_show" && appointment.status !== "cancelled" && (
                <button
                  onClick={() => handleStatusChange("no_show")}
                  className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700"
                >
                  Marquer comme no show
                </button>
              )}

              {appointment.status !== "cancelled" && (
                <button
                  onClick={() => handleStatusChange("cancelled")}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                  Annuler le RDV
                </button>
              )}
            </div>

            {appointment.clientConversationId && (
              <button
                onClick={handleOpenConversation}
                className="w-full px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
              >
                Ouvrir la conversation client
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

