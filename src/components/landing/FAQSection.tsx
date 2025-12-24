"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Combien de temps faut-il pour démarrer ?",
    answer: "Moins de 5 minutes ! Créez votre compte, ajoutez vos informations (email, téléphone) et c'est parti. Aucune installation complexe requise."
  },
  {
    question: "Est-ce que mes données sont sécurisées ?",
    answer: "Absolument. Vos données sont chiffrées de bout en bout et hébergées en Europe. Nous sommes conformes RGPD et ne revendons jamais vos informations."
  },
  {
    question: "Puis-je essayer gratuitement ?",
    answer: "Oui ! Profitez d'un essai gratuit de 14 jours avec toutes les fonctionnalités. Aucune carte bancaire requise pour commencer."
  },
  {
    question: "Comment fonctionnent les intégrations ?",
    answer: "C'est simple : vous renseignez votre email et numéro de téléphone professionnel, et Lokario centralise tout automatiquement. Ça prend 5 minutes."
  },
  {
    question: "Comment fonctionne l'intelligence artificielle ?",
    answer: "Notre IA s'occupe des tâches chronophages : relances automatiques, messages clients, résumés d'emails... Elle vous fait gagner du temps sur la communication quotidienne."
  }
];

export const LandingFAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 bg-black relative overflow-hidden">
      {/* Top gradient transition from Testimonials */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#1E293B]/10 to-transparent pointer-events-none z-10" />
      {/* Bottom gradient transition to CTASection */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-[#F97316]/10 pointer-events-none z-10" />
      <div className="container mx-auto px-4 relative z-20">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 animate-fade-up">
            Questions fréquentes
          </h2>
          <p className="text-lg text-white/70 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Tout ce que vous devez savoir avant de commencer
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`bg-[#1E293B] border rounded-xl px-6 transition-all duration-300 ${
                  openIndex === index 
                    ? 'border-[#F97316]/30 bg-[#1E293B]/80' 
                    : 'border-white/5'
                }`}
              >
                <button
                  className="flex w-full items-center justify-between py-5 text-left text-white font-medium hover:no-underline focus:outline-none"
                  onClick={() => toggleFAQ(index)}
                >
                  <span>{faq.question}</span>
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 ${
                      openIndex === index 
                        ? 'rotate-45 bg-[#F97316]/20' 
                        : 'bg-[#1E293B]'
                    }`}
                  >
                    <span className="text-[#F97316] text-xl leading-none">+</span>
                  </span>
                </button>
                {openIndex === index && (
                  <div className="pb-5 text-white/70 leading-relaxed animate-fade-up">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

