"""
Service pour classifier automatiquement les messages dans les dossiers
en utilisant ChatGPT/OpenAI API.
"""
import os
import re
import logging
from typing import Dict, List, Optional, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)

# Import OpenAI avec gestion d'erreur
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError as e:
    logger.error(f"OpenAI library not available: {e}")
    OpenAI = None
    OPENAI_AVAILABLE = False


class AIClassifierService:
    """
    Service pour classifier les messages dans les dossiers avec ChatGPT.
    """
    
    def __init__(self):
        """Initialise le service avec l'API key OpenAI."""
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI library not available. AI classification will be disabled.")
            self.enabled = False
            self.client = None
            return
        
        api_key = os.getenv("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", None)
        if not api_key:
            logger.warning("OPENAI_API_KEY not configured. AI classification will be disabled.")
            self.enabled = False
            self.client = None
        else:
            try:
                # Créer le client OpenAI
                # Note: Si vous rencontrez une erreur 'proxies', essayez de créer le client sans arguments supplémentaires
                self.client = OpenAI(api_key=api_key)
                # Test rapide pour vérifier que le client fonctionne
                self.enabled = True
                logger.info("✅ Service de classification IA initialisé avec succès")
            except TypeError as e:
                if "proxies" in str(e):
                    logger.error("❌ Erreur de compatibilité OpenAI/httpx. Mettez à jour les dépendances: pip install --upgrade openai httpx httpcore")
                else:
                    logger.error(f"❌ Erreur lors de l'initialisation du client OpenAI: {e}")
                self.enabled = False
                self.client = None
            except Exception as e:
                logger.error(f"❌ Erreur lors de l'initialisation du client OpenAI: {e}")
                import traceback
                traceback.print_exc()
                self.enabled = False
                self.client = None
    
    def classify_messages_batch(
        self,
        messages: List[Dict],  # Liste de messages avec conversation_id, content, subject, from_email
        folders: List[Dict],
        company_context: Optional[str] = None
    ) -> Dict[int, Optional[int]]:
        """
        Classe plusieurs messages en un seul appel à l'IA.
        
        Args:
            messages: Liste de dicts avec conversation_id, content, subject, from_email
            folders: Liste des dossiers disponibles avec leurs règles IA
            company_context: Contexte supplémentaire sur l'entreprise (optionnel)
        
        Returns:
            Dict {conversation_id: folder_id} ou None si aucun dossier ne correspond
        """
        if not self.enabled:
            logger.warning("AI classification is disabled (no API key)")
            return {}
        
        # Filtrer seulement les dossiers avec classification automatique activée
        auto_classify_folders = [
            folder for folder in folders
            if folder.get("ai_rules", {}).get("autoClassify", False)
        ]
        
        if not auto_classify_folders:
            logger.debug("No folders with auto-classification enabled")
            return {}
        
        if not messages:
            return {}
        
        try:
            # Vérification directe basée sur l'expéditeur pour chaque message
            results = {}
            messages_to_classify_ia = []
            
            for msg_data in messages:
                message_from = msg_data.get("from_email") or msg_data.get("from_phone")
                conversation_id = msg_data.get("conversation_id")
                
                # Vérification directe par expéditeur
                if message_from:
                    folder_id = self._check_sender_match(message_from, auto_classify_folders)
                    if folder_id:
                        results[conversation_id] = folder_id
                        continue
                
                # Sinon, on l'ajoute pour classification par IA
                messages_to_classify_ia.append(msg_data)
            
            # Si tous les messages ont été classés par vérification directe, on retourne
            if not messages_to_classify_ia:
                return results
            
            # Construire le prompt pour tous les messages restants
            prompt = self._build_batch_classification_prompt(
                messages=messages_to_classify_ia,
                folders=auto_classify_folders,
                company_context=company_context
            )
            
            # Un seul appel IA pour tous les messages
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "Tu es un assistant expert qui classe les messages dans les bons dossiers. Tu détectes particulièrement bien les messages importants comme les demandes de rendez-vous (rdv), les demandes urgentes, et les messages nécessitant une action rapide. Sois TRÈS PRUDENT avec la classification spam/newsletter - ne classe comme spam que si c'est vraiment évident, en cas de doute laisse le message non classé."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=500  # Plus de tokens pour traiter plusieurs messages
            )
            
            # Parser la réponse
            result = response.choices[0].message.content.strip()
            logger.debug(f"[AI CLASSIFIER] Réponse ChatGPT batch: {result}")
            
            # Extraire les IDs des dossiers pour chaque conversation
            batch_results = self._parse_batch_classification_response(result, messages_to_classify_ia, auto_classify_folders)
            
            # Combiner avec les résultats de vérification directe
            results.update(batch_results)
            
            return results
            
        except Exception as e:
            error_str = str(e)
            # Gérer les erreurs de rate limiting
            if "429" in error_str or "rate limit" in error_str.lower():
                logger.warning(f"⚠️  Limite d'appels IA atteinte (429). Classification ignorée. Détails: {e}")
            else:
                logger.error(f"Error during batch AI classification: {e}")
                import traceback
                traceback.print_exc()
            return {}
    
    def _check_sender_match(self, message_from: str, folders: List[Dict]) -> Optional[int]:
        """Vérifie si l'expéditeur correspond à un dossier (sans appel IA)."""
        if not message_from:
            return None
            
        message_from_lower = message_from.lower()
        
        for folder in folders:
            ai_rules = folder.get("ai_rules", {})
            context = ai_rules.get("context", "") if ai_rules.get("context") else ""
            
            if not context:
                continue
            
            context_lower = context.lower()
            
            # Extraire tous les mots du context (minimum 3 caractères)
            words = re.findall(r'\b[a-z]{3,}\b', context_lower)
            
            # Chercher aussi des patterns explicites
            explicit_keywords = re.findall(r'(?:expéditeur|from|de|sender|envoyeur)[\s:]+([a-z0-9._%+-@]+)', context_lower)
            
            # Extraire les emails
            emails = re.findall(r'\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b', context_lower)
            
            # Combiner tous les mots-clés
            all_keywords = words + explicit_keywords + emails
            
            # Filtrer les mots courants
            common_words = {'les', 'des', 'dans', 'pour', 'avec', 'sont', 'cette', 'tous', 'toutes', 'tout', 'toute', 'dans', 'pour', 'avec', 'mais', 'plus', 'peut', 'sont', 'sous', 'tout', 'tous', 'toutes', 'toute'}
            all_keywords = [kw for kw in all_keywords if kw not in common_words]
            
            # Vérifier chaque mot-clé
            for keyword in all_keywords:
                keyword_clean = keyword.strip('.,;:!?()[]{}').lower()
                if len(keyword_clean) >= 3:
                    if keyword_clean in message_from_lower:
                        logger.info(f"[AI CLASSIFIER] ✅ Correspondance directe trouvée: '{keyword_clean}' dans expéditeur '{message_from}' → dossier '{folder['name']}' (ID: {folder['id']})")
                        return folder["id"]
        
        return None
    
    def _build_batch_classification_prompt(
        self,
        messages: List[Dict],
        folders: List[Dict],
        company_context: Optional[str]
    ) -> str:
        """Construit le prompt pour classifier plusieurs messages en une fois."""
        prompt_parts = []
        
        # Contexte de l'entreprise
        if company_context:
            prompt_parts.append(f"Contexte entreprise: {company_context}\n")
        
        # Messages à classifier
        prompt_parts.append("Messages à classifier:\n")
        for i, msg_data in enumerate(messages, 1):
            prompt_parts.append(f"\nMessage {i} (Conversation ID: {msg_data.get('conversation_id')}):")
            if msg_data.get("subject"):
                prompt_parts.append(f"  Sujet: {msg_data.get('subject')}")
            if msg_data.get("from_email") or msg_data.get("from_phone"):
                prompt_parts.append(f"  De: {msg_data.get('from_email') or msg_data.get('from_phone')}")
            prompt_parts.append(f"  Contenu: {msg_data.get('content', '')[:200]}...")  # Limiter le contenu
        
        # Dossiers disponibles
        prompt_parts.append("\n\nDossiers disponibles:\n")
        for folder in folders:
            folder_info = f"- ID {folder['id']}: {folder['name']}"
            folder_type = folder.get('folder_type', 'general')
            folder_info += f" (Type: {folder_type})"
            
            ai_rules = folder.get('ai_rules', {})
            context = ai_rules.get('context')
            if context:
                folder_info += f"\n  Description: {context}"
            
            prompt_parts.append(folder_info)
        
        # Instructions
        prompt_parts.append("\n\nInstructions:")
        prompt_parts.append("Analyse chaque message et choisis le dossier le plus approprié.")
        prompt_parts.append("IMPORTANT: Si la description d'un dossier mentionne un expéditeur (nom, email, ou mot-clé),")
        prompt_parts.append("vérifie d'abord que l'expéditeur du message correspond à cette mention.")
        prompt_parts.append("\nLes messages importants incluent:")
        prompt_parts.append("- Les demandes de rendez-vous (rdv, rendez-vous, disponibilité, réserver, réservation, prendre rdv, j'aimerais prendre, etc.)")
        prompt_parts.append("- Les demandes urgentes ou avec deadline")
        prompt_parts.append("- Les messages nécessitant une action rapide")
        prompt_parts.append("\n⚠️  ATTENTION: Si un dossier a un nom qui contient 'rdv' ou 'rendez-vous' ou 'appointment',")
        prompt_parts.append("et que le message contient des mots comme 'rdv', 'rendez-vous', 'disponible', 'réserver', 'prendre rdv', etc.,")
        prompt_parts.append("choisis ce dossier même si le message est actuellement dans un autre dossier.")
        prompt_parts.append("\n🔍 IMPORTANT pour les dossiers Spam/Newsletter:")
        prompt_parts.append("Sois TRÈS PRUDENT avant de classer un message comme spam ou newsletter.")
        prompt_parts.append("Ne classe comme spam/newsletter QUE si c'est vraiment évident (publicités massives, emails promotionnels clairs, etc.).")
        prompt_parts.append("En cas de doute, NE classe PAS comme spam - laisse le message non classé plutôt que de risquer de perdre un message important.")
        prompt_parts.append("\nRéponds au format JSON suivant:")
        prompt_parts.append('{"results": [{"conversation_id": 123, "folder_id": 5}, {"conversation_id": 124, "folder_id": null}]}')
        prompt_parts.append("Si aucun dossier ne correspond, utilise null pour folder_id.")
        
        return "\n".join(prompt_parts)
    
    def _parse_batch_classification_response(
        self,
        response: str,
        messages: List[Dict],
        folders: List[Dict]
    ) -> Dict[int, Optional[int]]:
        """Parse la réponse JSON de ChatGPT pour extraire les IDs des dossiers."""
        results = {}
        
        try:
            import json
            # Chercher un JSON dans la réponse (format plus flexible)
            # Essayer de trouver le JSON complet
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                try:
                    data = json.loads(json_str)
                    for item in data.get("results", []):
                        conv_id = item.get("conversation_id")
                        folder_id = item.get("folder_id")
                        if conv_id:
                            results[conv_id] = folder_id if folder_id else None
                    if results:
                        logger.debug(f"[AI CLASSIFIER] Parsed {len(results)} results from JSON")
                        return results
                except json.JSONDecodeError:
                    pass
        except Exception as e:
            logger.debug(f"[AI CLASSIFIER] JSON parsing failed: {e}, trying manual parsing")
            pass
        
        # Si le parsing JSON a échoué, essayer de parser manuellement
        if not results:
            for msg_data in messages:
                conv_id = msg_data.get("conversation_id")
                # Chercher le format "Conversation 123: dossier 5" ou "Conv 123: 5"
                pattern = rf'(?:conversation|conv)\s*{conv_id}.*?(?:dossier|folder).*?(\d+)|{conv_id}.*?:.*?(\d+)'
                match = re.search(pattern, response, re.IGNORECASE)
                if match:
                    folder_id = int(match.group(1) or match.group(2))
                    folder_ids = [f['id'] for f in folders]
                    if folder_id in folder_ids:
                        results[conv_id] = folder_id
        
        return results
    
    def classify_message_to_folder(
        self,
        message_content: str,
        message_subject: Optional[str],
        message_from: Optional[str],
        folders: List[Dict],
        company_context: Optional[str] = None
    ) -> Optional[int]:
        """
        Classe un message dans un dossier approprié en utilisant ChatGPT.
        
        Args:
            message_content: Contenu du message
            message_subject: Sujet du message (optionnel)
            message_from: Expéditeur du message (optionnel)
            folders: Liste des dossiers disponibles avec leurs règles IA
                    Format: [
                        {
                            "id": 1,
                            "name": "Demande d'info",
                            "folder_type": "info",
                            "ai_rules": {
                                "autoClassify": True,
                                "context": "Messages de demandes d'informations"
                            }
                        },
                        ...
                    ]
            company_context: Contexte supplémentaire sur l'entreprise (optionnel)
        
        Returns:
            L'ID du dossier approprié, ou None si aucun dossier ne correspond
        """
        if not self.enabled:
            logger.warning("AI classification is disabled (no API key)")
            return None
        
        # Filtrer seulement les dossiers avec classification automatique activée
        auto_classify_folders = [
            folder for folder in folders
            if folder.get("ai_rules", {}).get("autoClassify", False)
        ]
        
        if not auto_classify_folders:
            logger.debug("No folders with auto-classification enabled")
            return None
        
        # Vérification directe basée sur l'expéditeur (avant l'appel IA)
        if message_from:
            folder_id = self._check_sender_match(message_from, auto_classify_folders)
            if folder_id:
                return folder_id
        
        try:
            # Préparer le prompt pour ChatGPT
            prompt = self._build_classification_prompt(
                message_content=message_content,
                message_subject=message_subject,
                message_from=message_from,
                folders=auto_classify_folders,
                company_context=company_context
            )
            
            # Appeler ChatGPT
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Utiliser gpt-4o-mini pour réduire les coûts
                messages=[
                    {
                        "role": "system",
                        "content": "Tu es un assistant expert qui classe les messages dans les bons dossiers. Tu détectes particulièrement bien les messages importants comme les demandes de rendez-vous (rdv), les demandes urgentes, et les messages nécessitant une action rapide. Sois TRÈS PRUDENT avec la classification spam/newsletter - ne classe comme spam que si c'est vraiment évident, en cas de doute laisse le message non classé."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Plus déterministe
                max_tokens=150
            )
            
            # Parser la réponse
            result = response.choices[0].message.content.strip()
            logger.debug(f"[AI CLASSIFIER] Réponse ChatGPT: {result}")
            
            # Extraire l'ID du dossier
            folder_id = self._parse_classification_response(result, auto_classify_folders)
            
            if folder_id:
                folder_name = next((f["name"] for f in auto_classify_folders if f["id"] == folder_id), "Inconnu")
                logger.info(f"[AI CLASSIFIER] Message classé dans le dossier '{folder_name}' (ID: {folder_id})")
            else:
                logger.debug(f"[AI CLASSIFIER] Aucun dossier trouvé. Réponse ChatGPT: {result}")
            
            return folder_id
            
        except Exception as e:
            error_str = str(e)
            # Gérer les erreurs de rate limiting
            if "429" in error_str or "rate limit" in error_str.lower():
                logger.warning(f"⚠️  Limite d'appels IA atteinte (429). Classification ignorée. Détails: {e}")
            else:
                logger.error(f"Error during AI classification: {e}")
            return None
    
    def _build_classification_prompt(
        self,
        message_content: str,
        message_subject: Optional[str],
        message_from: Optional[str],
        folders: List[Dict],
        company_context: Optional[str]
    ) -> str:
        """Construit le prompt pour ChatGPT."""
        prompt_parts = []
        
        # Contexte de l'entreprise
        if company_context:
            prompt_parts.append(f"Contexte entreprise: {company_context}\n")
        
        # Informations du message
        prompt_parts.append("Message à classifier:\n")
        if message_subject:
            prompt_parts.append(f"Sujet: {message_subject}\n")
        if message_from:
            prompt_parts.append(f"De: {message_from}\n")
        prompt_parts.append(f"Contenu: {message_content}\n")
        
        # Dossiers disponibles
        prompt_parts.append("\nDossiers disponibles:\n")
        for folder in folders:
            folder_info = f"- ID {folder['id']}: {folder['name']}"
            folder_type = folder.get('folder_type', 'general')
            folder_info += f" (Type: {folder_type})"
            
            ai_rules = folder.get('ai_rules', {})
            context = ai_rules.get('context')
            if context:
                folder_info += f"\n  Description: {context}"
            
            prompt_parts.append(folder_info)
        
        # Instructions
        prompt_parts.append("\nInstructions:")
        prompt_parts.append("Analyse le message et choisis le dossier le plus approprié.")
        prompt_parts.append("IMPORTANT: Si la description d'un dossier mentionne un expéditeur (nom, email, ou mot-clé),")
        prompt_parts.append("vérifie d'abord que l'expéditeur du message correspond à cette mention.")
        prompt_parts.append("\nLes messages importants incluent:")
        prompt_parts.append("- Les demandes de rendez-vous (rdv, rendez-vous, disponibilité, réserver, réservation, prendre rdv, j'aimerais prendre, etc.)")
        prompt_parts.append("- Les demandes urgentes ou avec deadline")
        prompt_parts.append("- Les messages nécessitant une action rapide")
        prompt_parts.append("- Les messages dont l'expéditeur correspond aux critères mentionnés dans la description du dossier")
        prompt_parts.append("\n⚠️  ATTENTION: Si un dossier a un nom qui contient 'rdv' ou 'rendez-vous' ou 'appointment',")
        prompt_parts.append("et que le message contient des mots comme 'rdv', 'rendez-vous', 'disponible', 'réserver', 'prendre rdv', etc.,")
        prompt_parts.append("choisis ce dossier même si le message est actuellement dans un autre dossier.")
        prompt_parts.append("\n🔍 IMPORTANT pour les dossiers Spam/Newsletter:")
        prompt_parts.append("Sois TRÈS PRUDENT avant de classer un message comme spam ou newsletter.")
        prompt_parts.append("Ne classe comme spam/newsletter QUE si c'est vraiment évident (publicités massives, emails promotionnels clairs, etc.).")
        prompt_parts.append("En cas de doute, NE classe PAS comme spam - laisse le message non classé plutôt que de risquer de perdre un message important.")
        prompt_parts.append("\nRéponds UNIQUEMENT avec l'ID du dossier (exemple: 5).")
        prompt_parts.append("Si aucun dossier ne correspond, réponds: NONE")
        
        return "\n".join(prompt_parts)
    
    def _parse_classification_response(self, response: str, folders: List[Dict]) -> Optional[int]:
        """Parse la réponse de ChatGPT pour extraire l'ID du dossier."""
        response = response.strip().upper()
        
        # Si la réponse contient "NONE" ou "AUCUN"
        if "NONE" in response or "AUCUN" in response or "NULL" in response:
            return None
        
        # Chercher un ID numérique dans la réponse
        numbers = re.findall(r'\d+', response)
        
        if numbers:
            folder_id = int(numbers[0])
            # Vérifier que l'ID correspond à un dossier existant
            folder_ids = [f['id'] for f in folders]
            if folder_id in folder_ids:
                return folder_id
        
        # Si on ne trouve pas d'ID, essayer de matcher par nom
        for folder in folders:
            folder_name = folder['name'].upper()
            if folder_name in response:
                return folder['id']
        
        return None
