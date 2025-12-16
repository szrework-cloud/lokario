"use client";

import { useState, useEffect } from "react";
import { AppointmentType } from "./types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { getCompanyUsers } from "@/services/usersService";

interface AppointmentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: AppointmentType | null;
  onSave: (type: Omit<AppointmentType, "id">) => void;
}

export function AppointmentTypeModal({
  isOpen,
  onClose,
  type,
  onSave,
}: AppointmentTypeModalProps) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState(0);
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState(0);
  const [employeesAllowedIds, setEmployeesAllowedIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string }>>([]);

  // Charger les employés
  useEffect(() => {
    const loadEmployees = async () => {
      if (!token) return;
      
      try {
        const users = await getCompanyUsers(token);
        setEmployees(users.map((u) => ({ id: u.id, name: u.fullName })));
      } catch (err) {
        console.error("Erreur lors du chargement des employés:", err);
      }
    };

    if (isOpen) {
      loadEmployees();
    }
  }, [token, isOpen]);

  useEffect(() => {
    if (type) {
      setName(type.name);
      setDescription(type.description || "");
      setDurationMinutes(type.durationMinutes);
      setBufferBeforeMinutes(type.bufferBeforeMinutes || 0);
      setBufferAfterMinutes(type.bufferAfterMinutes || 0);
      setEmployeesAllowedIds(type.employeesAllowedIds || []);
      setIsActive(type.isActive);
    } else {
      // Reset pour nouveau type
      setName("");
      setDescription("");
      setDurationMinutes(30);
      setBufferBeforeMinutes(0);
      setBufferAfterMinutes(0);
      setEmployeesAllowedIds([]);
      setIsActive(true);
    }
  }, [type, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      durationMinutes,
      bufferBeforeMinutes: bufferBeforeMinutes || undefined,
      bufferAfterMinutes: bufferAfterMinutes || undefined,
      employeesAllowedIds: employeesAllowedIds.length > 0 ? employeesAllowedIds : undefined,
      isActive,
    });

    onClose();
  };

  const toggleEmployee = (employeeId: number) => {
    setEmployeesAllowedIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">
              {type ? "Modifier le type de RDV" : "Nouveau type de RDV"}
            </h2>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Nom *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Ex: Coupe + brushing"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                rows={3}
                placeholder="Description optionnelle"
              />
            </div>

            {/* Durée */}
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Durée (minutes) *
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                min="1"
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                required
              />
            </div>

            {/* Buffers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Buffer avant (minutes)
                </label>
                <input
                  type="number"
                  value={bufferBeforeMinutes}
                  onChange={(e) => setBufferBeforeMinutes(parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Buffer après (minutes)
                </label>
                <input
                  type="number"
                  value={bufferAfterMinutes}
                  onChange={(e) => setBufferAfterMinutes(parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                />
              </div>
            </div>

            {/* Employés autorisés */}
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">
                Employés autorisés (optionnel)
              </label>
              <div className="space-y-2">
                {employees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={employeesAllowedIds.includes(employee.id)}
                      onChange={() => toggleEmployee(employee.id)}
                      className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                    />
                    <span className="text-sm text-[#0F172A]">{employee.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Si aucun employé n'est sélectionné, tous peuvent prendre ce type de RDV.
              </p>
            </div>

            {/* Actif */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                />
                <span className="text-sm font-medium text-[#0F172A]">Type actif</span>
              </label>
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
                className="flex-1 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
              >
                {type ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

