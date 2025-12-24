"use client";

import { Button } from "@/components/ui/Button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export const LandingHero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/videos/hero-background.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for 30% brightness (70% darkening) */}
        <div className="absolute inset-0 bg-black/70" />
        {/* Bottom gradient fade to background */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-24 lg:pt-32 pb-16 lg:pb-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* Headline */}
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.95] tracking-wide mb-6">
            <span className="text-white/90">L'outil qui </span>
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">organise</span>
            <span className="text-white/90"> votre entreprise</span>
            <br className="hidden sm:block" />
            <span className="text-white/60"> sans vous </span>
            <span className="bg-gradient-to-r from-[#F97316]/80 via-[#F97316] to-[#F97316]/60 bg-clip-text text-transparent font-semibold">surcharger</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-white/70 max-w-xl mx-auto mb-10 animate-fade-up">
            Lokario centralise tâches, messages, relances, devis, factures et suivi client pour que votre entreprise reste
            organisée sans effort.
          </p>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up">
            <Link href="/register">
              <Button variant="ghost" size="xl" className="bg-transparent border border-white/20 text-white hover:bg-white/5 hover:border-white/30 font-medium px-8">
                Découvrir Lokario
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
