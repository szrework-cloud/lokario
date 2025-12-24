"""
Routes API pour l'intégration Stripe
Gestion des abonnements, checkout, webhooks
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
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
    interval: str = "month"  # "month" ou "year" pour mensuel ou annuel
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
    """Récupère les plans d'abonnement disponibles (mensuels et annuels)"""
    plans = []
    
    # Fonction helper pour récupérer le prix depuis Stripe
    def get_price_from_stripe(price_id: str, plan_name: str = "") -> Optional[float]:
        """Récupère le prix depuis Stripe pour vérifier qu'il correspond"""
        if not settings.STRIPE_SECRET_KEY:
            return None
        try:
            price_obj = stripe.Price.retrieve(price_id)
            # Stripe stocke les prix en centimes
            price = price_obj.unit_amount / 100 if price_obj.unit_amount else None
            logger.info(f"[PLANS] Prix récupéré depuis Stripe pour {plan_name} (price_id={price_id}): {price}€")
            return price
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du prix Stripe {price_id}: {e}")
            return None
    
    # Plan Essentiel - Mensuel
    if settings.STRIPE_PRICE_STARTER_MONTHLY:
        logger.info(f"[PLANS] Configuration Essentiel mensuel - Price ID: {settings.STRIPE_PRICE_STARTER_MONTHLY}")
        stripe_price = get_price_from_stripe(settings.STRIPE_PRICE_STARTER_MONTHLY, "Essentiel mensuel")
        # Utiliser le prix depuis Stripe si disponible, sinon le prix par défaut
        price = stripe_price if stripe_price is not None else 19.99
        logger.info(f"[PLANS] Prix final Essentiel mensuel: {price}€")
        
        plans.append({
            "id": "starter_monthly",
            "name": "Essentiel",
            "price": price,
            "currency": "eur",
            "interval": "month",
            "trial_days": 14,
            "features": [
                "Devis & Factures illimités",
                "Relances automatiques",
                "Gestion des clients",
            ],
            "stripe_price_id": settings.STRIPE_PRICE_STARTER_MONTHLY,
        })
    
    # Plan Essentiel - Annuel
    if settings.STRIPE_PRICE_STARTER_YEARLY:
        stripe_price = get_price_from_stripe(settings.STRIPE_PRICE_STARTER_YEARLY)
        # Pour annuel, on calcule le prix mensuel équivalent
        if stripe_price is not None:
            yearly_price = stripe_price
            monthly_equivalent = yearly_price / 12
        else:
            yearly_price = 191.88
            monthly_equivalent = 15.99
        
        plans.append({
            "id": "starter_yearly",
            "name": "Essentiel",
            "price": monthly_equivalent,  # Prix mensuel équivalent
            "currency": "eur",
            "interval": "year",
            "trial_days": 14,
            "features": [
                "Devis & Factures illimités",
                "Relances automatiques",
                "Gestion des clients",
            ],
            "stripe_price_id": settings.STRIPE_PRICE_STARTER_YEARLY,
            "yearly_price": yearly_price,  # Prix total annuel
            "monthly_equivalent": monthly_equivalent,  # Prix mensuel équivalent
        })
    
    # Plan Pro - Mensuel
    if settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY:
        logger.info(f"[PLANS] Configuration Pro mensuel - Price ID: {settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY}")
        stripe_price = get_price_from_stripe(settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY, "Pro mensuel")
        # Utiliser le prix depuis Stripe si disponible, sinon le prix par défaut
        price = stripe_price if stripe_price is not None else 59.99
        logger.info(f"[PLANS] Prix final Pro mensuel: {price}€")
        
        plans.append({
            "id": "professional_monthly",
            "name": "Pro",
            "price": price,
            "currency": "eur",
            "interval": "month",
            "trial_days": 14,
            "features": [
                "Devis & Factures illimités",
                "Relance IA automatique",
                "Import & Export",
                "Gestion des tâches",
                "Boîte de réception centralisée",
                "Calendrier & Rendez-vous",
                "Support prioritaire",
            ],
            "stripe_price_id": settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
        })
    
    # Plan Pro - Annuel
    if settings.STRIPE_PRICE_PROFESSIONAL_YEARLY:
        stripe_price = get_price_from_stripe(settings.STRIPE_PRICE_PROFESSIONAL_YEARLY)
        # Pour annuel, on calcule le prix mensuel équivalent
        if stripe_price is not None:
            yearly_price = stripe_price
            monthly_equivalent = yearly_price / 12
        else:
            yearly_price = 575.88
            monthly_equivalent = 47.99
        
        plans.append({
            "id": "professional_yearly",
            "name": "Pro",
            "price": monthly_equivalent,  # Prix mensuel équivalent
            "currency": "eur",
            "interval": "year",
            "trial_days": 14,
            "features": [
                "Devis & Factures illimités",
                "Relance IA automatique",
                "Import & Export",
                "Gestion des tâches",
                "Boîte de réception centralisée",
                "Calendrier & Rendez-vous",
                "Support prioritaire",
            ],
            "stripe_price_id": settings.STRIPE_PRICE_PROFESSIONAL_YEARLY,
            "yearly_price": yearly_price,  # Prix total annuel
            "monthly_equivalent": monthly_equivalent,  # Prix mensuel équivalent
        })
    
    # Logger tous les plans retournés pour debug
    logger.info(f"[PLANS] {len(plans)} plans retournés:")
    for plan in plans:
        logger.info(f"[PLANS]   - {plan['name']} ({plan['id']}): {plan['price']}€/{plan['interval']} - Price ID: {plan['stripe_price_id']}")
    
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
    
    # Vérifier si l'essai gratuit est expiré (pour les abonnements sans Stripe)
    now = datetime.now(timezone.utc)
    if subscription.status == SubscriptionStatus.TRIALING and not subscription.stripe_subscription_id:
        if subscription.trial_end and subscription.trial_end < now:
            # L'essai est expiré, mettre à jour le statut
            subscription.status = SubscriptionStatus.INCOMPLETE_EXPIRED
            db.commit()
            logger.info(f"Essai gratuit expiré pour l'entreprise {company.id}")
    
    # Récupérer les informations à jour depuis Stripe si disponible
    if subscription.stripe_subscription_id:
        try:
            stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
            # Synchroniser les données
            subscription.status = SubscriptionStatus(stripe_sub.status)
            
            # Convertir les timestamps (les objets Stripe ont des attributs, pas des dict)
            if hasattr(stripe_sub, 'current_period_start') and stripe_sub.current_period_start:
                subscription.current_period_start = datetime.fromtimestamp(stripe_sub.current_period_start, tz=timezone.utc)
            if hasattr(stripe_sub, 'current_period_end') and stripe_sub.current_period_end:
                subscription.current_period_end = datetime.fromtimestamp(stripe_sub.current_period_end, tz=timezone.utc)
            
            if hasattr(stripe_sub, 'trial_start') and stripe_sub.trial_start:
                subscription.trial_start = datetime.fromtimestamp(stripe_sub.trial_start, tz=timezone.utc)
            if hasattr(stripe_sub, 'trial_end') and stripe_sub.trial_end:
                subscription.trial_end = datetime.fromtimestamp(stripe_sub.trial_end, tz=timezone.utc)
            
            # Synchroniser le plan depuis le price_id si nécessaire
            if hasattr(stripe_sub, 'items') and stripe_sub.items and hasattr(stripe_sub.items, 'data') and stripe_sub.items.data:
                price_item = stripe_sub.items.data[0]
                if hasattr(price_item, 'price') and price_item.price and hasattr(price_item.price, 'id'):
                    price_id = price_item.price.id
                    # Si le price_id a changé, mettre à jour le plan
                    if subscription.stripe_price_id != price_id:
                        subscription.stripe_price_id = price_id
                        # Déterminer le plan depuis le price_id
                        if price_id == settings.STRIPE_PRICE_STARTER_MONTHLY or price_id == settings.STRIPE_PRICE_STARTER_YEARLY:
                            subscription.plan = SubscriptionPlan.STARTER
                        elif price_id == settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY or price_id == settings.STRIPE_PRICE_PROFESSIONAL_YEARLY:
                            subscription.plan = SubscriptionPlan.PROFESSIONAL
                        logger.info(f"Plan synchronisé depuis Stripe: {subscription.plan.value}")
            
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
            "trial_start": subscription.trial_start.isoformat() if subscription.trial_start else None,
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


