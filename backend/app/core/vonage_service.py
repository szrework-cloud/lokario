"""
Service pour envoyer et recevoir des SMS via Vonage API (anciennement Nexmo).
Documentation: https://developer.vonage.com/en/sms/overview
"""
from typing import Dict, Optional
import requests
import logging
from datetime import datetime
import base64
import unicodedata
import re

logger = logging.getLogger(__name__)


def normalize_company_name_for_sms(company_name: str) -> str:
    """
    Normalise le nom d'entreprise pour l'utiliser comme expéditeur SMS (Alphanumeric Sender ID).
    
    Règles :
    - Maximum 11 caractères (limite Vonage)
    - Alphanumérique uniquement (A-Z, 0-9)
    - En majuscules
    - Pas d'espaces, accents, caractères spéciaux
    
    Args:
        company_name: Nom de l'entreprise (ex: "Ma Super Entreprise")
    
    Returns:
        Nom normalisé (ex: "MASUPERENT")
    """
    if not company_name:
        return "LOKARIO"  # Fallback par défaut
    
    try:
        # Étape 1: Normaliser les accents (é → e, à → a, etc.)
        normalized = unicodedata.normalize('NFD', company_name)
        ascii_text = normalized.encode('ascii', 'ignore').decode('ascii')
        
        # Étape 2: Garder uniquement les caractères alphanumériques
        alphanumeric = re.sub(r'[^A-Za-z0-9]', '', ascii_text)
        
        # Étape 3: Convertir en majuscules
        alphanumeric = alphanumeric.upper()
        
        # Étape 4: Limiter à 11 caractères (limite Vonage)
        result = alphanumeric[:11] if alphanumeric else "LOKARIO"
        
        logger.debug(f"[VONAGE] Normalisation nom entreprise: '{company_name}' → '{result}'")
        
        return result
    except Exception as e:
        logger.error(f"[VONAGE] Erreur lors de la normalisation du nom d'entreprise '{company_name}': {e}")
        return "LOKARIO"  # Fallback en cas d'erreur


def get_vonage_credentials_and_sender(
    company_name: str,
    company_id: Optional[int] = None,
    db: Optional[any] = None,
    vonage_integration: Optional[any] = None
) -> tuple[Optional[str], Optional[str], str]:
    """
    Récupère les credentials Vonage et l'expéditeur SMS avec fallback.
    
    Ordre de priorité :
    1. Credentials centralisés (VONAGE_API_KEY, VONAGE_API_SECRET) + nom d'entreprise normalisé ✅ NOUVEAU
    2. Intégration par entreprise (InboxIntegration) + phone_number (compatibilité)
    
    Args:
        company_name: Nom de l'entreprise (pour normaliser comme expéditeur)
        company_id: ID de l'entreprise (optionnel, pour logging)
        db: Session SQLAlchemy (optionnel, pour fallback intégration)
        vonage_integration: InboxIntegration existante (optionnel, pour éviter requête DB)
    
    Returns:
        Tuple (api_key, api_secret, from_number)
        - api_key: API Key Vonage (None si non disponible)
        - api_secret: API Secret Vonage (None si non disponible)
        - from_number: Expéditeur (nom d'entreprise normalisé ou phone_number)
    """
    from app.core.config import settings
    from app.core.encryption_service import get_encryption_service
    
    # Priorité 1: Credentials centralisés (compte Vonage centralisé)
    if settings.VONAGE_API_KEY and settings.VONAGE_API_SECRET:
        normalized_name = normalize_company_name_for_sms(company_name)
        logger.info(f"[VONAGE] Utilisation du compte centralisé avec expéditeur: {normalized_name}")
        return settings.VONAGE_API_KEY, settings.VONAGE_API_SECRET, normalized_name
    
    # Priorité 2: Intégration par entreprise (compatibilité rétroactive)
    if vonage_integration:
        if vonage_integration.api_key and vonage_integration.webhook_secret:
            encryption_service = get_encryption_service()
            api_key = encryption_service.decrypt(vonage_integration.api_key) if vonage_integration.api_key else None
            api_secret = encryption_service.decrypt(vonage_integration.webhook_secret) if vonage_integration.webhook_secret else None
            
            if api_key and api_secret:
                from_number = vonage_integration.phone_number or normalize_company_name_for_sms(company_name)
                logger.info(f"[VONAGE] Utilisation de l'intégration par entreprise avec expéditeur: {from_number}")
                return api_key, api_secret, from_number
    
    # Si pas d'intégration fournie mais company_id et db disponibles, chercher une intégration
    if company_id and db:
        from app.db.models.inbox_integration import InboxIntegration
        
        integration = db.query(InboxIntegration).filter(
            InboxIntegration.company_id == company_id,
            InboxIntegration.integration_type == "sms",
            InboxIntegration.is_active == True
        ).first()
        
        if not integration:
            integration = db.query(InboxIntegration).filter(
                InboxIntegration.company_id == company_id,
                InboxIntegration.integration_type == "whatsapp",
                InboxIntegration.is_active == True
            ).first()
        
        if integration and integration.api_key and integration.webhook_secret:
            encryption_service = get_encryption_service()
            api_key = encryption_service.decrypt(integration.api_key) if integration.api_key else None
            api_secret = encryption_service.decrypt(integration.webhook_secret) if integration.webhook_secret else None
            
            if api_key and api_secret:
                from_number = integration.phone_number or normalize_company_name_for_sms(company_name)
                logger.info(f"[VONAGE] Utilisation de l'intégration par entreprise (trouvée) avec expéditeur: {from_number}")
                return api_key, api_secret, from_number
    
    # Aucune configuration trouvée
    logger.warning(f"[VONAGE] Aucune configuration Vonage trouvée (centralisée ou intégration)")
    return None, None, normalize_company_name_for_sms(company_name)


