"use client";

import { LandingHeader } from "@/components/landing/Header";
import { LandingHero } from "@/components/landing/Hero";
import { LandingProductShowcase } from "@/components/landing/ProductShowcase";
import { LandingFeaturesGrid } from "@/components/landing/FeaturesGrid";
import { LandingCTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/Footer";
import { useEffect } from "react";

export default function LandingPage() {
  useEffect(() => {
    // Forcer le fond noir sur le body pour la landing page
    document.body.style.backgroundColor = "#000000";
    
    // Nettoyer au démontage (si nécessaire)
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-black w-full">
      <LandingHeader />
      <main className="bg-black w-full">
        <LandingHero />
        <LandingProductShowcase />
        <LandingFeaturesGrid />
        <LandingCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
