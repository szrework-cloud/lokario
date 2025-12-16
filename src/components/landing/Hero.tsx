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
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white border border-white/20 mb-8 animate-fade-up" style={{ animationDelay: '0ms' }}>
            <Sparkles className="w-4 h-4 text-[#F97316]" />
            <span className="text-sm font-medium">Propulsé par l'IA</span>
          </div>

          {/* Headline - No animation delay to improve LCP */}
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.95] tracking-wide mb-6 text-white">
            Pilotez votre entreprise sans chaos
          </h1>

          {/* Subheadline - No delay for faster Speed Index */}
          <p className="text-lg sm:text-xl text-white/70 max-w-xl mb-10 animate-fade-up" style={{ animationDelay: '0ms' }}>
            Une seule interface simple et fiable pour centraliser vos messages, tâches, relances et rendez-vous.
          </p>

          {/* CTA Button - No delay for faster Speed Index */}
          <div className="flex flex-col sm:flex-row items-start gap-4 animate-fade-up" style={{ animationDelay: '0ms' }}>
            <Link href="/register">
              <Button variant="ghost" size="lg" className="bg-transparent border border-white/20 text-white hover:bg-white/5 hover:border-white/30 font-medium px-8 inline-flex items-center gap-2">
                <span>Démarrer un projet</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