@router.get("/subscription/{company_id}/history")
async def get_company_subscription_history(
    company_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Récupère l'historique des abonnements et factures d'une entreprise (admin uniquement)"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company.id
    ).first()
    
    if not subscription or not subscription.stripe_customer_id:
        return {"history": []}
    
    history = []
    
    try:
        # Récupérer toutes les factures depuis Stripe
        invoices = stripe.Invoice.list(
            customer=subscription.stripe_customer_id,
            limit=100  # Limiter à 100 factures
        )
        
        # Récupérer l'historique des abonnements depuis Stripe
        subscriptions_history = stripe.Subscription.list(
            customer=subscription.stripe_customer_id,
            limit=100
        )
        
        # Mapper les factures
        for invoice in invoices.data:
            if invoice.subscription:
                # Récupérer les détails de l'abonnement associé
                sub = None
                for sub_item in subscriptions_history.data:
                    if sub_item.id == invoice.subscription:
                        sub = sub_item
                        break
                
                # Récupérer le plan depuis les line items
                plan_name = "Starter"
                if invoice.lines and invoice.lines.data:
                    line_item = invoice.lines.data[0]
                    if hasattr(line_item, 'price') and line_item.price:
                        # Essayer de récupérer le nom du plan depuis le price
                        try:
                            price_obj = stripe.Price.retrieve(line_item.price.id)
                            if hasattr(price_obj, 'nickname') and price_obj.nickname:
                                plan_name = price_obj.nickname
                        except:
                            pass
                
                # Déterminer la période
                period_start = datetime.fromtimestamp(invoice.period_start) if invoice.period_start else None
                period_end = datetime.fromtimestamp(invoice.period_end) if invoice.period_end else None
                
                # Formater la période
                period_str = "N/A"
                if period_start and period_end:
                    period_str = f"{period_start.strftime('%d/%m/%Y')} - {period_end.strftime('%d/%m/%Y')}"
                elif period_start:
                    period_str = f"{period_start.strftime('%d/%m/%Y')} - Actuel"
                
                # Statut
                status_map = {
                    "paid": "Payé",
                    "open": "Ouvert",
                    "void": "Annulé",
                    "uncollectible": "Impayable",
                    "draft": "Brouillon",
                }
                status = status_map.get(invoice.status, invoice.status)
                
                history.append({
                    "id": invoice.id,
                    "plan": plan_name,
                    "period": period_str,
                    "period_start": period_start.isoformat() if period_start else None,
                    "period_end": period_end.isoformat() if period_end else None,
                    "amount": invoice.amount_paid / 100 if invoice.amount_paid else 0,  # Stripe utilise les centimes
                    "currency": invoice.currency.upper(),
                    "status": status,
                    "invoice_number": invoice.number or invoice.id,
                    "invoice_date": datetime.fromtimestamp(invoice.created).isoformat() if invoice.created else None,
                    "invoice_pdf_url": invoice.invoice_pdf,
                })
        
        # Trier par date de facture (plus récent en premier)
        history.sort(key=lambda x: x["invoice_date"] or "", reverse=True)
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'historique Stripe: {e}")
        # En cas d'erreur, retourner les factures de la base de données
        db_invoices = db.query(SubscriptionInvoice).filter(
            SubscriptionInvoice.subscription_id == subscription.id
        ).order_by(SubscriptionInvoice.invoice_date.desc()).limit(100).all()
        
        for invoice in db_invoices:
            history.append({
                "id": invoice.stripe_invoice_id,
                "plan": subscription.plan.value,
                "period": invoice.invoice_date.strftime('%d/%m/%Y') if invoice.invoice_date else "N/A",
                "period_start": None,
                "period_end": None,
                "amount": float(invoice.amount),
                "currency": invoice.currency.upper(),
                "status": invoice.status,
                "invoice_number": invoice.invoice_number or invoice.stripe_invoice_id,
                "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
                "invoice_pdf_url": invoice.invoice_pdf_url,
            })
    
    return {"history": history}


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
    
    # Valider l'intervalle
    if request.interval not in ["month", "year"]:
        raise HTTPException(status_code=400, detail="Interval doit être 'month' ou 'year'")
    
    # Mapper le plan et l'intervalle à son price ID Stripe
    plan_to_price = {
        (SubscriptionPlan.STARTER, "month"): settings.STRIPE_PRICE_STARTER_MONTHLY,
        (SubscriptionPlan.STARTER, "year"): settings.STRIPE_PRICE_STARTER_YEARLY,
        (SubscriptionPlan.PROFESSIONAL, "month"): settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
        (SubscriptionPlan.PROFESSIONAL, "year"): settings.STRIPE_PRICE_PROFESSIONAL_YEARLY,
    }
    
    price_id = plan_to_price.get((request.plan, request.interval))
    if not price_id:
        raise HTTPException(
            status_code=400, 
            detail=f"Plan {request.plan.value} ({request.interval}) non configuré (price ID manquant). Vérifiez vos variables d'environnement Stripe."
        )
    
    try:
        # Récupérer l'abonnement existant (peut être un essai gratuit)
        subscription = db.query(Subscription).filter(
            Subscription.company_id == company.id
        ).first()
        
        if not subscription:
            raise HTTPException(
                status_code=404,
                detail="Aucun abonnement trouvé pour cette entreprise"
            )
        
        # Créer ou récupérer le customer Stripe
        customer_id = None
        if subscription.stripe_customer_id:
            customer_id = subscription.stripe_customer_id
        else:
            # Créer un nouveau customer Stripe
            customer = stripe.Customer.create(
                email=current_user.email,
                name=company.name,
                metadata={
                    "company_id": str(company.id),
                    "user_id": str(current_user.id),
                }
            )
            customer_id = customer.id
            subscription.stripe_customer_id = customer_id
            db.commit()
        
        # Mettre à jour le plan de l'abonnement
        subscription.plan = request.plan
        
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
                },
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
            event = json.loads(payload.decode('utf-8'))
            logger.warning("Webhook traité sans vérification de signature (développement uniquement)")
        except Exception as e:
            logger.error(f"Erreur de parsing du payload: {e}")
            raise HTTPException(status_code=400, detail="Payload invalide")
    
    # Logger l'événement (ou récupérer l'existant si déjà traité - idempotence)
    event_id = event.get("id") or f"dev_{int(time.time())}"
    event_type = event.get("type") or "unknown"
    event_data_obj = event.get("data", {}).get("object", event)
    
    # Vérifier si l'événement existe déjà (Stripe peut renvoyer le même événement plusieurs fois)
    event_record = db.query(SubscriptionEvent).filter(
        SubscriptionEvent.stripe_event_id == event_id
    ).first()
    
    if event_record:
        # L'événement existe déjà
        if event_record.processed:
            logger.info(f"Événement {event_id} déjà traité - ignoré (idempotence)")
            return {"status": "success", "message": "Event already processed"}
        else:
            logger.info(f"Événement {event_id} existe mais pas encore traité - nouvelle tentative")
    else:
        # Créer un nouvel enregistrement d'événement
        event_record = SubscriptionEvent(
            stripe_event_id=event_id,
            event_type=event_type,
            event_data=json.dumps(event_data_obj),
        )
        db.add(event_record)
        db.flush()  # Pour obtenir l'ID sans commit
    
    try:
        # Traiter l'événement
        logger.info(f"Traitement de l'événement Stripe: {event['type']}")
        if event["type"] == "checkout.session.completed":
            await handle_checkout_session_completed(event, db)
        elif event["type"] == "customer.subscription.created":
            await handle_subscription_created(event, db)
        elif event["type"] == "customer.subscription.updated":
            await handle_subscription_updated(event, db)
        elif event["type"] == "customer.subscription.deleted":
            await handle_subscription_deleted(event, db)
        elif event["type"] == "invoice.paid":
            await handle_invoice_paid(event, db)
        elif event["type"] == "invoice.payment_failed":
            await handle_invoice_payment_failed(event, db)
        else:
            logger.info(f"Événement Stripe non traité: {event['type']}")
        
        event_record.processed = True
        event_record.processed_at = datetime.now(timezone.utc)
        db.commit()
        
    except Exception as e:
        event_id = event.get("id", "unknown")
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"Erreur lors du traitement de l'événement {event_id}: {e}")
        logger.error(f"Traceback complet:\n{error_traceback}")
        event_record.error_message = str(e)
        db.commit()
        # Retourner l'erreur avec plus de détails (mais ne pas exposer le traceback complet en production)
        error_detail = str(e) if settings.ENVIRONMENT.lower() in ["development", "dev", "staging"] else "Erreur lors du traitement"
        raise HTTPException(status_code=500, detail=error_detail)
    
    return {"status": "success"}


