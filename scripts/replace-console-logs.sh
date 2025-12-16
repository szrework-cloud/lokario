#!/bin/bash

# Script pour remplacer console.log/debug/info par logger dans le frontend
# Utilisation: ./scripts/replace-console-logs.sh

echo "🔄 Remplacement des console.log par logger..."

# Trouver tous les fichiers TypeScript/TSX avec console.log
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "console\.\(log\|debug\|info\)" {} \; | while read file; do
  echo "Traitement: $file"
  
  # Ajouter l'import logger si nécessaire (une seule fois)
  if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
    # Trouver la dernière ligne d'import
    last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
    if [ -n "$last_import_line" ]; then
      sed -i '' "${last_import_line}a\\
import { logger } from \"@/lib/logger\";
" "$file"
    fi
  fi
  
  # Remplacer console.log par logger.log
  sed -i '' 's/console\.log(/logger.log(/g' "$file"
  
  # Remplacer console.debug par logger.debug
  sed -i '' 's/console\.debug(/logger.debug(/g' "$file"
  
  # Remplacer console.info par logger.info
  sed -i '' 's/console\.info(/logger.info(/g' "$file"
  
  # Note: console.error et console.warn sont laissés tels quels car ils doivent toujours logger
done

echo "✅ Remplacement terminé !"
echo ""
echo "⚠️  Vérifiez manuellement que:"
echo "   1. Les imports logger sont corrects"
echo "   2. Les console.error/warn restent tels quels"
echo "   3. Tous les fichiers compilent correctement"
