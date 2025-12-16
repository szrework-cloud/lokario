"use client";

import { InputHTMLAttributes, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";

interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
}

/**
 * Input avec animations de focus et validation
 */
export function AnimatedInput({
  label,
  error,
  success,
  className = "",
  ...props
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <motion.label
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="block text-sm font-medium text-[#0F172A] mb-1"
        >
          {label}
        </motion.label>
      )}
      <motion.div
        whileFocus={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Input
          {...props}
          className={className}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
        />
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="text-sm text-red-600 mt-1"
          >
            {error}
          </motion.p>
        )}
        {success && !error && (
          <motion.p
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="text-sm text-green-600 mt-1"
          >
            ✓ Validé
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

