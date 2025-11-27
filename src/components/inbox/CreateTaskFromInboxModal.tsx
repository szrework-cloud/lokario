"use client";

import { useState, FormEvent } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface CreateTaskFromInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    priority: string;
    dueDate?: string;
    assignedTo?: number;
  }) => void;
  defaultSubject?: string;
  defaultClient?: string;
}

export function CreateTaskFromInboxModal({
  isOpen,
  onClose,
  onSubmit,
  defaultSubject,
  defaultClient,
}: CreateTaskFromInboxModalProps) {
  const [title, setTitle] = useState(defaultSubject || "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<number | undefined>();

  const mockEmployees = [
    { id: 1, name: "Jean Dupont" },
    { id: 2, name: "Marie Martin" },
    { id: 3, name: "Sophie Durand" },
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      priority,
      dueDate: dueDate || undefined,
      assignedTo,
    });
    // Reset form
    setTitle(defaultSubject || "");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setAssignedTo(undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">Créer une tâche</h2>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Titre de la tâche *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Priorité
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="low">Faible</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Date d'échéance
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Assignée à
              </label>
              <select
                value={assignedTo || ""}
                onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              >
                <option value="">Non assignée</option>
                {mockEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            {defaultClient && (
              <div className="p-2 bg-blue-50 rounded-lg text-sm text-blue-800">
                Client: {defaultClient}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit">Créer la tâche</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

