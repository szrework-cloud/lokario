"""
Script pour supprimer tous les messages de l'inbox de l'entreprise ID 6
et créer 10 nouveaux messages répartis dans les dossiers actifs.
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, init_db
from app.db.models.conversation import Conversation, InboxMessage, InboxFolder, MessageAttachment, InternalNote
from app.db.models.client import Client
from app.db.models.user import User


# Messages de démo réalistes
DEMO_MESSAGES = [
    {
        "subject": "Demande de devis pour rénovation",
        "from_name": "Marie Dupont",
        "from_email": "marie.dupont@example.com",
        "content": "Bonjour, je souhaiterais obtenir un devis pour la rénovation de ma boutique. Pourriez-vous me contacter ?",
        "source": "email",
    },
    {
        "subject": "Question sur les tarifs",
        "from_name": "Jean Martin",
        "from_email": "jean.martin@example.com",
        "content": "Bonjour, j'aimerais connaître vos tarifs pour une prestation de conseil. Merci d'avance.",
        "source": "email",
    },
    {
        "subject": "Urgent - Problème avec ma commande",
        "from_name": "Sophie Bernard",
        "from_email": "sophie.bernard@example.com",
        "content": "Bonjour, j'ai un problème urgent avec ma commande passée la semaine dernière. Pouvez-vous me rappeler rapidement ?",
        "source": "email",
    },
    {
        "subject": "Demande de rendez-vous",
        "from_name": "Pierre Leroy",
        "from_email": "pierre.leroy@example.com",
        "content": "Bonjour, je souhaiterais prendre rendez-vous pour discuter d'un projet. Quelles sont vos disponibilités ?",
        "source": "email",
    },
    {
        "subject": "Facture en retard",
        "from_name": "Claire Moreau",
        "from_email": "claire.moreau@example.com",
        "content": "Bonjour, j'ai remarqué que ma facture du mois dernier n'a pas été payée. Pouvez-vous me renvoyer la facture ?",
        "source": "email",
    },
    {
        "subject": "Demande d'informations",
        "from_name": "Thomas Petit",
        "from_email": "thomas.petit@example.com",
        "content": "Bonjour, j'aimerais avoir plus d'informations sur vos services. Pourriez-vous m'envoyer une documentation ?",
        "source": "email",
    },
    {
        "subject": "Re: Devis accepté",
        "from_name": "Isabelle Roux",
        "from_email": "isabelle.roux@example.com",
        "content": "Bonjour, j'accepte votre devis. Quand pouvez-vous commencer les travaux ?",
        "source": "email",
    },
    {
        "subject": "Réclamation",
        "from_name": "Marc Dubois",
        "from_email": "marc.dubois@example.com",
        "content": "Bonjour, je ne suis pas satisfait de la prestation reçue. J'aimerais discuter d'un remboursement.",
        "source": "email",
    },
    {
        "subject": "Nouvelle commande",
        "from_name": "Julie Blanc",
        "from_email": "julie.blanc@example.com",
        "content": "Bonjour, je souhaite passer une nouvelle commande. Pouvez-vous me confirmer les disponibilités ?",
        "source": "email",
    },
    {
        "subject": "Question technique",
        "from_name": "Nicolas Vert",
        "from_email": "nicolas.vert@example.com",
        "content": "Bonjour, j'ai une question technique sur l'utilisation de votre produit. Pouvez-vous m'aider ?",
        "source": "email",
    },
]


def setup_demo_inbox(company_id: int = 6):
    """Supprime tous les messages et crée 10 nouveaux messages dans les dossiers actifs."""
    init_db()
    db = SessionLocal()
    
    try:
        print(f"\n📧 Configuration de l'inbox pour l'entreprise ID {company_id}...")
        
        # 1. Récupérer les dossiers actifs de l'entreprise
        print("\n📁 Récupération des dossiers actifs...")
        folders = db.query(InboxFolder).filter(
            InboxFolder.company_id == company_id
        ).all()
        
        if not folders:
            print("  ⚠️  Aucun dossier trouvé. Création d'un dossier par défaut...")
            default_folder = InboxFolder(
                company_id=company_id,
                name="Inbox",
                folder_type="general",
                is_system=True,
            )
            db.add(default_folder)
            db.flush()
            folders = [default_folder]
            print(f"  ✅ Dossier créé: {default_folder.name}")
        
        print(f"  ✅ {len(folders)} dossier(s) trouvé(s):")
        for folder in folders:
            print(f"     - {folder.name} (ID: {folder.id}, Type: {folder.folder_type})")
        
        # 2. Récupérer un utilisateur de l'entreprise pour l'assignation
        user = db.query(User).filter(
            User.company_id == company_id,
            User.role.in_(["owner", "admin"])
        ).first()
        
        if not user:
            print("  ⚠️  Aucun utilisateur owner/admin trouvé. Les messages ne seront pas assignés.")
        
        # 3. Récupérer quelques clients existants (ou créer des clients de démo)
        clients = db.query(Client).filter(Client.company_id == company_id).limit(5).all()
        
        # 4. Supprimer tous les messages et conversations existants
        print("\n🗑️  Suppression des messages existants...")
        
        # Supprimer d'abord les pièces jointes et notes internes
        conversations = db.query(Conversation).filter(Conversation.company_id == company_id).all()
        conversation_ids = [c.id for c in conversations]
        
        if conversation_ids:
            # Supprimer les pièces jointes
            attachments_count = db.query(MessageAttachment).filter(
                MessageAttachment.message_id.in_(
                    db.query(InboxMessage.id).filter(InboxMessage.conversation_id.in_(conversation_ids))
                )
            ).delete(synchronize_session=False)
            
            # Supprimer les notes internes
            notes_count = db.query(InternalNote).filter(
                InternalNote.conversation_id.in_(conversation_ids)
            ).delete(synchronize_session=False)
            
            # Supprimer les messages
            messages_count = db.query(InboxMessage).filter(
                InboxMessage.conversation_id.in_(conversation_ids)
            ).delete(synchronize_session=False)
            
            # Supprimer les conversations
            conversations_count = db.query(Conversation).filter(
                Conversation.company_id == company_id
            ).delete(synchronize_session=False)
            
            db.commit()
            print(f"  ✅ {conversations_count} conversation(s) supprimée(s)")
            print(f"  ✅ {messages_count} message(s) supprimé(s)")
            print(f"  ✅ {notes_count} note(s) interne(s) supprimée(s)")
            print(f"  ✅ {attachments_count} pièce(s) jointe(s) supprimée(s)")
        else:
            print("  ℹ️  Aucune conversation existante à supprimer")
        
        # 5. Créer 10 nouveaux messages
        print("\n✉️  Création de 10 nouveaux messages...")
        
        statuses = ["À répondre", "En attente", "Répondu", "Urgent"]
        sources = ["email", "whatsapp", "formulaire"]
        
        for i, msg_data in enumerate(DEMO_MESSAGES):
            # Choisir un dossier aléatoire (ou le premier si un seul)
            folder = random.choice(folders) if folders else None
            
            # Choisir un client aléatoire si disponible
            client = random.choice(clients) if clients else None
            
            # Créer la conversation
            conversation = Conversation(
                company_id=company_id,
                client_id=client.id if client else None,
                subject=msg_data["subject"],
                status=random.choice(statuses),
                source=msg_data["source"],
                folder_id=folder.id if folder else None,
                assigned_to_id=user.id if user else None,
                ai_classified=random.choice([True, False]),
                is_urgent=random.choice([True, False]) if i < 3 else False,  # Les 3 premiers peuvent être urgents
                unread_count=1 if random.choice([True, False]) else 0,
                last_message_at=datetime.now() - timedelta(hours=random.randint(0, 48)),
            )
            db.add(conversation)
            db.flush()
            
            # Créer le message initial
            message = InboxMessage(
                conversation_id=conversation.id,
                from_name=msg_data["from_name"],
                from_email=msg_data.get("from_email"),
                content=msg_data["content"],
                source=msg_data["source"],
                is_from_client=True,
                read=False,
                created_at=datetime.now() - timedelta(hours=random.randint(0, 48)),
            )
            db.add(message)
            
            # Parfois ajouter une réponse de l'entreprise
            if random.choice([True, False]) and conversation.status == "Répondu":
                reply_message = InboxMessage(
                    conversation_id=conversation.id,
                    from_name=user.full_name if user else "Équipe",
                    from_email=user.email if user else None,
                    content=f"Bonjour, merci pour votre message. Nous vous répondrons dans les plus brefs délais.",
                    source=msg_data["source"],
                    is_from_client=False,
                    read=True,
                    created_at=datetime.now() - timedelta(hours=random.randint(0, 24)),
                )
                db.add(reply_message)
            
            folder_name = folder.name if folder else "Aucun dossier"
            client_name = client.name if client else "Client non identifié"
            print(f"  ✅ Message créé: '{msg_data['subject']}' dans '{folder_name}' (Client: {client_name})")
        
        db.commit()
        
        print("\n" + "="*60)
        print("✅ Configuration terminée avec succès !")
        print("="*60)
        print(f"\n📊 Résumé:")
        print(f"   - Dossiers actifs: {len(folders)}")
        print(f"   - Nouveaux messages créés: {len(DEMO_MESSAGES)}")
        print(f"   - Clients utilisés: {len(clients)}")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la configuration: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    
    company_id = 6
    if len(sys.argv) > 1:
        try:
            company_id = int(sys.argv[1])
        except ValueError:
            print("❌ L'ID de l'entreprise doit être un nombre")
            sys.exit(1)
    
    setup_demo_inbox(company_id)
