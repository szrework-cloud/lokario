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
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    
    try:
        from supabase import create_client, Client
        
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        return _supabase_client
    except ImportError:
        return None
    except Exception:
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
        buckets = client.storage.list_buckets()
        bucket_exists = any(b.name == bucket for b in buckets)
        
        if not bucket_exists:
            # Créer le bucket
            client.storage.create_bucket(
                bucket,
                options={
                    "public": False,  # Bucket privé (nécessite authentification)
                    "file_size_limit": settings.MAX_UPLOAD_SIZE,
                    "allowed_mime_types": settings.ALLOWED_MIME_TYPES
                }
            )
        
        return True
    except Exception:
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
        return None
    
    # S'assurer que le bucket existe
    if not ensure_bucket_exists():
        return None
    
    try:
        import io
        
        # Construire le chemin complet dans le bucket
        # Si company_id est fourni ET que file_path ne commence pas déjà par company_id,
        # alors on préfixe avec company_id. Sinon, on utilise file_path tel quel.
        # Cela permet de préserver les sous-dossiers (ex: "2/signatures/file.png")
        if company_id and not file_path.startswith(f"{company_id}/"):
            # Si le chemin commence déjà par un nombre (potentiellement un company_id), l'enlever
            parts = file_path.split("/", 1)
            if len(parts) > 1 and parts[0].isdigit():
                # Le chemin commence déjà par un company_id, utiliser tel quel
                storage_path = file_path
            else:
                # Ajouter company_id au début
                storage_path = f"{company_id}/{file_path}"
        else:
            storage_path = file_path
        
        # Supprimer le fichier existant s'il existe (pour remplacer)
        try:
            client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([storage_path])
        except Exception:
            # Ignorer si le fichier n'existe pas
            pass
        
        # Le SDK Supabase accepte directement les bytes (pas besoin de BytesIO)
        # Note: Le SDK Python ne supporte pas upsert, on supprime puis upload
        response = client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
            path=storage_path,
            file=file_content,  # Passer directement les bytes
            file_options={
                "content-type": content_type or "application/octet-stream"
            }
        )
        
        # La réponse peut être un dict avec 'path' ou directement le path
        if response:
            # Extraire le path de la réponse
            if isinstance(response, dict):
                uploaded_path = response.get('path') or response.get('id') or storage_path
            else:
                uploaded_path = storage_path
            
            return uploaded_path
        else:
            return None
            
    except Exception:
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
        logger.debug(f"Supabase client not available, cannot download: {file_path}")
        return None
    
    try:
        response = client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).download(file_path)
        return response if response else None
    except Exception as e:
        # L'erreur 400 peut signifier que le fichier n'existe pas ou que le chemin est incorrect
        # C'est normal pour certains fichiers qui n'ont pas encore été uploadés dans Supabase
        error_msg = str(e)
        if "400" in error_msg or "404" in error_msg or "not found" in error_msg.lower():
            logger.debug(f"File not found in Supabase Storage (this is normal if file wasn't uploaded yet): {file_path}")
        else:
            logger.warning(f"Error downloading file from Supabase Storage: {file_path}, error: {e}")
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
        return False
    
    try:
        response = client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([file_path])
        return bool(response)
    except Exception:
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
        
    except Exception:
        return None


def is_supabase_storage_configured() -> bool:
    """
    Vérifie si Supabase Storage est configuré.
    
    Returns:
        True si configuré, False sinon
    """
    return bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)

