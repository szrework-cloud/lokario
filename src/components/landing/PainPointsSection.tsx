"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, ListTodo, Bell, Calendar, Brain } from "lucide-react";

export const LandingPainPointsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const painPoints = [
    { icon: MessageSquare, text: "Les messages arrivent de partout.", delay: 0.2 },
    { icon: ListTodo, text: "Les tâches s'empilent.", delay: 0.4 },
    { icon: Bell, text: "Les relances attendent.", delay: 0.6 },
    { icon: Calendar, text: 'Les rendez-vous se notent "pour plus tard".', delay: 0.8 },
  ];

  return (
    <section ref={sectionRef} className="relative py-32 overflow-hidden bg-black">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#1E293B]/20 to-black" />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`absolute top-20 left-1/4 w-96 h-96 bg-[#F97316]/5 rounded-full blur-3xl transition-all duration-1000 ${
            isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
        />
        <div
          className={`absolute bottom-20 right-1/4 w-80 h-80 bg-[#EA580C]/5 rounded-full blur-3xl transition-all duration-1000 delay-300 ${
            isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main headline */}
          <div className="text-center mb-16">
            <h2
              className={`font-display text-4xl sm:text-5xl lg:text-6xl text-white mb-4 transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              Le quotidien <span className="bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#F97316]/60 bg-clip-text text-transparent">déborde.</span>
            </h2>
            <p
              className={`text-xl sm:text-2xl text-white/70 transition-all duration-700 delay-100 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              Pas par manque de volonté.
            </p>
          </div>

          {/* Pain points with motion design */}
          <div className="relative mb-16">
            {/* Desktop: Central chaos illustration */}
            <div className="hidden md:flex justify-center mb-12">
              <div className="relative">
                {/* Central brain icon */}
                <div
                  className={`relative z-10 w-24 h-24 rounded-full bg-[#1E293B] border border-white/10 flex items-center justify-center transition-all duration-700 delay-200 ${
                    isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
                  }`}
                >
                  <Brain className="w-12 h-12 text-[#F97316]" />
                </div>

                {/* Orbiting icons */}
                {painPoints.map((point, index) => {
                  const angle = index * 90 - 45;
                  const radius = 100;
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;

                  return (
                    <div
                      key={index}
                      className={`absolute w-12 h-12 rounded-full bg-[#1E293B]/80 border border-white/5 flex items-center justify-center transition-all duration-700 ${
                        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
                      }`}
                      style={{
                        left: `calc(50% + ${x}px - 24px)`,
                        top: `calc(50% + ${y}px - 24px)`,
                        transitionDelay: `${point.delay}s`,
                        animation: isVisible ? `orbit-${index} 8s ease-in-out infinite ${point.delay}s` : "none",
                      }}
                    >
                      <point.icon className="w-5 h-5 text-[#F97316]/70" />
                    </div>
                  );
                })}

                {/* Connecting lines */}
                {painPoints.map((_, index) => {
                  const angle = index * 90 - 45;
                  return (
                    <div
                      key={`line-${index}`}
                      className={`absolute left-1/2 top-1/2 h-px bg-gradient-to-r from-[#F97316]/20 to-transparent origin-left transition-all duration-700 ${
                        isVisible ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                      }`}
                      style={{
                        width: "80px",
                        transform: `rotate(${angle}deg)`,
                        transitionDelay: `${0.3 + index * 0.1}s`,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Mobile: simplified brain icon */}
            <div className="flex md:hidden justify-center mb-8">
              <div
                className={`w-16 h-16 rounded-full bg-[#1E293B] border border-white/10 flex items-center justify-center transition-all duration-700 delay-200 ${
                  isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
                }`}
              >
                <Brain className="w-8 h-8 text-[#F97316]" />
              </div>
            </div>

            {/* Pain points text list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {painPoints.map((point, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-lg bg-[#1E293B]/50 border border-white/5 backdrop-blur-sm transition-all duration-500 hover:bg-[#1E293B]/80 hover:border-[#F97316]/30 ${
                    isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                  }`}
                  style={{ transitionDelay: `${point.delay + 0.3}s` }}
                >
                  <div className="w-10 h-10 rounded-full bg-[#F97316]/10 flex items-center justify-center flex-shrink-0">
                    <point.icon className="w-5 h-5 text-[#F97316]" />
                  </div>
                  <span className="text-white/90 text-sm sm:text-base">{point.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Solution hint */}
          <div
            className={`text-center p-8 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#334155]/30 border border-white/5 transition-all duration-700 delay-[1.2s] ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <p className="text-lg text-white/80 mb-2">Vous ne manquez pas d'organisation.</p>
            <p className="text-xl sm:text-2xl font-display text-white">
              Vous manquez d'un <span className="bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#F97316]/60 bg-clip-text text-transparent">endroit unique</span> pour tout suivre.
            </p>
          </div>
        </div>
      </div>

      {/* Custom keyframes for orbiting animation - reduced movement */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes orbit-0 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-2px, 3px); }
        }
        @keyframes orbit-1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(3px, 2px); }
        }
        @keyframes orbit-2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(2px, -3px); }
        }
        @keyframes orbit-3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-3px, -2px); }
        }
      `}} />
    </section>
  );
};

