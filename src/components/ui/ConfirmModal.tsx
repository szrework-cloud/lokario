"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = "warning",
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const buttonVariants = {
    danger: "bg-[#DC2626] hover:bg-[#B91C1C] text-white",
    warning: "bg-[#F97316] hover:bg-[#EA580C] text-white",
    info: "bg-[#3B82F6] hover:bg-[#2563EB] text-white",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full ${
            variant === "danger" ? "bg-[#DC2626]/10" :
            variant === "warning" ? "bg-[#F97316]/10" :
            "bg-[#3B82F6]/10"
          }`}>
            <AlertTriangle className={`w-5 h-5 ${
              variant === "danger" ? "text-[#DC2626]" :
              variant === "warning" ? "text-[#F97316]" :
              "text-[#3B82F6]"
            }`} />
          </div>
          <p className="flex-1 text-[#64748B]">{message}</p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A]"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className={buttonVariants[variant]}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
