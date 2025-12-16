"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const LandingCTASection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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
    <section ref={sectionRef} className="relative py-32 lg:py-48 overflow-hidden bg-black">
      {/* Perspective grid background */}
      <div className="absolute inset-0">
        {/* Central glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#F97316]/30 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-[#F97316]/50 blur-[80px] rounded-full" />
        
        {/* Grid perspective effect */}
        <div 
          className="absolute inset-0"
          style={{
            perspective: '1000px',
            perspectiveOrigin: 'center 40%',
          }}
        >
          {/* Horizontal lines */}
          <div 
            className="absolute left-0 right-0 h-full"
            style={{
              transform: 'rotateX(60deg)',
              transformOrigin: 'center top',
            }}
          >
            {[...Array(12)].map((_, i) => (
              <div
                key={`h-${i}`}
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F97316]/40 to-transparent"
                style={{
                  top: `${15 + i * 8}%`,
                }}
              />
            ))}
          </div>
          
          {/* Vertical lines - left side */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`vl-${i}`}
              className="absolute bottom-0 w-px h-[60%] bg-gradient-to-t from-[#F97316]/40 via-[#F97316]/20 to-transparent"
              style={{
                left: `${50 - (i + 1) * 6}%`,
                transform: `rotateY(${5 + i * 2}deg)`,
                transformOrigin: 'bottom center',
              }}
            />
          ))}
          
          {/* Vertical lines - right side */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`vr-${i}`}
              className="absolute bottom-0 w-px h-[60%] bg-gradient-to-t from-[#F97316]/40 via-[#F97316]/20 to-transparent"
              style={{
                left: `${50 + (i + 1) * 6}%`,
                transform: `rotateY(-${5 + i * 2}deg)`,
                transformOrigin: 'bottom center',
              }}
            />
          ))}
        </div>
        
        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-1 h-1 bg-white/40 rounded-full" />
        <div className="absolute top-32 right-32 w-1.5 h-1.5 bg-white/30 rounded-full" />
        <div className="absolute bottom-40 left-1/4 w-1 h-1 bg-white/20 rounded-full" />
        <div className="absolute top-1/3 right-20 w-1 h-1 bg-white/30 rounded-full" />
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h2 
          className={`font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          Bienvenue dans l'ère de
          <br />
          <span className="text-[#F97316]">l'assistant</span> intelligent
        </h2>
        
        <p 
          className={`text-lg text-white/60 mb-10 max-w-xl mx-auto transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
          style={{ transitionDelay: '0.1s' }}
        >
          L'IA qui gère votre activité, pas vos tâches
        </p>
        
        <div 
          className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
          style={{ transitionDelay: '0.2s' }}
        >
          <Link href="/contact">
            <Button
              variant="secondary"
              size="lg"
              className="bg-transparent backdrop-blur-sm border border-white/20 text-white hover:bg-white/5 hover:border-white/30 rounded-full px-8 inline-flex items-center gap-2"
            >
              <span>Parler à un expert</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
