"use client";

import { useState } from "react";
import { AppointmentType } from "./types";
import { mockAppointmentTypes, mockEmployees } from "./mockData";
import { AppointmentTypeModal } from "./AppointmentTypeModal";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export function AppointmentTypesView() {
  const [types, setTypes] = useState<AppointmentType[]>(mockAppointmentTypes);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = () => {
    setSelectedType(null);
    setIsModalOpen(true);
  };

  const handleEdit = (type: AppointmentType) => {
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleSave = (typeData: Omit<AppointmentType, "id">) => {
    if (selectedType) {
      // Modifier
      setTypes((prev) =>
        prev.map((t) => (t.id === selectedType.id ? { ...selectedType, ...typeData } : t))
      );
    } else {
      // Créer
      const newType: AppointmentType = {
        id: Math.max(...types.map((t) => t.id), 0) + 1,
        ...typeData,
      };
      setTypes((prev) => [...prev, newType]);
    }
    setIsModalOpen(false);
    setSelectedType(null);
  };

  const handleToggleActive = (typeId: number) => {
    setTypes((prev) =>
      prev.map((t) => (t.id === typeId ? { ...t, isActive: !t.isActive } : t))
    );
  };

  const getEmployeeNames = (employeeIds?: number[]) => {
    if (!employeeIds || employeeIds.length === 0) {
      return "Tous les employés";
    }
    return employeeIds
      .map((id) => mockEmployees.find((e) => e.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Types de rendez-vous</h2>
            <p className="text-sm text-[#64748B] mt-1">
              Gérez les différents types de rendez-vous proposés à vos clients.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
          >
            + Nouveau type de RDV
          </button>
        </div>

        {/* Liste */}
        {types.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-[#64748B]">Aucun type de rendez-vous créé.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((type) => (
              <Card key={type.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-[#0F172A]">{type.name}</h3>
                      {type.description && (
                        <p className="text-xs text-[#64748B] mt-1">{type.description}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        type.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {type.isActive ? "Actif" : "Inactif"}
                    </span>
                  </div>

                  <div className="space-y-1 mt-3 text-xs text-[#64748B]">
                    <p>Durée : {type.durationMinutes} min</p>
                    {type.bufferBeforeMinutes && (
                      <p>Buffer avant : {type.bufferBeforeMinutes} min</p>
                    )}
                    {type.bufferAfterMinutes && (
                      <p>Buffer après : {type.bufferAfterMinutes} min</p>
                    )}
                    <p className="mt-2">Employés : {getEmployeeNames(type.employeesAllowedIds)}</p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => handleEdit(type)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleToggleActive(type.id)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
                        type.isActive
                          ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      }`}
                    >
                      {type.isActive ? "Désactiver" : "Activer"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AppointmentTypeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedType(null);
        }}
        type={selectedType}
        onSave={handleSave}
      />
    </>
  );
}

