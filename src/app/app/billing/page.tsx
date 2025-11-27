"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function BillingPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Rediriger vers la page des devis par défaut
    router.replace("/app/billing/quotes");
  }, [router]);

  return null; // Redirection en cours
}

