# 🎨 Guide des Animations

Ce guide explique comment utiliser les composants animés pour créer une interface fluide et agréable.

## 📦 Installation

Framer Motion est déjà installé :
```bash
npm install framer-motion
```

## 🎯 Composants Animés Disponibles

### 1. AnimatedModal

Modal avec animations d'entrée/sortie fluides.

**Exemple :**
```tsx
import { AnimatedModal } from "@/components/ui/AnimatedModal";

<AnimatedModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Créer un devis"
  size="lg"
>
  {/* Contenu du modal */}
</AnimatedModal>
```

**Avantages :**
- Animation spring naturelle
- Backdrop avec blur
- Fermeture animée
- Bouton de fermeture avec rotation au hover

---

### 2. AnimatedCard

Carte avec animation d'entrée et hover.

**Exemple :**
```tsx
import { AnimatedCard } from "@/components/ui/AnimatedCard";

<AnimatedCard delay={0.1} hover={true}>
  <Card>
    <CardContent>
      <h3>Titre</h3>
      <p>Contenu</p>
    </CardContent>
  </Card>
</AnimatedCard>
```

**AnimatedCardList** pour des listes avec effet cascade :
```tsx
import { AnimatedCardList } from "@/components/ui/AnimatedCard";

<AnimatedCardList className="grid grid-cols-3 gap-4">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</AnimatedCardList>
```

---

### 3. AnimatedButton

Bouton avec animations de hover et click, avec état de chargement.

**Exemple :**
```tsx
import { AnimatedButton } from "@/components/ui/AnimatedButton";

<AnimatedButton
  variant="primary"
  loading={isSubmitting}
  onClick={handleSubmit}
>
  Envoyer
</AnimatedButton>
```

**Variants disponibles :** `primary`, `secondary`, `danger`, `ghost`

---

### 4. PageTransition

Wrapper pour animer les transitions entre les pages.

**Exemple :**
```tsx
import { PageTransition } from "@/components/ui/PageTransition";

export default function MyPage() {
  return (
    <PageTransition>
      <div>
        {/* Contenu de la page */}
      </div>
    </PageTransition>
  );
}
```

**StaggerList** pour animer les listes avec effet cascade :
```tsx
import { StaggerList } from "@/components/ui/PageTransition";

<StaggerList staggerDelay={0.1}>
  {items.map(item => (
    <ItemCard key={item.id} item={item} />
  ))}
</StaggerList>
```

---

### 5. AnimatedBadge

Badge avec animation d'apparition et option pulse.

**Exemple :**
```tsx
import { AnimatedBadge } from "@/components/ui/AnimatedBadge";

<AnimatedBadge variant="success" pulse={true}>
  Nouveau
</AnimatedBadge>
```

**Variants disponibles :** `default`, `success`, `warning`, `danger`, `info`

---

### 6. AnimatedInput

Input avec animations de focus et validation.

**Exemple :**
```tsx
import { AnimatedInput } from "@/components/ui/AnimatedInput";

<AnimatedInput
  label="Email"
  type="email"
  error={errors.email}
  success={isValid}
  placeholder="votre@email.com"
/>
```

---

## 🎬 Exemples d'Utilisation Avancés

### Animation de liste avec stagger

```tsx
import { StaggerList } from "@/components/ui/PageTransition";

function TasksList({ tasks }) {
  return (
    <StaggerList staggerDelay={0.05}>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </StaggerList>
  );
}
```

### Modal avec formulaire animé

```tsx
import { AnimatedModal } from "@/components/ui/AnimatedModal";
import { AnimatedInput } from "@/components/ui/AnimatedInput";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

function CreateTaskModal({ isOpen, onClose }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer une tâche"
      size="md"
    >
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <AnimatedInput
          label="Titre"
          placeholder="Nom de la tâche"
        />
        <AnimatedButton
          variant="primary"
          loading={isSubmitting}
          type="submit"
        >
          Créer
        </AnimatedButton>
      </motion.form>
    </AnimatedModal>
  );
}
```

