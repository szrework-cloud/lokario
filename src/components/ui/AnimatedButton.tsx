"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export interface AnimatedButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "variant"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
}

/**
 * Bouton avec animations de hover et click
 */
export function AnimatedButton({
  children,
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  ...props
}: AnimatedButtonProps) {
  return (
    <motion.div
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Button
        variant={variant}
        disabled={disabled || loading}
        className={className}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            />
            {children}
          </span>
        ) : (
          children
        )}
      </Button>
    </motion.div>
  );
}

