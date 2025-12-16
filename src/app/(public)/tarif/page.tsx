"use client";

import { LandingHeader } from "@/components/landing/Header";
import { LandingPricing } from "@/components/landing/Pricing";
import { LandingFooter } from "@/components/landing/Footer";

export default function TarifPage() {
  return (
    <div className="min-h-screen bg-black">
      <LandingHeader />
      <main className="pt-20">
        <LandingPricing />
      </main>
      <LandingFooter />
    </div>
  );
}
