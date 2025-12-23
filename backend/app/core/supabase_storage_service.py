"""
Service pour gérer le stockage de fichiers sur Supabase Storage.
Permet un stockage persistant des fichiers (logos, signatures, etc.) qui ne sont pas perdus lors des redéploiements.
"""
from typing import Optional, BinaryIO
from pathlib import Path
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialisation lazy du client Supabase
_supabase_client = None


def get_supabase_client():
    """
    Récupère ou crée le client Supabase (singleton).
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    # Log détaillé pour debug
    has_url = bool(settings.SUPABASE_URL)
    has_key = bool(settings.SUPABASE_SERVICE_ROLE_KEY)
    bucket = settings.SUPABASE_STORAGE_BUCKET
    
    logger.info(f"🔍 Vérification Supabase Storage - URL: {has_url}, Key: {has_key}, Bucket: {bucket}")
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning(f"⚠️  Supabase Storage non configuré - SUPABASE_URL: {has_url}, SUPABASE_SERVICE_ROLE_KEY: {has_key}")
        return None
    
    try:
        from supabase import create_client, Client
        
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        logger.info(f"✅ Client Supabase Storage initialisé (URL: {settings.SUPABASE_URL[:30]}..., bucket: {settings.SUPABASE_STORAGE_BUCKET})")
        return _supabase_client
    except ImportError:
        logger.error("❌ Module 'supabase' non installé. Installez-le avec: pip install supabase")
        return None
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'initialisation du client Supabase: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None


def ensure_bucket_exists(bucket_name: Optional[str] = None) -> bool:
    """
    Vérifie que le bucket existe, le crée si nécessaire.
    
    Args:
        bucket_name: Nom du bucket (par défaut: settings.SUPABASE_STORAGE_BUCKET)
    
    Returns:
        True si le bucket existe ou a été créé, False sinon
    """
    bucket = bucket_name or settings.SUPABASE_STORAGE_BUCKET
    client = get_supabase_client()
    
    if not client:
        return False
    
    try:
        # Vérifier si le bucket existe
        logger.info(f"🔍 Vérification du bucket '{bucket}' dans Supabase Storage")
        buckets = client.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        logger.info(f"📦 Buckets existants: {bucket_names}")
        bucket_exists = any(b.name == bucket for b in buckets)
        
        if not bucket_exists:
            # Créer le bucket
            logger.info(f"🔄 Création du bucket '{bucket}' dans Supabase Storage")
            result = client.storage.create_bucket(
                bucket,
                options={
                    "public": False,  # Bucket privé (nécessite authentification)
                    "file_size_limit": settings.MAX_UPLOAD_SIZE,
                    "allowed_mime_types": settings.ALLOWED_MIME_TYPES
                }
            )
            logger.info(f"✅ Bucket '{bucket}' créé dans Supabase Storage: {result}")
        else:
            logger.info(f"✅ Bucket '{bucket}' existe déjà")
        
        return True
    except Exception as e:
        logger.error(f"❌ Erreur lors de la vérification/création du bucket '{bucket}': {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False


def upload_file(
    file_path: str,
    file_content: bytes,
    content_type: Optional[str] = None,
    company_id: Optional[int] = None
) -> Optional[str]:
    """
    Upload un fichier vers Supabase Storage.
    
    Args:
        file_path: Chemin du fichier dans le bucket (ex: "1/logo_xxx.png")
        file_content: Contenu binaire du fichier
        content_type: Type MIME du fichier (ex: "image/png")
        company_id: ID de l'entreprise (optionnel, pour organisation)
    
    Returns:
        Chemin du fichier dans le bucket si succès, None sinon
    """
    client = get_supabase_client()
    
    if not client:
        logger.error("❌ Client Supabase non disponible pour l'upload")
        return None
    
    # S'assurer que le bucket existe
    if not ensure_bucket_exists():
        logger.error("❌ Impossible de créer/vérifier le bucket")
        return None
    
    try:
        import io
        
        # Construire le chemin complet dans le bucket
        # Format: company_id/filename (ex: "1/logo_xxx.png")
        if company_id:
            storage_path = f"{company_id}/{Path(file_path).name}"
        else:
            storage_path = file_path
        
        # Upload du fichier - Supabase accepte directement les bytes
        logger.info(f"🔄 Tentative d'upload vers Supabase Storage: bucket={settings.SUPABASE_STORAGE_BUCKET}, path={storage_path}, size={len(file_content)} bytes")
        
        # Supprimer le fichier existant s'il existe (pour remplacer)
        try:
            client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([storage_path])
            logger.debug(f"🗑️  Fichier existant supprimé (s'il existait): {storage_path}")
        except Exception as e:
            # Ignorer si le fichier n'existe pas
            logger.debug(f"Fichier n'existe pas encore (normal): {storage_path}")
        
        # Le SDK Supabase accepte directement les bytes (pas besoin de BytesIO)
        # Note: Le SDK Python ne supporte pas upsert, on supprime puis upload
        response = client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
            path=storage_path,
            file=file_content,  # Passer directement les bytes
            file_options={
                "content-type": content_type or "application/octet-stream"
            }
        )
        
        logger.info(f"📥 Réponse Supabase upload: {response}")
        
        # La réponse peut être un dict avec 'path' ou directement le path
        if response:
            # Extraire le path de la réponse
            if isinstance(response, dict):
                uploaded_path = response.get('path') or response.get('id') or storage_path
            else:
                uploaded_path = storage_path
            
            logger.info(f"✅ Fichier uploadé vers Supabase Storage: {uploaded_path}")
            return uploaded_path
        else:
            logger.error(f"❌ Échec de l'upload vers Supabase Storage: {storage_path} - Réponse vide")
            return None
            
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'upload vers Supabase Storage ({file_path}): {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None


def download_file(file_path: str) -> Optional[bytes]:
    """
    Télécharge un fichier depuis Supabase Storage.
    
    Args:
        file_path: Chemin du fichier dans le bucket (ex: "1/logo_xxx.png")
    
    Returns:
        Contenu binaire du fichier si succès, None sinon
    """
    client = get_supabase_client()
    
    if not client:
        logger.error("❌ Client Supabase non disponible pour le téléchargement")
        return None
    
    try:
        response = client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).download(file_path)
        
        if response:
            logger.debug(f"✅ Fichier téléchargé depuis Supabase Storage: {file_path}")
            return response
        else:
            logger.warning(f"⚠️  Fichier non trouvé dans Supabase Storage: {file_path}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Erreur lors du téléchargement depuis Supabase Storage ({file_path}): {e}")
        return None


def delete_file(file_path: str) -> bool:
    """
    Supprime un fichier depuis Supabase Storage.
    
    Args:
        file_path: Chemin du fichier dans le bucket (ex: "1/logo_xxx.png")
    
    Returns:
        True si succès, False sinon
    """
    client = get_supabase_client()
    
    if not client:
        logger.error("❌ Client Supabase non disponible pour la suppression")
        return False
    
    try:
        response = client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([file_path])
        
        if response:
            logger.info(f"✅ Fichier supprimé de Supabase Storage: {file_path}")
            return True
        else:
            logger.warning(f"⚠️  Fichier non trouvé pour suppression: {file_path}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Erreur lors de la suppression depuis Supabase Storage ({file_path}): {e}")
        return False


def get_public_url(file_path: str, expires_in: int = 3600) -> Optional[str]:
    """
    Génère une URL publique signée pour accéder à un fichier.
    
    Args:
        file_path: Chemin du fichier dans le bucket
        expires_in: Durée de validité de l'URL en secondes (par défaut: 1h)
    
    Returns:
        URL publique signée si succès, None sinon
    """
    client = get_supabase_client()
    
    if not client:
        return None
    
    try:
        response = client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).create_signed_url(
            path=file_path,
            expires_in=expires_in
        )
        
        if response:
            return response.get("signedURL") if isinstance(response, dict) else str(response)
        return None
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la génération de l'URL publique ({file_path}): {e}")
        return None


def is_supabase_storage_configured() -> bool:
    """
    Vérifie si Supabase Storage est configuré.
    
    Returns:
        True si configuré, False sinon
    """
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)

