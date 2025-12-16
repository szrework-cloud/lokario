"""
Schémas Pydantic pour les intégrations Inbox
"""
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from datetime import datetime
from typing import Optional, Union


class InboxIntegrationBase(BaseModel):
    integration_type: str  # "imap", "sendgrid", "mailgun", "whatsapp", "messenger", "sms"
    name: str
    is_active: bool = True
    is_primary: bool = False  # Boîte mail principale pour l'envoi
    sync_interval_minutes: int = 5


class InboxIntegrationCreate(InboxIntegrationBase):
    # Configuration IMAP
    imap_server: Optional[str] = None
    imap_port: Optional[int] = None
    email_address: Optional[Union[EmailStr, str]] = None
    email_password: Optional[str] = None
    use_ssl: bool = True
    
    # Configuration API
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    
    # Configuration WhatsApp/Messenger
    account_id: Optional[str] = None
    phone_number: Optional[str] = None
    
    @model_validator(mode='before')
    @classmethod
    def clean_empty_strings(cls, data):
        """Convertit les chaînes vides en None pour éviter les erreurs de validation"""
        if isinstance(data, dict):
            # Pour email_address, convertir les chaînes vides en None
            if 'email_address' in data and data['email_address'] == "":
                data['email_address'] = None
            # Pour les autres champs optionnels, convertir les chaînes vides en None
            for key in ['imap_server', 'api_key', 'webhook_secret', 'phone_number', 'account_id']:
                if key in data and data[key] == "":
                    data[key] = None
        return data


class InboxIntegrationUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    is_primary: Optional[bool] = None  # Marquer comme boîte principale
    sync_interval_minutes: Optional[int] = None
    imap_server: Optional[str] = None
    imap_port: Optional[int] = None
    email_address: Optional[Union[EmailStr, str]] = None
    email_password: Optional[str] = None
    use_ssl: Optional[bool] = None
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    account_id: Optional[str] = None
    phone_number: Optional[str] = None


class InboxIntegrationRead(InboxIntegrationBase):
    id: int
    company_id: int
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    last_sync_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Ne pas exposer les mots de passe/clés API
    email_password: Optional[str] = None  # Masqué dans la réponse
    api_key: Optional[str] = None  # Masqué dans la réponse
    
    class Config:
        from_attributes = True

