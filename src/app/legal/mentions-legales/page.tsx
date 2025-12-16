"use client";

import { LandingFooter } from "@/components/landing/Footer";
import { LandingHeader } from "@/components/landing/Header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MentionsLegalesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <LandingHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
        
        <div className="bg-black/50 rounded-lg shadow-sm border border-[#334155] p-8 md:p-12">
          <h1 className="text-3xl font-bold text-white mb-8">
            Mentions Légales
          </h1>

          <div className="prose prose-invert max-w-none text-white space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Éditeur de la Plateforme</h2>
              <div className="bg-black/30 rounded-lg p-4 border border-[#334155]">
                <ul className="text-sm text-white/70 space-y-2">
                  <li><strong className="text-white">Dénomination sociale :</strong> S-Rework</li>
                  <li><strong className="text-white">Forme juridique :</strong> Entreprise Individuelle (EI)</li>
                  <li><strong className="text-white">Siège social :</strong> 28 rue d'eymoutiers 67110 Niederbronn-les-bains</li>
                  <li><strong className="text-white">Numéro SIRET :</strong> 938 687 969 00015</li>
                  <li><strong className="text-white">Directeur de publication :</strong> Gurler adem</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Contact</h2>
              <div className="bg-black/30 rounded-lg p-4 border border-[#334155]">
                <ul className="text-sm text-white/70 space-y-2">
                  <li><strong className="text-white">Email :</strong>{" "}
                    <a href="mailto:lokario.saas@gmail.com" className="text-[#F97316] hover:underline">
                      lokario.saas@gmail.com
                    </a>
                  </li>
                  <li><strong className="text-white">WhatsApp :</strong>{" "}
                    <a href="https://wa.me/33770034283" target="_blank" rel="noopener noreferrer" className="text-[#F97316] hover:underline">
                      +33 7 70 03 42 83
                    </a>
                  </li>
                  <li><strong className="text-white">DPO (Délégué à la Protection des Données) :</strong>{" "}
                    <a href="mailto:dpo@lokario.fr" className="text-[#F97316] hover:underline">
                      dpo@lokario.fr
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Hébergement</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                La plateforme Lokario est hébergée sur des serveurs sécurisés situés en Europe, conformément au RGPD.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Propriété intellectuelle</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                L'ensemble des éléments composant la plateforme Lokario (textes, images, logos, design, code source) sont la propriété exclusive de S-Rework et sont protégés par les lois relatives à la propriété intellectuelle.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Protection des données</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données personnelles.
              </p>
              <p className="text-sm text-white/70 leading-relaxed">
                Pour plus d'informations, consultez notre{" "}
                <Link href="/legal/privacy" className="text-[#F97316] hover:underline">
                  Politique de Confidentialité
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Liens utiles</h2>
              <ul className="text-sm text-white/70 space-y-2">
                <li>
                  <Link href="/legal/cgu" className="text-[#F97316] hover:underline">
                    Conditions Générales d'Utilisation (CGU)
                  </Link>
                </li>
                <li>
                  <Link href="/legal/cgv" className="text-[#F97316] hover:underline">
                    Conditions Générales de Vente (CGV)
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="text-[#F97316] hover:underline">
                    Politique de Confidentialité
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}

