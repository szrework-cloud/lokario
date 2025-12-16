"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { createContext, useContext } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = "info", duration: number = 5000) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(true);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const styles = {
    success: "bg-gradient-to-r from-[#16A34A]/20 to-[#16A34A]/10 border-[#16A34A]/30 text-[#16A34A]",
    error: "bg-gradient-to-r from-[#DC2626]/20 to-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]",
    info: "bg-gradient-to-r from-[#3B82F6]/20 to-[#3B82F6]/10 border-[#3B82F6]/30 text-[#3B82F6]",
    warning: "bg-gradient-to-r from-[#FACC15]/20 to-[#FACC15]/10 border-[#FACC15]/30 text-[#FACC15]",
  };

  const Icon = icons[toast.type];
  const styleClasses = styles[toast.type];

  return (
    <div
      className={`${styleClasses} border rounded-lg p-4 flex items-center gap-3 shadow-lg backdrop-blur-sm animate-fade-up ${
        isVisible ? "opacity-100" : "opacity-0"
      } transition-opacity duration-300`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 font-medium text-sm">{toast.message}</p>
          <button
        onClick={handleRemove}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Fermer"
          >
        <X className="w-4 h-4" />
          </button>
    </div>
  );
}
