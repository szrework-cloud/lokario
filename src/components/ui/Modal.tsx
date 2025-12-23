import { ReactNode, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Ne pas rendre du tout si fermé (évite les re-renders inutiles)
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Overlay noir avec animation */}
      <div 
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative w-full flex justify-center animate-scale-in"
      >
        <Card className={`${sizeClasses[size]} max-h-[95vh] overflow-y-auto w-full mx-8 shadow-2xl`}>
          <CardHeader>
            <div className="flex items-center justify-between relative">
              <div className="flex-1"></div>
              <h2 className="text-xl font-semibold text-[#0F172A] flex-1 text-center">{title}</h2>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={onClose}
                  className="text-[#64748B] hover:text-[#0F172A] transition-all duration-200 hover:scale-110 rounded-full w-8 h-8 flex items-center justify-center hover:bg-slate-100"
                  aria-label="Fermer"
                >
                  ✕
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}

