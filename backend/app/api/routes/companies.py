from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List
from pathlib import Path
from datetime import datetime, timedelta, date
import uuid
from app.db.session import get_db
from app.db.models.company import Company
from app.api.schemas.company import CompanyRead, CompanyUpdate
from app.api.schemas.company_settings import (
    CompanySettingsRead,
    CompanySettingsUpdate,
    CompanyWithSettings,
)
from app.api.deps import (
    get_current_active_user,
    get_current_active_user_from_token_or_query,
    get_current_super_admin,
    get_current_company_settings,
)
from app.db.models.user import User
from app.core.config import settings
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel

router = APIRouter(prefix="/companies", tags=["companies"])


class OnboardingStep1Request(BaseModel):
    discovery_source: str  # réseaux_sociaux, recommandation, recherche_google, publicité, autre


class OnboardingStep2Request(BaseModel):
    sector: str  # commerce, restauration, services, artisan_btp, independant, autre


class OnboardingStep3Request(BaseModel):
    motivation: str  # mieux_organiser, centraliser_messages, ne_rien_oublier, gagner_temps, tester_ia, autre


class OnboardingStep4Request(BaseModel):
    plan: str  # starter ou professional

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/me", response_model=CompanyRead)
def get_my_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retourne la company de l'utilisateur courant.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.patch("/me", response_model=CompanyRead)
def update_my_company(
    company_data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Met à jour les informations de l'entreprise de l'utilisateur courant.
    Autorisé uniquement pour owner et super_admin.
    """
    # Vérification du rôle
    if current_user.role not in ("owner", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Owner or super_admin role required.",
        )
    
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Mettre à jour les champs fournis
    update_data = company_data.model_dump(exclude_unset=True)
    
    # Si le nom change, mettre à jour le slug aussi
    if "name" in update_data and update_data["name"] != company.name:
        import re
        base_slug = re.sub(r'[^a-z0-9]+', '-', update_data["name"].lower()).strip('-')
        # Vérifier l'unicité du slug
        slug = base_slug
        slug_counter = 1
        while db.query(Company).filter(Company.slug == slug, Company.id != company.id).first():
            slug = f"{base_slug}-{slug_counter}"
            slug_counter += 1
        update_data["slug"] = slug
    
    for field, value in update_data.items():
        setattr(company, field, value)
    
    db.commit()
    db.refresh(company)
    
    return company


@router.get("", response_model=List[CompanyRead])
def get_all_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """
    Liste toutes les companies actives (réservé aux super_admin).
    Les entreprises supprimées (is_active=False) ne sont pas retournées.
    """
    companies = db.query(Company).filter(Company.is_active == True).all()
    return companies


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère une entreprise spécifique.
    Accessible aux super_admin pour toutes les entreprises, ou aux owners/users pour leur propre entreprise.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Si pas super_admin, vérifier que l'utilisateur appartient à cette entreprise
    if current_user.role != "super_admin":
        if current_user.company_id != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to access this company"
            )
    
    return company


@router.get("/me/settings", response_model=CompanyWithSettings)
def get_my_company_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    settings = Depends(get_current_company_settings),
):
    """
    Récupère les informations de l'entreprise et ses settings.
    """
    company = (
        db.query(Company)
        .filter(Company.id == current_user.company_id)
        .first()
    )
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return {
        "company": company,
        "settings": settings,
    }


@router.patch("/me/settings", response_model=CompanySettingsRead)
def update_my_company_settings(
    payload: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Met à jour les settings de l'entreprise.
    
    Autorisé uniquement pour owner et super_admin.
    
    IMPORTANT: Les owners ne peuvent PAS modifier les modules (réservés au super_admin).
    Ils peuvent seulement modifier ia et integrations.
    
    TODO: Valider la structure des settings plus tard
    TODO: Gérer des plans (Starter/Pro/etc.) avec des restrictions
    TODO: Affiner la granularité (interdire certains champs IA qui ont un impact coût)
    """
    from copy import deepcopy
    
    # Vérification du rôle
    if current_user.role not in ("owner", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Owner or super_admin role required.",
        )
    
    try:
        # Récupérer les settings depuis la session actuelle pour éviter les conflits de session
        from app.db.models.company_settings import CompanySettings
        from app.core.defaults import get_default_settings
        from app.db.retry import execute_with_retry
        
        # Utiliser execute_with_retry pour gérer les erreurs de connexion SSL
        def _get_settings():
            return (
                db.query(CompanySettings)
                .filter(CompanySettings.company_id == current_user.company_id)
                .first()
            )
        
        settings = execute_with_retry(db, _get_settings)
        
        if not settings:
            # Créer des settings par défaut si manquants avec retry
            def _create_settings():
                new_settings = CompanySettings(
                    company_id=current_user.company_id,
                    settings=get_default_settings(),
                )
                db.add(new_settings)
                db.commit()
                db.refresh(new_settings)
                return new_settings
            
            settings = execute_with_retry(db, _create_settings)
        
        existing = deepcopy(settings.settings)
        incoming = payload.settings
        
        # Fonction pour fusionner profondément (deep merge) deux dictionnaires
        def deep_merge(existing_dict: dict, incoming_dict: dict) -> dict:
            """Fusionne profondément deux dictionnaires."""
            result = deepcopy(existing_dict)
            for key, value in incoming_dict.items():
                if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                    # Si les deux sont des dicts, fusionner récursivement
                    result[key] = deep_merge(result[key], value)
                else:
                    # Sinon, écraser la valeur (même si c'est un dict dans incoming mais pas dans existing)
                    result[key] = deepcopy(value) if isinstance(value, dict) else value
            return result
        
        # Si owner, on garde les modules existants (pas de modification autorisée)
        if current_user.role == "owner":
            # Le owner ne peut PAS modifier les modules
            if "modules" in incoming:
                del incoming["modules"]
        
        # Fusionner profondément les settings existants avec les nouveaux
        merged_settings = deep_merge(existing, incoming)
        
        # Réappliquer les modules si owner
        if current_user.role == "owner":
            merged_settings["modules"] = existing.get("modules", {})
        
        # Logs détaillés pour le débogage
        print("=" * 80)
        print(f"[SETTINGS UPDATE] Settings avant merge: {existing}")
        print(f"[SETTINGS UPDATE] Settings incoming: {incoming}")
        print(f"[SETTINGS UPDATE] Settings incoming - ia: {incoming.get('ia')}")
        print(f"[SETTINGS UPDATE] Settings incoming - ia.inbox: {incoming.get('ia', {}).get('inbox')}")
        print(f"[SETTINGS UPDATE] Settings après merge: {merged_settings}")
        print(f"[SETTINGS UPDATE] Settings après merge - ia: {merged_settings.get('ia')}")
        print(f"[SETTINGS UPDATE] Settings après merge - ia.inbox: {merged_settings.get('ia', {}).get('inbox')}")
        print("=" * 80)
        
        # Sauvegarder les modifications avec retry pour gérer les erreurs SSL
        def _save_settings():
            settings.settings = merged_settings
            # L'objet settings est déjà dans la session db, pas besoin de db.add()
            db.commit()
            db.refresh(settings)
            return settings
        
        settings = execute_with_retry(db, _save_settings)
        
        print(f"[SETTINGS UPDATE] ✅ Settings sauvegardés avec succès pour company_id={current_user.company_id}")
        return settings
    except Exception as e:
        db.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur lors de la mise à jour des settings: {e}", exc_info=True)
        import traceback
        logger.error(f"Traceback complet: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise à jour des settings: {str(e)}"
        )


# ============================================================================
# Routes ADMIN pour gérer les settings d'une entreprise (super_admin uniquement)
# ============================================================================

@router.get("/{company_id}/settings", response_model=CompanySettingsRead)
def get_company_settings_admin(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Récupère les settings d'une entreprise (super_admin uniquement).
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed. Super admin only."
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    from app.db.models.company_settings import CompanySettings
    from app.core.defaults import get_default_settings
    
    settings = (
        db.query(CompanySettings)
        .filter(CompanySettings.company_id == company_id)
        .first()
    )
    
    if not settings:
        # Créer des settings par défaut si manquants
        settings = CompanySettings(
            company_id=company_id,
            settings=get_default_settings(),
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


@router.patch("/{company_id}/settings", response_model=CompanySettingsRead)
def update_company_settings_admin(
    company_id: int,
    payload: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Met à jour les settings d'une entreprise (super_admin uniquement).
    Permet de modifier TOUT, y compris les modules payants.
    """
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed. Super admin only."
        )
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    from app.db.models.company_settings import CompanySettings
    
    settings = (
        db.query(CompanySettings)
        .filter(CompanySettings.company_id == company_id)
        .first()
    )
    
    if not settings:
        from app.core.defaults import get_default_settings
        settings = CompanySettings(
            company_id=company_id,
            settings=get_default_settings(),
        )
        db.add(settings)
    
    # Le super_admin peut modifier TOUT, y compris les modules
    settings.settings = payload.settings
    db.add(settings)
    db.commit()
    db.refresh(settings)
    
    return settings


@router.post("/me/logo", response_model=dict)
async def upload_company_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload le logo de l'entreprise.
    Autorisé uniquement pour owner et super_admin.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"📤 Upload de logo demandé - User: {current_user.id}, Company: {current_user.company_id}, File: {file.filename}")
    
    # Vérification du rôle
    if current_user.role not in ("owner", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Owner or super_admin role required.",
        )
    
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    
    # Vérifier l'extension (uniquement images)
    original_file_ext = Path(file.filename).suffix.lower()
    allowed_extensions = [".jpg", ".jpeg", ".png"]
    if original_file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed extensions: {', '.join(allowed_extensions)}"
        )
    
    # Lire le contenu du fichier
    file_content = await file.read()
    file_size = len(file_content)
    file_ext = original_file_ext  # Garder le format original
    
    # Vérifier uniquement la taille maximale (pas de conversion)
    max_size = 10 * 1024 * 1024  # 10MB
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is 10MB."
        )
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Logo uploaded without processing: {file_size} bytes (format: {file_ext})")
    
    # Générer un nom de fichier unique
    unique_filename = f"logo_{uuid.uuid4()}{file_ext}"
    
    # Récupérer les settings de l'entreprise
    from app.db.models.company_settings import CompanySettings
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    
    # Essayer d'abord Supabase Storage (recommandé pour production)
    from app.core.supabase_storage_service import (
        upload_file as upload_to_supabase,
        delete_file as delete_from_supabase,
        is_supabase_storage_configured
    )
    
    storage_path = None
    use_supabase = is_supabase_storage_configured()
    
    if use_supabase:
        # Supprimer l'ancien logo depuis Supabase si existe
        if company_settings:
            company_info = company_settings.settings.get("company_info", {})
            old_logo_path = company_info.get("logo_path")
            if old_logo_path and old_logo_path.startswith(f"{current_user.company_id}/"):
                try:
                    delete_from_supabase(old_logo_path)
                except Exception:
                    pass  # Ignorer les erreurs de suppression
        
        # Upload vers Supabase Storage
        storage_path = upload_to_supabase(
            file_path=unique_filename,
            file_content=file_content,
            content_type="image/png" if file_ext == ".png" else "image/jpeg",
            company_id=current_user.company_id
        )
        
        if not storage_path:
            use_supabase = False
    
    # Fallback vers stockage local si Supabase n'est pas configuré ou a échoué
    if not use_supabase:
        company_upload_dir = UPLOAD_DIR / str(current_user.company_id)
        company_upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = company_upload_dir / unique_filename
        
        # Supprimer l'ancien logo s'il existe
        if company_settings:
            company_info = company_settings.settings.get("company_info", {})
            old_logo_path = company_info.get("logo_path")
            if old_logo_path:
                old_file_path = UPLOAD_DIR / old_logo_path
                if old_file_path.exists():
                    try:
                        old_file_path.unlink()
                    except Exception:
                        pass  # Ignorer les erreurs de suppression
        
        # Sauvegarder le nouveau fichier
        try:
            with open(file_path, "wb") as f:
                f.write(file_content)
            
            # Vérifier que le fichier a bien été écrit
            if not file_path.exists():
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Logo file was not created: {file_path}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="File was not saved correctly to disk"
                )
            
            actual_size = file_path.stat().st_size
            if actual_size != file_size:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Logo file size mismatch: expected {file_size}, got {actual_size}")
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Logo saved successfully: {file_path} (size: {actual_size} bytes)")
            
            storage_path = str(file_path.relative_to(UPLOAD_DIR))
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error saving logo {file_path}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving file: {str(e)}"
            )
    
    # Mettre à jour company_info avec le chemin du logo
    if not company_settings:
        from app.core.defaults import get_default_settings
        company_settings = CompanySettings(
            company_id=current_user.company_id,
            settings=get_default_settings(),
        )
        db.add(company_settings)
        db.flush()
    
    # Mettre à jour le chemin du logo dans company_info
    if "company_info" not in company_settings.settings:
        company_settings.settings["company_info"] = {}
    
    company_settings.settings["company_info"]["logo_path"] = storage_path
    flag_modified(company_settings, "settings")
    db.commit()
    
    return {
        "logo_path": storage_path,
        "message": "Logo uploaded successfully"
    }


@router.post("/me/signature", response_model=dict)
async def upload_company_signature(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload la signature de l'entreprise pour les devis/factures.
    Autorisé uniquement pour owner et super_admin.
    """
    # Vérification du rôle
    if current_user.role not in ("owner", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Owner or super_admin role required.",
        )
    
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    
    # Vérifier l'extension (uniquement images)
    original_file_ext = Path(file.filename).suffix.lower()
    allowed_extensions = [".jpg", ".jpeg", ".png"]
    if original_file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed extensions: {', '.join(allowed_extensions)}"
        )
    
    # Lire le contenu du fichier
    file_content = await file.read()
    original_size = len(file_content)
    
    # Compresser l'image si nécessaire
    file_ext = ".jpg"
    try:
        from PIL import Image
        import io
        
        image = Image.open(io.BytesIO(file_content))
        
        # Convertir en RGB si nécessaire
        if image.mode in ('RGBA', 'LA', 'P'):
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = rgb_image
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Redimensionner si nécessaire (max 400px de largeur pour les signatures)
        max_width = 400
        if image.width > max_width:
            ratio = max_width / image.width
            new_height = int(image.height * ratio)
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        # Compresser l'image
        output = io.BytesIO()
        quality = 85
        for q in range(85, 40, -10):
            output.seek(0)
            output.truncate(0)
            image.save(output, format='JPEG', quality=q, optimize=True)
            if len(output.getvalue()) <= 2 * 1024 * 1024:
                quality = q
                break
        
        file_content = output.getvalue()
        file_size = len(file_content)
        
    except ImportError:
        file_size = original_size
        file_ext = original_file_ext
        max_size = 2 * 1024 * 1024
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is 2MB."
            )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error compressing signature image: {str(e)}")
        file_size = original_size
        file_ext = original_file_ext
        max_size = 2 * 1024 * 1024
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is 2MB"
            )
    
    # Générer un nom de fichier unique
    unique_filename = f"signature_{uuid.uuid4()}{file_ext}"
    
    # Récupérer les settings de l'entreprise
    from app.db.models.company_settings import CompanySettings
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    
    # Essayer d'abord Supabase Storage (recommandé pour production)
    from app.core.supabase_storage_service import (
        upload_file as upload_to_supabase,
        delete_file as delete_from_supabase,
        is_supabase_storage_configured
    )
    
    storage_path = None
    use_supabase = is_supabase_storage_configured()
    
    if use_supabase:
        # Supprimer l'ancienne signature depuis Supabase si existe
        if company_settings:
            billing_settings = company_settings.settings.get("billing", {})
            quote_design = billing_settings.get("quote_design", {})
            old_signature_path = quote_design.get("signature_path")
            if old_signature_path and old_signature_path.startswith(f"{current_user.company_id}/"):
                try:
                    delete_from_supabase(old_signature_path)
                except Exception:
                    pass  # Ignorer les erreurs de suppression
        
        # Upload vers Supabase Storage
        storage_path = upload_to_supabase(
            file_path=unique_filename,
            file_content=file_content,
            content_type="image/jpeg",
            company_id=current_user.company_id
        )
        
        if not storage_path:
            use_supabase = False
    
    # Fallback vers stockage local si Supabase n'est pas configuré ou a échoué
    if not use_supabase:
        company_upload_dir = UPLOAD_DIR / str(current_user.company_id)
        company_upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = company_upload_dir / unique_filename
        
        # Supprimer l'ancienne signature s'il existe
        if company_settings:
            billing_settings = company_settings.settings.get("billing", {})
            quote_design = billing_settings.get("quote_design", {})
            old_signature_path = quote_design.get("signature_path")
            if old_signature_path:
                old_file_path = UPLOAD_DIR / old_signature_path
                if old_file_path.exists():
                    try:
                        old_file_path.unlink()
                    except Exception:
                        pass
        
        # Sauvegarder le nouveau fichier
        try:
            with open(file_path, "wb") as f:
                f.write(file_content)
            
            if not file_path.exists():
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="File was not saved correctly to disk"
                )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error saving signature {file_path}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving file: {str(e)}"
            )
        
        storage_path = str(file_path.relative_to(UPLOAD_DIR))
    
    # Mettre à jour quote_design avec le chemin de la signature
    if not company_settings:
        from app.core.defaults import get_default_settings
        company_settings = CompanySettings(
            company_id=current_user.company_id,
            settings=get_default_settings(),
        )
        db.add(company_settings)
        db.flush()
    
    settings_dict = company_settings.settings
    if "billing" not in settings_dict:
        settings_dict["billing"] = {}
    if "quote_design" not in settings_dict["billing"]:
        settings_dict["billing"]["quote_design"] = {}
    
    settings_dict["billing"]["quote_design"]["signature_path"] = storage_path
    
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(company_settings, "settings")
    db.commit()
    
    return {
        "signature_path": storage_path,
        "message": "Signature uploaded successfully"
    }


