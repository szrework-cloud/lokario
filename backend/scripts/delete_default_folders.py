#!/usr/bin/env python3
"""
Script pour supprimer les dossiers par défaut (Spam, Newsletters, Notifications) de toutes les entreprises.
Ces dossiers ne seront plus créés automatiquement dans le futur.

Usage:
    python scripts/delete_default_folders.py
    
    OU avec DATABASE_URL:
    export DATABASE_URL="postgresql://..."
    python scripts/delete_default_folders.py
"""
import sys
import os
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.db.models.conversation import InboxFolder
from app.db.models.conversation import Conversation
from sqlalchemy import func
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

FOLDERS_TO_DELETE = ["Spam", "Newsletters", "Notifications"]


def delete_default_folders():
    """Supprime les dossiers Spam, Newsletters et Notifications de toutes les entreprises."""
    db = SessionLocal()
    
    try:
        logger.info("🗑️  Début de la suppression des dossiers par défaut...")
        
        total_deleted = 0
        companies_affected = set()
        
        for folder_name in FOLDERS_TO_DELETE:
            logger.info(f"🔍 Recherche des dossiers '{folder_name}'...")
            
            # Récupérer tous les dossiers avec ce nom (système)
            folders = db.query(InboxFolder).filter(
                InboxFolder.name == folder_name,
                InboxFolder.is_system == True
            ).all()
            
            logger.info(f"   Trouvé {len(folders)} dossier(s) '{folder_name}'")
            
            for folder in folders:
                # Compter les conversations dans ce dossier
                conversation_count = db.query(Conversation).filter(
                    Conversation.folder_id == folder.id
                ).count()
                
                if conversation_count > 0:
                    # Déplacer les conversations vers "all" (pas de dossier = None)
                    logger.info(f"   Déplacement de {conversation_count} conversation(s) du dossier '{folder_name}' (ID: {folder.id}, Company: {folder.company_id})")
                    db.query(Conversation).filter(
                        Conversation.folder_id == folder.id
                    ).update({Conversation.folder_id: None})
                
                # Supprimer le dossier
                companies_affected.add(folder.company_id)
                db.delete(folder)
                total_deleted += 1
                logger.info(f"   ✅ Dossier '{folder_name}' supprimé (ID: {folder.id}, Company: {folder.company_id})")
        
        if total_deleted > 0:
            db.commit()
            logger.info(f"\n✅ {total_deleted} dossier(s) supprimé(s)")
            logger.info(f"📊 {len(companies_affected)} entreprise(s) affectée(s)")
            logger.info("\nLes conversations qui étaient dans ces dossiers ont été déplacées dans 'Inbox' (aucun dossier).")
        else:
            logger.info("\nℹ️  Aucun dossier à supprimer.")
        
        return total_deleted
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur lors de la suppression des dossiers: {e}", exc_info=True)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("⚠️  ATTENTION: Ce script va supprimer les dossiers 'Spam', 'Newsletters' et 'Notifications' de toutes les entreprises.")
    print("   Les conversations dans ces dossiers seront déplacées dans 'Inbox' (aucun dossier).")
    print("\n   Appuyez sur Ctrl+C pour annuler, ou Entrée pour continuer...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\n❌ Annulé")
        sys.exit(0)
    
    try:
        deleted_count = delete_default_folders()
        if deleted_count > 0:
            print(f"\n✅ Opération terminée avec succès ! {deleted_count} dossier(s) supprimé(s).")
        else:
            print("\n✅ Aucun dossier à supprimer.")
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1)

