import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
}

const variantStyles = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-[#FACC15]/20 text-[#854D0E]",
  error: "bg-red-100 text-red-700",
  info: "bg-[#FDBA74]/20 text-[#7C2D12]",
};

export function Tag({ children, variant = "default", className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

