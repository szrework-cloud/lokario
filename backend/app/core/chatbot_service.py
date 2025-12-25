"""
Service pour intégrer ChatGPT dans le chatbot.
"""
import os
import logging
import json
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.chatbot_context_service import build_company_context
from app.core.openai_throttle import throttle_openai_request
from app.db.models.chatbot import ChatbotConversation, ChatbotMessage

logger = logging.getLogger(__name__)

# Import OpenAI avec gestion d'erreur
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError as e:
    logger.error(f"OpenAI library not available: {e}")
    OpenAI = None
    OPENAI_AVAILABLE = False


class ChatbotService:
    """
    Service pour gérer les conversations avec ChatGPT.
    """
    
    def __init__(self):
        """Initialise le service avec l'API key OpenAI."""
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI library not available. Chatbot will be disabled.")
            self.enabled = False
            self.client = None
            return
        
        api_key = os.getenv("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", None)
        if not api_key:
            logger.warning("OPENAI_API_KEY not configured. Chatbot will be disabled.")
            self.enabled = False
            self.client = None
        else:
            try:
                self.client = OpenAI(api_key=api_key)
                self.enabled = True
                logger.info("✅ Service chatbot ChatGPT initialisé avec succès")
            except Exception as e:
                logger.error(f"❌ Erreur lors de l'initialisation du client OpenAI: {e}")
                self.enabled = False
                self.client = None
    
    def format_context_for_prompt(self, company_context: Dict[str, Any]) -> str:
        """
        Formate le contexte de manière lisible et structurée pour le prompt.
        """
        lines = []
        
        # Informations de l'entreprise
        company = company_context.get("company", {})
        lines.append(f"📊 ENTREPRISE: {company.get('name', 'N/A')}")
        lines.append(f"   Secteur: {company.get('sector', 'N/A')}")
        if company.get('is_auto_entrepreneur'):
            lines.append(f"   Statut: Auto-entrepreneur")
        if company.get('vat_exempt'):
            lines.append(f"   TVA: Exonérée")
        modules = company.get('modules_enabled', [])
        if modules:
            lines.append(f"   Modules activés: {', '.join(modules)}")
        lines.append("")
        
        # Clients
        clients = company_context.get("clients", {})
        lines.append(f"👥 CLIENTS: {clients.get('total', 0)} clients au total")
        if clients.get('recent'):
            lines.append(f"   Clients récents ({len(clients['recent'])}):")
            for client in clients['recent'][:5]:  # Limiter à 5 pour ne pas surcharger
                lines.append(f"   - {client.get('name', 'Sans nom')} ({client.get('email', 'N/A')}) - {client.get('total_invoices', 0)} factures, {client.get('total_quotes', 0)} devis")
        if clients.get('clients_with_pending_invoices'):
            lines.append(f"   ⚠️ Clients avec factures impayées ({len(clients['clients_with_pending_invoices'])}):")
            for client in clients['clients_with_pending_invoices'][:5]:
                lines.append(f"   - {client.get('name', 'Sans nom')}: {client.get('pending_amount', 0):.2f} € impayés")
        lines.append("")
        
        # Factures et devis
        billing = company_context.get("billing", {})
        quotes = billing.get("quotes", {})
        invoices = billing.get("invoices", {})
        lines.append(f"💰 FACTURATION:")
        lines.append(f"   Devis: {quotes.get('total', 0)} au total, {quotes.get('pending', 0)} en attente")
        if quotes.get('recent'):
            lines.append(f"   Derniers devis ({len(quotes['recent'])}):")
            for quote in quotes['recent'][:5]:
                lines.append(f"   - {quote.get('client_name', 'N/A')}: {quote.get('amount', 0):.2f} € ({quote.get('status', 'N/A')})")
        lines.append(f"   Factures: {invoices.get('total', 0)} au total, {invoices.get('unpaid', 0)} impayées ({invoices.get('total_unpaid_amount', 0):.2f} €)")
        if invoices.get('recent'):
            lines.append(f"   Dernières factures ({len(invoices['recent'])}):")
            for inv in invoices['recent'][:5]:
                lines.append(f"   - {inv.get('client_name', 'N/A')}: {inv.get('amount', 0):.2f} € ({inv.get('status', 'N/A')})")
        lines.append("")
        
        # Tâches
        tasks = company_context.get("tasks", {})
        lines.append(f"✅ TÂCHES: {tasks.get('total', 0)} au total")
        by_status = tasks.get('by_status', {})
        if by_status:
            lines.append(f"   - À faire: {by_status.get('À faire', 0)}")
            lines.append(f"   - En cours: {by_status.get('En cours', 0)}")
            lines.append(f"   - Terminée: {by_status.get('Terminée', 0)}")
        if tasks.get('urgent'):
            lines.append(f"   ⚠️ Tâches urgentes ({len(tasks['urgent'])}):")
            for task in tasks['urgent'][:5]:
                lines.append(f"   - {task.get('title', 'N/A')} (Priorité: {task.get('priority', 'N/A')}, Échéance: {task.get('due_date', 'N/A')})")
        lines.append("")
        
        # Projets
        projects = company_context.get("projects", {})
        lines.append(f"📁 PROJETS: {projects.get('total', 0)} au total, {projects.get('active', 0)} actifs")
        if projects.get('recent'):
            lines.append(f"   Projets récents ({len(projects['recent'])}):")
            for project in projects['recent'][:5]:
                lines.append(f"   - {project.get('name', 'N/A')} ({project.get('client_name', 'N/A')}) - {project.get('status', 'N/A')}")
        lines.append("")
        
        # Rendez-vous
        appointments = company_context.get("appointments", {})
        lines.append(f"📅 RENDEZ-VOUS:")
        lines.append(f"   Aujourd'hui: {appointments.get('today', 0)}")
        lines.append(f"   Cette semaine: {appointments.get('this_week', 0)}")
        if appointments.get('upcoming'):
            lines.append(f"   Prochains ({len(appointments['upcoming'])}):")
            for apt in appointments['upcoming'][:5]:
                lines.append(f"   - {apt.get('client_name', 'N/A')} le {apt.get('date', 'N/A')} ({apt.get('type', 'N/A')})")
        lines.append("")
        
        # Relances
        followups = company_context.get("followups", {})
        lines.append(f"📞 RELANCES: {followups.get('pending', 0)} en attente")
        if followups.get('recent'):
            lines.append(f"   Prochaines relances ({len(followups['recent'])}):")
            for followup in followups['recent'][:5]:
                lines.append(f"   - {followup.get('client_name', 'N/A')}: {followup.get('type', 'N/A')} ({followup.get('scheduled_date', 'N/A')})")
        lines.append("")
        
        # Inbox
        inbox = company_context.get("inbox", {})
        lines.append(f"📧 INBOX:")
        lines.append(f"   Non lues: {inbox.get('unread', 0)}")
        lines.append(f"   Urgentes: {inbox.get('urgent', 0)}")
        if inbox.get('recent_conversations'):
            lines.append(f"   Conversations récentes ({len(inbox['recent_conversations'])}):")
            for conv in inbox['recent_conversations'][:5]:
                lines.append(f"   - {conv.get('client_name', 'N/A')}: {conv.get('subject', 'N/A')} ({conv.get('status', 'N/A')})")
        
        return "\n".join(lines)
    
    def get_system_prompt(self, company_context: Dict[str, Any]) -> str:
        """
        Construit le prompt système pour ChatGPT avec le contexte de l'entreprise.
        """
        # Formater le contexte de manière plus lisible
        context_str = self.format_context_for_prompt(company_context)
        
        # Extraire les modules activés
        modules_enabled = company_context.get("company", {}).get("modules_enabled", [])
        modules_list = ", ".join(modules_enabled) if modules_enabled else "tous les modules"
        
        system_prompt = f"""Tu es un assistant intelligent intégré dans une application de gestion administrative B2B complète appelée "Local Assistant".

## CONTEXTE DE L'APPLICATION

Cette application permet de gérer :
- **Clients** : Base de données complète des clients avec leurs informations, historique de factures et devis
- **Devis & Factures** : Création, suivi et gestion des devis et factures avec statuts (brouillon, envoyé, accepté, refusé, payé, impayé, en retard)
- **Tâches** : Système de gestion de tâches avec priorités (normal, high, critical), statuts (À faire, En cours, Terminé, En retard), dates d'échéance et assignation
- **Projets** : Suivi de projets avec statut et progression
- **Rendez-vous** : Gestion d'agenda avec types de rendez-vous, employés assignés, statuts (scheduled, confirmed, completed, cancelled)
- **Relances** : Système automatisé de relances pour devis non répondu, factures impayées, rappels RDV, etc.
- **Inbox** : Gestion centralisée des conversations (emails, WhatsApp, Messenger) avec classification automatique
- **Reporting** : Tableaux de bord et statistiques
- **Checklists** : Templates de checklists réutilisables

Modules activés pour cette entreprise : {modules_list}

## DONNÉES DISPONIBLES

Tu as accès aux données réelles de l'entreprise dans le contexte suivant :
{context_str}

## INSTRUCTIONS IMPORTANTES

1. **Utilise TOUJOURS les données exactes du contexte** - Ne devine jamais, utilise uniquement les informations fournies
2. **Sois précis et détaillé** - Quand tu donnes des informations, cite les chiffres exacts, les noms, les dates
3. **Liste les éléments** - Si on te demande une liste, donne TOUS les éléments pertinents du contexte, pas juste un résumé
4. **Donne des exemples concrets** - Utilise les données réelles pour illustrer tes réponses
5. **Structure tes réponses** - Utilise des listes à puces, des sections claires, des chiffres en évidence

## EXEMPLES DE RÉPONSES ATTENDUES

❌ MAUVAIS : "Vous avez plusieurs clients et quelques factures impayées."
✅ BON : "Vous avez {company_context.get('clients', {}).get('total', 0)} clients au total. Parmi eux, {len(company_context.get('clients', {}).get('clients_with_pending_invoices', []))} ont des factures impayées pour un montant total de {company_context.get('billing', {}).get('invoices', {}).get('total_unpaid_amount', 0):.2f} €."

❌ MAUVAIS : "Vous avez des tâches urgentes à faire."
✅ BON : "Vous avez {len(company_context.get('tasks', {}).get('urgent', []))} tâches urgentes : [liste détaillée avec titres, dates, priorités]"

❌ MAUVAIS : "Il y a des rendez-vous cette semaine."
✅ BON : "Vous avez {company_context.get('appointments', {}).get('this_week', 0)} rendez-vous cette semaine, dont {company_context.get('appointments', {}).get('today', 0)} aujourd'hui. Voici les prochains : [liste avec dates, clients, types]"

## STYLE DE RÉPONSE ET MISE EN FORME

**IMPORTANT - Mise en forme obligatoire :**
- Utilise des sauts de ligne fréquents pour aérer le texte
- Laisse une ligne vide entre chaque section principale
- Utilise des listes à puces avec des sauts de ligne entre chaque élément
- Structure tes réponses avec des titres/sections claires
- Utilise des espaces pour séparer les paragraphes
- Ne compacte jamais plusieurs informations sur une seule ligne

**Exemple de bonne mise en forme :**

Pour créer un rendez-vous dans l'application "Local Assistant", voici les étapes à suivre :

**1. Accéder au module des Rendez-vous**
- Ouvrez l'application et naviguez vers le module "Rendez-vous"

**2. Créer un nouveau rendez-vous**
- Cliquez sur le bouton "Nouveau rendez-vous" ou "Créer un rendez-vous"

**3. Remplir les informations nécessaires**
- **Client** : Sélectionnez le client concerné (par exemple, Adem Gurler)
- **Date et heure** : Choisissez la date et l'heure du rendez-vous
- **Type de rendez-vous** : Indiquez le type de rendez-vous (par exemple, réunion, appel, etc.)
- **Employé assigné** : Si nécessaire, assignez un employé à ce rendez-vous
- **Statut** : Définissez le statut initial (par exemple, "scheduled")

**4. Ajouter des notes (si besoin)**
- Vous pouvez ajouter des notes ou des détails supplémentaires concernant le rendez-vous

**5. Enregistrer le rendez-vous**
- Cliquez sur "Enregistrer" ou "Confirmer" pour finaliser la création du rendez-vous

**6. Vérification**
- Une fois créé, vérifiez que le rendez-vous apparaît dans votre calendrier ou votre liste de rendez-vous

Si vous avez besoin d'aide supplémentaire ou d'informations spécifiques sur un client ou un type de rendez-vous, n'hésitez pas à demander !

**Autres règles de style :**
- Réponds en français de manière professionnelle et amicale
- Utilise "vous" pour vous adresser à l'utilisateur
- Sois concis mais complet - donne toutes les informations pertinentes
- Si une donnée n'est pas disponible dans le contexte, dis-le clairement
- Propose des actions concrètes quand c'est pertinent (ex: "Vous devriez relancer le client X pour sa facture de Y €")
- **TOUJOURS utiliser des sauts de ligne et des espaces pour une meilleure lisibilité**

Rappelle-toi : tu as accès aux VRAIES données de l'entreprise. Utilise-les pour donner des réponses précises et utiles, pas des réponses génériques. Et surtout, aère tes réponses avec des sauts de ligne !"""
        
        return system_prompt
    
    async def generate_response(
        self,
        db: Session,
        conversation_id: int,
        user_message: str,
        company_id: int,
        model: str = "gpt-4o-mini",  # Modèle plus économique
        max_tokens: int = 1000,  # Augmenté pour permettre des réponses plus détaillées
        temperature: float = 0.5  # Réduit pour des réponses plus précises et cohérentes
    ) -> Optional[Dict[str, Any]]:
        """
        Génère une réponse ChatGPT pour un message utilisateur.
        
        Args:
            db: Session de base de données
            conversation_id: ID de la conversation
            user_message: Message de l'utilisateur
            company_id: ID de l'entreprise
            model: Modèle ChatGPT à utiliser
            max_tokens: Nombre maximum de tokens
            temperature: Température pour la génération
        
        Returns:
            Dictionnaire avec la réponse, tokens utilisés, etc. ou None en cas d'erreur
        """
        if not self.enabled or not self.client:
            logger.error("Service chatbot non disponible")
            return None
        
        try:
            # Construire le contexte de l'entreprise
            company_context = await build_company_context(db, company_id)
            
            # Construire le prompt système
            system_prompt = self.get_system_prompt(company_context)
            
            # Récupérer l'historique de la conversation
            conversation = db.query(ChatbotConversation).filter(
                ChatbotConversation.id == conversation_id
            ).first()
            
            if not conversation:
                logger.error(f"Conversation {conversation_id} not found")
                return None
            
            # Récupérer les messages précédents (limité à 10 pour éviter trop de tokens)
            previous_messages = (
                db.query(ChatbotMessage)
                .filter(ChatbotMessage.conversation_id == conversation_id)
                .order_by(ChatbotMessage.created_at.desc())
                .limit(10)
                .all()
            )
            
            # Construire les messages pour l'API (en ordre chronologique)
            api_messages = [{"role": "system", "content": system_prompt}]
            
            # Ajouter l'historique (en ordre chronologique)
            for msg in reversed(previous_messages):
                api_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            # Ajouter le nouveau message de l'utilisateur
            api_messages.append({
                "role": "user",
                "content": user_message
            })
            
            logger.info(f"[CHATBOT] Envoi de {len(api_messages)} messages à ChatGPT (modèle: {model})")
            
            # Appeler l'API OpenAI
            response = self.client.chat.completions.create(
                model=model,
                messages=api_messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            
            # Extraire la réponse
            assistant_message = response.choices[0].message.content
            tokens_used = response.usage.total_tokens if hasattr(response, 'usage') else None
            
            # Sauvegarder le snapshot du contexte utilisé
            context_snapshot = {
                "company_context_keys": list(company_context.keys()),
                "messages_count": len(previous_messages),
            }
            
            logger.info(f"[CHATBOT] Réponse reçue ({tokens_used} tokens utilisés)")
            
            return {
                "response": assistant_message,
                "tokens_used": tokens_used,
                "model_used": model,
                "context_snapshot": context_snapshot,
            }
            
        except Exception as e:
            error_message = str(e)
            error_type = type(e).__name__
            
            # Gestion spéciale pour les erreurs de quota (429)
            if (error_type == "RateLimitError" or 
                "429" in error_message or 
                "quota" in error_message.lower() or 
                "insufficient_quota" in error_message.lower()):
                logger.error(f"[CHATBOT] Quota OpenAI dépassé: {e}")
                return {
                    "error": "quota_exceeded",
                    "message": "Le quota OpenAI a été dépassé. Veuillez vérifier votre compte OpenAI et ajouter des crédits.",
                    "response": "Désolé, je ne peux pas répondre pour le moment car le quota OpenAI a été dépassé. Veuillez vérifier votre compte OpenAI et ajouter des crédits, ou contactez l'administrateur.",
                }
            logger.error(f"Erreur lors de la génération de la réponse ChatGPT: {e}", exc_info=True)
            return None
    
    def count_tokens(self, text: str) -> int:
        """
        Estime le nombre de tokens dans un texte (approximation).
        """
        # Approximation: 1 token ≈ 4 caractères pour l'anglais, un peu plus pour le français
        return len(text) // 3


# Instance globale du service
chatbot_service = ChatbotService()

