"use client";

import { createLazyModal } from "@/components/ui/LazyModal";

// Lazy load du modal CreateChecklistModal pour réduire le bundle initial
export const CreateChecklistModal = createLazyModal(
  () => import("./CreateChecklistModal").then(module => ({ default: module.CreateChecklistModal })),
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-2xl animate-pulse">
      <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

// Réexporter le type pour la compatibilité
export type { ChecklistFormData } from "./CreateChecklistModal";

