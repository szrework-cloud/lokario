"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* Header removed */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
        
        <div className="bg-black/50 rounded-lg shadow-sm border border-[#334155] p-8 md:p-12">
          <h1 className="text-3xl font-bold text-white mb-2">
            Politique de Confidentialité
          </h1>
          <p className="text-sm text-white/60 mb-8">
            Date de dernière mise à jour : 1er janvier 2025
          </p>

          <div className="prose prose-invert max-w-none text-white space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                La présente Politique de Confidentialité a pour objet d'informer les utilisateurs de la plateforme Lokario sur la manière dont S-Rework collecte, utilise, stocke et protège leurs données personnelles conformément au RGPD.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Responsable du traitement</h2>
              <div className="bg-black/30 rounded-lg p-4 border border-[#334155]">
                <ul className="text-sm text-white/70 space-y-1 list-disc list-inside">
                  <li>Dénomination sociale : S-Rework</li>
                  <li>Forme juridique : EI</li>
                  <li>Siège social : 28 rue d'eymoutiers 67110 Niederbronn-les-bains</li>
                  <li>SIRET : 938 687 969 00015</li>
                  <li>Email : lokario.saas@gmail.com</li>
                  <li>WhatsApp : +33 7 70 03 42 83</li>
                  <li>Email DPO : dpo@lokario.fr</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Données collectées</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                Nous collectons les données personnelles que vous nous fournissez directement lors de la création de votre compte, de l'utilisation du Service, et de la communication avec notre support.
              </p>
              <p className="text-sm text-white/70 leading-relaxed">
                Nous collectons également automatiquement des données de connexion et de navigation lors de votre utilisation de la Plateforme.
              </p>
            </section>

            <section id="cookies">
              <h2 className="text-xl font-semibold text-white mb-4">4. Cookies</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                Nous utilisons des cookies pour assurer le fonctionnement de la Plateforme, améliorer votre expérience utilisateur, et analyser l'utilisation du Service.
              </p>
              <p className="text-sm text-white/70 leading-relaxed">
                Vous pouvez gérer vos préférences de cookies depuis les paramètres de votre navigateur ou via notre bandeau de consentement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Vos droits RGPD</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="text-sm text-white/70 space-y-2 list-disc list-inside">
                <li>Droit d'accès : Obtenir une copie de vos données</li>
                <li>Droit de rectification : Corriger vos données inexactes</li>
                <li>Droit à l'effacement : Demander la suppression de vos données</li>
                <li>Droit à la portabilité : Récupérer vos données dans un format structuré</li>
                <li>Droit d'opposition : Vous opposer au traitement de vos données</li>
              </ul>
              <p className="text-sm text-white/70 leading-relaxed mt-4">
                Pour exercer vos droits, contactez notre DPO à{" "}
                <a href="mailto:dpo@lokario.fr" className="text-[#F97316] hover:underline">
                  dpo@lokario.fr
                </a>
                {" "}ou utilisez la section "Données personnelles" dans les Paramètres de votre compte.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Sécurité des données</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles contre l'accès non autorisé, la perte ou la destruction accidentelle.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Durée de conservation</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Nous conservons vos données personnelles pendant la durée de votre abonnement et 3 ans après la résiliation de votre compte, sauf obligation légale de conservation plus longue.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Contact</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Pour toute question relative à cette Politique de Confidentialité, contactez notre DPO à{" "}
                <a href="mailto:dpo@lokario.fr" className="text-[#F97316] hover:underline">
                  dpo@lokario.fr
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
      {/* Footer removed */}
    </div>
  );
}

