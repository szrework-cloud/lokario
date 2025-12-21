# 🔄 Comment redémarrer Next.js

## Méthode 1 : Via le terminal (Recommandé)

### Étape 1 : Arrêter le serveur

Dans le terminal où Next.js est lancé, appuyez sur :
- **Ctrl + C** (Windows/Linux)
- **Cmd + C** (Mac)

### Étape 2 : Redémarrer

```bash
npm run dev
```

Ou selon votre gestionnaire de paquets :
```bash
yarn dev
# ou
pnpm dev
# ou
bun dev
```

---

## Méthode 2 : Forcer l'arrêt puis redémarrer

### Arrêter tous les processus Node.js

```bash
# Trouver et tuer les processus sur le port 3000 (port par défaut de Next.js)
lsof -ti:3000 | xargs kill -9

# Ou tuer tous les processus Node.js (attention : ferme tous les processus Node)
pkill -f "next dev"
```

### Puis redémarrer

```bash
npm run dev
```

---

## Méthode 3 : Nettoyer le cache et redémarrer

Si vous avez des problèmes de cache :

```bash
# Supprimer le dossier .next (cache Next.js)
rm -rf .next

# Redémarrer
npm run dev
```

---

## Vérifier que Next.js tourne

Une fois redémarré, vous devriez voir dans le terminal :

```
  ▲ Next.js 16.0.10
  - Local:        http://localhost:3000
  - Ready in XXXms
```

Puis ouvrez http://localhost:3000 dans votre navigateur.

---

## Astuce : Rechargement automatique

Next.js recharge automatiquement les fichiers modifiés. Si vous ne voyez pas les changements :

1. **Rechargez le navigateur** : `Ctrl+Shift+R` (Windows/Linux) ou `Cmd+Shift+R` (Mac)
2. **Videz le cache du navigateur** si nécessaire
3. **Redémarrez Next.js** si le hot-reload ne fonctionne pas


