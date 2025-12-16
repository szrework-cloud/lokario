import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const CGV = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Légal
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Conditions Générales de Vente
            </h1>
            <p className="text-muted-foreground">
              Dernière mise à jour : 1er janvier 2025
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {/* Article 1 */}
            <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Article 1 - Objet</h2>
              <p className="text-muted-foreground leading-relaxed">
                Les présentes Conditions Générales de Vente (ci-après "CGV") régissent les relations contractuelles entre S-Rework, entreprise individuelle immatriculée sous le numéro SIRET 938 687 969 00015 (ci-après "le Vendeur"), et toute personne physique ou morale souhaitant souscrire à l'abonnement Lokario (ci-après "le Client").
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Toute souscription à l'abonnement Lokario implique l'acceptation sans réserve des présentes CGV.
              </p>
            </section>

            {/* Article 2 */}
            <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Article 2 - Description du Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Lokario est une solution logicielle en mode SaaS (Software as a Service) de gestion administrative et commerciale destinée aux petites entreprises. Le Service comprend notamment :
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                <li>Gestion des clients et des projets</li>
                <li>Création et gestion de devis et factures</li>
                <li>Gestion des tâches et rendez-vous</li>
                <li>Boîte de réception centralisée</li>
                <li>Relances automatisées par IA</li>
                <li>Tableau de bord analytique</li>
              </ul>
            </section>

            {/* Article 3 */}
            <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Article 3 - Prix et modalités de paiement</h2>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">3.1 Tarification</h3>
              <p className="text-muted-foreground leading-relaxed">
                L'abonnement Lokario est proposé au tarif de <strong className="text-foreground">59,99 € TTC par mois</strong>. Ce tarif inclut l'accès à l'ensemble des fonctionnalités de la plateforme.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Le Vendeur se réserve le droit de modifier ses tarifs à tout moment. Les nouveaux tarifs s'appliqueront à compter du renouvellement suivant l'annonce de la modification, avec un préavis minimum de 30 jours.
              </p>

              <h3 className="text-lg font-medium text-foreground mt-6 mb-2">3.2 Paiement</h3>
              <p className="text-muted-foreground leading-relaxed">
                Le paiement s'effectue par carte bancaire via notre prestataire de paiement sécurisé Stripe. Le paiement est dû à l'avance, au début de chaque période de facturation mensuelle.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                En cas de défaut de paiement, le Vendeur se réserve le droit de suspendre l'accès au Service jusqu'à régularisation.
              </p>
            </section>

            {/* Article 4 */}
            <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Article 4 - Durée et renouvellement</h2>
              <p className="text-muted-foreground leading-relaxed">
                L'abonnement est souscrit pour une durée d'un (1) mois. Il est renouvelé tacitement pour des périodes successives d'un mois, sauf résiliation par l'une des parties.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                La date de renouvellement correspond à la date anniversaire de la souscription initiale.
              </p>
            </section>

            {/* Article 5 */}
            <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Article 5 - Droit de rétractation</h2>
              <p className="text-muted-foreground leading-relaxed">
                Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de fourniture de contenu numérique non fourni sur support matériel dont l'exécution a commencé avec l'accord préalable exprès du consommateur et renoncement exprès à son droit de rétractation.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                En souscrivant à l'abonnement Lokario, le Client accepte que l'exécution du Service commence immédiatement et renonce expressément à son droit de rétractation.
              </p>
            </section>

            {/* Article 6 */}
            <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Article 6 - Résiliation</h2>
              
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">6.1 Résiliation par le Client</h3>
              <p className="text-muted-foreground leading-relaxed">
                Le Client peut résilier son abonnement à tout moment depuis les paramètres de son compte. La résiliation prend effet à la fin de la période de facturation en cours. Aucun remboursement au prorata ne sera effectué.
              </p>

              <h3 className="text-lg font-medium text-foreground mt-6 mb-2">6.2 Résiliation par le Vendeur</h3>
              <p className="text-muted-foreground leading-relaxed">
                Le Vendeur peut résilier l'abonnement en cas de :
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Non-paiement des sommes dues</li>
                <li>Violation des Conditions Générales d'Utilisation</li>
                <li>Utilisation frauduleuse du Service</li>
              </ul>

              <h3 className="text-lg font-medium text-foreground mt-6 mb-2">6.3 Effets de la résiliation</h3>
              <p className="text-muted-foreground leading-relaxed">
                À la résiliation, l'accès au Service est désactivé. Le Client dispose d'un délai de 30 jours pour exporter ses données. Passé ce délai, les données peuvent être supprimées définitivement.
              </p>
            </section>

            {/* Article 7 */}
            <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Article 7 - Obligations du Vendeur</h2>
              <p className="text-muted-foreground leading-relaxed">
                Le Vendeur s'engage à :
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                <li>Fournir l'accès au Service conformément à sa description</li>
                <li>Assurer la maintenance et la disponibilité du Service dans la mesure du possible</li>
                <li>Protéger les données du Client conformément à la réglementation en vigueur</li>
                <li>Informer le Client de toute modification substantielle du Service</li>
              </ul>
            </section>

            {/* Article 8 */}
            <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Article 8 - Limitation de responsabilité</h2>
              <p className="text-muted-foreground leading-relaxed">
                Le Vendeur ne saurait être tenu responsable des dommages indirects, tels que perte de chiffre d'affaires, perte de données ou préjudice commercial, résultant de l'utilisation ou de l'impossibilité d'utiliser le Service.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                La responsabilité du Vendeur est limitée au montant des sommes versées par le Client au titre des 12 derniers mois d'abonnement.
              </p>
            </section>

            {/* Article 9 */}
            <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Article 9 - Protection des données</h2>
              <p className="text-muted-foreground leading-relaxed">
                Les données personnelles collectées sont traitées conformément à notre <a href="/confidentialite" className="text-primary hover:underline">Politique de Confidentialité</a> et au Règlement Général sur la Protection des Données (RGPD).
              </p>
            </section>

            {/* Article 10 */}
            <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Article 10 - Droit applicable et litiges</h2>
              <p className="text-muted-foreground leading-relaxed">
                Les présentes CGV sont régies par le droit français.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, le litige sera soumis aux tribunaux compétents.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Conformément aux dispositions du Code de la consommation concernant le règlement amiable des litiges, le Client peut recourir au service de médiation proposé par le Vendeur. Le médiateur peut être contacté à l'adresse : <a href="mailto:lokario.saas@gmail.com" className="text-primary hover:underline">lokario.saas@gmail.com</a>
              </p>
            </section>

            {/* Article 11 */}
            <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-foreground mb-4">Article 11 - Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                Pour toute question relative aux présentes CGV :
              </p>
              <ul className="mt-4 text-muted-foreground space-y-2">
                <li>Email : <a href="mailto:lokario.saas@gmail.com" className="text-primary hover:underline">lokario.saas@gmail.com</a></li>
                <li>WhatsApp : <a href="https://wa.me/33770034283" className="text-primary hover:underline">+33 7 70 03 42 83</a></li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CGV;
