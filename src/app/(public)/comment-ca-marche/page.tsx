"use client";

import { LandingHeader } from "@/components/landing/Header";
import { LandingFooter } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Zap, Users, Calendar, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Configurez votre espace",
    description: "Créez votre compte en 30 secondes. Ajoutez les informations de votre entreprise et invitez votre équipe.",
    icon: Users,
    features: ["Inscription gratuite", "Configuration rapide", "Multi-utilisateurs"],
  },
  {
    number: "02",
    title: "Centralisez votre activité",
    description: "Gérez vos clients, projets, devis et factures depuis une seule interface. Planifiez vos rendez-vous et tâches.",
    icon: Calendar,
    features: ["Clients & projets", "Devis & factures", "Tâches & rendez-vous"],
  },
  {
    number: "03",
    title: "Automatisez vos relances",
    description: "L'IA génère et envoie vos relances automatiquement. Plus rien ne passe entre les mailles du filet.",
    icon: Zap,
    features: ["Relances intelligentes", "Emails & SMS auto", "Suivi en temps réel"],
  },
];

const benefits = [
  { title: "Gain de temps", value: "10h", suffix: "/semaine", description: "économisées en moyenne" },
  { title: "Taux de réponse", value: "+45", suffix: "%", description: "sur vos relances" },
  { title: "Satisfaction", value: "98", suffix: "%", description: "de clients satisfaits" },
];

