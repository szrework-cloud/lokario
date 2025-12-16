#!/bin/bash
# Script pour installer la synchronisation automatique des relances via cron

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_PATH=$(which python3 || which python)

if [ -z "$PYTHON_PATH" ]; then
    echo "❌ Python 3 n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

# Créer le répertoire logs s'il n'existe pas
mkdir -p "$SCRIPT_DIR/logs"
CRON_LOG="$SCRIPT_DIR/logs/followups_auto.log"

# Ligne cron (toutes les heures)
CRON_LINE="0 * * * * cd $SCRIPT_DIR && $PYTHON_PATH scripts/send_automatic_followups.py >> $CRON_LOG 2>&1"

echo "📋 Configuration du cron pour les relances automatiques"
echo "=================================================="
echo "Script: $SCRIPT_DIR/scripts/send_automatic_followups.py"
echo "Logs: $CRON_LOG"
echo "Fréquence: Toutes les heures (à l'heure pile)"
echo ""
echo "Ligne cron à ajouter:"
echo "$CRON_LINE"
echo ""

# Vérifier si un cron existe déjà
if crontab -l 2>/dev/null | grep -q "send_automatic_followups.py"; then
    echo "⚠️  Une synchronisation est déjà configurée dans cron"
    echo ""
    echo "Cron actuel:"
    crontab -l 2>/dev/null | grep "send_automatic_followups"
    echo ""
    read -p "Voulez-vous remplacer la configuration existante ? (o/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        # Supprimer l'ancien cron et ajouter le nouveau
        crontab -l 2>/dev/null | grep -v "send_automatic_followups.py" | crontab -
        (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
        echo "✅ Cron mis à jour"
    else
        echo "❌ Installation annulée"
        exit 0
    fi
else
    # Ajouter le nouveau cron
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    echo "✅ Cron ajouté"
fi

echo ""
echo "📋 Cron configuré:"
crontab -l | grep "send_automatic_followups"

echo ""
echo "💡 Pour voir les logs en temps réel:"
echo "   tail -f $CRON_LOG"
echo ""
echo "💡 Pour modifier ou supprimer le cron:"
echo "   crontab -e"
echo "   (supprimez la ligne avec send_automatic_followups.py)"
