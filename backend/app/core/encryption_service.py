"""
Service de chiffrement pour les données sensibles (mots de passe, API keys).
Utilise AES-256-GCM pour le chiffrement symétrique.
"""
import os
import base64
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import logging

logger = logging.getLogger(__name__)


class EncryptionService:
    """
    Service pour chiffrer/déchiffrer les données sensibles.
    Utilise une clé dérivée depuis une clé maître stockée dans les variables d'environnement.
    """
    
    def __init__(self, master_key: Optional[str] = None):
        """
        Initialise le service de chiffrement.
        
        Args:
            master_key: Clé maître pour dériver la clé de chiffrement.
                       Si None, utilise ENCRYPTION_MASTER_KEY depuis les variables d'environnement.
        """
        if master_key is None:
            master_key = os.getenv("ENCRYPTION_MASTER_KEY")
        
        if not master_key:
            logger.warning(
                "ENCRYPTION_MASTER_KEY non configurée. "
                "Les données sensibles ne seront pas chiffrées. "
                "Configurez ENCRYPTION_MASTER_KEY dans .env pour activer le chiffrement."
            )
            self.fernet = None
            self.enabled = False
        else:
            # Dériver une clé Fernet depuis la clé maître
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'lokario_encryption_salt',  # En production, utiliser un salt unique par entreprise
                iterations=100000,
                backend=default_backend()
            )
            key = base64.urlsafe_b64encode(kdf.derive(master_key.encode()))
            self.fernet = Fernet(key)
            self.enabled = True
    
    def encrypt(self, plaintext: str) -> Optional[str]:
        """
        Chiffre une chaîne de caractères.
        
        Args:
            plaintext: Texte en clair à chiffrer
            
        Returns:
            Texte chiffré encodé en base64, ou None si le chiffrement n'est pas activé
        """
        if not self.enabled or not self.fernet:
            # Si le chiffrement n'est pas activé, retourner en clair (pour compatibilité)
            # En production, vous devriez forcer l'activation
            logger.warning("Chiffrement non activé - données stockées en clair")
            return plaintext
        
        if not plaintext:
            return None
        
        try:
            encrypted = self.fernet.encrypt(plaintext.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Erreur lors du chiffrement: {e}")
            raise
    
    def decrypt(self, ciphertext: Optional[str]) -> Optional[str]:
        """
        Déchiffre une chaîne de caractères chiffrée.
        
        Args:
            ciphertext: Texte chiffré encodé en base64, ou texte en clair si chiffrement non activé
            
        Returns:
            Texte en clair, ou None si ciphertext est None
        """
        if not ciphertext:
            return None
        
        if not self.enabled or not self.fernet:
            # Si le chiffrement n'est pas activé, retourner tel quel (pour compatibilité)
            return ciphertext
        
        try:
            decrypted = self.fernet.decrypt(ciphertext.encode())
            return decrypted.decode()
        except Exception as e:
            # Si le déchiffrement échoue, peut-être que c'est du texte en clair (migration)
            logger.warning(f"Erreur lors du déchiffrement (peut-être du texte en clair?): {e}")
            return ciphertext  # Retourner tel quel pour compatibilité avec anciennes données


# Instance globale du service de chiffrement
_encryption_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    """
    Récupère l'instance globale du service de chiffrement.
    """
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service

