"use client";

import { LandingHeader } from "@/components/landing/Header";
import { LandingHero } from "@/components/landing/Hero";
import { LandingProductShowcase } from "@/components/landing/ProductShowcase";
import { LandingFeaturesGrid } from "@/components/landing/FeaturesGrid";
import { LandingCTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black fixed inset-0 overflow-y-auto">
      <LandingHeader />
      <main className="bg-black">
        <LandingHero />
        <LandingProductShowcase />
        <LandingFeaturesGrid />
        <LandingCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
