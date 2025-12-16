"use client";

import { LandingHeader } from "@/components/landing/Header";
import { LandingFooter } from "@/components/landing/Footer";
import { LandingCTASection } from "@/components/landing/CTASection";
import { useEffect, useRef, useState } from "react";

const faqSections = [
  {
    title: "Généralités",
    questions: [
      {
        question: "Qu'est-ce que Lokario ?",
        answer: "Lokario est un logiciel SaaS B2B complet qui centralise la gestion administrative et commerciale de votre entreprise. Il regroupe tous vos outils essentiels dans une seule plateforme : gestion des clients, projets, tâches, facturation, rendez-vous et communications."
      },
      {
        question: "Quels sont les avantages de Lokario ?",
        answer: "Centralisation de tous vos outils en un seul endroit, automatisation des relances et classification des messages par IA, gain de temps significatif sur les tâches administratives, suivi en temps réel via un dashboard complet, et accessibilité depuis n'importe quel appareil."
      },
      {
        question: "Lokario est-il adapté à mon secteur d'activité ?",
        answer: "Lokario s'adapte à tous les secteurs B2B : commerce, services, artisanat, conseil, etc. Des modèles prêts à l'emploi sont disponibles pour différents secteurs (commerce, beauté/coiffure, restauration)."
      },
      {
        question: "Dois-je installer un logiciel ?",
        answer: "Non, Lokario est une application web accessible depuis votre navigateur. Aucune installation n'est nécessaire. Vous pouvez y accéder depuis n'importe quel ordinateur, tablette ou smartphone."
      }
    ]
  },
  {
    title: "Inscription et Compte",
    questions: [
      {
        question: "Comment créer un compte ?",
        answer: "Rendez-vous sur la page d'inscription, remplissez vos informations (nom, email, mot de passe), vérifiez votre email via le lien de vérification, puis connectez-vous et commencez à utiliser Lokario."
      },
      {
        question: "Puis-je inviter des membres de mon équipe ?",
        answer: "Oui, en tant que propriétaire ou administrateur, vous pouvez ajouter des utilisateurs à votre entreprise, définir leurs permissions (création, modification, suppression de tâches, etc.) et assigner des tâches et projets à vos collaborateurs."
      },
      {
        question: "Comment changer mon mot de passe ?",
        answer: "Allez dans Paramètres (menu latéral), cliquez sur Sécurité, puis utilisez la fonctionnalité 'Réinitialiser le mot de passe'. Un email avec un lien de réinitialisation vous sera envoyé."
      },
      {
        question: "Que faire si j'ai oublié mon mot de passe ?",
        answer: "Sur la page de connexion, cliquez sur 'Mot de passe oublié ?'. Un email avec un lien de réinitialisation vous sera envoyé."
      }
    ]
  },
  {
    title: "Modules et Fonctionnalités",
    questions: [
      {
        question: "Quels sont les modules disponibles ?",
        answer: "Lokario propose 8 modules principaux : Dashboard (vue d'ensemble), Tâches (gestion et organisation), Inbox (boîte de réception centralisée), Relances (suivi et automatisation), Clients (base de données complète), Projets (suivi de vos projets), Devis & Factures (documents commerciaux), et Rendez-vous (planification)."
      },
      {
        question: "Comment fonctionne l'Inbox centralisée ?",
        answer: "L'Inbox regroupe tous vos messages (emails, SMS, autres sources) dans une seule interface. L'IA classe automatiquement vos messages par type (devis, facture, info, rendez-vous, etc.) et les associe à vos clients si connus."
      },
      {
        question: "Comment fonctionne la classification automatique par IA ?",
        answer: "L'intelligence artificielle de Lokario analyse le contenu de vos messages, identifie le type de demande, reconnaît l'expéditeur et l'associe à un client si connu, puis suggère des actions (créer une tâche, une relance, etc.)."
      },
      {
        question: "Comment fonctionnent les relances automatiques ?",
        answer: "Lokario peut générer et envoyer automatiquement des relances pour les devis non signés, factures impayées, informations manquantes et rendez-vous à confirmer. Vous configurez les délais et l'IA génère des messages personnalisés."
      },
      {
        question: "Comment créer un devis ou une facture ?",
        answer: "Allez dans Devis & Factures, cliquez sur '+ Nouveau devis' ou '+ Nouvelle facture', sélectionnez le client, ajoutez les lignes de facturation, puis envoyez directement depuis l'interface."
      },
      {
        question: "Puis-je importer mes données existantes ?",
        answer: "Oui, selon votre abonnement, vous pouvez importer vos contacts, clients et données existantes. Contactez notre support pour plus d'informations."
      }
    ]
  },
  {
    title: "Facturation et Abonnements",
    questions: [
      {
        question: "Puis-je essayer Lokario gratuitement ?",
        answer: "Oui, un essai gratuit est disponible. Vous pouvez tester toutes les fonctionnalités avant de vous abonner."
      },
      {
        question: "Comment fonctionne la facturation ?",
        answer: "L'abonnement est mensuel ou annuel selon votre choix. La facturation se fait automatiquement via carte bancaire (Stripe)."
      },
      {
        question: "Puis-je annuler mon abonnement à tout moment ?",
        answer: "Oui, vous pouvez annuler votre abonnement à tout moment depuis les Paramètres > Abonnement. L'accès reste actif jusqu'à la fin de la période payée."
      },
      {
        question: "Que se passe-t-il si je dépasse mon quota d'utilisateurs ?",
        answer: "Vous recevrez une notification. Vous devrez soit mettre à niveau votre abonnement, soit réduire le nombre d'utilisateurs actifs."
      }
    ]
  },
  {
    title: "Sécurité et Confidentialité",
    questions: [
      {
        question: "Mes données sont-elles sécurisées ?",
        answer: "Oui, Lokario utilise des protocoles de sécurité avancés : chiffrement des données en transit (HTTPS), chiffrement des données sensibles en base, authentification sécurisée et sauvegardes régulières."
      },
      {
        question: "Où sont stockées mes données ?",
        answer: "Vos données sont stockées sur des serveurs sécurisés en Europe, conformément au RGPD."
      },
      {
        question: "Lokario est-il conforme au RGPD ?",
        answer: "Oui, Lokario est conforme au Règlement Général sur la Protection des Données (RGPD). Vous pouvez consulter notre politique de confidentialité pour plus de détails."
      },
      {
        question: "Puis-je exporter mes données ?",
        answer: "Oui, vous pouvez exporter vos données à tout moment depuis les Paramètres > Données."
      }
    ]
  },
  {
    title: "Support et Technique",
    questions: [
      {
        question: "Comment contacter le support ?",
        answer: "Vous pouvez contacter notre support par email à support@lokario.fr, via le chat en ligne dans l'application, ou par téléphone (selon votre abonnement)."
      },
      {
        question: "Quels navigateurs sont supportés ?",
        answer: "Lokario fonctionne sur tous les navigateurs modernes : Chrome (recommandé), Firefox, Safari et Edge."
      },
      {
        question: "Puis-je utiliser Lokario sur mobile ?",
        answer: "Oui, Lokario est une application web responsive, accessible depuis votre smartphone ou tablette. Une application mobile native est en développement."
      },
      {
        question: "Les données sont-elles sauvegardées automatiquement ?",
        answer: "Oui, toutes vos actions sont sauvegardées automatiquement en temps réel. Vous ne perdrez jamais vos données."
      }
    ]
  }
];

