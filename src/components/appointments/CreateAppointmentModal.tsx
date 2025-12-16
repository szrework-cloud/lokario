"use client";

import { useState, useEffect, useMemo } from "react";
import { Appointment, AppointmentType } from "./types";
import { calculateAvailableSlots, formatDateForDisplay, formatTimeForDisplay } from "./utils";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { getAppointmentTypes } from "@/services/appointmentsService";
import { getCompanyUsers } from "@/services/usersService";
import { getClients } from "@/services/clientsService";

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Omit<Appointment, "id" | "createdAt" | "updatedAt">) => void;
  initialClientId?: number;
  initialDate?: Date;
  existingAppointments?: Appointment[]; // Pour calculer les créneaux disponibles
}

export function CreateAppointmentModal({
  isOpen,
  onClose,
  onSave,
  initialClientId,
  initialDate,
  existingAppointments = [],
}: CreateAppointmentModalProps) {
  const { token } = useAuth();
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number>(initialClientId || 0);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; employeeId?: number; employeeName?: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string }>>([]);
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);

  // Charger les données
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      
      try {
        const [typesData, usersData, clientsData] = await Promise.all([
          getAppointmentTypes(token, true), // Seulement les types actifs
          getCompanyUsers(token),
          getClients(token),
        ]);
        
        setAppointmentTypes(typesData);
        setEmployees(usersData.map((u) => ({ id: u.id, name: u.full_name || u.email })));
        setClients(clientsData.map((c) => ({ id: c.id, name: c.name })));
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [token, isOpen]);

  // Réinitialiser quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setSelectedTypeId(null);
      setSelectedClientId(initialClientId || 0);
      setSelectedDate(initialDate || new Date());
      setSelectedSlot(null);
      setNotes("");
    }
  }, [isOpen, initialClientId, initialDate]);

  const selectedType = useMemo(() => {
    return selectedTypeId
      ? appointmentTypes.find((t) => t.id === selectedTypeId && t.isActive)
      : null;
  }, [selectedTypeId, appointmentTypes]);

  // Calculer les créneaux disponibles
  const availableSlots = useMemo(() => {
    if (!selectedType) return [];

    return calculateAvailableSlots(
      selectedType,
      existingAppointments,
      employees,
      selectedDate
    );
  }, [selectedType, selectedDate, existingAppointments, employees]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !selectedClientId || !selectedSlot) return;

    const client = clients.find((c) => c.id === selectedClientId);
    const employee = selectedSlot.employeeId
      ? employees.find((e) => e.id === selectedSlot.employeeId)
      : undefined;

    onSave({
      clientId: selectedClientId,
      clientName: client?.name || "Client inconnu",
      typeId: selectedType.id,
      typeName: selectedType.name,
      employeeId: selectedSlot.employeeId,
      employeeName: employee?.name,
      startDateTime: selectedSlot.start.toISOString(),
      endDateTime: selectedSlot.end.toISOString(),
      status: "scheduled",
      notesInternal: notes.trim() || undefined,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">Créer un rendez-vous</h2>
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
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Étape 1 : Sélection du type */}
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">
                Type de rendez-vous *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {appointmentTypes
                  .filter((type) => type.isActive)
                  .map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setSelectedTypeId(type.id);
                        setSelectedSlot(null); // Réinitialiser le créneau sélectionné
                      }}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedTypeId === type.id
                          ? "border-[#F97316] bg-[#F97316]/5"
                          : "border-[#E5E7EB] hover:border-[#F97316]/50"
                      }`}
                    >
                      <div className="font-medium text-[#0F172A]">{type.name}</div>
                      {type.description && (
                        <div className="text-xs text-[#64748B] mt-1">{type.description}</div>
                      )}
                      <div className="text-xs text-[#64748B] mt-2">
                        Durée : {type.durationMinutes} min
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Étape 2 : Sélection du client */}
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">
                Client *
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(parseInt(e.target.value))}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                required
              >
                <option value={0}>Sélectionner un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Étape 3 : Sélection de la date */}
            {selectedType && (
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={selectedDate.toISOString().split("T")[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setSelectedDate(newDate);
                    setSelectedSlot(null); // Réinitialiser le créneau
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  required
                />
                <p className="text-xs text-[#64748B] mt-1">
                  {formatDateForDisplay(selectedDate)}
                </p>
              </div>
            )}

            {/* Étape 4 : Sélection du créneau */}
            {selectedType && selectedDate && (
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Créneau disponible *
                </label>
                {availableSlots.length === 0 ? (
                  <div className="p-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-center">
                    <p className="text-sm text-[#64748B]">
                      Aucun créneau disponible pour cette date. Veuillez choisir une autre date.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 border border-[#E5E7EB] rounded-lg">
                    {availableSlots.map((slot, index) => {
                      const isSelected =
                        selectedSlot?.start.getTime() === slot.start.getTime() &&
                        selectedSlot?.employeeId === slot.employeeId;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-lg border-2 text-sm transition-all ${
                            isSelected
                              ? "border-[#F97316] bg-[#F97316]/5"
                              : "border-[#E5E7EB] hover:border-[#F97316]/50"
                          }`}
                        >
                          <div className="font-medium text-[#0F172A]">
                            {formatTimeForDisplay(slot.start)}
                          </div>
                          {slot.employeeName && (
                            <div className="text-xs text-[#64748B] mt-1">
                              {slot.employeeName}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">
                Notes internes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                rows={3}
                placeholder="Notes internes sur ce rendez-vous..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!selectedType || !selectedClientId || !selectedSlot}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Créer le rendez-vous
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

