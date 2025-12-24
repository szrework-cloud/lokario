"""
Utilitaire centralisé pour charger les images (logos, signatures) pour la génération de PDFs.
Gère automatiquement le stockage local et Supabase Storage avec une gestion d'erreur robuste.
"""
import logging
import os
import uuid
from pathlib import Path
from typing import Optional, Tuple
from reportlab.platypus import Image
from reportlab.lib.units import mm

logger = logging.getLogger(__name__)


class ImageLoadResult:
    """Résultat du chargement d'une image."""
    def __init__(self, image: Optional[Image] = None, temp_file_path: Optional[Path] = None, loaded: bool = False):
        self.image = image
        self.temp_file_path = temp_file_path  # Fichier temporaire créé (à nettoyer plus tard)
        self.loaded = loaded


def normalize_image_path(image_path: str, upload_dir: Path) -> Tuple[str, str]:
    """
    Normalise un chemin d'image pour le traitement.
    
    Args:
        image_path: Chemin de l'image (relatif ou absolu)
        upload_dir: Répertoire d'upload de base
    
    Returns:
        Tuple (normalized_path, absolute_path)
        - normalized_path: Chemin normalisé pour Supabase Storage (ex: "6/logo_abc.png")
        - absolute_path: Chemin absolu pour le système de fichiers local
    """
    if not image_path:
        return "", ""
    
    # Enlever les préfixes "uploads/" ou "./uploads/"
    normalized = image_path
    if normalized.startswith("uploads/"):
        normalized = normalized[8:]
    elif normalized.startswith("./uploads/"):
        normalized = normalized[11:]
    
    # Construire le chemin absolu
    if Path(normalized).is_absolute():
        absolute_path = str(Path(normalized).resolve())
        # Extraire le chemin relatif pour Supabase
        try:
            if Path(normalized).is_relative_to(upload_dir):
                normalized = str(Path(normalized).relative_to(upload_dir))
            else:
                normalized = Path(normalized).name
        except (ValueError, AttributeError):
            normalized = Path(normalized).name
    else:
        absolute_path = str((upload_dir / normalized).resolve())
    
    return normalized, absolute_path


