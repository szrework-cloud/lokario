"use client";

import { LandingHeader } from "@/components/landing/Header";
import { LandingFooter } from "@/components/landing/Footer";
import { Target, Users, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const values = [
  {
    icon: Target,
    title: "Simplicité",
    description: "Nous croyons que les outils professionnels doivent être simples à utiliser, sans formation complexe."
  },
  {
    icon: Zap,
    title: "Efficacité",
    description: "Chaque fonctionnalité est conçue pour vous faire gagner du temps et automatiser les tâches répétitives."
  },
  {
    icon: Users,
    title: "Proximité",
    description: "Nous écoutons nos utilisateurs et construisons Lokario avec eux, pour répondre à leurs vrais besoins."
  }
];

export default function AProposPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [valuesVisible, setValuesVisible] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === cardsRef.current && entry.isIntersecting) {
            setCardsVisible(true);
          }
          if (entry.target === valuesRef.current && entry.isIntersecting) {
            setValuesVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (cardsRef.current) observer.observe(cardsRef.current);
    if (valuesRef.current) observer.observe(valuesRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <LandingHeader />
      <main className="pt-32 pb-20 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Header with fade-in animation */}
            <div 
              className="text-center mb-16 transition-all duration-700 ease-out"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(30px)'
              }}
            >
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                À propos de Lokario
              </h1>
              <p className="text-xl text-white/70">
                L'assistant tout-en-un conçu pour les entrepreneurs qui veulent se concentrer sur l'essentiel.
              </p>
            </div>

            {/* Cards with staggered animation */}
            <div ref={cardsRef} className="prose prose-invert max-w-none mb-16">
              <div 
                className="p-8 rounded-2xl bg-black/50 border border-[#334155]/30 backdrop-blur-sm mb-8 transition-all duration-700 ease-out hover:border-[#F97316]/30 hover:bg-black/60"
                style={{
                  opacity: cardsVisible ? 1 : 0,
                  transform: cardsVisible ? 'translateX(0)' : 'translateX(-50px)',
                  transitionDelay: '0ms'
                }}
              >
                <h2 className="text-2xl font-semibold text-white mb-4">Notre mission</h2>
                <p className="text-white/70 leading-relaxed">
                  Lokario est né d'un constat simple : les petites entreprises passent trop de temps sur des tâches administratives 
                  au lieu de se concentrer sur leur cœur de métier. Notre mission est de leur offrir une plateforme unique, 
                  simple et intelligente qui centralise toute leur gestion quotidienne.
                </p>
              </div>

              <div 
                className="p-8 rounded-2xl bg-black/50 border border-[#334155]/30 backdrop-blur-sm transition-all duration-700 ease-out hover:border-[#F97316]/30 hover:bg-black/60"
                style={{
                  opacity: cardsVisible ? 1 : 0,
                  transform: cardsVisible ? 'translateX(0)' : 'translateX(50px)',
                  transitionDelay: '150ms'
                }}
              >
                <h2 className="text-2xl font-semibold text-white mb-4">Notre histoire</h2>
                <p className="text-white/70 leading-relaxed">
                  Fondé en 2025, Lokario est le fruit de plusieurs années d'expérience aux côtés des entrepreneurs. 
                  Nous avons compris leurs frustrations face aux outils complexes et dispersés. Aujourd'hui, 
                  nous construisons l'outil que nous aurions aimé avoir : simple, complet et propulsé par l'IA.
                </p>
              </div>
            </div>

            {/* Values with staggered fade-in */}
            <div ref={valuesRef} className="mb-16">
              <h2 
                className="text-2xl font-semibold text-white text-center mb-8 transition-all duration-500"
                style={{
                  opacity: valuesVisible ? 1 : 0,
                  transform: valuesVisible ? 'translateY(0)' : 'translateY(20px)'
                }}
              >
                Nos valeurs
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {values.map((value, index) => {
                  const Icon = value.icon;
                  return (
                    <div 
                      key={index}
                      className="p-6 rounded-2xl bg-black/50 border border-[#334155]/30 backdrop-blur-sm text-center transition-all duration-500 ease-out hover:scale-105 hover:border-[#F97316]/30 hover:bg-black/60 group"
                      style={{
                        opacity: valuesVisible ? 1 : 0,
                        transform: valuesVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
                        transitionDelay: `${200 + index * 150}ms`
                      }}
                    >
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#F97316]/10 border border-[#F97316]/20 mb-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#F97316]/20">
                        <Icon className="w-7 h-7 text-[#F97316] transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
                      <p className="text-sm text-white/60">{value.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
