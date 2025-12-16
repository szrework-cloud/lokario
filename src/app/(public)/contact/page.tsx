"use client";

import { useState } from "react";
import { LandingHeader } from "@/components/landing/Header";
import { LandingFooter } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Mail, MessageCircle, Send, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

export default function ContactPage() {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = "Erreur lors de l'envoi du message";
        try {
          const data = await response.json();
          errorMessage = data.error || data.detail || errorMessage;
        } catch {
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Afficher le message de succès
      setShowSuccessMessage(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      
      // Faire défiler jusqu'au formulaire pour voir le message
      setTimeout(() => {
        document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      
      // Masquer le message après 5 secondes
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    } catch (error) {
      console.error("Erreur:", error);
      let errorMessage = "Une erreur est survenue. Veuillez réessayer ou nous contacter directement par email.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      // Afficher l'erreur via toast
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-black">
      <LandingHeader />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-16 animate-fade-up">
            <span className="inline-block px-4 py-2 rounded-full bg-[#F97316]/10 text-[#F97316] text-sm font-medium mb-6">
              Contact
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Parlons de votre projet
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
              Une question ? Un besoin spécifique ? Notre équipe est là pour vous accompagner.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <div className="p-6 rounded-2xl bg-black/50 border border-[#334155]/30 backdrop-blur-sm">
                <h2 className="font-display text-xl font-semibold text-white mb-6">
                  Informations de contact
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#F97316]/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-[#F97316]" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Email</p>
                      <a 
                        href="mailto:lokario.saas@gmail.com" 
                        className="text-white/70 hover:text-[#F97316] transition-colors"
                      >
                        lokario.saas@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#F97316]/10 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-[#F97316]" />
                    </div>
                    <div>
                      <p className="font-medium text-white">WhatsApp</p>
                      <a 
                        href="https://wa.me/33770034283" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-white/70 hover:text-[#F97316] transition-colors"
                      >
                        +33 7 70 03 42 83
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#F97316]/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-[#F97316]" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Disponibilité</p>
                      <p className="text-white/70">
                        Lun - Ven : 9h - 18h
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#F97316]/10 to-[#F97316]/5 border border-[#F97316]/20">
                <h3 className="font-display font-semibold text-white mb-3">
                  Réponse rapide garantie
                </h3>
                <p className="text-white/70 text-sm">
                  Nous nous engageons à vous répondre sous 24h ouvrées. Pour les demandes urgentes, privilégiez WhatsApp.
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-3 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <form 
                id="contact-form"
                onSubmit={handleSubmit}
                className="p-8 rounded-2xl bg-black/50 border border-[#334155]/30 backdrop-blur-sm"
              >
                <h2 className="font-display text-xl font-semibold text-white mb-6">
                  Envoyez-nous un message
                </h2>

                {/* Message de succès */}
                {showSuccessMessage && (
                  <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-[#16A34A]/20 to-[#16A34A]/10 border border-[#16A34A]/30 flex items-center gap-3 animate-fade-up">
                    <CheckCircle className="w-5 h-5 text-[#16A34A] flex-shrink-0" />
                    <p className="text-[#16A34A] font-medium">
                      Message envoyé ! Nous vous répondrons dans les plus brefs délais.
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Jean Dupont"
                        required
                        className="bg-black/50 border-[#334155]/50 focus:border-[#F97316] text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="jean@exemple.com"
                        required
                        className="bg-black/50 border-[#334155]/50 focus:border-[#F97316] text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Sujet *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="En quoi pouvons-nous vous aider ?"
                      required
                      className="bg-white/50 border-[#E5E7EB]/50 focus:border-[#F97316]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Décrivez votre demande en détail..."
                      required
                      rows={6}
                      className="bg-white/50 border-[#E5E7EB]/50 focus:border-[#F97316] resize-none"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    variant="primary"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      "Envoi en cours..."
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer le message
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-white/60 text-center">
                    En soumettant ce formulaire, vous acceptez notre{" "}
                    <Link href="/legal/privacy" className="text-[#F97316] hover:underline">
                      politique de confidentialité
                    </Link>
                    .
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
