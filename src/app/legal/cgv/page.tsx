"use client";

import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CGVPage() {
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
            Conditions Générales de Vente (CGV)
          </h1>
          <p className="text-sm text-white/60 mb-8">
            Date de dernière mise à jour : 1er janvier 2025
          </p>

          <div className="prose prose-invert max-w-none text-white space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 1 - Objet</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Les présentes Conditions Générales de Vente (CGV) régissent la vente des abonnements à la plateforme Lokario proposés par S-Rework.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 2 - Mentions légales</h2>
              <div className="bg-black/30 rounded-lg p-4 border border-[#334155]">
                <p className="text-sm font-medium text-white mb-2">Vendeur :</p>
                <ul className="text-sm text-white/70 space-y-1 list-disc list-inside">
                  <li>Dénomination sociale : S-Rework</li>
                  <li>Forme juridique : EI</li>
                  <li>Siège social : 28 rue d'eymoutiers 67110 Niederbronn-les-bains</li>
                  <li>Numéro SIRET : 938 687 969 00015</li>
                  <li>Directeur de publication : Gurler adem</li>
                </ul>
                <p className="text-sm font-medium text-white mt-4 mb-2">Contact :</p>
                <ul className="text-sm text-white/70 space-y-1 list-disc list-inside">
                  <li>Email : lokario.saas@gmail.com</li>
                  <li>WhatsApp : +33 7 70 03 42 83</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 3 - Commande</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                La commande s'effectue en ligne sur le site Lokario. La commande est considérée comme acceptée dès réception de la confirmation de paiement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 4 - Prix</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Les prix des abonnements sont indiqués en euros, toutes taxes comprises (TTC). Les prix applicables sont ceux en vigueur au jour de la commande.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 5 - Modalités de paiement</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Le paiement s'effectue par carte bancaire via le système de paiement sécurisé Stripe. Le paiement est exigible immédiatement lors de la commande.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 6 - Durée et résiliation</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                L'abonnement est conclu pour la durée choisie (mensuel ou annuel). L'abonnement est automatiquement renouvelé sauf résiliation par l'acheteur au moins 48 heures avant la date d'échéance.
              </p>
              <p className="text-sm text-white/70 leading-relaxed">
                L'acheteur peut résilier son abonnement à tout moment depuis les Paramètres de son compte.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 7 - Droit applicable</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Les présentes CGV sont régies par le droit français. Tout litige relève de la compétence des tribunaux français.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-[#334155]">
              <p className="text-xs text-white/60">
                Pour toute question relative aux présentes CGV, contactez-nous :{" "}
                <a href="mailto:lokario.saas@gmail.com" className="text-[#F97316] hover:underline">
                  lokario.saas@gmail.com
                </a>
                {" "}ou{" "}
                <a href="https://wa.me/33770034283" target="_blank" rel="noopener noreferrer" className="text-[#F97316] hover:underline">
                  WhatsApp : +33 7 70 03 42 83
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Footer removed */}
    </div>
  );
}

