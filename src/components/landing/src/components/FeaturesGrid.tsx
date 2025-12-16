import { useEffect, useRef, useState } from "react";
import { FileText, Brain, CheckSquare, Inbox, CalendarDays } from "lucide-react";

const modules = [
  {
    icon: Inbox,
    title: "Boîte de réception centralisée",
    description: "Tous vos messages, emails et notifications regroupés dans une interface unique et intuitive."
  },
  {
    icon: FileText,
    title: "Devis & Factures",
    description: "Créez, envoyez et suivez vos devis et factures en quelques clics. Gestion automatique des relances et suivi des paiements."
  },
  {
    icon: Brain,
    title: "Relance IA",
    description: "L'intelligence artificielle analyse vos échanges et génère des relances personnalisées au bon moment."
  },
  {
    icon: CheckSquare,
    title: "Tâches",
    description: "Organisez vos tâches, définissez des priorités et suivez l'avancement de vos projets en temps réel."
  },
  {
    icon: CalendarDays,
    title: "Rendez-vous",
    description: "Planifiez, confirmez et gérez vos rendez-vous clients avec des rappels automatiques."
  }
];

export const FeaturesGrid = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let rafId: number | null = null;
    let ticking = false;

    const updateActiveIndex = () => {
      if (!containerRef.current) {
        ticking = false;
        return;
      }
      
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerHeight = container.offsetHeight;
      const viewportHeight = window.innerHeight;
      
      // Calculate scroll progress through the section
      const scrollProgress = Math.max(0, Math.min(1, 
        (viewportHeight - rect.top) / (containerHeight + viewportHeight * 0.5)
      ));
      
      // Determine which card should be active based on scroll
      const newIndex = Math.min(
        modules.length - 1,
        Math.floor(scrollProgress * modules.length)
      );
      
      setActiveIndex(newIndex);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        rafId = requestAnimationFrame(updateActiveIndex);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveIndex(); // Initial check
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section 
      ref={containerRef}
      className="min-h-[450vh] bg-background relative"
    >
      {/* Background effects */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          {/* Cards container */}
          <div className="relative h-[500px] flex items-center justify-center">
            {modules.map((module, index) => {
              const Icon = module.icon;
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;
              
              return (
                <div
                  key={index}
                  className="absolute w-full max-w-4xl mx-auto"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive 
                      ? 'translateY(0) scale(1)' 
                      : isPast 
                        ? 'translateY(-80px) scale(0.9)' 
                        : 'translateY(80px) scale(0.9)',
                    transition: 'all 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)',
                    pointerEvents: isActive ? 'auto' : 'none',
                  }}
                >
                  {/* Card */}
                  <div className="relative p-14 lg:p-20 rounded-3xl bg-card/30 backdrop-blur-sm border border-border/30 overflow-hidden">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                    
                    {/* Icon container */}
                    <div 
                      className="relative mb-10 inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/10 border border-primary/20"
                      style={{
                        animation: isActive ? 'pulse 3s ease-in-out infinite' : 'none',
                      }}
                    >
                      <Icon className="w-12 h-12 text-primary" />
                      
                      {/* Icon glow */}
                      <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl opacity-50" />
                    </div>
                    
                    {/* Content */}
                    <h3 className="relative text-4xl lg:text-5xl font-semibold text-foreground mb-6">
                      {module.title}
                    </h3>
                    <p className="relative text-xl lg:text-2xl text-muted-foreground leading-relaxed">
                      {module.description}
                    </p>
                    
                    {/* Bottom accent line */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
                      style={{
                        transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                        transition: 'transform 0.8s ease-out 0.2s',
                      }}
                    />
                  </div>
                  
                  {/* Outer glow */}
                  <div 
                    className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 to-transparent blur-2xl -z-10"
                    style={{
                      opacity: isActive ? 0.6 : 0,
                      transition: 'opacity 0.8s ease-out',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
