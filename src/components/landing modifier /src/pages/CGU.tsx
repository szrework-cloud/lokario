import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";

const CGU = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div 
              className="text-center mb-12 transition-all duration-700"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(30px)'
              }}
            >
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Conditions Générales d'Utilisation
              </h1>
              <p className="text-muted-foreground">
                Date de dernière mise à jour : 1er janvier 2025
              </p>
            </div>

            <div className="prose prose-invert max-w-none space-y-6">
              {/* Article 1 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 1 - Objet et champ d'application</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Les présentes Conditions Générales d'Utilisation (ci-après "CGU") ont pour objet de définir les conditions et modalités d'utilisation de la plateforme Lokario (ci-après "la Plateforme" ou "le Service"), édité par S-Rework (ci-après "l'Éditeur" ou "nous").
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. Toute personne accédant à la Plateforme (ci-après "l'Utilisateur" ou "vous") s'engage à respecter ces conditions.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les modifications prennent effet dès leur publication sur la Plateforme. Il est recommandé de consulter régulièrement les CGU.
                </p>
              </section>

              {/* Article 2 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 2 - Mentions légales</h2>
                <div className="text-muted-foreground leading-relaxed space-y-4">
                  <div>
                    <h3 className="text-foreground font-medium mb-2">Éditeur de la Plateforme :</h3>
                    <ul className="space-y-1 ml-4">
                      <li>Dénomination sociale : S-Rework</li>
                      <li>Forme juridique : EI</li>
                      <li>Numéro SIRET : 938 687 969 00015</li>
                      <li>Directeur de publication : Gurler Adem</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium mb-2">Contact :</h3>
                    <ul className="space-y-1 ml-4">
                      <li>Email : lokario.saas@gmail.com</li>
                      <li>WhatsApp : +33 7 70 03 42 83</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Article 3 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 3 - Définitions</h2>
                <ul className="text-muted-foreground leading-relaxed space-y-2">
                  <li><strong className="text-foreground">Plateforme</strong> : Désigne l'application web Lokario accessible à l'adresse lokario.fr</li>
                  <li><strong className="text-foreground">Service</strong> : Désigne l'ensemble des fonctionnalités proposées par la Plateforme</li>
                  <li><strong className="text-foreground">Utilisateur</strong> : Toute personne physique ou morale utilisant la Plateforme</li>
                  <li><strong className="text-foreground">Compte</strong> : Espace personnel créé par l'Utilisateur pour accéder à la Plateforme</li>
                  <li><strong className="text-foreground">Données</strong> : Toutes les informations saisies, importées ou générées par l'Utilisateur sur la Plateforme</li>
                  <li><strong className="text-foreground">Abonnement</strong> : Contrat d'accès au Service conclu entre l'Utilisateur et l'Éditeur</li>
                </ul>
              </section>

              {/* Article 4 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 4 - Accès à la Plateforme</h2>
                <div className="text-muted-foreground leading-relaxed space-y-4">
                  <div>
                    <h3 className="text-foreground font-medium mb-2">4.1 Conditions d'accès</h3>
                    <p className="mb-2">L'accès à la Plateforme est réservé aux Utilisateurs ayant créé un compte. Pour créer un compte, l'Utilisateur doit :</p>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>Être une personne physique majeure ou une personne morale</li>
                      <li>Fournir des informations exactes, complètes et à jour</li>
                      <li>Accepter les présentes CGU</li>
                      <li>Vérifier son adresse email</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium mb-2">4.2 Création du compte</h3>
                    <p>L'Utilisateur est responsable de la confidentialité de ses identifiants de connexion. Toute utilisation de son compte est présumée effectuée par l'Utilisateur.</p>
                  </div>
                </div>
              </section>

              {/* Article 5 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 5 - Description du Service</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Lokario est une plateforme SaaS B2B proposant des outils de gestion administrative et commerciale, notamment :
                </p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                  <li>Gestion des clients</li>
                  <li>Gestion des projets</li>
                  <li>Gestion des tâches</li>
                  <li>Facturation (devis et factures)</li>
                  <li>Gestion des rendez-vous</li>
                  <li>Boîte de réception centralisée</li>
                  <li>Relances automatisées</li>
                  <li>Tableau de bord analytique</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  L'Éditeur se réserve le droit de modifier, suspendre ou interrompre tout ou partie du Service à tout moment, notamment pour des raisons de maintenance, de mise à jour ou de force majeure.
                </p>
              </section>

              {/* Article 6 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 6 - Utilisation du Service</h2>
                <div className="text-muted-foreground leading-relaxed space-y-4">
                  <div>
                    <h3 className="text-foreground font-medium mb-2">6.1 Utilisation conforme</h3>
                    <p className="mb-2">L'Utilisateur s'engage à utiliser le Service conformément à sa destination. Il est strictement interdit :</p>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>D'utiliser le Service à des fins illégales ou frauduleuses</li>
                      <li>De porter atteinte aux droits de tiers</li>
                      <li>De diffuser des contenus illicites, diffamatoires ou contraires aux bonnes mœurs</li>
                      <li>De tenter d'accéder de manière non autorisée au Service</li>
                      <li>De perturber le fonctionnement du Service</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium mb-2">6.2 Responsabilité de l'Utilisateur</h3>
                    <p>L'Utilisateur est seul responsable de l'utilisation qu'il fait du Service, des Données qu'il saisit et du respect des droits de tiers.</p>
                  </div>
                </div>
              </section>

              {/* Article 7 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 7 - Disponibilité du Service</h2>
                <p className="text-muted-foreground leading-relaxed">
                  L'Éditeur s'efforce d'assurer une disponibilité du Service 24h/24 et 7j/7, sous réserve des opérations de maintenance programmées ou d'urgence, des cas de force majeure et des dysfonctionnements indépendants de sa volonté. L'Éditeur ne garantit pas une disponibilité absolue du Service.
                </p>
              </section>

              {/* Article 8 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 8 - Protection des Données</h2>
                <p className="text-muted-foreground leading-relaxed">
                  L'Éditeur s'engage à protéger les Données de l'Utilisateur conformément au Règlement Général sur la Protection des Données (RGPD). Les Données sont stockées sur des serveurs sécurisés situés en Europe. L'Utilisateur dispose d'un droit d'accès, de rectification, de suppression et de portabilité de ses Données.
                </p>
              </section>

              {/* Article 9 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 9 - Propriété intellectuelle</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  La Plateforme, son contenu, sa structure, son design, ses logos et marques sont la propriété exclusive de l'Éditeur et sont protégés par les lois relatives à la propriété intellectuelle. Toute reproduction est strictement interdite sans autorisation écrite préalable.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  L'Utilisateur conserve la propriété de ses Données. Il accorde à l'Éditeur une licence d'utilisation non exclusive pour les besoins de la fourniture du Service.
                </p>
              </section>

              {/* Article 10-11 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 10 - Limitation de responsabilité</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  L'Éditeur ne saurait être tenu responsable des dommages indirects résultant de l'utilisation du Service, de la perte de Données résultant d'une faute de l'Utilisateur ou d'un cas de force majeure, des décisions prises par l'Utilisateur sur la base d'informations issues du Service.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  La responsabilité de l'Éditeur est limitée au montant des sommes versées par l'Utilisateur au titre de l'Abonnement sur les 12 derniers mois.
                </p>
              </section>

              {/* Article 12 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 11 - Résiliation</h2>
                <div className="text-muted-foreground leading-relaxed space-y-4">
                  <p>L'Utilisateur peut résilier son Abonnement à tout moment depuis les Paramètres de son compte. La résiliation prend effet à la fin de la période d'abonnement en cours.</p>
                  <p>L'Éditeur peut résilier l'accès de l'Utilisateur en cas de non-respect des CGU, non-paiement, utilisation frauduleuse ou inactivité prolongée.</p>
                  <p>En cas de résiliation, l'Utilisateur peut exporter ses Données dans un délai de 30 jours. Passé ce délai, les Données peuvent être supprimées définitivement.</p>
                </div>
              </section>

              {/* Article 13 */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 12 - Droit applicable et juridiction</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Les présentes CGU sont régies par le droit français. En cas de litige et à défaut d'accord amiable, les parties s'engagent à rechercher une solution par médiation. À défaut, les tribunaux français seront seuls compétents.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Conformément à l'article L.612-1 du Code de la consommation, l'Utilisateur peut recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable du litige.
                </p>
              </section>

              {/* Contact */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">Article 13 - Contact</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Pour toute question relative aux présentes CGU, contactez-nous :
                </p>
                <ul className="mt-2 text-muted-foreground space-y-1">
                  <li>Email : <a href="mailto:lokario.saas@gmail.com" className="text-primary hover:underline">lokario.saas@gmail.com</a></li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CGU;