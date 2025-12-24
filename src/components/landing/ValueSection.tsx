"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Users, Zap, TrendingUp, CheckCircle2, Sparkles } from "lucide-react";

const stats = [
  { icon: Clock, value: 10, suffix: "h", label: "Jusqu'à 10h par semaine libérées sur l'organisation", color: "from-[#F97316] to-[#EA580C]", prefix: "Jusqu'à " },
  { icon: Users, value: 100, suffix: "+", label: "clients satisfaits", color: "from-[#EA580C] to-[#F97316]", prefix: "" },
  { icon: TrendingUp, value: 70, suffix: " %", label: "Une charge mentale nettement réduite", color: "from-[#F97316] to-[#EA580C]", prefix: "" },
];

const features = [
  "Tout suivre depuis un seul endroit",
  "Relances et rappels automatisés qui ne s'oublient pas",
  "Clients, projets et documents liés entre eux",
];

export const LandingValueSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [counters, setCounters] = useState([0, 0, 0]);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Animate counters
          const targets = [10, 100, 70];
          const duration = 2000;
          const startTime = Date.now();

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setCounters(targets.map((target) => Math.round(target * eased)));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 relative overflow-hidden bg-black">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#F97316]/5 to-black" />

      {/* Animated orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#F97316]/10 rounded-full blur-[100px] animate-pulse" />
      <div
        className="absolute bottom-20 right-10 w-96 h-96 bg-[#EA580C]/10 rounded-full blur-[120px] animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Main headline */}
          <div
            className={`text-center mb-16 transition-all duration-1200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-32"}`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F97316]/10 border border-[#F97316]/20 rounded-full text-[#F97316] text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Votre assistant tout-en-un
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-white">Une organisation qui suit votre</span>
              <span className="bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#F97316]/60 bg-clip-text text-transparent"> rythme</span>
            </h2>
            <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              Quand tout est centralisé, le temps se
              <span className="text-[#F97316] font-semibold"> libère naturellement.</span>.
            </p>
          </div>

          {/* Stats with animated counters */}
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 transition-all duration-1200 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-32"}`}
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="relative group">
                  <div
                    className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl"
                    style={{
                      background: `linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(234, 88, 12, 0.3))`,
                    }}
                  />
                  <div className="relative bg-[#1E293B]/50 backdrop-blur-sm border border-white/5 rounded-2xl p-8 text-center hover:border-[#F97316]/30 transition-all duration-300 hover:-translate-y-1">
                    <div
                      className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                      {stat.prefix || ""}{counters[index]}{stat.suffix}
                    </div>
                    <div className="text-white/70 text-base">{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature list with staggered animation */}
          <div
            className={`bg-[#1E293B]/30 backdrop-blur-sm border border-white/5 rounded-3xl p-8 md:p-12 transition-all duration-1200 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-32"}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 transition-all duration-700`}
                  style={{
                    transitionDelay: `${600 + index * 150}ms`,
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateX(0)" : "translateX(-32px)",
                  }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#F97316]/10 border border-[#F97316]/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-[#F97316]" />
                  </div>
                  <span className="text-lg text-white">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

