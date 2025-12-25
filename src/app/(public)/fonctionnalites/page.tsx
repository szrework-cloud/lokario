"use client";

import { LandingHeader } from "@/components/landing/Header";
import { LandingFooter } from "@/components/landing/Footer";
import { LandingCTASection } from "@/components/landing/CTASection";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Inbox, 
  Bell, 
  Users, 
  FolderKanban, 
  FileText, 
  Calendar, 
  Zap,
  TrendingUp,
  Clock,
  Shield,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const modules = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    subtitle: "Vue d'ensemble intelligente",
    description: "Visualisez vos performances en temps réel avec des KPIs clairs : devis, CA, factures, relances. Graphiques de suivi et planning du jour intégrés.",
    features: ["KPIs temps réel", "Graphiques de performance", "Planning quotidien", "Actions rapides"],
    gradient: "from-[#F97316]/20 to-[#F97316]/5",
    screenshot: "/assets/screenshots/dashboard-time.png"
  },
  {
    icon: CheckSquare,
    title: "Tâches",
    subtitle: "Organisation optimale",
    description: "Créez, assignez et suivez vos tâches avec priorités, checklists et notifications. Vue calendrier ou liste selon vos préférences.",
    features: ["Priorités & statuts", "Checklists intégrées", "Assignation équipe", "Notifications auto"],
    gradient: "from-emerald-500/20 to-emerald-500/5",
    screenshot: "/assets/screenshots/taches.png"
  },
  {
    icon: Inbox,
    title: "Inbox",
    subtitle: "Communications centralisées",
    description: "Tous vos emails et SMS au même endroit. L'IA classe automatiquement, identifie les expéditeurs et suggère des réponses pertinentes.",
    features: ["Classification IA", "Réponses suggérées", "Dossiers personnalisés", "Réponses automatiques"],
    gradient: "from-blue-500/20 to-blue-500/5",
    screenshot: "/assets/screenshots/inbox.png"
  },
  {
    icon: Bell,
    title: "Relances",
    subtitle: "Suivi automatisé",
    description: "Relances automatiques de devis, factures et informations. L'IA génère des messages personnalisés envoyés au bon moment.",
    features: ["Relances auto", "Messages IA", "Email & SMS", "Statistiques"],
    gradient: "from-amber-500/20 to-amber-500/5",
    screenshot: "/assets/screenshots/relances.png"
  },
  {
    icon: Users,
    title: "Clients",
    subtitle: "CRM simplifié",
    description: "Gérez votre base clients avec toutes les informations essentielles, l'historique des interactions et les documents associés.",
    features: ["Fiches complètes", "Historique interactions", "Documents associés", "Stats par client"],
    gradient: "from-violet-500/20 to-violet-500/5",
    screenshot: "/assets/screenshots/clients.png"
  },
  {
    icon: FolderKanban,
    title: "Projets",
    subtitle: "Suivi de A à Z",
    description: "Timeline des événements, gestion documentaire et suivi budgétaire. Gardez une vue claire sur l'avancement de chaque projet.",
    features: ["Timeline projet", "Gestion documents", "Suivi budget", "Statuts personnalisés"],
    gradient: "from-rose-500/20 to-rose-500/5",
    screenshot: "/assets/screenshots/projets.png"
  },
  {
    icon: FileText,
    title: "Devis & Factures",
    subtitle: "Facturation professionnelle",
    description: "Créez des devis signables en ligne, convertissez-les en factures automatiquement. Conformité réglementaire garantie.",
    features: ["Signature électronique", "Conversion auto", "Suivi paiements", "PDF conformes"],
    gradient: "from-cyan-500/20 to-cyan-500/5",
    screenshot: "/assets/screenshots/devis-factures.png"
  },
  {
    icon: Calendar,
    title: "Rendez-vous",
    subtitle: "Agenda intelligent",
    description: "Vue calendrier ou liste, types de RDV personnalisables, disponibilités et rappels automatiques pour ne jamais rater un meeting.",
    features: ["Vue agenda", "Types personnalisés", "Disponibilités", "Rappels auto"],
    gradient: "from-indigo-500/20 to-indigo-500/5",
    screenshot: "/assets/screenshots/rendez-vous.png"
  }
];

const highlights = [
  {
    icon: Zap,
    title: "Automatisation IA",
    description: "L'intelligence artificielle travaille pour vous en arrière-plan"
  },
  {
    icon: TrendingUp,
    title: "Gain de temps",
    description: "Réduisez de 70% le temps passé sur les tâches administratives"
  },
  {
    icon: Clock,
    title: "Temps réel",
    description: "Toutes vos données synchronisées instantanément"
  },
  {
    icon: Shield,
    title: "Sécurité",
    description: "Vos données protégées selon les standards les plus stricts"
  }
];