class VonageSMSService:
    """
    Service pour gérer les SMS via Vonage API.
    """
    
    def __init__(
        self,
        api_key: str,
        api_secret: str
    ):
        """
        Initialise le service SMS avec les credentials Vonage.
        
        Args:
            api_key: API Key Vonage
            api_secret: API Secret Vonage
        """
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = "https://rest.nexmo.com"  # Vonage utilise encore l'URL nexmo.com
    
    def send_sms(
        self,
        to: str,
        message: str,
        from_number: str
    ) -> Dict[str, any]:
        """
        Envoie un SMS via l'API Vonage.
        
        Args:
            to: Numéro de téléphone du destinataire (format: 33612345678 ou +33612345678)
            message: Contenu du message
            from_number: Numéro Vonage d'envoi (format: 33612345678 ou nom alphanumérique)
        
        Returns:
            Dict contenant le statut et les détails de l'envoi
        """
        try:
            # Normaliser le numéro pour Vonage (enlever le +)
            to = self._normalize_phone_number(to)
            from_num = self._normalize_from_number(from_number)
            
            logger.info(f"[VONAGE] Envoi SMS de {from_num} vers {to}")
            
            # Vonage utilise des paramètres query string pour l'authentification
            # et JSON pour le body (ou form-data selon la méthode)
            params = {
                "api_key": self.api_key,
                "api_secret": self.api_secret,
            }
            
            # Construire le payload
            payload = {
                "from": from_num,
                "to": to,
                "text": message,
                "type": "text"
            }
            
            # Envoyer le SMS via l'API Vonage
            url = f"{self.base_url}/sms/json"
            response = requests.post(url, params=params, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                messages = data.get("messages", [])
                
                if messages and len(messages) > 0:
                    message_result = messages[0]
                    
                    if message_result.get("status") == "0":
                        logger.info(f"[VONAGE] SMS envoyé avec succès: {message_result.get('message-id')}")
                        
                        return {
                            "status": "sent",
                            "success": True,
                            "message_id": message_result.get("message-id"),
                            "to": to,
                            "from": from_num,
                            "remaining_balance": message_result.get("remaining-balance"),
                            "message_price": message_result.get("message-price")
                        }
                    else:
                        error_text = message_result.get("error-text", "Unknown error")
                        logger.error(f"[VONAGE] Erreur API: {error_text}")
                        
                        return {
                            "status": "error",
                            "success": False,
                            "error": error_text,
                            "error_code": message_result.get("status")
                        }
                else:
                    logger.error(f"[VONAGE] Aucun message retourné dans la réponse")
                    return {
                        "status": "error",
                        "success": False,
                        "error": "No message in response"
                    }
            else:
                error_data = response.json() if response.content else {}
                error_message = error_data.get("error-text", response.text)
                
                logger.error(f"[VONAGE] Erreur HTTP: {response.status_code} - {error_message}")
                
                return {
                    "status": "error",
                    "success": False,
                    "error": error_message,
                    "error_code": response.status_code
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"[VONAGE] Erreur réseau: {e}")
            return {
                "status": "error",
                "success": False,
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"[VONAGE] Erreur inattendue: {e}")
            return {
                "status": "error",
                "success": False,
                "error": str(e)
            }
    
    def _normalize_phone_number(self, phone: str) -> str:
        """
        Normalise un numéro de téléphone pour Vonage.
        Vonage attend les numéros sans le + et avec le code pays.
        """
        # Enlever les espaces et caractères spéciaux
        phone = phone.replace(" ", "").replace("-", "").replace(".", "").replace("(", "").replace(")", "")
        
        # Enlever le + s'il existe
        if phone.startswith("+"):
            phone = phone[1:]
        
        # Si le numéro commence par 0, le remplacer par 33 (France)
        if phone.startswith("0"):
            phone = "33" + phone[1:]
        
        return phone
    
    def _normalize_from_number(self, from_number: str) -> str:
        """
        Normalise le numéro d'envoi pour Vonage.
        Peut être un numéro ou un nom alphanumérique (11 caractères max).
        """
        # Si c'est un numéro, normaliser comme les autres
        if from_number.startswith("+") or from_number[0].isdigit():
            return self._normalize_phone_number(from_number)
        
        # Sinon, c'est probablement un nom alphanumérique (ex: "MONENTREP")
        # Vonage accepte jusqu'à 11 caractères alphanumériques
        return from_number[:11] if len(from_number) > 11 else from_number
    
    def receive_sms_webhook(self, webhook_data: Dict) -> Dict[str, any]:
        """
        Traite les données d'un webhook Vonage pour un SMS reçu.
        
        Format Vonage webhook (form-data ou query params):
        - msisdn: Numéro expéditeur (33612345678)
        - to: Numéro destinataire (votre numéro Vonage)
        - text: Contenu du message
        - messageId: ID unique du message
        - message-timestamp: Timestamp du message
        
        Args:
            webhook_data: Données du webhook Vonage (form data ou JSON)
        
        Returns:
            Dict normalisé avec les informations du message
        """
        try:
            # Vonage peut envoyer en form-data ou JSON selon la configuration
            from_number = webhook_data.get("msisdn") or webhook_data.get("from")
            to_number = webhook_data.get("to")
            message_body = webhook_data.get("text", "")
            message_id = webhook_data.get("messageId") or webhook_data.get("message-id")
            timestamp = webhook_data.get("message-timestamp") or webhook_data.get("timestamp")
            
            # Ajouter le + au numéro si nécessaire
            if from_number and not from_number.startswith("+"):
                from_number = "+" + from_number
            if to_number and not to_number.startswith("+"):
                to_number = "+" + to_number
            
            result = {
                "from": from_number or "",
                "to": to_number or "",
                "body": message_body,
                "message_id": message_id or "",
                "direction": "inbound",
                "num_media": 0,
                "media_urls": []
            }
            
            # Vonage supporte aussi MMS dans certains cas
            if webhook_data.get("type") == "binary" or webhook_data.get("data"):
                result["num_media"] = 1
                # Les médias sont généralement dans un payload séparé
            
            return result
            
        except Exception as e:
            logger.error(f"[VONAGE] Erreur lors du traitement du webhook: {e}")
            return {
                "from": "",
                "to": "",
                "body": "",
                "message_id": "",
                "num_media": 0,
                "media_urls": []
            }
    
    def get_message_status(self, message_id: str) -> Optional[Dict[str, any]]:
        """
        Récupère le statut d'un message envoyé.
        
        Note: Vonage ne fournit pas directement un endpoint pour récupérer le statut
        d'un message individuel via l'API REST. Le statut est généralement envoyé
        via un webhook de statut de livraison.
        
        Args:
            message_id: ID du message Vonage
        
        Returns:
            Dict avec le statut du message ou None si erreur
        """
        # Vonage utilise des webhooks pour les statuts de livraison
        # Il n'y a pas d'endpoint direct pour récupérer le statut
        logger.warning("[VONAGE] Récupération du statut d'un message non directement disponible via l'API REST")
        return None

