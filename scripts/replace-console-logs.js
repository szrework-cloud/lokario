#!/usr/bin/env node

/**
 * Script pour remplacer automatiquement console.log/debug/info par logger
 * dans tous les fichiers TypeScript/TSX du projet
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Fonction pour trouver tous les fichiers .ts et .tsx
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      findTsFiles(filePath, fileList);
    } else if (file.match(/\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Fonction pour ajouter l'import logger si nécessaire
function addLoggerImport(content) {
  // Vérifier si logger est déjà importé
  if (content.includes('from "@/lib/logger"') || content.includes("from '@/lib/logger'")) {
    return content;
  }
  
  // Trouver la dernière ligne d'import
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') && !lines[i].trim().startsWith('import type')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex >= 0) {
    // Ajouter l'import après la dernière ligne d'import
    lines.splice(lastImportIndex + 1, 0, 'import { logger } from "@/lib/logger";');
    return lines.join('\n');
  }
  
  return content;
}

// Fonction pour remplacer console.log/debug/info
function replaceConsoleLogs(content) {
  // Remplacer console.log( par logger.log(
  content = content.replace(/console\.log\(/g, 'logger.log(');
  
  // Remplacer console.debug( par logger.debug(
  content = content.replace(/console\.debug\(/g, 'logger.debug(');
  
  // Remplacer console.info( par logger.info(
  content = content.replace(/console\.info\(/g, 'logger.info(');
  
  // Note: console.error et console.warn sont laissés tels quels
  
  return content;
}

// Main
console.log('🔄 Remplacement des console.log par logger...\n');

const files = findTsFiles(SRC_DIR);
let modifiedCount = 0;
let skippedCount = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Vérifier si le fichier contient des console.log/debug/info
  if (!content.match(/console\.(log|debug|info)\(/)) {
    skippedCount++;
    return;
  }
  
  let newContent = content;
  
  // Ajouter l'import logger si nécessaire
  newContent = addLoggerImport(newContent);
  
  // Remplacer les console.log
  newContent = replaceConsoleLogs(newContent);
  
  // Écrire le fichier si modifié
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`✅ Modifié: ${path.relative(SRC_DIR, file)}`);
    modifiedCount++;
  } else {
    skippedCount++;
  }
});

console.log(`\n📊 Résumé:`);
console.log(`   - Fichiers modifiés: ${modifiedCount}`);
console.log(`   - Fichiers ignorés: ${skippedCount}`);
console.log(`   - Total: ${files.length}`);
console.log(`\n✅ Remplacement terminé !`);
console.log(`\n⚠️  Vérifiez manuellement que:`);
console.log(`   1. Les imports logger sont corrects`);
console.log(`   2. Les console.error/warn restent tels quels (ils doivent toujours logger)`);
console.log(`   3. Tous les fichiers compilent correctement: npm run build`);
