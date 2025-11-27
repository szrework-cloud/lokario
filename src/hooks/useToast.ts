"use client";

import { useState, useCallback } from "react";

export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error" | "info";
    isVisible: boolean;
  }>({
    message: "",
    type: "success",
    isVisible: false,
  });

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ message, type, isVisible: true });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  return { toast, showToast, hideToast };
}

