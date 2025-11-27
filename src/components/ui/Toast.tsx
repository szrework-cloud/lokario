"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: "success" | "error" | "info";
}

export function Toast({
  message,
  isVisible,
  onClose,
  type = "success",
}: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const typeStyles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-[#FDBA74]/20 border-[#F97316] text-[#7C2D12]",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2">
      <div
        className={cn(
          "rounded-lg border px-4 py-3 shadow-lg",
          typeStyles[type]
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{message}</span>
          <button
            onClick={onClose}
            className="ml-2 text-current opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

