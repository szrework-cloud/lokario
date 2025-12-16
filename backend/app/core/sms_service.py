"""
Service pour envoyer et recevoir des SMS via Twilio.
"""
from typing import Dict, Optional
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class SMSService:
    """
    Service pour gérer les SMS via Twilio.
    """
    
    def __init__(
        self,
        account_sid: str,
        auth_token: str,
        from_number: str
    ):
        """
        Initialise le service SMS avec les credentials Twilio.
        
        Args:
            account_sid: Account SID Twilio
            auth_token: Auth Token Twilio
            from_number: Numéro Twilio d'envoi (format: +33612345678)
        """
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number
        self.client = Client(account_sid, auth_token)
    
    def send_sms(
        self,
        to: str,
        message: str,
        from_number: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Envoie un SMS.
        
        Args:
            to: Numéro de téléphone du destinataire (format: +33612345678)
            message: Contenu du message (max 1600 caractères)
            from_number: Numéro d'envoi (optionnel, utilise self.from_number par défaut)
        
        Returns:
            Dict contenant le statut et les détails de l'envoi
        """
        try:
            # Normaliser le numéro (s'assurer qu'il commence par +)
            to = self._normalize_phone_number(to)
            from_num = from_number or self.from_number
            from_num = self._normalize_phone_number(from_num)
            
            logger.info(f"[SMS] Envoi SMS de {from_num} vers {to}")
            
            # Envoyer le SMS
            message_obj = self.client.messages.create(
                body=message,
                from_=from_num,
                to=to
            )
            
            logger.info(f"[SMS] SMS envoyé avec succès: {message_obj.sid}")
            
            return {
                "status": "sent",
                "success": True,
                "message_sid": message_obj.sid,
                "status_text": message_obj.status,
                "to": to,
                "from": from_num,
                "date_created": message_obj.date_created.isoformat() if message_obj.date_created else None
            }
            
        except TwilioRestException as e:
            logger.error(f"[SMS] Erreur Twilio: {e}")
            return {
                "status": "error",
                "success": False,
                "error": str(e),
                "error_code": e.code,
                "error_message": e.msg
            }
        except Exception as e:
            logger.error(f"[SMS] Erreur inattendue: {e}")
            return {
                "status": "error",
                "success": False,
                "error": str(e)
            }
    
    def _normalize_phone_number(self, phone: str) -> str:
        """
        Normalise un numéro de téléphone pour Twilio.
        S'assure qu'il commence par + et contient le code pays.
        """
        # Enlever les espaces et caractères spéciaux
        phone = phone.replace(" ", "").replace("-", "").replace(".", "").replace("(", "").replace(")", "")
        
        # Si le numéro commence par 0, le remplacer par +33 (France)
        if phone.startswith("0"):
            phone = "+33" + phone[1:]
        
        # Si le numéro ne commence pas par +, ajouter +33 (France par défaut)
        if not phone.startswith("+"):
            phone = "+33" + phone
        
        return phone
    
    def receive_sms_webhook(self, webhook_data: Dict) -> Dict[str, any]:
        """
        Traite les données d'un webhook Twilio pour un SMS reçu.
        
        Args:
            webhook_data: Données du webhook Twilio (form data)
        
        Returns:
            Dict normalisé avec les informations du message
        """
        from_number = webhook_data.get("From", "").replace("whatsapp:", "").replace("sms:", "")
        to_number = webhook_data.get("To", "").replace("whatsapp:", "").replace("sms:", "")
        message_body = webhook_data.get("Body", "")
        message_sid = webhook_data.get("MessageSid", "")
        num_media = webhook_data.get("NumMedia", "0")
        
        # Normaliser les numéros
        from_number = self._normalize_phone_number(from_number)
        to_number = self._normalize_phone_number(to_number)
        
        result = {
            "from": from_number,
            "to": to_number,
            "body": message_body,
            "message_sid": message_sid,
            "num_media": int(num_media) if num_media.isdigit() else 0,
            "media_urls": []
        }
        
        # Récupérer les URLs des médias si présents
        if result["num_media"] > 0:
            for i in range(result["num_media"]):
                media_url = webhook_data.get(f"MediaUrl{i}", "")
                content_type = webhook_data.get(f"MediaContentType{i}", "")
                if media_url:
                    result["media_urls"].append({
                        "url": media_url,
                        "content_type": content_type
                    })
        
        return result
    
    def get_message_status(self, message_sid: str) -> Optional[Dict[str, any]]:
        """
        Récupère le statut d'un message envoyé.
        
        Args:
            message_sid: SID du message Twilio
        
        Returns:
            Dict avec le statut du message ou None si erreur
        """
        try:
            message = self.client.messages(message_sid).fetch()
            return {
                "sid": message.sid,
                "status": message.status,
                "to": message.to,
                "from": message.from_,
                "body": message.body,
                "date_created": message.date_created.isoformat() if message.date_created else None,
                "date_sent": message.date_sent.isoformat() if message.date_sent else None,
                "error_code": message.error_code,
                "error_message": message.error_message
            }
        except Exception as e:
            logger.error(f"[SMS] Erreur lors de la récupération du statut: {e}")
            return None