export default function FonctionnalitesPage() {
  const [visibleModules, setVisibleModules] = useState<number[]>([]);
  const moduleRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    moduleRefs.current.forEach((ref, index) => {
      if (ref) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setVisibleModules((prev) => 
                  prev.includes(index) ? prev : [...prev, index]
                );
              }
            });
          },
          { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
        );
        observer.observe(ref);
        observers.push(observer);
      }
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <LandingHeader />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#F97316]/5 via-transparent to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F97316]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#F97316]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#F97316]/10 text-[#F97316] text-sm font-medium mb-6 animate-fade-up">
                Fonctionnalités
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-up text-white" style={{ animationDelay: "0.1s" }}>
                Tout ce dont vous avez besoin,{" "}
                <span className="bg-gradient-to-r from-[#F97316] to-[#EA580C] bg-clip-text text-transparent">au même endroit</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
                8 modules interconnectés, propulsés par l'IA, pour gérer votre entreprise sans complexité. Découvrez chaque fonctionnalité en détail.
              </p>
            </div>
          </div>
        </section>

        {/* Highlights Bar */}
        <section className="py-12 border-y border-[#334155]/30 bg-black/50 backdrop-blur-sm relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {highlights.map((highlight, index) => {
                const Icon = highlight.icon;
                return (
                  <div 
                    key={highlight.title}
                    className="flex items-center gap-4 animate-fade-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#F97316]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-[#F97316]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{highlight.title}</h3>
                      <p className="text-sm text-white/60">{highlight.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Modules Grid */}
        <section className="py-20 lg:py-32 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-0">
            <div className="grid gap-16 lg:gap-24">
              {modules.map((module, index) => {
                const isVisible = visibleModules.includes(index);
                const isEven = index % 2 === 0;
                const Icon = module.icon;
                
                return (
                  <div
                    key={module.title}
                    ref={(el) => { moduleRefs.current[index] = el; }}
                    className={`
                      relative transition-all duration-1000 ease-out
                      ${isVisible 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-16'
                      }
                    `}
                    style={{ transitionDelay: `${(index % 3) * 100}ms` }}
                  >
                    <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-16 items-center`}>
                      
                      {/* Text Content */}
                      <div className="flex-1 lg:w-1/2">
                        <div className={`
                          flex items-center gap-4 mb-6
                          ${isVisible ? 'animate-fade-up' : 'opacity-0 translate-y-24'}
                        `}
                        style={{ animationDelay: '0.1s' }}
                        >
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center border border-white/10`}>
                            <Icon className="w-7 h-7 text-[#F97316]" />
                          </div>
                          <div>
                            <h2 className="font-display text-2xl lg:text-3xl font-bold text-white">
                              {module.title}
                            </h2>
                            <p className="text-[#F97316] font-medium text-sm">{module.subtitle}</p>
                          </div>
                        </div>
                        
                        <p className={`
                          text-white/70 leading-relaxed mb-8 text-lg
                          ${isVisible ? 'animate-fade-up' : 'opacity-0 translate-y-24'}
                        `}
                        style={{ animationDelay: '0.2s' }}
                        >
                          {module.description}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {module.features.map((feature, featureIndex) => (
                            <div 
                              key={feature}
                              className={`
                                flex items-center gap-3 p-3 rounded-xl bg-black/50 border border-[#334155]/30
                                transition-all duration-500 hover:border-[#F97316]/30 hover:bg-black/80
                                ${isVisible ? 'animate-fade-up' : 'opacity-0 translate-y-24'}
                              `}
                              style={{ transitionDelay: `${0.3 + featureIndex * 0.1}s` }}
                            >
                              <div className="w-2 h-2 rounded-full bg-[#F97316] flex-shrink-0" />
                              <span className="text-sm text-white">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Screenshot Preview */}
                      <div className={`
                        flex-1 lg:w-1/2
                        ${isVisible ? 'animate-fade-up' : 'opacity-0 translate-y-24'}
                      `}
                      style={{ animationDelay: '0.3s' }}
                      >
                        <div className="relative group">
                          {/* Glow effect */}
                          <div className={`absolute -inset-4 bg-gradient-to-br ${module.gradient} rounded-3xl opacity-30 blur-2xl group-hover:opacity-50 transition-opacity duration-500`} />
                          
                          {/* Preview Container */}
                          <div className="relative rounded-2xl border border-[#334155]/50 bg-black/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20 group-hover:border-[#F97316]/30 transition-colors duration-500">
                            {/* Screenshot */}
                            {module.screenshot ? (
                              <div className="relative overflow-hidden">
                                <Image 
                                  src={module.screenshot} 
                                  alt={`Capture d'écran ${module.title}`}
                                  width={800}
                                  height={500}
                                  className="w-full h-auto object-cover brightness-[0.85]"
                                />
                                {/* Overlay gradient for polish */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                              </div>
                            ) : (
                              <div className="aspect-[16/10] bg-gradient-to-br from-[#1E293B]/20 via-[#1E293B]/10 to-[#1E293B]/5 flex items-center justify-center p-8 relative overflow-hidden">
                                <div className="relative z-10 text-center">
                                  <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
                                    <Icon className="w-10 h-10 text-[#F97316]" />
                                  </div>
                                  <p className="text-white/60 text-sm font-medium">{module.subtitle}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Separator gradient */}
                    {index < modules.length - 1 && (
                      <div className="mt-16 lg:mt-24 h-px bg-gradient-to-r from-transparent via-[#334155]/50 to-transparent" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <LandingCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