# ==================== HANDLERS WEBHOOK ====================

async def handle_checkout_session_completed(event, db: Session):
    """Gère la complétion d'une session de checkout Stripe"""
    logger.info("Traitement de checkout.session.completed")
    
    # Gérer le format Stripe webhook
    if isinstance(event, dict) and "data" in event:
        checkout_session_data = event["data"]["object"]
    else:
        checkout_session_data = event
    
    # Vérifier si c'est un webhook de test (livemode = False)
    livemode = checkout_session_data.get("livemode", True)
    logger.info(f"Mode webhook: {'live' if livemode else 'test'}")
    
    # Récupérer l'ID de la subscription depuis la session de checkout
    subscription_id = checkout_session_data.get("subscription")
    if not subscription_id:
        logger.warning("Aucun subscription_id dans checkout.session.completed")
        logger.warning(f"Données de la session: {checkout_session_data}")
        # Pour les tests webhooks, c'est OK de ne pas avoir de subscription_id
        logger.info("Webhook de test sans subscription_id - ignoré")
        return
    
    # Récupérer les métadonnées
    metadata = checkout_session_data.get("metadata", {}) or {}
    company_id = metadata.get("company_id")
    
    if not company_id:
        logger.warning("Aucun company_id dans les métadonnées du checkout")
        logger.warning(f"Métadonnées disponibles: {metadata}")
        logger.warning(f"Données de la session (clés): {list(checkout_session_data.keys())}")
        # Pour les tests webhooks, c'est OK de ne pas avoir de company_id
        logger.info("Webhook de test sans company_id - ignoré (normal pour un test)")
        return
    
    company_id = int(company_id)
    
    # Récupérer l'abonnement depuis Stripe pour avoir toutes les infos
    try:
        stripe_subscription = stripe.Subscription.retrieve(subscription_id)
        logger.info(f"Abonnement Stripe récupéré: {subscription_id} pour company_id: {company_id}")
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'abonnement Stripe: {e}")
        return
    
    # Récupérer ou créer l'abonnement en base
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id
    ).first()
    
    if not subscription:
        logger.error(f"Aucun abonnement trouvé en base pour company_id: {company_id}")
        raise ValueError(f"Aucun abonnement trouvé en base pour company_id: {company_id}")
    
    # Mettre à jour l'abonnement avec les infos Stripe
    subscription.stripe_subscription_id = stripe_subscription.id
    subscription.status = SubscriptionStatus(stripe_subscription.status)
    # Convertir les timestamps (les objets Stripe ont des attributs, pas des dict)
    if hasattr(stripe_subscription, 'current_period_start') and stripe_subscription.current_period_start:
        subscription.current_period_start = datetime.fromtimestamp(stripe_subscription.current_period_start, tz=timezone.utc)
    if hasattr(stripe_subscription, 'current_period_end') and stripe_subscription.current_period_end:
        subscription.current_period_end = datetime.fromtimestamp(stripe_subscription.current_period_end, tz=timezone.utc)
    
    if hasattr(stripe_subscription, 'trial_start') and stripe_subscription.trial_start:
        subscription.trial_start = datetime.fromtimestamp(stripe_subscription.trial_start, tz=timezone.utc)
    if hasattr(stripe_subscription, 'trial_end') and stripe_subscription.trial_end:
        subscription.trial_end = datetime.fromtimestamp(stripe_subscription.trial_end, tz=timezone.utc)
    
    # Mettre à jour le customer_id si nécessaire
    if stripe_subscription.customer:
        subscription.stripe_customer_id = stripe_subscription.customer
    
    # Mettre à jour le plan et le montant depuis les items
    if hasattr(stripe_subscription, 'items') and stripe_subscription.items and hasattr(stripe_subscription.items, 'data') and stripe_subscription.items.data:
        price_item = stripe_subscription.items.data[0]
        if hasattr(price_item, 'price') and price_item.price and hasattr(price_item.price, 'id'):
            price_id = price_item.price.id
            subscription.stripe_price_id = price_id
            logger.info(f"[CHECKOUT] Price ID récupéré depuis Stripe: {price_id}")
            
            # Récupérer le montant depuis le price
            try:
                price_obj = stripe.Price.retrieve(price_id)
                subscription.amount = price_obj.unit_amount / 100 if price_obj.unit_amount else 0
                logger.info(f"[CHECKOUT] Montant récupéré: {subscription.amount}€")
            except Exception as e:
                logger.error(f"Erreur lors de la récupération du prix: {e}")
    
    # Déterminer le plan depuis les métadonnées OU depuis le price_id
    plan_updated = False
    if metadata.get("plan"):
        try:
            subscription.plan = SubscriptionPlan(metadata["plan"])
            plan_updated = True
            logger.info(f"[CHECKOUT] Plan mis à jour depuis métadonnées: {metadata.get('plan')}")
        except ValueError:
            logger.warning(f"[CHECKOUT] Plan invalide dans les métadonnées: {metadata.get('plan')}")
    
    # Si le plan n'a pas été mis à jour depuis les métadonnées, essayer de le déterminer depuis le price_id
    if not plan_updated and subscription.stripe_price_id:
        try:
            logger.info(f"[CHECKOUT] Détermination du plan depuis price_id: {subscription.stripe_price_id}")
            logger.info(f"[CHECKOUT] Price IDs configurés - STARTER_MONTHLY: {settings.STRIPE_PRICE_STARTER_MONTHLY}, STARTER_YEARLY: {settings.STRIPE_PRICE_STARTER_YEARLY}")
            logger.info(f"[CHECKOUT] Price IDs configurés - PROFESSIONAL_MONTHLY: {settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY}, PROFESSIONAL_YEARLY: {settings.STRIPE_PRICE_PROFESSIONAL_YEARLY}")
            
            # Comparer avec les price IDs configurés
            if subscription.stripe_price_id == settings.STRIPE_PRICE_STARTER_MONTHLY or subscription.stripe_price_id == settings.STRIPE_PRICE_STARTER_YEARLY:
                subscription.plan = SubscriptionPlan.STARTER
                plan_updated = True
                logger.info(f"[CHECKOUT] ✅ Plan déterminé depuis price_id: STARTER (Essentiel)")
            elif subscription.stripe_price_id == settings.STRIPE_PRICE_PROFESSIONAL_MONTHLY or subscription.stripe_price_id == settings.STRIPE_PRICE_PROFESSIONAL_YEARLY:
                subscription.plan = SubscriptionPlan.PROFESSIONAL
                plan_updated = True
                logger.info(f"[CHECKOUT] ✅ Plan déterminé depuis price_id: PROFESSIONAL (Pro)")
            else:
                logger.warning(f"[CHECKOUT] ⚠️ Price ID {subscription.stripe_price_id} ne correspond à aucun plan configuré")
        except Exception as e:
            logger.error(f"[CHECKOUT] Erreur lors de la détermination du plan depuis price_id: {e}")
    
    if not plan_updated:
        logger.warning(f"[CHECKOUT] ⚠️ Le plan n'a pas pu être déterminé pour l'abonnement {subscription.id}")
    
    # S'assurer que le statut est bien "active" si l'abonnement Stripe est actif
    # Un abonnement payé doit être actif (même si Stripe dit "trialing", on le marque comme actif après paiement)
    if stripe_subscription.status == "active":
        subscription.status = SubscriptionStatus.ACTIVE
    elif stripe_subscription.status == "trialing":
        # Si on vient de payer, on passe à actif, sinon on garde trialing
        subscription.status = SubscriptionStatus.ACTIVE
    
    db.commit()
    logger.info(f"Abonnement mis à jour avec succès pour company_id: {company_id}, status: {subscription.status.value}")

