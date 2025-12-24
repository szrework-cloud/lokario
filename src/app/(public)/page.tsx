"use client";

import { LandingHeader } from "@/components/landing/Header";
import { LandingHero } from "@/components/landing/Hero";
import { LandingPainPointsSection } from "@/components/landing/PainPointsSection";
import { LandingSolutionSection } from "@/components/landing/SolutionSection";
import { LandingValueSection } from "@/components/landing/ValueSection";
import { LandingFeaturesGrid } from "@/components/landing/FeaturesGrid";
import { LandingFAQSection } from "@/components/landing/FAQSection";
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
        <LandingPainPointsSection />
        <LandingSolutionSection />
        <LandingValueSection />
        <LandingFeaturesGrid />
        <LandingFAQSection />
        <LandingCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