@router.get("/me/signature")
async def get_company_signature(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user_from_token_or_query)
):
    """
    Récupère la signature de l'entreprise depuis Supabase Storage ou stockage local.
    """
    from app.db.models.company_settings import CompanySettings
    from fastapi.responses import Response
    from app.core.supabase_storage_service import (
        download_file as download_from_supabase,
        is_supabase_storage_configured
    )
    import logging
    
    logger = logging.getLogger(__name__)
    
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    
    if not company_settings:
        raise HTTPException(status_code=404, detail="Company settings not found")
    
    billing_settings = company_settings.settings.get("billing", {})
    quote_design = billing_settings.get("quote_design", {})
    signature_path = quote_design.get("signature_path")
    
    if not signature_path:
        raise HTTPException(status_code=404, detail="Signature not found")
    
    # Essayer d'abord Supabase Storage si configuré et si le chemin ressemble à un chemin Supabase
    use_supabase = is_supabase_storage_configured() and (
        signature_path.startswith(f"{current_user.company_id}/") or 
        "/" in signature_path  # Format Supabase: "company_id/filename"
    )
    
    if use_supabase:
        try:
            file_content = download_from_supabase(signature_path)
            if file_content:
                return Response(
                    content=file_content,
                    media_type="image/jpeg",
                    headers={"Content-Disposition": f'inline; filename="signature.jpg"'}
                )
        except Exception:
            use_supabase = False
    
    # Fallback vers stockage local
    if not use_supabase:
        from fastapi.responses import FileResponse
        
        file_path = UPLOAD_DIR / signature_path
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Signature file not found")
        
        return FileResponse(
            path=str(file_path),
            media_type="image/jpeg",
            filename="signature.jpg"
        )


