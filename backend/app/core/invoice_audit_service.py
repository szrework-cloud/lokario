"""
Service d'audit pour les factures.
Enregistre toutes les modifications apportées aux factures.
"""
import json
from datetime import datetime, timezone
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from fastapi import Request
from app.db.models.invoice_audit import InvoiceAuditLog
from app.db.models.user import User


def get_client_info(request: Optional[Request] = None) -> Dict[str, Optional[str]]:
    """
    Récupère les informations du client (IP, user agent) depuis la requête.
    
    Args:
        request: Requête FastAPI (optionnel)
        
    Returns:
        Dictionnaire avec ip_address et user_agent
    """
    if not request:
        return {"ip_address": None, "user_agent": None}
    
    # Récupérer l'IP (gérer les proxies)
    ip_address = request.client.host if request.client else None
    if request.headers.get("x-forwarded-for"):
        ip_address = request.headers.get("x-forwarded-for").split(",")[0].strip()
    
    # Récupérer le user agent
    user_agent = request.headers.get("user-agent")
    
    return {
        "ip_address": ip_address,
        "user_agent": user_agent[:500] if user_agent else None  # Limiter à 500 caractères
    }


def create_audit_log(
    db: Session,
    invoice_id: int,
    user_id: int,
    action: str,
    field_name: Optional[str] = None,
    old_value: Any = None,
    new_value: Any = None,
    description: Optional[str] = None,
    request: Optional[Request] = None
) -> InvoiceAuditLog:
    """
    Crée un log d'audit pour une facture.
    
    Args:
        db: Session de base de données
        invoice_id: ID de la facture
        user_id: ID de l'utilisateur qui a effectué l'action
        action: Type d'action ('created', 'updated', 'status_changed', 'deleted', 'archived', etc.)
        field_name: Nom du champ modifié (si applicable)
        old_value: Ancienne valeur (sera sérialisée en JSON)
        new_value: Nouvelle valeur (sera sérialisée en JSON)
        description: Description lisible de l'action
        request: Requête FastAPI pour récupérer IP et user agent
        
    Returns:
        Log d'audit créé
    """
    client_info = get_client_info(request)
    
    # Sérialiser les valeurs en JSON
    old_value_json = json.dumps(old_value, default=str) if old_value is not None else None
    new_value_json = json.dumps(new_value, default=str) if new_value is not None else None
    
    log = InvoiceAuditLog(
        invoice_id=invoice_id,
        user_id=user_id,
        action=action,
        field_name=field_name,
        old_value=old_value_json,
        new_value=new_value_json,
        description=description,
        ip_address=client_info["ip_address"],
        user_agent=client_info["user_agent"]
    )
    
    db.add(log)
    db.commit()
    db.refresh(log)
    
    return log


def log_invoice_creation(
    db: Session,
    invoice_id: int,
    user_id: int,
    request: Optional[Request] = None
) -> InvoiceAuditLog:
    """
    Log la création d'une facture.
    
    Args:
        db: Session de base de données
        invoice_id: ID de la facture créée
        user_id: ID de l'utilisateur qui a créé la facture
        request: Requête FastAPI
        
    Returns:
        Log d'audit créé
    """
    return create_audit_log(
        db=db,
        invoice_id=invoice_id,
        user_id=user_id,
        action="created",
        description="Facture créée",
        request=request
    )


def log_invoice_update(
    db: Session,
    invoice_id: int,
    user_id: int,
    changes: Dict[str, tuple],
    request: Optional[Request] = None
) -> list[InvoiceAuditLog]:
    """
    Log les modifications d'une facture.
    Crée un log pour chaque champ modifié.
    
    Args:
        db: Session de base de données
        invoice_id: ID de la facture modifiée
        user_id: ID de l'utilisateur qui a modifié la facture
        changes: Dictionnaire {field_name: (old_value, new_value)}
        request: Requête FastAPI
        
    Returns:
        Liste des logs d'audit créés
    """
    logs = []
    
    for field_name, (old_value, new_value) in changes.items():
        log = create_audit_log(
            db=db,
            invoice_id=invoice_id,
            user_id=user_id,
            action="field_updated",
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            description=f"{field_name} modifié de '{old_value}' à '{new_value}'",
            request=request
        )
        logs.append(log)
    
    return logs


def log_status_change(
    db: Session,
    invoice_id: int,
    user_id: int,
    old_status: str,
    new_status: str,
    request: Optional[Request] = None
) -> InvoiceAuditLog:
    """
    Log le changement de statut d'une facture.
    
    Args:
        db: Session de base de données
        invoice_id: ID de la facture
        user_id: ID de l'utilisateur qui a changé le statut
        old_status: Ancien statut
        new_status: Nouveau statut
        request: Requête FastAPI
        
    Returns:
        Log d'audit créé
    """
    return create_audit_log(
        db=db,
        invoice_id=invoice_id,
        user_id=user_id,
        action="status_changed",
        field_name="status",
        old_value=old_status,
        new_value=new_status,
        description=f"Statut changé de '{old_status}' à '{new_status}'",
        request=request
    )


def log_invoice_deletion(
    db: Session,
    invoice_id: int,
    user_id: int,
    request: Optional[Request] = None
) -> InvoiceAuditLog:
    """
    Log la suppression (soft delete) d'une facture.
    
    Args:
        db: Session de base de données
        invoice_id: ID de la facture supprimée
        user_id: ID de l'utilisateur qui a supprimé la facture
        request: Requête FastAPI
        
    Returns:
        Log d'audit créé
    """
    return create_audit_log(
        db=db,
        invoice_id=invoice_id,
        user_id=user_id,
        action="deleted",
        description="Facture supprimée (soft delete)",
        request=request
    )


def log_invoice_archival(
    db: Session,
    invoice_id: int,
    user_id: int,
    request: Optional[Request] = None
) -> InvoiceAuditLog:
    """
    Log l'archivage d'une facture.
    
    Args:
        db: Session de base de données
        invoice_id: ID de la facture archivée
        user_id: ID de l'utilisateur qui a archivé la facture
        request: Requête FastAPI
        
    Returns:
        Log d'audit créé
    """
    return create_audit_log(
        db=db,
        invoice_id=invoice_id,
        user_id=user_id,
        action="archived",
        description="Facture archivée",
        request=request
    )


def log_credit_note_creation(
    db: Session,
    invoice_id: int,
    credit_note_id: int,
    user_id: int,
    amount: float,
    request: Optional[Request] = None
) -> InvoiceAuditLog:
    """
    Log la création d'un avoir pour une facture.
    
    Args:
        db: Session de base de données
        invoice_id: ID de la facture originale
        credit_note_id: ID de l'avoir créé
        user_id: ID de l'utilisateur qui a créé l'avoir
        amount: Montant de l'avoir
        request: Requête FastAPI
        
    Returns:
        Log d'audit créé
    """
    return create_audit_log(
        db=db,
        invoice_id=invoice_id,
        user_id=user_id,
        action="credit_note_created",
        description=f"Avoir #{credit_note_id} créé pour un montant de {amount} €",
        request=request
    )
