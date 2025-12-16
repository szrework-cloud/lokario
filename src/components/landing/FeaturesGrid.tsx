"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Brain, CheckSquare, Inbox, CalendarDays } from "lucide-react";

// Large contextual animations for each module
const InboxAnimation = ({ isActive }: { isActive: boolean }) => (
  <div className="relative w-full h-full flex items-center justify-center p-6">
    {/* Mini inbox interface */}
    <div 
      className="w-full max-w-sm rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden shadow-2xl"
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
        <span className="text-sm font-medium text-white">Messages</span>
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-5 rounded-full bg-[#F97316] flex items-center justify-center text-[10px] text-white font-bold"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'scale(1)' : 'scale(0)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s',
            }}
          >
            4
          </div>
        </div>
      </div>
      
      {/* Message list */}
      <div className="divide-y divide-white/10">
        {[
          { from: "Client A", subject: "Nouveau devis demandé", time: "2m", unread: true, color: "bg-blue-500" },
          { from: "Fournisseur", subject: "Confirmation commande", time: "15m", unread: true, color: "bg-green-500" },
          { from: "Support", subject: "Ticket #1234 résolu", time: "1h", unread: false, color: "bg-purple-500" },
          { from: "Équipe", subject: "Réunion demain 10h", time: "2h", unread: true, color: "bg-amber-500" },
        ].map((msg, i) => (
          <div
            key={i}
            className={`px-4 py-3 flex items-start gap-3 ${msg.unread ? 'bg-[#F97316]/5' : ''}`}
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'translateX(0)' : 'translateX(-30px)',
              transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.2 + i * 0.1}s`,
            }}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full ${msg.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
              {msg.from[0]}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm truncate ${msg.unread ? 'font-semibold text-white' : 'text-white/60'}`}>
                  {msg.from}
                </span>
                <span className="text-xs text-white/60 shrink-0">{msg.time}</span>
              </div>
              <p className={`text-xs truncate ${msg.unread ? 'text-white/80' : 'text-white/50'}`}>
                {msg.subject}
              </p>
            </div>
            {/* Unread indicator */}
            {msg.unread && (
              <div 
                className="w-2 h-2 rounded-full bg-[#F97316] shrink-0 mt-2"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? 'scale(1)' : 'scale(0)',
                  transition: `all 0.3s ease-out ${0.6 + i * 0.1}s`,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const InvoiceAnimation = ({ isActive }: { isActive: boolean }) => (
  <div className="relative w-full h-full flex items-center justify-center">
    {/* Stacked documents */}
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="absolute w-48 h-64 rounded-2xl bg-white/10 backdrop-blur-sm border border-[#F97316]/20 shadow-2xl"
        style={{
          right: `${20 + i * 30}px`,
          top: `${20 + i * 20}px`,
          opacity: isActive ? 1 - i * 0.15 : 0,
          transform: isActive 
            ? `rotate(${i * -8}deg) translateY(0)` 
            : `rotate(0deg) translateY(60px)`,
          transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${(2 - i) * 0.15}s`,
          zIndex: 3 - i,
        }}
      >
        <div className="p-5 space-y-3 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="w-16 h-4 bg-[#F97316]/40 rounded" />
            <div className="w-8 h-8 rounded-lg bg-[#F97316]/20" />
          </div>
          {/* Lines */}
          <div className="space-y-2 flex-1">
            <div className="w-full h-2 bg-white/20 rounded" />
            <div className="w-3/4 h-2 bg-white/20 rounded" />
            <div className="w-1/2 h-2 bg-white/20 rounded" />
            <div className="w-2/3 h-2 bg-white/20 rounded" />
          </div>
          {/* Amount */}
          <div className="pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="text-sm text-white/60">Total</span>
            <div className="w-20 h-4 bg-[#F97316]/50 rounded" />
          </div>
        </div>
      </div>
    ))}
    {/* Checkmark overlay */}
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-[#F97316]/20 flex items-center justify-center z-10"
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0)',
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s',
      }}
    >
      <svg className="w-10 h-10 text-[#F97316]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  </div>
);

const AIAnimation = ({ isActive }: { isActive: boolean }) => (
  <div className="relative w-full h-full flex items-center justify-center">
    {/* Neural network visualization */}
    <svg className="w-full h-full" viewBox="0 0 200 200">
      {/* Connection lines */}
      {[
        { x1: 30, y1: 50, x2: 100, y2: 100 },
        { x1: 30, y1: 150, x2: 100, y2: 100 },
        { x1: 100, y1: 100, x2: 170, y2: 50 },
        { x1: 100, y1: 100, x2: 170, y2: 100 },
        { x1: 100, y1: 100, x2: 170, y2: 150 },
        { x1: 30, y1: 100, x2: 100, y2: 100 },
      ].map((line, i) => (
        <line 
          key={i}
          x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
          stroke="#F97316"
          strokeWidth="2"
          strokeOpacity={isActive ? 0.4 : 0}
          style={{
            transition: `stroke-opacity 0.6s ease-out ${i * 0.05}s`,
          }}
        />
      ))}
      {/* Animated pulse on lines */}
      {isActive && [
        { x1: 30, y1: 50, x2: 100, y2: 100 },
        { x1: 100, y1: 100, x2: 170, y2: 100 },
      ].map((line, i) => (
        <circle 
          key={`pulse-${i}`}
          r="4"
          fill="#F97316"
          style={{
            animation: `pulse 2s ease-in-out ${i * 0.5}s infinite`,
          }}
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={`M${line.x1},${line.y1} L${line.x2},${line.y2}`}
          />
        </circle>
      ))}
      {/* Nodes */}
      {[
        { x: 30, y: 50 }, { x: 30, y: 100 }, { x: 30, y: 150 },
        { x: 100, y: 100 },
        { x: 170, y: 50 }, { x: 170, y: 100 }, { x: 170, y: 150 },
      ].map((node, i) => (
        <g key={i}>
          <circle
            cx={node.x}
            cy={node.y}
            r={i === 3 ? 20 : 12}
            fill={i === 3 ? "#F97316" : "rgba(249, 115, 22, 0.3)"}
            stroke="#F97316"
            strokeWidth="2"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'scale(1)' : 'scale(0)',
              transformOrigin: `${node.x}px ${node.y}px`,
              transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s`,
            }}
          />
        </g>
      ))}
    </svg>
    {/* Center brain icon */}
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.5s ease-out 0.3s',
      }}
    >
      <Brain className="w-8 h-8 text-white" />
    </div>
  </div>
);

