# Guide : Intégrer votre Landing Page existante

## 📋 Vue d'ensemble

Vous avez déjà une landing page (de Lovable ou autre) et vous voulez l'intégrer dans ce projet Next.js.

## 🔄 Processus d'intégration

### Option 1 : Remplacer complètement la landing page actuelle

Si votre nouvelle landing page est complète et prête :

1. **Copier vos composants** dans `src/components/landing/`
2. **Remplacer** les fichiers existants ou créer de nouveaux fichiers
3. **Adapter les imports** si nécessaire (Vite → Next.js)

### Option 2 : Fusionner avec la landing page existante

Si vous voulez garder certains éléments de l'ancienne :

1. **Comparer** les deux versions
2. **Fusionner** les meilleurs éléments
3. **Tester** que tout fonctionne

## 📁 Structure actuelle

Votre projet Next.js a déjà :

```
src/
├── app/
│   └── (public)/
│       └── page.tsx          ← Page principale de la landing
└── components/
    └── landing/
        ├── Header.tsx
        ├── Hero.tsx
        ├── FeaturesGrid.tsx
        ├── ProductShowcase.tsx
        ├── CTASection.tsx
        └── Footer.tsx
```

## 🔧 Étapes d'intégration

### Étape 1 : Préparer vos fichiers

Si votre landing page vient de **Lovable (Vite)** :

#### A. Adapter les imports

**AVANT (Vite)** :
```tsx
import logoImage from "@/assets/logo.png";
import { Link } from "react-router-dom";
```

**APRÈS (Next.js)** :
```tsx
import Image from "next/image";
import Link from "next/link";
// Pour les images : mettre dans public/ et utiliser <Image src="/logo.png" />
```

#### B. Supprimer les directives inutiles

Si vous avez des `"use client"` en trop, gardez-les seulement si nécessaire (pour hooks React, événements, etc.)

#### C. Adapter les images

**AVANT (Vite)** :
```tsx
import logo from "@/assets/logo.png";
<img src={logo} alt="Logo" />
```

**APRÈS (Next.js)** :
```tsx
// Option 1 : Image dans public/
<Image src="/logo.png" width={100} height={100} alt="Logo" />

// Option 2 : Import direct (si dans src/)
import logo from "@/assets/logo.png";
<Image src={logo} width={100} height={100} alt="Logo" />
```

### Étape 2 : Copier vos composants

1. **Copiez vos fichiers** de votre landing page vers :
   ```
   src/components/landing/
   ```

2. **Nommez-les** de manière cohérente :
   - `Header.tsx` ou `LandingHeader.tsx`
   - `Hero.tsx` ou `LandingHero.tsx`
   - etc.

### Étape 3 : Adapter le point d'entrée

Modifiez `src/app/(public)/page.tsx` :

```tsx
"use client";

import { LandingHeader } from "@/components/landing/Header";
import { LandingHero } from "@/components/landing/Hero";
// ... importez tous vos composants

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <LandingHero />
        {/* Ajoutez tous vos autres composants ici */}
      </main>
      <LandingFooter />
    </div>
  );
}
```

### Étape 4 : Gérer les assets (images, vidéos)

#### Images statiques

**Option 1 : Dossier `public/`** (recommandé)
```
public/
├── lokario-logo.png
├── hero-image.jpg
└── videos/
    └── hero-background.mp4
```

Utilisation :
```tsx
<Image src="/lokario-logo.png" width={100} height={100} alt="Logo" />
```

**Option 2 : Import direct**
```
src/assets/
└── images/
    └── logo.png
```

Utilisation :
```tsx
import logo from "@/assets/images/logo.png";
<Image src={logo} width={100} height={100} alt="Logo" />
```

#### Vidéos

Mettez-les dans `public/videos/` :
```tsx
<video src="/videos/hero-background.mp4" autoPlay loop muted />
```

### Étape 5 : Vérifier les dépendances

Assurez-vous que toutes les dépendances sont dans `package.json` :

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "next": "16.0.4",
    "lucide-react": "^0.561.0",
    "framer-motion": "^12.23.26",
    // ... autres dépendances
  }
}
```

Si vous utilisez des librairies qui ne sont pas installées :
```bash
npm install nom-de-la-librairie
```

### Étape 6 : Tester

1. **Démarrer le serveur** :
   ```bash
   npm run dev
   ```

2. **Vérifier** :
   - ✅ La page se charge sans erreurs
   - ✅ Les images s'affichent
   - ✅ Les liens fonctionnent
   - ✅ Les animations fonctionnent
   - ✅ Le responsive fonctionne

## 🔄 Checklist de migration Vite → Next.js

Si votre landing vient de Lovable/Vite :

- [ ] Remplacer `import { Link } from "react-router-dom"` → `import Link from "next/link"`
- [ ] Remplacer `<a href>` internes → `<Link href>`
- [ ] Remplacer `<img src={importedImage}>` → `<Image src="/path.png" width={} height={}>`
- [ ] Déplacer les images vers `public/` ou `src/assets/`
- [ ] Vérifier que `"use client"` est présent si vous utilisez des hooks
- [ ] Adapter les chemins d'assets
- [ ] Vérifier que Tailwind fonctionne (devrait fonctionner identiquement)
- [ ] Tester tous les composants

## 📝 Exemple complet de transformation

### Composant Hero (Vite → Next.js)

**AVANT (Vite/Lovable)** :
```tsx
import heroImage from "@/assets/hero.jpg";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <section>
      <img src={heroImage} alt="Hero" />
      <Link to="/register">S'inscrire</Link>
    </section>
  );
}
```

**APRÈS (Next.js)** :
```tsx
"use client";

import Image from "next/image";
import Link from "next/link";

export function LandingHero() {
  return (
    <section>
      <Image src="/hero.jpg" width={1200} height={600} alt="Hero" />
      <Link href="/register">S'inscrire</Link>
    </section>
  );
}
```

## 🎨 Utilisation de shadcn/ui

Si votre landing page utilise shadcn/ui, vous pouvez :

1. **Installer shadcn/ui** dans ce projet :
   ```bash
   npx shadcn-ui@latest init
   ```

2. **Ajouter les composants** que vous utilisez :
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add card
   # etc.
   ```

3. **Ou** utiliser vos composants UI existants dans `src/components/ui/`

## 🚀 Commandes utiles

```bash
# Démarrer le serveur de développement
npm run dev

# Build pour production
npm run build

# Vérifier les erreurs TypeScript
npx tsc --noEmit

# Linter
npm run lint
```

## 💡 Astuces

1. **Si vous avez des erreurs d'import** :
   - Vérifiez que les chemins `@/` sont corrects
   - Vérifiez que les fichiers existent bien

2. **Si les images ne s'affichent pas** :
   - Vérifiez qu'elles sont dans `public/`
   - Vérifiez les chemins (commencent par `/`)
   - Utilisez `Image` de Next.js au lieu de `<img>`

3. **Si les styles ne fonctionnent pas** :
   - Vérifiez que Tailwind est configuré
   - Vérifiez que les classes sont correctes

4. **Pour tester rapidement** :
   - Remplacez un composant à la fois
   - Testez après chaque remplacement

## 📞 Besoin d'aide ?

Si vous avez des erreurs spécifiques :
1. Copiez le message d'erreur
2. Vérifiez le fichier concerné
3. Adaptez selon ce guide
