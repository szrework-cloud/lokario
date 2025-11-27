import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = "font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-md hover:shadow-lg hover:brightness-110 focus:ring-[#F97316]",
    secondary: "bg-white border border-[#E5E7EB] text-[#0F172A] hover:bg-slate-50 focus:ring-[#F97316]",
    ghost: "bg-transparent text-[#64748B] hover:bg-slate-100 focus:ring-[#F97316]",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

