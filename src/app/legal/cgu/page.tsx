"use client";

import { LandingFooter } from "@/components/landing/Footer";
import { LandingHeader } from "@/components/landing/Header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CGUPage() {
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
          <h1 className="text-3xl font-bold text-white mb-2">
            Conditions Générales d'Utilisation (CGU)
          </h1>
          <p className="text-sm text-white/60 mb-8">
            Date de dernière mise à jour : 1er janvier 2025
          </p>

          <div className="prose prose-invert max-w-none text-white space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 1 - Objet et champ d'application</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                Les présentes Conditions Générales d'Utilisation (ci-après "CGU") ont pour objet de définir les conditions et modalités d'utilisation de la plateforme Lokario (ci-après "la Plateforme" ou "le Service"), édité par S-Rework (ci-après "l'Éditeur" ou "nous").
              </p>
              <p className="text-sm text-white/70 leading-relaxed">
                L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. Toute personne accédant à la Plateforme (ci-après "l'Utilisateur" ou "vous") s'engage à respecter ces conditions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 2 - Mentions légales</h2>
              <div className="bg-black/30 rounded-lg p-4 border border-[#334155]">
                <p className="text-sm font-medium text-white mb-2">Éditeur de la Plateforme :</p>
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
              <h2 className="text-xl font-semibold text-white mb-4">Article 3 - Accès à la Plateforme</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                L'accès à la Plateforme est réservé aux Utilisateurs ayant créé un compte. Pour créer un compte, l'Utilisateur doit accepter les présentes CGU et fournir des informations exactes, complètes et à jour.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 4 - Utilisation du Service</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                L'Utilisateur s'engage à utiliser le Service conformément à sa destination et aux présentes CGU. Il est strictement interdit d'utiliser le Service à des fins illégales ou frauduleuses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 5 - Protection des Données</h2>
              <p className="text-sm text-white/70 leading-relaxed mb-4">
                L'Éditeur s'engage à protéger les Données de l'Utilisateur conformément à la réglementation en vigueur, notamment le Règlement Général sur la Protection des Données (RGPD).
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
              <h2 className="text-xl font-semibold text-white mb-4">Article 6 - Propriété intellectuelle</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                La Plateforme, son contenu, sa structure, son design, ses logos, marques et tous éléments composant le Service sont la propriété exclusive de l'Éditeur et sont protégés par les lois relatives à la propriété intellectuelle.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 7 - Limitation de responsabilité</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                L'Éditeur ne saurait être tenu responsable des dommages indirects résultant de l'utilisation ou de l'impossibilité d'utiliser le Service. La responsabilité de l'Éditeur est limitée au montant des sommes versées par l'Utilisateur au titre de l'Abonnement sur les 12 derniers mois.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Article 8 - Droit applicable</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Les présentes CGU sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-[#334155]">
              <p className="text-xs text-white/60">
                Pour toute question relative aux présentes CGU, contactez-nous :{" "}
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
      <LandingFooter />
    </div>
  );
}

