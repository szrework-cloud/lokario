from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.db.models.notification import Notification, NotificationType
from app.db.models.user import User
from app.api.deps import get_current_active_user
from pydantic import BaseModel

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationRead(BaseModel):
    id: int
    type: str
    title: str
    message: str
    link_url: Optional[str] = None
    link_text: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[int] = None
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[NotificationRead])
def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère les notifications de l'utilisateur"""
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    query = db.query(Notification).filter(
        Notification.company_id == current_user.company_id,
        (Notification.user_id == current_user.id) | (Notification.user_id.is_(None))
    )
    
    if unread_only:
        query = query.filter(Notification.read == False)
    
    notifications = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()
    
    return [NotificationRead.model_validate(n) for n in notifications]


@router.get("/unread-count", response_model=dict)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère le nombre de notifications non lues"""
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    count = db.query(Notification).filter(
        Notification.company_id == current_user.company_id,
        (Notification.user_id == current_user.id) | (Notification.user_id.is_(None)),
        Notification.read == False
    ).count()
    
    return {"count": count}


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Marque une notification comme lue"""
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.company_id == current_user.company_id,
        (Notification.user_id == current_user.id) | (Notification.user_id.is_(None))
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.read = True
    notification.read_at = datetime.now()
    db.commit()
    db.refresh(notification)
    
    return NotificationRead.model_validate(notification)


@router.patch("/mark-all-read", response_model=dict)
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Marque toutes les notifications comme lues"""
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    updated = db.query(Notification).filter(
        Notification.company_id == current_user.company_id,
        (Notification.user_id == current_user.id) | (Notification.user_id.is_(None)),
        Notification.read == False
    ).update({
        Notification.read: True,
        Notification.read_at: datetime.now()
    })
    
    db.commit()
    
    return {"updated": updated}

