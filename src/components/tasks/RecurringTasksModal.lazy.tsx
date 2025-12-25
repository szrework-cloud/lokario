"use client";

import { createLazyModal } from "@/components/ui/LazyModal";

// Lazy load du modal RecurringTasksModal pour réduire le bundle initial
export const RecurringTasksModal = createLazyModal(
  () => import("./RecurringTasksModal").then(module => ({ default: module.RecurringTasksModal })),
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-4xl animate-pulse">
      <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

