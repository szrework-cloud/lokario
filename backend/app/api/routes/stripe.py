"""
Routes API pour l'intégration Stripe
Gestion des abonnements, checkout, webhooks
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import stripe
import json
import logging
import time

from app.api.deps import get_db, get_current_user, get_current_super_admin
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.subscription import (
    Subscription,
    SubscriptionStatus,
    SubscriptionPlan,
    SubscriptionInvoice,
    SubscriptionPaymentMethod,
    SubscriptionEvent,
)
from app.core.config import settings
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stripe", tags=["stripe"])

# Initialiser Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY


# ==================== SCHEMAS ====================

class CreateCheckoutSessionRequest(BaseModel):
    plan: SubscriptionPlan
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class UpdateSubscriptionRequest(BaseModel):
    plan: Optional[SubscriptionPlan] = None
    cancel_at_period_end: Optional[bool] = None


class CreatePortalSessionRequest(BaseModel):
    return_url: str


# ==================== ROUTES ====================

@router.get("/plans")
async def get_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère les plans d'abonnement disponibles"""
    plans = [
        {
            "id": "starter",
            "name": "Offre de démarrage",
            "price": 59.99,
            "currency": "eur",
            "interval": "month",
            "features": [
                "Gestion complète de votre activité",
                "Clients et factures illimités",
                "Tous les modules inclus",
                "Inbox automatisé",
                "Gestion des tâches et projets",
                "Relances automatiques",
                "Support par email",
            ],
            "stripe_price_id": settings.STRIPE_PRICE_STARTER,
        },
    ]
    return {"plans": plans}


@router.get("/subscription")
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère l'abonnement actuel de l'entreprise"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company.id
    ).first()
    
    if not subscription:
        return {
            "has_subscription": False,
            "subscription": None
        }
    
    # Récupérer les informations à jour depuis Stripe si disponible
    if subscription.stripe_subscription_id:
        try:
            stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
            # Synchroniser les données
            subscription.status = SubscriptionStatus(stripe_sub.status)
            subscription.current_period_start = datetime.fromtimestamp(stripe_sub.current_period_start)
            subscription.current_period_end = datetime.fromtimestamp(stripe_sub.current_period_end)
            db.commit()
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de l'abonnement Stripe: {e}")
    
    return {
        "has_subscription": True,
        "subscription": {
            "id": subscription.id,
            "plan": subscription.plan.value,
            "status": subscription.status.value,
            "amount": float(subscription.amount),
            "currency": subscription.currency,
            "current_period_start": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
            "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
            "trial_end": subscription.trial_end.isoformat() if subscription.trial_end else None,
        }
    }