const TaskAnimation = ({ isActive }: { isActive: boolean }) => (
  <div className="relative w-full h-full flex flex-col justify-center gap-5 px-4">
    {[
      { label: "Envoyer devis client", done: true, priority: "high" },
      { label: "Relancer fournisseur", done: true, priority: "medium" },
      { label: "Préparer réunion", done: false, priority: "high" },
      { label: "Facturer projet X", done: false, priority: "low" },
    ].map((task, i) => (
      <div
        key={i}
        className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10"
        style={{
          opacity: isActive ? 1 : 0,
          transform: isActive ? 'translateX(0)' : 'translateX(40px)',
          transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.1}s`,
        }}
      >
        {/* Checkbox */}
        <div 
          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center ${
            task.done ? 'bg-[#F97316] border-[#F97316]' : 'border-[#F97316]/40'
          }`}
          style={{
            backgroundColor: task.done && isActive ? '#F97316' : 'transparent',
            transition: `background-color 0.3s ease-out ${0.4 + i * 0.1}s`,
          }}
        >
          {task.done && (
            <svg 
              className="w-4 h-4 text-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scale(1)' : 'scale(0)',
                transition: `all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.5 + i * 0.1}s`,
              }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        {/* Task label */}
        <span className={`flex-1 text-sm ${task.done ? 'text-white/60 line-through' : 'text-white'}`}>
          {task.label}
        </span>
        {/* Priority badge */}
        <div className={`w-2 h-2 rounded-full ${
          task.priority === 'high' ? 'bg-red-500' : 
          task.priority === 'medium' ? 'bg-[#F97316]' : 'bg-white/30'
        }`} />
      </div>
    ))}
  </div>
);

const CalendarAnimation = ({ isActive }: { isActive: boolean }) => (
  <div className="relative w-full h-full flex items-center justify-center p-4">
    <div 
      className="w-full max-w-xs rounded-2xl bg-white/10 backdrop-blur-sm border border-[#F97316]/20 overflow-hidden shadow-2xl"
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Calendar header */}
      <div className="px-4 py-3 bg-[#F97316]/20 flex items-center justify-between">
        <span className="text-sm font-medium text-white">Décembre 2024</span>
        <div className="flex gap-1">
          <div className="w-6 h-6 rounded-lg bg-[#F97316]/20" />
          <div className="w-6 h-6 rounded-lg bg-[#F97316]/20" />
        </div>
      </div>
      {/* Days header */}
      <div className="grid grid-cols-7 gap-1 px-3 py-2 border-b border-white/10">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="text-xs text-white/60 text-center">{d}</span>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="p-3 grid grid-cols-7 gap-1">
        {Array.from({ length: 31 }).map((_, i) => {
          const isHighlighted = i === 11 || i === 18 || i === 25;
          const isToday = i === 15;
          return (
            <div
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                isToday ? 'bg-[#F97316] text-white font-bold' :
                isHighlighted ? 'bg-[#F97316]/30 text-white' : 
                'text-white/60 hover:bg-white/10'
              }`}
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scale(1)' : 'scale(0.8)',
                transition: `all 0.3s ease-out ${0.2 + i * 0.015}s`,
              }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
      {/* Upcoming event */}
      <div 
        className="mx-3 mb-3 p-3 rounded-xl bg-[#F97316]/10 border border-[#F97316]/20"
        style={{
          opacity: isActive ? 1 : 0,
          transform: isActive ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.5s ease-out 0.6s',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#F97316]" />
          <span className="text-xs text-white">RDV Client - 14:00</span>
        </div>
      </div>
    </div>
  </div>
);

const contextAnimations: Record<string, React.FC<{ isActive: boolean }>> = {
  "Boîte de réception centralisée": InboxAnimation,
  "Devis & Factures": InvoiceAnimation,
  "Relance IA": AIAnimation,
  "Tâches": TaskAnimation,
  "Rendez-vous": CalendarAnimation,
};

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

export const LandingFeaturesGrid = () => {
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
      
      // Custom thresholds: first card stays longer (requires more scroll)
      // First card: 0-0.35, others split the remaining 0.35-1.0
      const thresholds = [0, 0.35, 0.5, 0.65, 0.8, 1.0];
      let newIndex = 0;
      for (let i = 0; i < thresholds.length - 1; i++) {
        if (scrollProgress >= thresholds[i] && scrollProgress < thresholds[i + 1]) {
          newIndex = i;
          break;
        }
      }
      if (scrollProgress >= thresholds[thresholds.length - 1]) {
        newIndex = modules.length - 1;
      }
      
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
      className="min-h-[450vh] bg-black relative"
      id="features"
    >
      {/* Background effects */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F97316]/5 via-transparent to-black" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#F97316]/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          {/* Cards container */}
          <div className="relative h-[500px] flex items-center justify-center">
            {modules.map((module, index) => {
              const Icon = module.icon;
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;
              const ContextAnimation = contextAnimations[module.title];
              
              return (
                <div
                  key={index}
                  className="absolute w-full max-w-5xl mx-auto"
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
                  <div className="relative rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#F97316]/10 to-transparent" />
                    
                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px]">
                      {/* Left: Text content */}
                      <div className="relative p-10 lg:p-14 flex flex-col justify-center">
                        {/* Icon container */}
                        <div 
                          className="mb-8 inline-flex items-center justify-center w-16 h-16 rounded-xl bg-[#F97316]/10 border border-[#F97316]/20"
                          style={{
                            animation: isActive ? 'pulse 3s ease-in-out infinite' : 'none',
                          }}
                        >
                          <Icon className="w-8 h-8 text-[#F97316]" />
                          {/* Icon glow */}
                          <div className="absolute inset-0 rounded-xl bg-[#F97316]/30 blur-xl opacity-50" />
                        </div>
                        
                        {/* Content */}
                        <h3 className="relative text-3xl lg:text-4xl font-semibold text-white mb-4">
                          {module.title}
                        </h3>
                        <p className="relative text-lg text-white/70 leading-relaxed">
                          {module.description}
                        </p>
                      </div>
                      
                      {/* Right: Animation */}
                      <div className="relative hidden lg:block">
                        {ContextAnimation && <ContextAnimation isActive={isActive} />}
                      </div>
                    </div>
                    
                    {/* Bottom accent line */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F97316] to-transparent"
                      style={{
                        transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                        transition: 'transform 0.8s ease-out 0.2s',
                        transformOrigin: 'left',
                      }}
                    />
                  </div>
                  
                  {/* Outer glow */}
                  <div 
                    className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#F97316]/20 to-transparent blur-2xl -z-10"
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
