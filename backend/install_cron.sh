#!/bin/bash
# Script pour installer la synchronisation automatique des emails via cron
# À exécuter UNE SEULE FOIS sur le serveur de production

# Détecter automatiquement le répertoire du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_PATH=$(which python3)
CRON_LOG="$SCRIPT_DIR/logs/email_sync.log"

# Créer le dossier de logs
mkdir -p "$SCRIPT_DIR/logs"

# Ligne cron (toutes les minutes)
CRON_LINE="* * * * * cd $SCRIPT_DIR && $PYTHON_PATH scripts/sync_emails_periodic.py >> $CRON_LOG 2>&1"

echo "📧 Configuration de la synchronisation automatique des emails"
echo ""
echo "⚠️  IMPORTANT: Ce script configure la synchronisation pour TOUTES les entreprises"
echo "   Il doit être exécuté UNE SEULE FOIS sur le serveur de production"
echo ""
echo "Script: $SCRIPT_DIR/scripts/sync_emails_periodic.py"
echo "Python: $PYTHON_PATH"
echo "Logs: $CRON_LOG"
echo ""
echo "Ligne cron à ajouter:"
echo "$CRON_LINE"
echo ""

# Vérifier si la ligne existe déjà
if crontab -l 2>/dev/null | grep -q "sync_emails_periodic.py"; then
    echo "⚠️  Une synchronisation est déjà configurée dans cron"
    echo ""
    echo "Cron actuel:"
    crontab -l 2>/dev/null | grep "sync_emails_periodic"
    echo ""
    read -p "Voulez-vous la remplacer ? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        # Supprimer l'ancienne ligne
        crontab -l 2>/dev/null | grep -v "sync_emails_periodic.py" | crontab -
        # Ajouter la nouvelle
        (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
        echo "✅ Cron mis à jour"
    else
        echo "❌ Annulé"
        exit 1
    fi
else
    # Ajouter la ligne
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    echo "✅ Synchronisation automatique installée !"
fi

echo ""
echo "📋 Cron configuré:"
crontab -l | grep "sync_emails_periodic"
echo ""
echo "📝 Pour voir les logs en temps réel:"
echo "   tail -f $CRON_LOG"
echo ""
echo "📝 Pour désinstaller:"
echo "   crontab -e"
echo "   (supprimez la ligne avec sync_emails_periodic.py)"

