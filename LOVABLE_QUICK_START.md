# Quick Start : Migrer vers Lovable

## 🚀 Étapes rapides

### 1. Créer un nouveau projet dans Lovable
- Choisir le template **React + Vite + TypeScript**
- Lovable configurera automatiquement Tailwind CSS

### 2. Structure de dossiers

Créez cette structure dans votre projet Lovable :

```
src/
├── components/
│   ├── landing/
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── FeaturesGrid.tsx
│   │   ├── ProductShowcase.tsx
│   │   ├── CTASection.tsx
│   │   └── Footer.tsx
│   └── ui/
│       └── Button.tsx (si vous utilisez vos composants UI)
├── assets/
│   ├── images/
│   │   └── lokario-logo.png
│   └── videos/
│       └── hero-background.mp4
├── App.tsx
└── main.tsx
```

### 3. Modifications à faire dans chaque composant

#### ✅ À FAIRE :
1. **Supprimer** `"use client"` en haut de chaque fichier
2. **Remplacer** `import Link from "next/link"` par `<a href="...">` ou React Router
3. **Remplacer** `import Image from "next/image"` par `<img>` avec import d'image
4. **Garder** tous les autres imports (lucide-react, framer-motion, etc.)

#### 📝 Exemple de transformation :

**AVANT (Next.js)** :
```tsx
"use client";
import Link from "next/link";
import Image from "next/image";

export function Component() {
  return (
    <Link href="/register">
      <Image src="/logo.png" width={100} height={100} alt="Logo" />
    </Link>
  );
}
```

**APRÈS (Lovable/Vite)** :
```tsx
import logoImage from "@/assets/images/logo.png";

export function Component() {
  return (
    <a href="/register">
      <img src={logoImage} alt="Logo" className="w-[100px] h-[100px]" />
    </a>
  );
}
```

### 4. Configuration Vite (si nécessaire)

Dans Lovable, allez dans les paramètres du projet et ajoutez :

**Alias `@`** : Configuré automatiquement par Lovable
**Tailwind CSS** : Déjà configuré

### 5. Copier vos composants

1. Copiez tous les fichiers de `src/components/landing/` vers Lovable
2. Appliquez les modifications ci-dessus
3. Copiez vos composants UI si nécessaire (`Button.tsx`, etc.)

### 6. Assets (images, vidéos)

**Option 1 : Dossier public** (recommandé pour Lovable)
```
public/
├── lokario-logo.png
└── videos/
    └── hero-background.mp4
```
Utilisation : `<img src="/lokario-logo.png" />`

**Option 2 : Import direct**
```
src/assets/
├── lokario-logo.png
└── videos/
    └── hero-background.mp4
```
Utilisation : `import logo from "@/assets/lokario-logo.png"` puis `<img src={logo} />`

### 7. App.tsx final

```tsx
import { LandingHeader } from "@/components/landing/Header";
import { LandingHero } from "@/components/landing/Hero";
import { LandingProductShowcase } from "@/components/landing/ProductShowcase";
import { LandingFeaturesGrid } from "@/components/landing/FeaturesGrid";
import { LandingCTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingProductShowcase />
        <LandingFeaturesGrid />
        <LandingCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
```

## ✅ Checklist finale

- [ ] Tous les `"use client"` supprimés
- [ ] Tous les `next/link` remplacés par `<a>` ou React Router
- [ ] Tous les `next/image` remplacés par `<img>` avec imports
- [ ] Les images/vidéos sont dans `public/` ou importées
- [ ] `App.tsx` créé avec tous les composants
- [ ] Tailwind CSS fonctionne
- [ ] Tous les imports fonctionnent
- [ ] Le site se compile sans erreurs

## 🎨 Utiliser shadcn/ui dans Lovable

Lovable supporte shadcn/ui ! Vous pouvez :

1. Installer shadcn/ui dans votre projet Lovable
2. Utiliser les composants directement
3. Ou garder vos composants UI personnalisés

## 📚 Ressources

- [Documentation Vite](https://vitejs.dev/)
- [Documentation React Router](https://reactrouter.com/) (si vous avez besoin de routing)
- [Documentation Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

## 💡 Astuce Lovable

Dans Lovable, vous pouvez utiliser l'IA pour :
- Générer automatiquement les composants
- Adapter le code Next.js vers Vite
- Créer les configurations nécessaires

Il suffit de demander : *"Adapte ce composant Next.js pour Vite + React"*
