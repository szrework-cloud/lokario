import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("border-b border-[#E5E7EB] px-4 md:px-6 py-4", className)}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  // Si className contient "flex" ou "items-center", on ne met pas de padding par défaut
  // pour permettre le centrage
  const hasFlex = className?.includes("flex") || className?.includes("items-center");
  const paddingClass = hasFlex ? "p-0" : "px-4 md:px-6 py-4 md:py-6";
  return <div className={cn(paddingClass, className)}>{children}</div>;
}

