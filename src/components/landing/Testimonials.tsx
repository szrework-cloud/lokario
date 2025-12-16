"use client";

import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Lokario m'a fait gagner 5 heures par semaine. Je ne rate plus aucune relance client et mon chiffre d'affaires a augmenté de 20%.",
    author: "Marie D.",
    role: "Consultante indépendante",
    rating: 5,
  },
  {
    quote: "Enfin un outil simple qui fait ce qu'il promet. Pas de fonctionnalités inutiles, juste l'essentiel pour piloter mon activité.",
    author: "Thomas L.",
    role: "Artisan électricien",
    rating: 5,
  },
  {
    quote: "L'automatisation des rappels est un game-changer. Mes clients apprécient le professionnalisme et moi je gagne en sérénité.",
    author: "Sophie M.",
    role: "Coach professionnelle",
    rating: 5,
  },
];

export const LandingTestimonials = () => {
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden bg-black">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#F97316]/10 text-[#F97316] text-sm font-medium mb-4">
            Témoignages
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-white">
            Ils ont adopté{" "}
            <span className="text-[#F97316]">Lokario</span>
          </h2>
          <p className="text-lg text-white/60">
            Découvrez comment des entrepreneurs comme vous ont transformé leur quotidien.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.author}
              className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-white/10 hover:border-[#F97316]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#F97316]/10 animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-[#F97316] text-[#F97316]"
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-white mb-6 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {testimonial.author[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-white">{testimonial.author}</p>
                  <p className="text-sm text-white/60">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