@router.get("/me/logo")
async def get_company_logo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user_from_token_or_query)
):
    """
    Récupère le logo de l'entreprise depuis Supabase Storage ou stockage local.
    """
    from app.db.models.company_settings import CompanySettings
    from fastapi.responses import Response
    from app.core.supabase_storage_service import (
        download_file as download_from_supabase,
        is_supabase_storage_configured
    )
    import logging
    
    logger = logging.getLogger(__name__)
    
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    
    if not company_settings:
        raise HTTPException(status_code=404, detail="Company settings not found")
    
    company_info = company_settings.settings.get("company_info", {})
    logo_path = company_info.get("logo_path")
    
    if not logo_path:
        raise HTTPException(status_code=404, detail="Logo not found")
    
    # Essayer d'abord Supabase Storage si configuré et si le chemin ressemble à un chemin Supabase
    is_supabase_configured = is_supabase_storage_configured()
    is_supabase_format = logo_path.startswith(f"{current_user.company_id}/") or "/" in logo_path
    
    use_supabase = is_supabase_configured and is_supabase_format
    
    if use_supabase:
        try:
            file_content = download_from_supabase(logo_path)
            if file_content:
                # Déterminer le type MIME selon l'extension
                if logo_path.lower().endswith(".png"):
                    media_type = "image/png"
                elif logo_path.lower().endswith((".jpg", ".jpeg")):
                    media_type = "image/jpeg"
                else:
                    media_type = "image/png"  # Par défaut
                return Response(
                    content=file_content,
                    media_type=media_type,
                    headers={"Content-Disposition": f'inline; filename="{Path(logo_path).name}"'}
                )
            else:
                use_supabase = False
        except Exception:
            use_supabase = False
    
    # Fallback vers stockage local
    if not use_supabase:
        from fastapi.responses import FileResponse
        
        # Normaliser le chemin (enlever les slashes en début si présents)
        logo_path_normalized = logo_path.lstrip('/')
        file_path = UPLOAD_DIR / logo_path_normalized
        
        logger.info(f"Looking for logo locally: UPLOAD_DIR={UPLOAD_DIR}, logo_path={logo_path}, normalized={logo_path_normalized}, full_path={file_path}")
        
        if not file_path.exists():
            # Essayer aussi avec le chemin original (au cas où)
            file_path_alt = UPLOAD_DIR / logo_path
            if file_path_alt.exists():
                file_path = file_path_alt
                logger.info(f"Found logo with alternative path: {file_path_alt}")
            else:
                # Si le fichier n'existe pas, chercher le dernier logo uploadé dans le répertoire de la company
                company_upload_dir = UPLOAD_DIR / str(current_user.company_id)
                if company_upload_dir.exists():
                    # Chercher le dernier fichier logo
                    logo_files = sorted(company_upload_dir.glob("logo_*"), key=lambda p: p.stat().st_mtime, reverse=True)
                    if logo_files:
                        # Utiliser le dernier logo uploadé
                        file_path = logo_files[0]
                        logger.warning(f"Original logo file not found ({logo_path}), using latest logo: {file_path.name}")
                        # Mettre à jour le logo_path dans la base de données
                        company_settings.settings["company_info"]["logo_path"] = str(file_path.relative_to(UPLOAD_DIR))
                        flag_modified(company_settings, "settings")
                        db.commit()
                    else:
                        # Le fichier n'existe pas et aucun logo alternatif trouvé
                        # Nettoyer le logo_path dans la base de données pour éviter des erreurs répétées
                        logger.warning(f"Logo file not found: {file_path}. Cleaning logo_path from database.")
                        if "company_info" in company_settings.settings:
                            company_settings.settings["company_info"].pop("logo_path", None)
                            flag_modified(company_settings, "settings")
                            try:
                                db.commit()
                            except Exception as e:
                                logger.error(f"Error cleaning logo_path from database: {e}")
                                db.rollback()
                        raise HTTPException(status_code=404, detail="Logo file not found")
                else:
                    # Le répertoire n'existe même pas, nettoyer le logo_path
                    logger.warning(f"Company upload directory does not exist: {company_upload_dir}. Cleaning logo_path from database.")
                    if "company_info" in company_settings.settings:
                        company_settings.settings["company_info"].pop("logo_path", None)
                        flag_modified(company_settings, "settings")
                        try:
                            db.commit()
                        except Exception as e:
                            logger.error(f"Error cleaning logo_path from database: {e}")
                            db.rollback()
                    raise HTTPException(status_code=404, detail="Logo file not found")
        
        # Déterminer le type MIME selon l'extension
        if logo_path.lower().endswith(".png"):
            media_type = "image/png"
        elif logo_path.lower().endswith((".jpg", ".jpeg")):
            media_type = "image/jpeg"
        else:
            media_type = "image/png"  # Par défaut
        
        return FileResponse(
            path=str(file_path),
            media_type=media_type
        )