### Carte avec hover et click

```tsx
import { AnimatedCard } from "@/components/ui/AnimatedCard";

function ClientCard({ client }) {
  return (
    <AnimatedCard
      hover={true}
      onClick={() => router.push(`/app/clients/${client.id}`)}
      className="cursor-pointer"
    >
      <Card>
        <CardContent>
          <h3>{client.name}</h3>
          <p>{client.email}</p>
        </CardContent>
      </Card>
    </AnimatedCard>
  );
}
```

---

## 🎨 Personnalisation des Animations

### Ajuster la vitesse

```tsx
// Animation plus rapide
<motion.div
  transition={{ duration: 0.2 }}
  // ...
/>

// Animation plus lente
<motion.div
  transition={{ duration: 0.6 }}
  // ...
/>
```

### Changer le type d'animation

```tsx
// Spring (par défaut - plus naturel)
<motion.div
  transition={{
    type: "spring",
    stiffness: 300,
    damping: 30,
  }}
/>

// Tween (linéaire)
<motion.div
  transition={{
    type: "tween",
    duration: 0.3,
    ease: "easeOut",
  }}
/>
```

### Animation personnalisée

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
  animate={{ opacity: 1, scale: 1, rotate: 0 }}
  exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
  transition={{
    type: "spring",
    stiffness: 200,
    damping: 20,
  }}
>
  Contenu animé
</motion.div>
```

---

## 📱 Animations Responsive

Les animations s'adaptent automatiquement, mais vous pouvez désactiver les animations sur mobile pour de meilleures performances :

```tsx
import { useMediaQuery } from "@/hooks/useMediaQuery";

function MyComponent() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  return (
    <motion.div
      animate={!isMobile ? { y: 0 } : {}}
      // ...
    >
      Contenu
    </motion.div>
  );
}
```

---

## ⚡ Performance

### Réduire les animations sur mobile

```tsx
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

<motion.div
  animate={!prefersReducedMotion ? { y: 0 } : {}}
  // ...
/>
```

### Lazy loading des animations

Les animations Framer Motion sont déjà optimisées, mais vous pouvez désactiver certaines animations pour les composants lourds :

```tsx
// Désactiver les animations pour les grandes listes
<StaggerList staggerDelay={0}>
  {/* Pas d'animation stagger */}
</StaggerList>
```

---

## 🎯 Bonnes Pratiques

1. **Utilisez les animations avec modération** - Trop d'animations peuvent distraire
2. **Respectez les préférences utilisateur** - Désactivez si `prefers-reduced-motion`
3. **Optimisez pour mobile** - Réduisez les animations sur mobile
4. **Testez les performances** - Surveillez les FPS avec les DevTools
5. **Cohérence** - Utilisez les mêmes timings partout

---

## 🔧 Migration depuis les composants non-animés

### Modal

**Avant :**
```tsx
import { Modal } from "@/components/ui/Modal";
```

**Après :**
```tsx
import { AnimatedModal } from "@/components/ui/AnimatedModal";
// Même API, juste plus fluide !
```

### Button

**Avant :**
```tsx
import { Button } from "@/components/ui/Button";
```

**Après :**
```tsx
import { AnimatedButton } from "@/components/ui/AnimatedButton";
// Ajoute automatiquement les animations
```

---

## 📚 Ressources

- [Documentation Framer Motion](https://www.framer.com/motion/)
- [Exemples d'animations](https://www.framer.com/motion/examples/)
- [Guide de performance](https://www.framer.com/motion/performance/)

---

## 🚀 Prochaines Étapes

1. ✅ Composants animés créés
2. ⏳ Migrer les modals existants vers AnimatedModal
3. ⏳ Ajouter PageTransition aux pages principales
4. ⏳ Utiliser StaggerList pour les grandes listes
5. ⏳ Ajouter des animations aux interactions utilisateur

