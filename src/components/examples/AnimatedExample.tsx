"use client";

import { useState } from "react";
import { AnimatedModal } from "@/components/ui/AnimatedModal";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { AnimatedCard, AnimatedCardList } from "@/components/ui/AnimatedCard";
import { AnimatedBadge } from "@/components/ui/AnimatedBadge";
import { AnimatedInput } from "@/components/ui/AnimatedInput";
import { StaggerList } from "@/components/ui/PageTransition";
import { Card, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";

/**
 * Composant de démonstration des animations
 * À utiliser comme référence pour intégrer les animations
 */
export function AnimatedExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const items = [
    { id: 1, title: "Item 1", badge: "Nouveau" },
    { id: 2, title: "Item 2", badge: "Populaire" },
    { id: 3, title: "Item 3", badge: null },
    { id: 4, title: "Item 4", badge: "Hot" },
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simuler une requête
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 p-8">
      <h1 className="text-3xl font-bold">Exemples d'Animations</h1>

      {/* Section 1: Boutons animés */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Boutons Animés</h2>
        <div className="flex gap-4 flex-wrap">
          <AnimatedButton variant="primary" onClick={() => setIsModalOpen(true)}>
            Ouvrir Modal
          </AnimatedButton>
          <AnimatedButton variant="secondary">Secondaire</AnimatedButton>
          <AnimatedButton variant="danger">Danger</AnimatedButton>
          <AnimatedButton variant="ghost">Ghost</AnimatedButton>
          <AnimatedButton loading={isSubmitting} onClick={handleSubmit}>
            Envoyer
          </AnimatedButton>
        </div>
      </section>

      {/* Section 2: Cartes animées */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Cartes avec Hover</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnimatedCard delay={0} hover={true}>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Carte 1</h3>
                <p className="text-sm text-gray-600">
                  Survolez-moi pour voir l'animation
                </p>
              </CardContent>
            </Card>
          </AnimatedCard>
          <AnimatedCard delay={0.1} hover={true}>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Carte 2</h3>
                <p className="text-sm text-gray-600">Avec délai</p>
              </CardContent>
            </Card>
          </AnimatedCard>
          <AnimatedCard delay={0.2} hover={true}>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Carte 3</h3>
                <p className="text-sm text-gray-600">Effet cascade</p>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </section>

      {/* Section 3: Liste avec stagger */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Liste avec Effet Cascade</h2>
        <StaggerList staggerDelay={0.1} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.badge && (
                    <AnimatedBadge variant="success" pulse={item.badge === "Nouveau"}>
                      {item.badge}
                    </AnimatedBadge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </StaggerList>
      </section>

      {/* Section 4: Inputs animés */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Inputs avec Validation</h2>
        <div className="max-w-md space-y-4">
          <AnimatedInput
            label="Email"
            type="email"
            placeholder="votre@email.com"
          />
          <AnimatedInput
            label="Mot de passe"
            type="password"
            error="Le mot de passe doit contenir au moins 8 caractères"
          />
          <AnimatedInput
            label="Nom d'utilisateur"
            type="text"
            success={true}
          />
        </div>
      </section>

      {/* Section 5: Badges animés */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Badges Animés</h2>
        <div className="flex gap-4 flex-wrap">
          <AnimatedBadge variant="default">Default</AnimatedBadge>
          <AnimatedBadge variant="success" pulse={true}>
            Success (Pulse)
          </AnimatedBadge>
          <AnimatedBadge variant="warning">Warning</AnimatedBadge>
          <AnimatedBadge variant="danger">Danger</AnimatedBadge>
          <AnimatedBadge variant="info">Info</AnimatedBadge>
        </div>
      </section>

      {/* Modal animé */}
      <AnimatedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Exemple de Modal Animé"
        size="md"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <p className="text-gray-600">
            Ce modal apparaît avec une animation fluide. Le backdrop a un effet
            de blur et le contenu utilise une animation spring naturelle.
          </p>
          <div className="flex gap-4 justify-end">
            <AnimatedButton variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annuler
            </AnimatedButton>
            <AnimatedButton variant="primary" onClick={handleSubmit}>
              Confirmer
            </AnimatedButton>
          </div>
        </motion.div>
      </AnimatedModal>
    </div>
  );
}

