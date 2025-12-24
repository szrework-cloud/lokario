"use client";

import { useEffect, useRef, useState } from "react";
import { Users, FileText, FolderKanban, Calendar, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const pillars = [
  { icon: Users, label: "Suivi clients" },
  { icon: FileText, label: "Devis & factures" },
  { icon: FolderKanban, label: "Projets" },
  { icon: Calendar, label: "Organisation" },
];

const floatingItems = [
  { text: "où en est chaque client", angle: -90, distance: 140, mobileIndex: 0 },
  { text: "ce qui a été envoyé", angle: 0, distance: 140, mobileIndex: 1 },
  { text: "ce qui reste à faire", angle: 180, distance: 140, mobileIndex: 2 },
  { text: "ce qui arrive ensuite", angle: 90, distance: 140, mobileIndex: 3 },
];

export const LandingSolutionSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden bg-black"
    >
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#F97316]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Un seul système.
          </h2>
          <p className="text-xl md:text-2xl text-[#F97316] font-medium">
            Pour gérer toute votre activité.
          </p>
        </div>

        {/* Pillars */}
        <div
          className={`max-w-4xl mx-auto mb-16 transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-center text-white/70 mb-8 text-lg">
            Lokario centralise ce qui fait avancer votre entreprise
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {pillars.map((pillar, index) => (
              <div
                key={pillar.label}
                className="flex items-center gap-3 px-5 py-3 bg-[#1E293B] border border-white/5 rounded-full transition-all duration-500 hover:border-[#F97316]/30 hover:bg-[#F97316]/5"
                style={{
                  transitionDelay: isVisible ? `${300 + index * 100}ms` : "0ms",
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(20px)",
                }}
              >
                <pillar.icon className="w-5 h-5 text-[#F97316]" />
                <span className="text-white font-medium">{pillar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Puzzle animation with floating words */}
        <div
          className={`mb-20 transition-all duration-700 delay-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-center text-white font-semibold mb-12 text-lg">
            Vous savez :
          </p>

          {/* Desktop: floating words around center */}
          <div className="hidden md:flex relative h-[350px] items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#F97316]/40" />
            {floatingItems.map((item, index) => {
              const baseAngle = item.angle * (Math.PI / 180);
              const x = Math.cos(baseAngle) * item.distance;
              const y = Math.sin(baseAngle) * item.distance;
              
              return (
                <div
                  key={item.text}
                  className="absolute flex items-center gap-2 px-4 py-2 bg-[#1E293B]/80 backdrop-blur-sm border border-white/5 rounded-full shadow-lg"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: isVisible ? 'translate(-50%, -50%) translateY(0)' : 'translate(-50%, -50%) translateY(20px)',
                    animation: isVisible ? `float-word 3s ease-in-out infinite ${index * 0.4}s` : 'none',
                    opacity: isVisible ? 1 : 0,
                    transition: `opacity 0.6s ease-out ${1.2 + index * 0.2}s, transform 0.6s ease-out ${1.2 + index * 0.2}s`,
                  }}
                >
                  <div className="w-5 h-5 rounded-full bg-[#F97316]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F97316]" />
                  </div>
                  <span className="text-white text-base whitespace-nowrap">{item.text}</span>
                </div>
              );
            })}
          </div>

          {/* Mobile: vertical list */}
          <div className="flex md:hidden flex-col gap-3 px-2">
            {floatingItems.map((item, index) => (
              <div
                key={item.text}
                className="flex items-center gap-3 px-4 py-3 bg-[#1E293B]/80 backdrop-blur-sm border border-white/5 rounded-xl shadow-sm"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                  transition: `opacity 0.5s ease-out ${0.8 + index * 0.15}s, transform 0.5s ease-out ${0.8 + index * 0.15}s`,
                }}
              >
                <div className="w-8 h-8 rounded-full bg-[#F97316]/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-[#F97316]" />
                </div>
                <span className="text-white text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tagline */}
        <div
          className={`text-center max-w-xl mx-auto mb-10 transition-all duration-700 delay-[1100ms] ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-white text-xl md:text-2xl font-semibold">
            Un système clair. <span className="text-[#F97316]">Pas une usine à gaz.</span>
          </p>
        </div>

        {/* CTA */}
        <div
          className={`text-center transition-all duration-700 delay-[1300ms] ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-white/70 mb-6">
            Vous ouvrez Lokario, et vous voyez{" "}
            <span className="text-white font-medium">l'essentiel</span>.
          </p>
          <Link href="/register">
            <Button variant="primary" size="lg" className="group">
              Découvrir Lokario
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-word {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-6px); }
        }
      `}} />
    </section>
  );
};

