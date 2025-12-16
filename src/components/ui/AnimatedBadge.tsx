"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface AnimatedBadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
  pulse?: boolean;
}

const variantStyles = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

/**
 * Badge avec animation d'apparition et option pulse
 */
export function AnimatedBadge({
  children,
  variant = "default",
  className = "",
  pulse = false,
}: AnimatedBadgeProps) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {pulse && (
        <motion.span
          className="absolute inset-0 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      <span className="relative">{children}</span>
    </motion.span>
  );
}

