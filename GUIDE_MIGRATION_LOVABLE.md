# Guide de Migration de la Landing Page vers Lovable

## Vue d'ensemble

Lovable utilise **Vite + React** au lieu de **Next.js**. Voici comment adapter votre landing page.

## Différences principales

### Next.js → Vite + React

1. **Routing** : Pas de `app/` directory, utilisez React Router ou un simple composant
2. **Imports** : Pas de `@/` par défaut, configurez les alias dans `vite.config.ts`
3. **Client Components** : Tous les composants sont "client" par défaut dans Vite
4. **Images** : Utilisez `import` pour les images au lieu de `next/image`

## Structure recommandée pour Lovable

```
lovable-project/
├── src/
│   ├── components/
│   │   └── landing/
│   │       ├── Header.tsx
│   │       ├── Hero.tsx
│   │       ├── FeaturesGrid.tsx
│   │       ├── ProductShowcase.tsx
│   │       ├── CTASection.tsx
│   │       └── Footer.tsx
│   ├── App.tsx          # Point d'entrée principal
│   ├── main.tsx         # Entry point Vite
│   └── index.css        # Styles globaux (Tailwind)
├── vite.config.ts       # Configuration Vite
├── tailwind.config.js   # Configuration Tailwind
├── tsconfig.json        # Configuration TypeScript
└── package.json
```

## Étapes de migration

### 1. Configuration Vite (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 2. Configuration TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 3. Point d'entrée (`src/main.tsx`)

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 4. App principal (`src/App.tsx`)

```typescript
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

### 5. Package.json pour Lovable

```json
{
  "name": "lokario-landing",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.561.0",
    "framer-motion": "^12.23.26",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}
```

### 6. Modifications des composants

#### Supprimer les directives Next.js

**Avant (Next.js)** :
```tsx
"use client";
import Link from "next/link";
import Image from "next/image";
```

**Après (Vite + React)** :
```tsx
import { Link } from "react-router-dom"; // Si vous utilisez React Router
// ou simplement <a> pour les liens externes
import logoImage from "@/assets/logo.png"; // Pour les images
```

#### Exemple : Header.tsx adapté

```tsx
import { Link } from "react-router-dom"; // ou <a> pour liens externes

export function LandingHeader() {
  return (
    <header className="...">
      <nav>
        <Link to="/">Accueil</Link>
        {/* ou <a href="/">Accueil</a> */}
      </nav>
    </header>
  );
}
```

### 7. Configuration Tailwind (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vos couleurs personnalisées
      },
    },
  },
  plugins: [],
}
```

### 8. CSS global (`src/index.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Vos styles personnalisés */
```

## Checklist de migration

- [ ] Créer la structure de projet Vite
- [ ] Configurer les alias `@/` dans `vite.config.ts`
- [ ] Adapter `package.json` avec les dépendances Vite
- [ ] Créer `App.tsx` et `main.tsx`
- [ ] Copier les composants de `src/components/landing/`
- [ ] Remplacer `next/link` par `<a>` ou React Router
- [ ] Remplacer `next/image` par `<img>` ou imports d'images
- [ ] Supprimer toutes les directives `"use client"`
- [ ] Tester que Tailwind fonctionne
- [ ] Vérifier que tous les imports fonctionnent

## Commandes Lovable

Dans Lovable, vous pouvez :
1. Créer un nouveau projet avec le template React + Vite
2. Copier vos composants dans `src/components/landing/`
3. Adapter les imports et les liens
4. Utiliser shadcn/ui si nécessaire (Lovable le supporte)

## Utilisation de shadcn/ui dans Lovable

Si vous voulez utiliser shadcn/ui :

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
# etc.
```

## Notes importantes

1. **Pas de SSR** : Vite est un SPA (Single Page Application), pas de rendu serveur
2. **Routing** : Utilisez React Router si vous avez plusieurs pages
3. **Images** : Importez-les comme des modules ou utilisez le dossier `public/`
4. **API** : Les appels API restent identiques (fetch, axios, etc.)

## Exemple complet d'un composant adapté

**Avant (Next.js)** :
```tsx
"use client";
import Link from "next/link";
import Image from "next/image";

export function LandingHero() {
  return (
    <section>
      <Link href="/register">S'inscrire</Link>
      <Image src="/logo.png" alt="Logo" width={100} height={100} />
    </section>
  );
}
```

**Après (Vite + React)** :
```tsx
import { Link } from "react-router-dom"; // ou <a href="/register">
import logoImage from "@/assets/logo.png";

export function LandingHero() {
  return (
    <section>
      <Link to="/register">S'inscrire</Link>
      {/* ou <a href="/register">S'inscrire</a> */}
      <img src={logoImage} alt="Logo" className="w-[100px] h-[100px]" />
    </section>
  );
}
```