export default function CommentCaMarchePage() {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [visibleBenefits, setVisibleBenefits] = useState(false);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  const benefitsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    stepsRef.current.forEach((ref, index) => {
      if (ref) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setVisibleSteps((prev) => [...new Set([...prev, index])]);
            }
          },
          { threshold: 0.3 }
        );
        observer.observe(ref);
        observers.push(observer);
      }
    });

    if (benefitsRef.current) {
      const benefitsObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleBenefits(true);
          }
        },
        { threshold: 0.3 }
      );
      benefitsObserver.observe(benefitsRef.current);
      observers.push(benefitsObserver);
    }

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <LandingHeader />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#F97316]/5 via-[#F97316]/3 to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F97316]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#F97316]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#F97316]/10 text-[#F97316] text-sm font-medium mb-6 animate-fade-up">
                Comment ça marche
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-up text-white" style={{ animationDelay: "0.1s" }}>
                Simplifiez votre quotidien en{" "}
                <span className="bg-gradient-to-r from-[#F97316] to-[#EA580C] bg-clip-text text-transparent">3 étapes</span>
              </h1>
              <p className="text-xl text-white/70 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
                Pas de configuration complexe, pas de courbe d'apprentissage. 
                Lokario est conçu pour être opérationnel en quelques minutes.
              </p>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-20 lg:py-32 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              {/* Vertical line connector */}
              <div className="hidden lg:block absolute left-1/2 top-32 bottom-32 w-px bg-gradient-to-b from-[#F97316] via-[#F97316]/50 to-[#F97316]" />
              
              <div className="space-y-24 lg:space-y-32">
                {steps.map((step, index) => {
                  const isVisible = visibleSteps.includes(index);
                  const isEven = index % 2 === 0;
                  const Icon = step.icon;
                  
                  return (
                    <div
                      key={step.number}
                      ref={(el) => { stepsRef.current[index] = el; }}
                      className={`relative flex flex-col lg:flex-row items-center gap-8 lg:gap-16 transition-all duration-1500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-40"
                      } ${isEven ? "" : "lg:flex-row-reverse"}`}
                    >
                      {/* Number Badge - Center on desktop */}
                      <div className="lg:absolute lg:left-1/2 lg:-translate-x-1/2 z-20">
                        <div 
                          className={`w-20 h-20 rounded-2xl bg-gradient-to-r from-[#F97316] to-[#EA580C] flex items-center justify-center shadow-lg transition-all duration-700 ${
                            isVisible ? "scale-100 rotate-0" : "scale-50 rotate-12"
                          }`}
                          style={{ transitionDelay: "0.2s" }}
                        >
                          <span className="font-display text-2xl font-bold text-white">
                            {step.number}
                          </span>
                        </div>
                      </div>

                      {/* Content Card */}
                      <div 
                        className={`flex-1 lg:w-5/12 ${isEven ? "lg:pr-24" : "lg:pl-24"}`}
                        style={{ transitionDelay: "0.3s" }}
                      >
                        <div 
                          className={`p-8 rounded-3xl bg-black/50 border border-[#334155]/50 backdrop-blur-sm transition-all duration-1200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[#F97316]/30 hover:shadow-lg ${
                            isVisible ? "opacity-100 translate-x-0" : `opacity-0 ${isEven ? "-translate-x-24" : "translate-x-24"}`
                          }`}
                        >
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-[#F97316]/10 flex items-center justify-center">
                              <Icon className="w-6 h-6 text-[#F97316]" />
                            </div>
                            <h3 className="font-display text-2xl font-semibold text-white">
                              {step.title}
                            </h3>
                          </div>
                          <p className="text-white/70 text-lg leading-relaxed mb-6">
                            {step.description}
                          </p>
                          <ul className="space-y-3">
                            {step.features.map((feature, i) => (
                              <li 
                                key={feature} 
                                className={`flex items-center gap-3 text-white/70 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                  isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-16"
                                }`}
                                style={{ transitionDelay: `${0.5 + i * 0.1}s` }}
                              >
                                <CheckCircle2 className="w-5 h-5 text-[#F97316] flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Visual/Icon Side */}
                      <div className={`flex-1 lg:w-5/12 hidden lg:flex ${isEven ? "lg:pl-24 justify-start" : "lg:pr-24 justify-end"}`}>
                        <div 
                          className={`w-48 h-48 rounded-3xl bg-gradient-to-br from-[#F97316]/20 to-[#F97316]/10 flex items-center justify-center transition-all duration-1000 ${
                            isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
                          }`}
                          style={{ transitionDelay: "0.4s" }}
                        >
                          <Icon className="w-20 h-20 text-[#F97316]/60" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section ref={benefitsRef} className="py-20 lg:py-32 relative bg-black/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2 
                className={`font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 transition-all duration-1200 ease-[cubic-bezier(0.16,1,0.3,1)] text-white ${
                  visibleBenefits ? "opacity-100 translate-y-0" : "opacity-0 translate-y-24"
                }`}
              >
                Des résultats <span className="bg-gradient-to-r from-[#F97316] to-[#EA580C] bg-clip-text text-transparent">mesurables</span>
              </h2>
              <p 
                className={`text-lg text-white/70 transition-all duration-1200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  visibleBenefits ? "opacity-100 translate-y-0" : "opacity-0 translate-y-24"
                }`}
                style={{ transitionDelay: "0.1s" }}
              >
                Nos utilisateurs constatent des améliorations significatives dès les premières semaines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {benefits.map((benefit, index) => (
                <div 
                  key={benefit.title}
                  className={`text-center p-8 rounded-3xl bg-black/50 border border-[#334155]/50 backdrop-blur-sm transition-all duration-1200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[#F97316]/30 hover:shadow-lg ${
                    visibleBenefits ? "opacity-100 translate-y-0" : "opacity-0 translate-y-24"
                  }`}
                  style={{ transitionDelay: `${0.2 + index * 0.1}s` }}
                >
                  <div className="font-display text-5xl font-bold bg-gradient-to-r from-[#F97316] to-[#EA580C] bg-clip-text text-transparent mb-2">
                    Jusqu'à {benefit.value}<span className="text-3xl">{benefit.suffix}</span>
                  </div>
                  <div className="text-white font-medium mb-1">{benefit.title}</div>
                  <div className="text-white/60 text-sm">{benefit.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-[#F97316]/5 via-transparent to-transparent" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-white">
                Prêt à <span className="bg-gradient-to-r from-[#F97316] to-[#EA580C] bg-clip-text text-transparent">commencer</span> ?
              </h2>
              <p className="text-lg text-white/70 mb-8">
                Rejoignez des centaines d'entrepreneurs qui ont simplifié leur quotidien avec Lokario.
              </p>
              <Link href="/register">
                <Button variant="primary" size="lg" className="group">
                  Essayer gratuitement
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