@router.delete("/me/logo", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company_logo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Supprime le logo de l'entreprise depuis Supabase Storage ou stockage local.
    Autorisé uniquement pour owner et super_admin.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Vérification du rôle
    if current_user.role not in ("owner", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Owner or super_admin role required.",
        )
    
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    
    from app.db.models.company_settings import CompanySettings
    from app.core.supabase_storage_service import (
        delete_file as delete_from_supabase,
        is_supabase_storage_configured
    )
    from pathlib import Path
    
    company_settings = db.query(CompanySettings).filter(
        CompanySettings.company_id == current_user.company_id
    ).first()
    
    if not company_settings:
        raise HTTPException(status_code=404, detail="Company settings not found")
    
    company_info = company_settings.settings.get("company_info", {})
    logo_path = company_info.get("logo_path")
    
    if not logo_path:
        # Pas de logo à supprimer, retourner 204 quand même
        return None
    
    # Supprimer le fichier depuis Supabase Storage si configuré
    use_supabase = is_supabase_storage_configured() and (
        logo_path.startswith(f"{current_user.company_id}/") or "/" in logo_path
    )
    
    if use_supabase:
        try:
            delete_from_supabase(logo_path)
        except Exception:
            # Continuer pour supprimer aussi du stockage local si présent
            pass
    
    # Supprimer aussi du stockage local si présent
    try:
        logo_path_normalized = logo_path.lstrip('/')
        file_path = UPLOAD_DIR / logo_path_normalized
        
        if file_path.exists():
            logger.info(f"🗑️  Suppression du logo depuis le stockage local: {file_path}")
            file_path.unlink()
            logger.info(f"✅ Logo supprimé du stockage local: {file_path}")
    except Exception as e:
        logger.warning(f"⚠️  Erreur lors de la suppression du stockage local ({logo_path}): {e}")
    
    # Supprimer le logo_path des settings
    company_info.pop("logo_path", None)
    company_info.pop("logo_crop_position", None)  # Supprimer aussi les paramètres de recadrage
    
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(company_settings, "settings")
    db.commit()
    
    logger.info(f"✅ Logo supprimé avec succès pour company_id={current_user.company_id}")
    return None


@router.get("/{company_id}/usage")
def get_company_usage(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """
    Récupère les statistiques d'utilisation d'une entreprise (admin uniquement).
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Importer les modèles nécessaires
    from app.db.models.task import Task, TaskStatus
    from app.db.models.billing import Invoice
    from app.db.models.client import Client
    from app.db.models.conversation import Conversation, InboxMessage
    from app.db.models.appointment import Appointment
    
    # Date de référence (30 derniers jours)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    # Tâches complétées (30 derniers jours)
    tasks_completed = db.query(Task).filter(
        Task.company_id == company_id,
        Task.status == TaskStatus.TERMINE,
        Task.completed_at >= thirty_days_ago
    ).count()
    
    # Messages envoyés (30 derniers jours) - messages de l'entreprise vers les clients
    messages_sent = db.query(InboxMessage).join(Conversation).filter(
        Conversation.company_id == company_id,
        InboxMessage.is_from_client == False,  # Messages envoyés par l'entreprise (pas reçus)
        InboxMessage.created_at >= thirty_days_ago
    ).count()
    
    # Factures générées (30 derniers jours)
    invoices_generated = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        Invoice.created_at >= thirty_days_ago
    ).count()
    
    # Rendez-vous réservés (30 derniers jours)
    appointments_booked = db.query(Appointment).filter(
        Appointment.company_id == company_id,
        Appointment.created_at >= thirty_days_ago
    ).count()
    
    # Clients gérés (total)
    clients_managed = db.query(Client).filter(
        Client.company_id == company_id
    ).count()
    
    # Dernière activité - chercher la date la plus récente parmi toutes les entités
    last_activity = None
    
    # Vérifier les tâches
    last_task = db.query(func.max(Task.updated_at)).filter(
        Task.company_id == company_id
    ).scalar()
    if last_task and (not last_activity or last_task > last_activity):
        last_activity = last_task
    
    # Vérifier les messages
    last_message = db.query(func.max(InboxMessage.created_at)).join(Conversation).filter(
        Conversation.company_id == company_id
    ).scalar()
    if last_message and (not last_activity or last_message > last_activity):
        last_activity = last_message
    
    # Vérifier les factures
    last_invoice = db.query(func.max(Invoice.updated_at)).filter(
        Invoice.company_id == company_id
    ).scalar()
    if last_invoice and (not last_activity or last_invoice > last_activity):
        last_activity = last_invoice
    
    # Vérifier les rendez-vous
    last_appointment = db.query(func.max(Appointment.updated_at)).filter(
        Appointment.company_id == company_id
    ).scalar()
    if last_appointment and (not last_activity or last_appointment > last_activity):
        last_activity = last_appointment
    
    # Calculer le temps gagné (estimation basée sur les automatisations)
    # Estimation: 5 min par tâche complétée, 2 min par message envoyé, 10 min par facture générée
    estimated_minutes = (tasks_completed * 5) + (messages_sent * 2) + (invoices_generated * 10)
    hours = estimated_minutes // 60
    minutes = estimated_minutes % 60
    
    return {
        "time_saved": {
            "hours": hours,
            "minutes": minutes,
            "description": "Temps gagné grâce à l'automatisation",
        },
        "stats": {
            "tasks_completed": tasks_completed,
            "messages_sent": messages_sent,
            "invoices_generated": invoices_generated,
            "appointments_booked": appointments_booked,
            "clients_managed": clients_managed,
        },
        "last_activity": last_activity.isoformat() if last_activity else None,
    }


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    """
    Supprime une entreprise et tous ses utilisateurs (cascade).
    Réservé aux super_admin.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Supprimer tous les utilisateurs de l'entreprise (cascade manuel)
    users = db.query(User).filter(User.company_id == company_id).all()
    for user in users:
        db.delete(user)
    
    # Supprimer les settings de l'entreprise
    from app.db.models.company_settings import CompanySettings
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    if settings:
        db.delete(settings)
    
    # Supprimer l'entreprise
    db.delete(company)
    db.commit()
    return None


@router.post("/me/onboarding/step1")
def onboarding_step1(
    data: OnboardingStep1Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Sauvegarde l'étape 1 de l'onboarding (découverte)"""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company.discovery_source = data.discovery_source
    db.commit()
    db.refresh(company)
    
    return {"message": "Étape 1 sauvegardée", "discovery_source": company.discovery_source}


@router.post("/me/onboarding/step2")
def onboarding_step2(
    data: OnboardingStep2Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Sauvegarde l'étape 2 de l'onboarding (secteur)"""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company.sector = data.sector
    db.commit()
    db.refresh(company)
    
    return {"message": "Étape 2 sauvegardée", "sector": company.sector}


@router.post("/me/onboarding/step3")
def onboarding_step3(
    data: OnboardingStep3Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Sauvegarde l'étape 3 de l'onboarding (motivation)"""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company.onboarding_motivation = data.motivation
    db.commit()
    db.refresh(company)
    
    return {"message": "Étape 3 sauvegardée", "motivation": company.onboarding_motivation}


@router.post("/me/onboarding/step4")
def onboarding_step4(
    data: OnboardingStep4Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Sauvegarde l'étape 4 de l'onboarding (choix du plan) et finalise l'onboarding"""
    from app.db.models.subscription import Subscription, SubscriptionStatus, SubscriptionPlan
    from datetime import timedelta, timezone
    
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Valider le plan
    if data.plan not in ["starter", "professional"]:
        raise HTTPException(status_code=400, detail="Plan invalide. Doit être 'starter' ou 'professional'")
    
    # Récupérer ou créer l'abonnement
    subscription = db.query(Subscription).filter(Subscription.company_id == company.id).first()
    if not subscription:
        # Créer l'abonnement d'essai
        trial_start = datetime.now(timezone.utc)
        trial_end = trial_start + timedelta(days=14)
        subscription = Subscription(
            company_id=company.id,
            plan=SubscriptionPlan(data.plan),
            status=SubscriptionStatus.TRIALING,
            trial_start=trial_start,
            trial_end=trial_end,
            current_period_start=trial_start,
            current_period_end=trial_end,
            amount=0,  # Gratuit pendant l'essai
            currency="eur"
        )
        db.add(subscription)
    else:
        # Mettre à jour le plan et les dates d'essai
        subscription.plan = SubscriptionPlan(data.plan)
        if not subscription.trial_start:
            trial_start = datetime.now(timezone.utc)
            trial_end = trial_start + timedelta(days=14)
            subscription.trial_start = trial_start
            subscription.trial_end = trial_end
            subscription.current_period_start = trial_start
            subscription.current_period_end = trial_end
        subscription.status = SubscriptionStatus.TRIALING
        subscription.amount = 0  # Gratuit pendant l'essai
    
    # Finaliser l'onboarding
    company.onboarding_completed = True
    db.commit()
    db.refresh(company)
    db.refresh(subscription)
    
    return {
        "message": "Onboarding terminé",
        "plan": subscription.plan.value,
        "trial_end": subscription.trial_end.isoformat() if subscription.trial_end else None
    }


@router.get("/me/onboarding/status")
def get_onboarding_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère le statut de l'onboarding"""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="User has no company")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return {
        "onboarding_completed": company.onboarding_completed,
        "discovery_source": company.discovery_source,
        "sector": company.sector,
        "motivation": company.onboarding_motivation
    }

