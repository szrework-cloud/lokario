from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    # JWT_SECRET_KEY est chargé depuis la variable d'environnement JWT_SECRET_KEY
    # Valeur par défaut uniquement pour le développement local
    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 jour
    # Variable pour détecter l'environnement (production, staging, development)
    ENVIRONMENT: str = "development"
    
    # Configuration email (SMTP)
    SMTP_HOST: Optional[str] = None  # ex: smtp.gmail.com
    SMTP_PORT: int = 587
    SMTP_USE_TLS: bool = True
    SMTP_USERNAME: Optional[str] = None  # Email d'envoi
    SMTP_PASSWORD: Optional[str] = None  # Mot de passe de l'email
    SMTP_FROM_EMAIL: str = "noreply@lokario.fr"  # Email expéditeur
    FRONTEND_URL: str = "http://localhost:3000"  # URL du frontend pour les liens
    
    # Configuration SendGrid API (prioritaire si configuré)
    SENDGRID_API_KEY: Optional[str] = None  # API Key SendGrid pour utiliser l'API REST
    
    # Configuration stockage fichiers
    UPLOAD_DIR: str = "./uploads"  # Répertoire de stockage des fichiers uploadés
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB max par fichier
    ALLOWED_EXTENSIONS: list = [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"]
    # MIME types autorisés (vérification réelle du contenu)
    ALLOWED_MIME_TYPES: list = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "application/msword",  # .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
        "application/vnd.ms-excel",  # .xls
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
        "text/plain", "text/csv",
    ]
    
    # Configuration webhooks
    WEBHOOK_SECRET: Optional[str] = None  # Secret pour vérifier les signatures de webhooks
    MESSENGER_VERIFY_TOKEN: Optional[str] = None  # Token de vérification Facebook Messenger
    
    # Configuration cron jobs
    CRON_SECRET: Optional[str] = None  # Secret pour protéger les endpoints cron (ex: pour relances automatiques)
    
    # Configuration OpenAI (pour classification IA)
    OPENAI_API_KEY: Optional[str] = None  # Clé API OpenAI pour ChatGPT
    
    # Configuration Stripe
    STRIPE_SECRET_KEY: Optional[str] = None  # Clé secrète Stripe
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None  # Clé publique Stripe (pour le frontend)
    STRIPE_WEBHOOK_SECRET: Optional[str] = None  # Secret pour vérifier les webhooks Stripe
    # Plan Essentiel (Starter)
    STRIPE_PRICE_STARTER_MONTHLY: Optional[str] = None  # Price ID Stripe pour le plan Essentiel mensuel
    STRIPE_PRICE_STARTER_YEARLY: Optional[str] = None  # Price ID Stripe pour le plan Essentiel annuel
    # Plan Pro (Professional)
    STRIPE_PRICE_PROFESSIONAL_MONTHLY: Optional[str] = None  # Price ID Stripe pour le plan Pro mensuel
    STRIPE_PRICE_PROFESSIONAL_YEARLY: Optional[str] = None  # Price ID Stripe pour le plan Pro annuel
    # Plan Enterprise (pour compatibilité future)
    STRIPE_PRICE_ENTERPRISE: Optional[str] = None  # Price ID Stripe pour le plan Enterprise
    
    # Configuration Supabase Storage
    SUPABASE_URL: Optional[str] = None  # URL de votre projet Supabase (ex: https://xxx.supabase.co)
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None  # Service Role Key (pour accès admin au Storage)
    SUPABASE_STORAGE_BUCKET: str = "company-assets"  # Nom du bucket pour les fichiers d'entreprise
    
    class Config:
        env_file = ".env"


settings = Settings()

# SÉCURITÉ: Valider que JWT_SECRET_KEY n'est pas la valeur par défaut en production
DEFAULT_JWT_SECRET = "dev-secret-key-change-in-production"
if settings.JWT_SECRET_KEY == DEFAULT_JWT_SECRET:
    if settings.ENVIRONMENT.lower() in ["production", "prod"]:
        raise ValueError(
            "🚨 SÉCURITÉ: JWT_SECRET_KEY ne peut pas utiliser la valeur par défaut en production. "
            "Définissez la variable d'environnement JWT_SECRET_KEY avec une clé sécurisée."
        )
    else:
        print(f"\n⚠️  ATTENTION: JWT_SECRET_KEY utilise la valeur par défaut (développement uniquement)")
        print(f"   Pour la production, définissez JWT_SECRET_KEY dans votre fichier .env\n")

# Debug: Afficher la configuration email au démarrage
sendgrid_configured = hasattr(settings, 'SENDGRID_API_KEY') and settings.SENDGRID_API_KEY
smtp_configured = settings.SMTP_HOST

if sendgrid_configured or smtp_configured:
    print(f"\n📧 Configuration email chargée:")
    if sendgrid_configured:
        print(f"   ✅ SendGrid API: Configuré ({len(settings.SENDGRID_API_KEY)} caractères)")
    if smtp_configured:
        print(f"   ✅ SMTP: {settings.SMTP_HOST}:{settings.SMTP_PORT}")
        print(f"   Username: {settings.SMTP_USERNAME}")
        print(f"   Password: {'✅ Configuré (' + str(len(settings.SMTP_PASSWORD or '')) + ' caractères)' if settings.SMTP_PASSWORD else '❌ Non configuré'}")
    print(f"   From: {settings.SMTP_FROM_EMAIL}")
    print(f"   Frontend URL: {settings.FRONTEND_URL}\n")
else:
    print("\n⚠️  Aucune configuration email (SMTP ou SendGrid) - Les emails ne seront pas envoyés (mode MOCK)")
    print("   💡 Configurez SENDGRID_API_KEY (recommandé) ou SMTP_HOST pour activer l'envoi d'emails\n")