const FAQSection = ({ section, sectionIndex }: { section: typeof faqSections[0], sectionIndex: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-12 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-0">
        <div className="max-w-4xl mx-auto">
          <h2 
            className="font-display text-2xl sm:text-3xl font-bold mb-8 text-[#F97316] transition-all duration-700"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(-30px)'
            }}
          >
            {section.title}
          </h2>
          <div className="space-y-4">
            {section.questions.map((faq, index) => (
              <details
                key={index}
                className="group rounded-2xl border border-[#334155]/50 bg-black/50 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-[#F97316]/30 hover:bg-black/60"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                  transitionDelay: `${index * 100}ms`
                }}
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-semibold text-white pr-4">{faq.question}</span>
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F97316]/10 flex items-center justify-center transition-all duration-300 group-open:rotate-45 group-open:bg-[#F97316]/20">
                    <span className="text-[#F97316] text-xl leading-none">+</span>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-white/70 leading-relaxed animate-fade-up">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default function FAQPage() {
  const [headerVisible, setHeaderVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const contactRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setHeaderVisible(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setContactVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (contactRef.current) observer.observe(contactRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <LandingHeader />
      <main className="pt-24 lg:pt-32 overflow-hidden">
        {/* Hero Section */}
        <section className="py-16 lg:py-24 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-0">
            <div className="max-w-3xl mx-auto text-center">
              <span 
                className="inline-block px-4 py-1.5 rounded-full bg-[#F97316]/10 text-[#F97316] text-sm font-medium mb-6 transition-all duration-700"
                style={{
                  opacity: headerVisible ? 1 : 0,
                  transform: headerVisible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.9)'
                }}
              >
                Centre d'aide
              </span>
              <h1 
                className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 transition-all duration-700 text-white"
                style={{
                  opacity: headerVisible ? 1 : 0,
                  transform: headerVisible ? 'translateY(0)' : 'translateY(30px)',
                  transitionDelay: '100ms'
                }}
              >
                Foire Aux Questions
              </h1>
              <p 
                className="text-xl text-white/70 transition-all duration-700"
                style={{
                  opacity: headerVisible ? 1 : 0,
                  transform: headerVisible ? 'translateY(0)' : 'translateY(30px)',
                  transitionDelay: '200ms'
                }}
              >
                Trouvez rapidement les réponses à vos questions sur Lokario
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Sections */}
        {faqSections.map((section, sectionIndex) => (
          <FAQSection key={sectionIndex} section={section} sectionIndex={sectionIndex} />
        ))}

        {/* Contact Section */}
        <section ref={contactRef} className="py-16 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-0">
            <div 
              className="max-w-2xl mx-auto text-center transition-all duration-700"
              style={{
                opacity: contactVisible ? 1 : 0,
                transform: contactVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)'
              }}
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4 text-white">
                Besoin d'aide supplémentaire ?
              </h2>
              <p className="text-white/70 mb-8">
                Notre équipe est là pour vous aider. Contactez-nous par email ou via le chat.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:lokario.saas@gmail.com"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#F97316] text-white font-medium hover:bg-[#EA580C] hover:scale-105 transition-all duration-300"
                >
                  lokario.saas@gmail.com
                </a>
              </div>
            </div>
          </div>
        </section>

        <LandingCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
