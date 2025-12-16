// Configuration Vite pour Lovable
// Copiez ce fichier comme vite.config.ts dans votre projet Lovable

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
  // Configuration pour les assets (images, vidéos, etc.)
  assetsInclude: ['**/*.mp4', '**/*.webm'],
})
