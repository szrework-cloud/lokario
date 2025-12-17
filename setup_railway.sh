#!/bin/bash

# Script pour configurer Railway via CLI

echo "🔐 Connexion à Railway..."
npx @railway/cli login

echo ""
echo "🔗 Liaison du projet..."
cd "/Users/glr_adem/Documents/B2B SAAS"
npx @railway/cli link

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "📝 Note: Le Root Directory doit être configuré dans l'interface Railway web :"
echo "   1. Allez dans Settings → Source"
echo "   2. Ajoutez 'backend' dans Root Directory"
echo "   3. Cliquez sur Update"
echo ""
echo "Ou utilisez cette commande après avoir lié le projet :"
echo "   npx @railway/cli open"