@router.get("/subscription/{company_id}")
async def get_company_subscription(
    company_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Récupère l'abonnement d'une entreprise spécifique (admin uniquement)"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company.id
    ).first()
    
    if not subscription:
        return {
            "has_subscription": False,
            "subscription": None
        }
    
    # Récupérer les informations à jour depuis Stripe si disponible
    if subscription.stripe_subscription_id:
        try:
            stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
            # Synchroniser les données
            subscription.status = SubscriptionStatus(stripe_sub.status)
            subscription.current_period_start = datetime.fromtimestamp(stripe_sub.current_period_start)
            subscription.current_period_end = datetime.fromtimestamp(stripe_sub.current_period_end)
            db.commit()
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de l'abonnement Stripe: {e}")
    
    return {
        "has_subscription": True,
        "subscription": {
            "id": subscription.id,
            "plan": subscription.plan.value,
            "status": subscription.status.value,
            "amount": float(subscription.amount),
            "currency": subscription.currency,
            "current_period_start": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
            "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
            "trial_end": subscription.trial_end.isoformat() if subscription.trial_end else None,
        }
    }


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crée une session de checkout Stripe"""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe n'est pas configuré")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Pour l'instant, un seul plan disponible
    price_id = settings.STRIPE_PRICE_STARTER
    if not price_id:
        raise HTTPException(status_code=400, detail="Plan non configuré")
    
    try:
        # Créer ou récupérer le customer Stripe
        subscription = db.query(Subscription).filter(
            Subscription.company_id == company.id
        ).first()
        
        customer_id = None
        if subscription and subscription.stripe_customer_id:
            customer_id = subscription.stripe_customer_id
        else:
            # Créer un nouveau customer
            customer = stripe.Customer.create(
                email=current_user.email,
                name=company.name,
                metadata={
                    "company_id": str(company.id),
                    "user_id": str(current_user.id),
                }
            )
            customer_id = customer.id
            
            # Créer ou mettre à jour l'abonnement en base
            if not subscription:
                subscription = Subscription(
                    company_id=company.id,
                    stripe_customer_id=customer_id,
                    plan=request.plan,
                    status=SubscriptionStatus.INCOMPLETE,
                )
                db.add(subscription)
            else:
                subscription.stripe_customer_id = customer_id
            db.commit()
        
        # Créer la session de checkout
        success_url = request.success_url or f"{settings.FRONTEND_URL}/app/settings?success=true"
        cancel_url = request.cancel_url or f"{settings.FRONTEND_URL}/app/settings?canceled=true"
        
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "company_id": str(company.id),
                "plan": request.plan.value,
            },
            subscription_data={
                "metadata": {
                    "company_id": str(company.id),
                    "plan": request.plan.value,
                }
            },
        )
        
        return {
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id,
        }
    
    except stripe.error.StripeError as e:
        logger.error(f"Erreur Stripe: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur Stripe: {str(e)}")
    except Exception as e:
        logger.error(f"Erreur lors de la création de la session: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la création de la session")


@router.post("/create-portal-session")
async def create_portal_session(
    request: CreatePortalSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crée une session pour le portail client Stripe"""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe n'est pas configuré")
    
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company.id
    ).first()
    
    if not subscription or not subscription.stripe_customer_id:
        raise HTTPException(status_code=404, detail="Aucun abonnement trouvé")
    
    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=request.return_url,
        )
        
        return {
            "portal_url": portal_session.url,
        }
    
    except stripe.error.StripeError as e:
        logger.error(f"Erreur Stripe: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur Stripe: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: str = Header(None, alias="stripe-signature")
):
    """Endpoint pour recevoir les webhooks Stripe"""
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.warning("Webhook secret non configuré - Les webhooks ne seront pas vérifiés")
        # En développement, on peut accepter les webhooks sans vérification
        # En production, il faut absolument configurer le secret
        if settings.ENVIRONMENT.lower() in ["production", "prod"]:
            raise HTTPException(status_code=500, detail="Webhook secret non configuré")
    
    payload = await request.body()
    
    # Vérifier la signature si le secret est configuré
    if settings.STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error(f"Erreur de parsing du payload: {e}")
            raise HTTPException(status_code=400, detail="Payload invalide")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Erreur de signature: {e}")
            raise HTTPException(status_code=400, detail="Signature invalide")
    else:
        # En développement sans secret, parser directement le JSON
        # ⚠️ ATTENTION : Ne pas utiliser en production !
        try:
            import json
            event = json.loads(payload.decode('utf-8'))
            logger.warning("Webhook traité sans vérification de signature (développement uniquement)")
        except Exception as e:
            logger.error(f"Erreur de parsing du payload: {e}")
            raise HTTPException(status_code=400, detail="Payload invalide")
    
    # Logger l'événement
    event_id = event.get("id") or f"dev_{int(time.time())}"
    event_type = event.get("type") or "unknown"
    event_data_obj = event.get("data", {}).get("object", event)
    
    event_record = SubscriptionEvent(
        stripe_event_id=event_id,
        event_type=event_type,
        event_data=json.dumps(event_data_obj),
    )
    db.add(event_record)
    
    try:
        # Traiter l'événement
        if event["type"] == "customer.subscription.created":
            await handle_subscription_created(event, db)
        elif event["type"] == "customer.subscription.updated":
            await handle_subscription_updated(event, db)
        elif event["type"] == "customer.subscription.deleted":
            await handle_subscription_deleted(event, db)
        elif event["type"] == "invoice.paid":
            await handle_invoice_paid(event, db)
        elif event["type"] == "invoice.payment_failed":
            await handle_invoice_payment_failed(event, db)
        
        event_record.processed = True
        db.commit()
        
    except Exception as e:
        event_id = event.get("id", "unknown")
        logger.error(f"Erreur lors du traitement de l'événement {event_id}: {e}")
        event_record.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail="Erreur lors du traitement")
    
    return {"status": "success"}


