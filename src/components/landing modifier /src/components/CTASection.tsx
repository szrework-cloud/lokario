import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="relative py-32 lg:py-48 overflow-hidden">
      {/* Perspective grid background */}
      <div className="absolute inset-0">
        {/* Central glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/30 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-primary/50 blur-[80px] rounded-full" />
        
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
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
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
              className="absolute bottom-0 w-px h-[60%] bg-gradient-to-t from-primary/40 via-primary/20 to-transparent"
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
              className="absolute bottom-0 w-px h-[60%] bg-gradient-to-t from-primary/40 via-primary/20 to-transparent"
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
        <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
          Bienvenue dans l'ère de
          <br />
          <span className="text-primary">l'assistant</span> intelligent
        </h2>
        
        <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
          L'IA qui gère votre activité, pas vos tâches
        </p>
        
        <Button
          variant="outline"
          size="lg"
          className="bg-background/80 backdrop-blur-sm border-border/30 text-white hover:bg-background/90 hover:border-primary/40 rounded-full px-8"
        >
          Parler à un expert
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </section>
  );
};
