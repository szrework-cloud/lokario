"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, MessageSquare, Calendar, CheckCircle, Zap, TrendingUp, Clock, Target } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Centralisation",
    description: "Rassemble tous vos messages, emails et notifications dans une seule interface intuitive"
  },
  {
    icon: Calendar,
    title: "Planification",
    description: "Gère automatiquement vos rendez-vous et relances pour ne jamais rien oublier"
  },
  {
    icon: CheckCircle,
    title: "Suivi",
    description: "Suit l'avancement de vos tâches et projets avec une vue claire et actionnable"
  },
  {
    icon: Zap,
    title: "Automatisation",
    description: "Automatise les tâches répétitives grâce à l'IA pour gagner du temps chaque jour"
  }
];

// Animated counter hook
const useCounter = (end: number, duration: number = 2000, isVisible: boolean) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!isVisible) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isVisible]);
  
  return count;
};

export const LandingProductShowcase = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState<number[]>([]);

  const timeSaved = useCounter(12, 2000, isVisible);
  const tasksAutomated = useCounter(847, 2500, isVisible);
  const productivity = useCounter(34, 1800, isVisible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          features.forEach((_, index) => {
            setTimeout(() => {
              setVisibleFeatures(prev => [...prev, index]);
            }, 200 * (index + 1));
          });
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
      className="py-24 lg:py-32 bg-black relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-[#F97316]/5" />
      
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div 
          className={`text-center mb-16 lg:mb-24 transition-all duration-1500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isVisible ? 'opacity-100 translate-y-0 translate-x-0' : 'opacity-0 translate-y-32 -translate-x-32'
          }`}
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Découvrez Lokario, votre{" "}
            <span className="bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#F97316]/60 bg-clip-text text-transparent">
              assistant intelligent
            </span>
          </h2>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
            Une IA qui comprend votre métier et s'adapte à vos besoins pour simplifier votre quotidien
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Animated Stats Dashboard */}
          <div 
            className={`transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }}
          >
            <div className="relative">
              <div className="bg-black/50 backdrop-blur-sm rounded-3xl border border-[#334155]/30 p-6 lg:p-8 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F97316]/10 rounded-full">
                    <Sparkles className="w-4 h-4 text-[#F97316]" />
                    <span className="text-sm text-[#F97316] font-medium">Dashboard IA</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Time Saved */}
                  <div className="bg-gradient-to-br from-[#F97316]/10 to-[#F97316]/5 rounded-2xl p-4 border border-[#F97316]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-[#F97316]" />
                      <span className="text-xs text-white/60">Temps gagné</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">{timeSaved}</span>
                      <span className="text-lg text-[#F97316]">h</span>
                      <span className="text-xs text-white/60">/semaine</span>
                    </div>
                  </div>

                  {/* Productivity */}
                  <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl p-4 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-white/60">Productivité</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">+{productivity}</span>
                      <span className="text-lg text-green-500">%</span>
                    </div>
                  </div>
                </div>

                {/* Animated Graph */}
                <div className="bg-[#F9FAFB]/20 rounded-2xl p-4 border border-[#E5E7EB]/20 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-white/60">Tâches automatisées</span>
                    <span className="text-sm font-medium text-[#F97316]">{tasksAutomated}</span>
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    {[40, 55, 45, 70, 60, 85, 75, 90, 80, 95, 88, 100].map((height, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-gradient-to-t from-[#F97316] to-[#F97316]/60 rounded-t transition-all duration-1000"
                        style={{ 
                          height: isVisible ? `${height}%` : '0%',
                          transitionDelay: `${i * 100}ms`
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Tasks Preview */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-[#334155]/20">
                    <div className={`w-5 h-5 rounded-full border-2 border-[#F97316] flex items-center justify-center transition-all duration-500 ${isVisible ? 'bg-[#F97316]' : ''}`}>
                      <CheckCircle className={`w-3 h-3 text-white transition-all duration-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
                    </div>
                    <span className="text-sm text-white/70 flex-1">Relance client envoyée automatiquement</span>
                    <span className="text-xs text-green-500">✓ Auto</span>
                  </div>
                  <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-[#334155]/20">
                    <div className={`w-5 h-5 rounded-full border-2 border-[#F97316] flex items-center justify-center transition-all duration-700 delay-300 ${isVisible ? 'bg-[#F97316]' : ''}`}>
                      <CheckCircle className={`w-3 h-3 text-white transition-all duration-500 delay-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
                    </div>
                    <span className="text-sm text-white/70 flex-1">Facture générée et envoyée</span>
                    <span className="text-xs text-green-500">✓ Auto</span>
                  </div>
                  <div className="flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-[#334155]/20">
                    <div className={`w-5 h-5 rounded-full border-2 border-[#F97316] flex items-center justify-center transition-all duration-900 delay-500 ${isVisible ? 'bg-[#F97316]' : ''}`}>
                      <Target className={`w-3 h-3 text-white transition-all duration-500 delay-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
                    </div>
                    <span className="text-sm text-white/70 flex-1">Objectif mensuel atteint</span>
                    <span className="text-xs text-[#F97316]">+15%</span>
                  </div>
                </div>
              </div>

              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-[#F97316]/10 via-transparent to-[#F97316]/5 rounded-3xl blur-3xl -z-10" />
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isEven = index % 2 === 0;
              return (
                <div 
                  key={index}
                  className={`flex gap-4 transition-all duration-1000 ${
                    visibleFeatures.includes(index) 
                      ? 'opacity-100 translate-x-0' 
                      : `opacity-0 ${isEven ? 'translate-x-32' : '-translate-x-32'}`
                  }`}
                  style={{ 
                    transitionDelay: `${200 * (index + 1)}ms`,
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div className="flex-shrink-0 mt-1">
                    <Sparkles className="w-5 h-5 text-[#F97316]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
