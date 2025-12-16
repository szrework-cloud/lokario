"""
Service d'audit pour logger toutes les actions critiques (création, modification, suppression).
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
import logging
import json

logger = logging.getLogger(__name__)

# Base pour les modèles d'audit (si on veut les stocker en DB)
AuditBase = declarative_base()


class AuditLog(AuditBase):
    """Modèle pour stocker les logs d'audit en base de données (optionnel)"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    company_id = Column(Integer, nullable=True)
    action = Column(String(50), nullable=False)  # create, update, delete, login, etc.
    resource_type = Column(String(100), nullable=False)  # invoice, client, quote, etc.
    resource_id = Column(Integer, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    details = Column(JSON, nullable=True)  # Détails supplémentaires
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


def log_audit_action(
    action: str,
    resource_type: str,
    resource_id: Optional[int] = None,
    user_id: Optional[int] = None,
    company_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    db: Optional[Session] = None
):
    """
    Log une action d'audit.
    
    Args:
        action: Type d'action (create, update, delete, login, etc.)
        resource_type: Type de ressource (invoice, client, quote, user, etc.)
        resource_id: ID de la ressource concernée (optionnel)
        user_id: ID de l'utilisateur qui a effectué l'action
        company_id: ID de l'entreprise
        ip_address: Adresse IP de la requête
        user_agent: User-Agent de la requête
        details: Détails supplémentaires à logger (dict JSON-sérialisable)
        db: Session DB pour sauvegarder en base (optionnel, sinon log seulement)
    """
    log_data = {
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "user_id": user_id,
        "company_id": company_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "details": details,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Logger dans les logs de l'application
    logger.info(f"AUDIT: {action.upper()} {resource_type}", extra=log_data)
    
    # Si une session DB est fournie, sauvegarder en base (optionnel)
    if db:
        try:
            audit_log = AuditLog(
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                user_id=user_id,
                company_id=company_id,
                ip_address=ip_address,
                user_agent=user_agent,
                details=details
            )
            db.add(audit_log)
            db.commit()
        except Exception as e:
            # Ne pas faire échouer la requête si l'audit log échoue
            logger.error(f"Erreur lors de la sauvegarde de l'audit log: {e}")
            db.rollback()


def get_client_info(request) -> tuple[Optional[str], Optional[str]]:
    """
    Extrait l'IP et le User-Agent depuis une requête FastAPI.
    
    Returns:
        (ip_address, user_agent)
    """
    # Récupérer l'IP (prendre en compte les proxies)
    ip_address = request.client.host if request.client else None
    if hasattr(request, 'headers'):
        # Vérifier X-Forwarded-For si derrière un proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip_address = forwarded_for.split(",")[0].strip()
        
        user_agent = request.headers.get("User-Agent")
    else:
        user_agent = None
    
    return ip_address, user_agent
