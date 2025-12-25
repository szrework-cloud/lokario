"""
Service pour générer des réponses et résumer des messages avec l'IA OpenAI.
"""
import os
import logging
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.openai_throttle import throttle_openai_request

logger = logging.getLogger(__name__)

# Import OpenAI avec gestion d'erreur
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError as e:
    logger.error(f"OpenAI library not available: {e}")
    OpenAI = None
    OPENAI_AVAILABLE = False


class AIReplyService:
    """
    Service pour générer des réponses et résumer des messages avec ChatGPT.
    """
    
    def __init__(self):
        """Initialise le service avec l'API key OpenAI."""
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI library not available. AI reply generation will be disabled.")
            self.enabled = False
            self.client = None
            return
        
        api_key = os.getenv("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", None)
        if not api_key:
            logger.warning("OPENAI_API_KEY not configured. AI reply generation will be disabled.")
            self.enabled = False
            self.client = None
        else:
            try:
                self.client = OpenAI(api_key=api_key)
                self.enabled = True
                logger.info("✅ Service de génération de réponses IA initialisé avec succès")
            except Exception as e:
                logger.error(f"❌ Erreur lors de l'initialisation du client OpenAI: {e}")
                self.enabled = False
                self.client = None
    
    def generate_reply(
        self,
        conversation_messages: list,
        client_name: Optional[str] = None,
        custom_prompt: Optional[str] = None,
        base_message: Optional[str] = None
    ) -> Optional[str]:
        """
        Génère une réponse professionnelle basée sur les messages de la conversation.
        
        Args:
            conversation_messages: Liste des messages de la conversation
            client_name: Nom du client (optionnel)
            custom_prompt: Prompt personnalisé depuis les paramètres (optionnel)
            base_message: Message de base que l'IA adaptera selon le contexte (optionnel)
        
        Returns:
            La réponse générée par l'IA ou None en cas d'erreur
        """
        if not self.enabled or not self.client:
            logger.error("Service IA non disponible")
            return None
        
        try:
            # Construire le contexte de la conversation
            messages_context = []
            for msg in conversation_messages:
                role = "assistant" if not msg.get("is_from_client", True) else "user"
                content = msg.get("content", "")
                if content:
                    messages_context.append({
                        "role": role,
                        "content": content
                    })
            
            # Vérifier qu'un prompt est configuré
            if not custom_prompt or not custom_prompt.strip():
                logger.error("Aucun prompt configuré pour générer une réponse. Veuillez configurer le prompt dans les paramètres.")
                return None
            
            # Construire le prompt système
            system_prompt = custom_prompt
            
            # Note: base_message n'est plus utilisé, le template est maintenant le prompt principal
            # (gardé pour compatibilité mais ne sera plus appelé)
            
            logger.info(f"[AI REPLY SERVICE] Utilisation du prompt personnalisé: {repr(system_prompt[:200])}...")
            
            # Préparer les messages pour l'API
            # Le prompt personnalisé est utilisé comme instruction système
            # Les messages de conversation sont ajoutés comme contexte
            api_messages = [
                {"role": "system", "content": system_prompt}
            ] + messages_context
            
            # Throttle pour éviter les rate limits
            throttle_openai_request()
            
            # Appel à l'API OpenAI
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Modèle plus économique
                messages=api_messages,
                temperature=0.7,
                max_tokens=500
            )
            
            reply = response.choices[0].message.content.strip()
            logger.info(f"✅ Réponse IA générée avec succès ({len(reply)} caractères)")
            return reply
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la génération de la réponse: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def summarize_message(
        self,
        conversation_messages: list,
        custom_prompt: Optional[str] = None
    ) -> Optional[str]:
        """
        Résume les messages de la conversation.
        
        Args:
            conversation_messages: Liste des messages de la conversation
            custom_prompt: Prompt personnalisé depuis les paramètres (optionnel)
        
        Returns:
            Le résumé généré par l'IA ou None en cas d'erreur
        """
        if not self.enabled or not self.client:
            logger.error("Service IA non disponible")
            return None
        
        try:
            # Construire le contexte de la conversation
            messages_text = []
            for msg in conversation_messages:
                sender = "Client" if msg.get("is_from_client", True) else "Entreprise"
                content = msg.get("content", "")
                if content:
                    messages_text.append(f"{sender}: {content}")
            
            conversation_text = "\n".join(messages_text)
            
            # Vérifier qu'un prompt est configuré
            if not custom_prompt or not custom_prompt.strip():
                logger.error("Aucun prompt configuré pour résumer. Veuillez configurer le prompt dans les paramètres.")
                return None
            
            system_prompt = custom_prompt
            logger.info(f"[AI REPLY SERVICE] Utilisation du prompt personnalisé pour résumé: {repr(system_prompt)}")
            
            # Préparer les messages pour l'API
            # Le prompt personnalisé est utilisé comme instruction système
            # La conversation est ajoutée comme contexte utilisateur
            api_messages = [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": conversation_text
                }
            ]
            
            # Appel à l'API OpenAI
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Modèle plus économique
                messages=api_messages,
                temperature=0.5,
                max_tokens=200
            )
            
            summary = response.choices[0].message.content.strip()
            logger.info(f"✅ Résumé IA généré avec succès ({len(summary)} caractères)")
            return summary
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la génération du résumé: {e}")
            import traceback
            traceback.print_exc()
            return None


# NOTE: La fonction generate_followup_message a été supprimée car les relances utilisent maintenant des templates
# configurés dans les paramètres au lieu de génération IA. Voir backend/app/api/routes/followups.py pour
# l'implémentation basée sur les templates.


# Instance globale du service
ai_reply_service = AIReplyService()

