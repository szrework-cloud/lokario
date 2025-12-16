import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-md hover:shadow-lg hover:brightness-110 hover:scale-105 focus:ring-[#F97316]",
    secondary: "bg-white border border-[#E5E7EB] text-[#0F172A] hover:bg-slate-50 hover:border-[#F97316]/30 focus:ring-[#F97316]",
    ghost: "bg-transparent text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A] focus:ring-[#F97316]",
    outline: "bg-transparent border border-current text-current hover:bg-current/10 focus:ring-[#F97316]",
    danger: "bg-red-500 text-white shadow-md hover:bg-red-600 hover:shadow-lg focus:ring-red-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
    xl: "px-8 py-4 text-lg",
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

