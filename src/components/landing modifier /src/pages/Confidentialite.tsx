import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";

const Confidentialite = () => {
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
                Politique de Confidentialité
              </h1>
              <p className="text-muted-foreground">
                Date de dernière mise à jour : 1er janvier 2025
              </p>
            </div>

            <div className="prose prose-invert max-w-none space-y-6">
              {/* Introduction */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  S-Rework, entreprise individuelle immatriculée sous le numéro SIRET 938 687 969 00015 (ci-après "nous" ou "Lokario"), s'engage à protéger la vie privée de ses utilisateurs.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Cette politique de confidentialité explique comment nous collectons, utilisons, stockons et protégeons vos données personnelles lorsque vous utilisez notre plateforme Lokario, conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.
                </p>
              </section>

              {/* Responsable du traitement */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">2. Responsable du traitement</h2>
                <div className="text-muted-foreground leading-relaxed">
                  <p className="mb-2">Le responsable du traitement des données est :</p>
                  <ul className="space-y-1 ml-4">
                    <li>S-Rework (EI)</li>
                    <li>Représentant : Gurler Adem</li>
                    <li>Email : <a href="mailto:lokario.saas@gmail.com" className="text-primary hover:underline">lokario.saas@gmail.com</a></li>
                  </ul>
                </div>
              </section>

              {/* Données collectées */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">3. Données collectées</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Nous collectons les types de données suivants :
                </p>
                <div className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="text-foreground font-medium mb-2">Données d'identification :</h3>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>Nom et prénom</li>
                      <li>Adresse email</li>
                      <li>Numéro de téléphone (optionnel)</li>
                      <li>Nom de l'entreprise</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium mb-2">Données de connexion et d'utilisation :</h3>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>Adresse IP</li>
                      <li>Type de navigateur et d'appareil</li>
                      <li>Historique de connexion</li>
                      <li>Actions effectuées sur la plateforme</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium mb-2">Données métier :</h3>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>Informations clients (contacts, entreprises)</li>
                      <li>Projets et tâches</li>
                      <li>Devis et factures</li>
                      <li>Messages et communications</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Finalités */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">4. Finalités du traitement</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Vos données sont traitées pour les finalités suivantes :
                </p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-2">
                  <li>Fourniture et gestion du service Lokario</li>
                  <li>Création et gestion de votre compte utilisateur</li>
                  <li>Traitement des paiements et facturation</li>
                  <li>Communication relative au service (support, notifications)</li>
                  <li>Amélioration de nos services et de l'expérience utilisateur</li>
                  <li>Respect de nos obligations légales</li>
                  <li>Sécurité de la plateforme</li>
                </ul>
              </section>

              {/* Base légale */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">5. Base légale du traitement</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Le traitement de vos données repose sur les bases légales suivantes :
                </p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-2">
                  <li><strong className="text-foreground">Exécution du contrat</strong> : pour vous fournir le service</li>
                  <li><strong className="text-foreground">Consentement</strong> : pour les communications marketing</li>
                  <li><strong className="text-foreground">Intérêt légitime</strong> : pour l'amélioration du service et la sécurité</li>
                  <li><strong className="text-foreground">Obligation légale</strong> : pour le respect des réglementations applicables</li>
                </ul>
              </section>

              {/* Durée de conservation */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">6. Durée de conservation</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Vos données sont conservées pendant les durées suivantes :
                </p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-2">
                  <li>Données de compte : pendant la durée de votre abonnement + 3 ans</li>
                  <li>Données de facturation : 10 ans (obligations comptables)</li>
                  <li>Données de connexion : 1 an</li>
                  <li>Données métier exportées après résiliation : 30 jours</li>
                </ul>
              </section>

              {/* Sécurité */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">7. Sécurité des données</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :
                </p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-2">
                  <li>Chiffrement des données en transit (HTTPS/TLS)</li>
                  <li>Chiffrement des données sensibles au repos</li>
                  <li>Authentification sécurisée</li>
                  <li>Sauvegardes régulières</li>
                  <li>Contrôle d'accès strict</li>
                  <li>Hébergement sur des serveurs sécurisés en Europe</li>
                </ul>
              </section>

              {/* Vos droits */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">8. Vos droits</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-2">
                  <li><strong className="text-foreground">Droit d'accès</strong> : obtenir une copie de vos données</li>
                  <li><strong className="text-foreground">Droit de rectification</strong> : corriger vos données inexactes</li>
                  <li><strong className="text-foreground">Droit à l'effacement</strong> : demander la suppression de vos données</li>
                  <li><strong className="text-foreground">Droit à la portabilité</strong> : récupérer vos données dans un format standard</li>
                  <li><strong className="text-foreground">Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
                  <li><strong className="text-foreground">Droit à la limitation</strong> : restreindre le traitement de vos données</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Pour exercer ces droits, contactez-nous à : <a href="mailto:lokario.saas@gmail.com" className="text-primary hover:underline">lokario.saas@gmail.com</a>
                </p>
              </section>

              {/* Cookies */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">9. Cookies</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Notre plateforme utilise des cookies pour :
                </p>
                <ul className="list-disc ml-6 text-muted-foreground space-y-2">
                  <li>Assurer le bon fonctionnement du service (cookies essentiels)</li>
                  <li>Mémoriser vos préférences</li>
                  <li>Analyser l'utilisation du service (cookies analytiques)</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Vous pouvez configurer votre navigateur pour refuser les cookies non essentiels.
                </p>
              </section>

              {/* Transferts */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">10. Transferts de données</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Vos données sont hébergées sur des serveurs situés dans l'Union Européenne. En cas de transfert hors UE, nous nous assurons que des garanties appropriées sont mises en place (clauses contractuelles types, décision d'adéquation).
                </p>
              </section>

              {/* Réclamation */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">11. Réclamation</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr</a>
                </p>
              </section>

              {/* Contact */}
              <section className="p-6 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">12. Contact</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Pour toute question concernant cette politique ou vos données personnelles :
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

export default Confidentialite;