def load_image_for_pdf(
    image_path: Optional[str],
    width: float,
    height: float,
    upload_dir: Path,
    company_id: Optional[int] = None,
    temp_subdir: str = "temp_images",
    kind: str = 'proportional'
) -> ImageLoadResult:
    """
    Charge une image pour l'utiliser dans un PDF ReportLab.
    
    Gère automatiquement:
    - Chargement depuis le système de fichiers local
    - Téléchargement depuis Supabase Storage si non trouvé localement
    - Création de fichiers temporaires pour Supabase (ReportLab nécessite des fichiers physiques)
    - Gestion d'erreur robuste avec logging détaillé
    
    Args:
        image_path: Chemin de l'image (relatif ou absolu)
        width: Largeur de l'image en millimètres
        height: Hauteur de l'image en millimètres
        upload_dir: Répertoire d'upload de base
        company_id: ID de l'entreprise (pour organisation des fichiers temporaires)
        temp_subdir: Sous-répertoire pour les fichiers temporaires
        kind: Type de redimensionnement ('proportional', 'normal', 'bound')
    
    Returns:
        ImageLoadResult avec l'image chargée et les informations de fichier temporaire
    """
    if not image_path:
        logger.debug(f"[IMAGE LOADER] No image path provided")
        return ImageLoadResult(loaded=False)
    
    logger.info(f"[IMAGE LOADER] Loading image: {image_path}")
    
    # Normaliser le chemin
    normalized_path, absolute_path = normalize_image_path(image_path, upload_dir)
    logger.info(f"[IMAGE LOADER] Normalized path: {normalized_path}, Absolute path: {absolute_path}")
    
    # TENTATIVE 1: Charger depuis le système de fichiers local
    if absolute_path:
        if Path(absolute_path).exists():
            try:
                logger.info(f"[IMAGE LOADER] Attempting to load from local filesystem: {absolute_path}")
                image = Image(absolute_path, width=width*mm, height=height*mm, kind=kind)
                logger.info(f"[IMAGE LOADER] ✅ Image loaded successfully from local filesystem")
                return ImageLoadResult(image=image, loaded=True)
            except Exception as e:
                logger.warning(f"[IMAGE LOADER] ⚠️ Failed to load image from local filesystem: {e}", exc_info=True)
                # Continuer pour essayer Supabase Storage
        else:
            logger.info(f"[IMAGE LOADER] Local file does not exist: {absolute_path}, will try Supabase Storage")
    else:
        logger.info(f"[IMAGE LOADER] No absolute path computed, will try Supabase Storage")
    
    # TENTATIVE 2: Charger depuis Supabase Storage
    if normalized_path:
        try:
            from app.core.supabase_storage_service import (
                download_file as download_from_supabase,
                is_supabase_storage_configured
            )
            
            if not is_supabase_storage_configured():
                logger.debug(f"[IMAGE LOADER] Supabase Storage not configured, skipping download")
                return ImageLoadResult(loaded=False)
            
            logger.info(f"[IMAGE LOADER] Attempting to download from Supabase Storage: {normalized_path}")
            file_content = download_from_supabase(normalized_path)
            
            if not file_content:
                logger.warning(f"[IMAGE LOADER] ⚠️ File not found in Supabase Storage: {normalized_path} (file may not exist or upload may have failed)")
                return ImageLoadResult(loaded=False)
            
            logger.info(f"[IMAGE LOADER] Downloaded {len(file_content)} bytes from Supabase Storage")
            
            # CRITIQUE: ReportLab nécessite un fichier physique, pas un BytesIO
            # Créer un fichier temporaire pour le stockage
            temp_file_path = None
            try:
                # Extraire company_id du chemin si non fourni (format: "company_id/filename")
                if not company_id and "/" in normalized_path:
                    try:
                        company_id = int(normalized_path.split("/")[0])
                    except (ValueError, IndexError):
                        company_id = None
                
                # Créer le répertoire temporaire
                if company_id:
                    temp_dir = upload_dir / str(company_id) / temp_subdir
                else:
                    temp_dir = upload_dir / "temp" / temp_subdir
                
                # Créer le répertoire avec gestion d'erreur robuste
                try:
                    temp_dir.mkdir(parents=True, exist_ok=True)
                except PermissionError as perm_error:
                    logger.error(f"[IMAGE LOADER] ❌ Permission denied creating temp directory {temp_dir}: {perm_error}")
                    return ImageLoadResult(loaded=False)
                except OSError as os_error:
                    logger.error(f"[IMAGE LOADER] ❌ OS error creating temp directory {temp_dir}: {os_error}")
                    return ImageLoadResult(loaded=False)
                
                # Générer un nom de fichier unique
                file_ext = Path(normalized_path).suffix or ".png"
                temp_file_path = temp_dir / f"img_{uuid.uuid4().hex[:8]}{file_ext}"
                
                # Sauvegarder le contenu téléchargé
                with open(temp_file_path, "wb") as temp_file:
                    temp_file.write(file_content)
                
                logger.info(f"[IMAGE LOADER] Saved temporary file: {temp_file_path}")
                
                # Créer l'objet Image ReportLab
                image = Image(str(temp_file_path), width=width*mm, height=height*mm, kind=kind)
                
                logger.info(f"[IMAGE LOADER] ✅ Image loaded successfully from Supabase Storage")
                return ImageLoadResult(image=image, temp_file_path=temp_file_path, loaded=True)
                
            except Exception as img_error:
                logger.error(f"[IMAGE LOADER] ❌ Error creating image from Supabase content: {img_error}", exc_info=True)
                # Nettoyer le fichier temporaire en cas d'erreur
                if temp_file_path and temp_file_path.exists():
                    try:
                        temp_file_path.unlink()
                    except Exception:
                        pass
                return ImageLoadResult(loaded=False)
                
        except ImportError:
            logger.debug(f"[IMAGE LOADER] Supabase Storage service not available")
            return ImageLoadResult(loaded=False)
        except Exception as e:
            logger.error(f"[IMAGE LOADER] ❌ Error downloading from Supabase Storage: {e}", exc_info=True)
            return ImageLoadResult(loaded=False)
    
    # Si aucune tentative n'a réussi
    logger.warning(f"[IMAGE LOADER] ❌ Image not found: {image_path} (tried local and Supabase Storage)")
    return ImageLoadResult(loaded=False)


def cleanup_temp_images(upload_dir: Path, max_age_seconds: int = 3600) -> None:
    """
    Nettoie les fichiers temporaires d'images plus anciens que max_age_seconds.
    
    Args:
        upload_dir: Répertoire d'upload de base
        max_age_seconds: Âge maximum en secondes (défaut: 1 heure)
    """
    import time
    
    try:
        current_time = time.time()
        temp_subdirs = ["temp_logos", "temp_signatures", "temp_images"]
        
        for company_dir in upload_dir.iterdir():
            if not company_dir.is_dir():
                continue
            
            for temp_subdir in temp_subdirs:
                temp_dir = company_dir / temp_subdir
                if not temp_dir.exists():
                    continue
                
                for temp_file in temp_dir.iterdir():
                    if not temp_file.is_file():
                        continue
                    
                    try:
                        file_age = current_time - temp_file.stat().st_mtime
                        if file_age > max_age_seconds:
                            temp_file.unlink()
                            logger.debug(f"[IMAGE LOADER] Cleaned up old temp file: {temp_file}")
                    except Exception as e:
                        logger.warning(f"[IMAGE LOADER] Error cleaning up temp file {temp_file}: {e}")
                        
    except Exception as e:
        logger.warning(f"[IMAGE LOADER] Error during temp files cleanup: {e}")

