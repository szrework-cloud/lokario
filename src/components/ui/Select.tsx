import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onValueChange) {
        onValueChange(e.target.value);
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <select
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm",
          "focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

Select.displayName = "Select";