async def handle_subscription_created(event, db: Session):
    """Gère la création d'un abonnement Stripe (après paiement)"""
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
        # Mettre à jour l'abonnement existant (qui était en essai gratuit) avec les infos Stripe
        subscription.stripe_subscription_id = subscription_data["id"]
        subscription.status = SubscriptionStatus(subscription_data["status"])
        
        # Convertir les timestamps en datetime (gérer les cas où ils peuvent être None ou int)
        if subscription_data.get("current_period_start"):
            if isinstance(subscription_data["current_period_start"], (int, float)):
                subscription.current_period_start = datetime.fromtimestamp(subscription_data["current_period_start"], tz=timezone.utc)
            else:
                logger.warning(f"current_period_start n'est pas un timestamp: {subscription_data.get('current_period_start')}")
        
        if subscription_data.get("current_period_end"):
            if isinstance(subscription_data["current_period_end"], (int, float)):
                subscription.current_period_end = datetime.fromtimestamp(subscription_data["current_period_end"], tz=timezone.utc)
            else:
                logger.warning(f"current_period_end n'est pas un timestamp: {subscription_data.get('current_period_end')}")
        
        if subscription_data.get("trial_start"):
            if isinstance(subscription_data["trial_start"], (int, float)):
                subscription.trial_start = datetime.fromtimestamp(subscription_data["trial_start"], tz=timezone.utc)
        
        if subscription_data.get("trial_end"):
            if isinstance(subscription_data["trial_end"], (int, float)):
                subscription.trial_end = datetime.fromtimestamp(subscription_data["trial_end"], tz=timezone.utc)
        # Mettre à jour le montant depuis les items de l'abonnement
        if subscription_data.get("items") and subscription_data["items"].get("data"):
            price_item = subscription_data["items"]["data"][0]
            if price_item.get("price") and price_item["price"].get("id"):
                subscription.stripe_price_id = price_item["price"]["id"]
                # Récupérer le montant depuis le price
                try:
                    price_obj = stripe.Price.retrieve(price_item["price"]["id"])
                    subscription.amount = price_obj.unit_amount / 100 if price_obj.unit_amount else 0
                except Exception as e:
                    logger.error(f"Erreur lors de la récupération du prix: {e}")
        db.commit()
        logger.info(f"Abonnement Stripe créé et lié pour l'entreprise {company_id}")


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
        # Convertir les timestamps en datetime avec vérification
        if subscription_data.get("current_period_start"):
            if isinstance(subscription_data["current_period_start"], (int, float)):
                subscription.current_period_start = datetime.fromtimestamp(subscription_data["current_period_start"], tz=timezone.utc)
        
        if subscription_data.get("current_period_end"):
            if isinstance(subscription_data["current_period_end"], (int, float)):
                subscription.current_period_end = datetime.fromtimestamp(subscription_data["current_period_end"], tz=timezone.utc)
        
        if subscription_data.get("canceled_at"):
            if isinstance(subscription_data["canceled_at"], (int, float)):
                subscription.canceled_at = datetime.fromtimestamp(subscription_data["canceled_at"], tz=timezone.utc)
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