# ==================== HANDLERS WEBHOOK ====================

async def handle_subscription_created(event, db: Session):
    """Gère la création d'un abonnement"""
    # Gérer le format Stripe webhook ou format direct
    if isinstance(event, dict) and "data" in event:
        subscription_data = event["data"]["object"]
    else:
        subscription_data = event
    
    metadata = subscription_data.get("metadata", {})
    company_id = metadata.get("company_id")
    if company_id:
        company_id = int(company_id)
    else:
        logger.warning("Pas de company_id dans les métadonnées de l'abonnement")
        return
    
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id
    ).first()
    
    if subscription:
        subscription.stripe_subscription_id = subscription_data["id"]
        subscription.status = SubscriptionStatus(subscription_data["status"])
        subscription.current_period_start = datetime.fromtimestamp(subscription_data["current_period_start"])
        subscription.current_period_end = datetime.fromtimestamp(subscription_data["current_period_end"])
        if subscription_data.get("trial_end"):
            subscription.trial_end = datetime.fromtimestamp(subscription_data["trial_end"])
        db.commit()


async def handle_subscription_updated(event, db: Session):
    """Gère la mise à jour d'un abonnement"""
    # Gérer le format Stripe webhook ou format direct
    if isinstance(event, dict) and "data" in event:
        subscription_data = event["data"]["object"]
    else:
        subscription_data = event
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_data["id"]
    ).first()
    
    if subscription:
        subscription.status = SubscriptionStatus(subscription_data["status"])
        subscription.current_period_start = datetime.fromtimestamp(subscription_data["current_period_start"])
        subscription.current_period_end = datetime.fromtimestamp(subscription_data["current_period_end"])
        if subscription_data.get("canceled_at"):
            subscription.canceled_at = datetime.fromtimestamp(subscription_data["canceled_at"])
        db.commit()


async def handle_subscription_deleted(event, db: Session):
    """Gère la suppression d'un abonnement"""
    # Gérer le format Stripe webhook ou format direct
    if isinstance(event, dict) and "data" in event:
        subscription_data = event["data"]["object"]
    else:
        subscription_data = event
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_data["id"]
    ).first()
    
    if subscription:
        subscription.status = SubscriptionStatus.CANCELED
        subscription.canceled_at = datetime.fromtimestamp(subscription_data.get("canceled_at", subscription_data.get("ended_at", time.time())))
        db.commit()


async def handle_invoice_paid(event, db: Session):
    """Gère le paiement d'une facture"""
    # Gérer le format Stripe webhook ou format direct
    if isinstance(event, dict) and "data" in event:
        invoice_data = event["data"]["object"]
    else:
        invoice_data = event
    
    # Créer ou mettre à jour la facture en base
    invoice = db.query(SubscriptionInvoice).filter(
        SubscriptionInvoice.stripe_invoice_id == invoice_data["id"]
    ).first()
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == invoice_data.get("subscription")
    ).first()
    
    if subscription and not invoice:
        invoice = SubscriptionInvoice(
            subscription_id=subscription.id,
            stripe_invoice_id=invoice_data["id"],
            invoice_number=invoice_data.get("number"),
            amount=invoice_data["amount_paid"] / 100,  # Stripe utilise les centimes
            currency=invoice_data["currency"],
            status=invoice_data["status"],
            invoice_date=datetime.fromtimestamp(invoice_data["created"]),
            paid_at=datetime.fromtimestamp(invoice_data.get("status_transitions", {}).get("paid_at", invoice_data["created"])),
            invoice_pdf_url=invoice_data.get("invoice_pdf"),
        )
        db.add(invoice)
        db.commit()


async def handle_invoice_payment_failed(event, db: Session):
    """Gère l'échec de paiement d'une facture"""
    # Gérer le format Stripe webhook ou format direct
    if isinstance(event, dict) and "data" in event:
        invoice_data = event["data"]["object"]
    else:
        invoice_data = event
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == invoice_data.get("subscription")
    ).first()
    
    if subscription:
        subscription.status = SubscriptionStatus.PAST_DUE
        db.commit()



