#!/bin/bash

echo "🚀 Démarrage du tunnel pour le port 8000..."
echo ""
echo "Si localtunnel fonctionne, vous verrez une URL ci-dessous :"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Essayer localtunnel
npx localtunnel --port 8000 2>&1 | while IFS= read -r line; do
    echo "$line"
    
    # Extraire l'URL si elle apparaît
    if [[ $line == *"your url is:"* ]]; then
        URL=$(echo "$line" | grep -o 'https://[^ ]*')
        echo ""
        echo "═══════════════════════════════════════════════════════════"
        echo "✅ URL du tunnel : $URL"
        echo ""
        echo "🔗 URL complète pour Vonage :"
        echo "$URL/inbox/webhooks/sms"
        echo ""
        echo "Format: POST (form-data)"
        echo "Méthode: POST"
        echo "═══════════════════════════════════════════════════════════"
        echo ""
    fi
done

