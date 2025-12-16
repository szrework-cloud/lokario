import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";

const MentionsLegales = () => {
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
                Mentions Légales
              </h1>
              <p className="text-muted-foreground">
                Informations légales relatives au site lokario.fr
              </p>
            </div>

            <div className="prose prose-invert max-w-none space-y-6">
              {/* Éditeur */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">1. Éditeur du site</h2>
                <div className="text-muted-foreground leading-relaxed space-y-2">
                  <p><strong className="text-foreground">Dénomination sociale :</strong> S-Rework</p>
                  <p><strong className="text-foreground">Forme juridique :</strong> Entreprise Individuelle (EI)</p>
                  <p><strong className="text-foreground">Siège social :</strong> 28 rue d'Eymoutiers, 67110 Niederbronn-les-Bains, France</p>
                  <p><strong className="text-foreground">SIRET :</strong> 938 687 969 00015</p>
                  <p><strong className="text-foreground">Directeur de la publication :</strong> Gurler Adem</p>
                </div>
              </section>

              {/* Contact */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">2. Contact</h2>
                <div className="text-muted-foreground leading-relaxed space-y-2">
                  <p><strong className="text-foreground">Email :</strong> <a href="mailto:lokario.saas@gmail.com" className="text-primary hover:underline">lokario.saas@gmail.com</a></p>
                  <p><strong className="text-foreground">WhatsApp :</strong> +33 7 70 03 42 83</p>
                  <p><strong className="text-foreground">Adresse :</strong> 28 rue d'Eymoutiers, 67110 Niederbronn-les-Bains</p>
                </div>
              </section>

              {/* Hébergement */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">3. Hébergement</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Le site lokario.fr est hébergé par des prestataires situés dans l'Union Européenne, conformément aux exigences du Règlement Général sur la Protection des Données (RGPD).
                </p>
              </section>

              {/* Propriété intellectuelle */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">4. Propriété intellectuelle</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  L'ensemble du contenu du site lokario.fr est protégé par le droit d'auteur et le droit des marques. Cela inclut notamment :
                </p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                  <li>Les textes, articles et contenus rédactionnels</li>
                  <li>Les images, illustrations et graphismes</li>
                  <li>Le logo et la marque Lokario</li>
                  <li>La structure et le design du site</li>
                  <li>Le code source et les logiciels</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie de ces éléments, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable de S-Rework.
                </p>
              </section>

              {/* Données personnelles */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">5. Protection des données personnelles</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Conformément à la loi n°78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés, modifiée, et au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données personnelles.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Pour exercer ces droits ou pour toute question relative à vos données personnelles, vous pouvez nous contacter à : <a href="mailto:lokario.saas@gmail.com" className="text-primary hover:underline">lokario.saas@gmail.com</a>
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Pour plus d'informations, consultez notre <a href="/confidentialite" className="text-primary hover:underline">Politique de Confidentialité</a>.
                </p>
              </section>

              {/* Cookies */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">6. Cookies</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Le site utilise des cookies pour améliorer l'expérience utilisateur et réaliser des statistiques de visite. Les cookies sont de petits fichiers texte stockés sur votre appareil qui nous permettent de :
                </p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                  <li>Assurer le bon fonctionnement du site</li>
                  <li>Mémoriser vos préférences</li>
                  <li>Analyser l'utilisation du site</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  Vous pouvez configurer votre navigateur pour refuser les cookies ou être alerté lorsqu'un cookie est déposé.
                </p>
              </section>

              {/* Limitation de responsabilité */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">7. Limitation de responsabilité</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  S-Rework s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur ce site. Cependant, S-Rework ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations disponibles.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  S-Rework décline toute responsabilité pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur ce site, ainsi que pour tous dommages résultant d'une intrusion frauduleuse d'un tiers.
                </p>
              </section>

              {/* Liens hypertextes */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">8. Liens hypertextes</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Le site peut contenir des liens vers d'autres sites web. S-Rework n'exerce aucun contrôle sur ces sites et n'assume aucune responsabilité quant à leur contenu ou leur politique de confidentialité.
                </p>
              </section>

              {/* Droit applicable */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">9. Droit applicable</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Les présentes mentions légales sont régies par le droit français. En cas de litige et à défaut d'accord amiable, le litige sera porté devant les tribunaux français compétents.
                </p>
              </section>

              {/* Médiation */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">10. Médiation de la consommation</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Conformément à l'article L.612-1 du Code de la consommation, en cas de litige, le consommateur peut recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable du litige qui l'oppose au professionnel.
                </p>
              </section>

              {/* Crédits */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">11. Crédits</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Conception et développement : S-Rework<br />
                  Design : S-Rework
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MentionsLegales;