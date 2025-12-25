"""
Service pour gérer les limites d'utilisation selon le plan d'abonnement
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models.subscription import Subscription, SubscriptionPlan, SubscriptionStatus
from app.db.models.billing import Quote, Invoice
from app.db.models.client import Client
from app.db.models.followup import FollowUpHistory
from datetime import datetime, timezone
from typing import Optional, Dict, Any


# Définition des limites par plan
PLAN_LIMITS = {
    SubscriptionPlan.STARTER: {
        "quotes_per_month": 20,  # Maximum 20 devis par mois
        "invoices_per_month": 20,  # Maximum 20 factures par mois
        "clients": 50,  # Maximum 50 clients
        "followups_per_month": 20,  # Maximum 20 relances automatiques par mois
        "features": {
            "auto_followups": True,  # Les relances automatiques sont autorisées (limitées)
            "appointments": False,  # Module rendez-vous désactivé pour Essentiel
            "inbox": False,  # Inbox masqué mais logique d'envoi conservée
            "projects": True,  # Projets autorisés
            "pdf_export": True,  # Export PDF autorisé
            "excel_export": False,  # Export Excel uniquement pour Pro
            "custom_branding": False,  # Branding personnalisé uniquement pour Pro
            "api_access": False,  # Accès API uniquement pour Pro
            "advanced_reports": False,  # Rapports avancés uniquement pour Pro
        }
    },
    SubscriptionPlan.PROFESSIONAL: {
        "quotes_per_month": -1,  # Illimité (-1 = illimité)
        "invoices_per_month": -1,  # Illimité
        "clients": -1,  # Illimité
        "followups_per_month": -1,  # Illimité
        "features": {
            "auto_followups": True,
            "appointments": True,  # Module rendez-vous activé
            "inbox": True,  # Inbox visible et actif
            "projects": True,
            "pdf_export": True,
            "excel_export": True,
            "custom_branding": True,
            "api_access": True,
            "advanced_reports": True,
        }
    },
    SubscriptionPlan.ENTERPRISE: {
        "quotes_per_month": -1,
        "invoices_per_month": -1,
        "clients": -1,
        "followups_per_month": -1,
        "features": {
            "auto_followups": True,
            "appointments": True,
            "inbox": True,
            "projects": True,
            "pdf_export": True,
            "excel_export": True,
            "custom_branding": True,
            "api_access": True,
            "advanced_reports": True,
        }
    },
}


def get_subscription_plan(db: Session, company_id: int) -> Optional[SubscriptionPlan]:
    """
    Récupère le plan d'abonnement d'une entreprise
    """
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id
    ).first()
    
    if not subscription:
        return SubscriptionPlan.STARTER  # Plan par défaut (trial)
    
    return subscription.plan


def get_plan_limits(plan: SubscriptionPlan) -> Dict[str, Any]:
    """
    Récupère les limites pour un plan donné
    """
    return PLAN_LIMITS.get(plan, PLAN_LIMITS[SubscriptionPlan.STARTER])


def check_quotes_limit(db: Session, company_id: int) -> tuple[bool, Optional[str]]:
    """
    Vérifie si l'entreprise peut créer un nouveau devis selon son plan
    
    Returns:
        (is_allowed, error_message)
    """
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id
    ).first()
    
    # Si c'est un essai gratuit (trialing avec amount = 0)
    if subscription and subscription.status == SubscriptionStatus.TRIALING and subscription.amount == 0:
        # Pendant l'essai, appliquer les restrictions selon le plan choisi
        # Si plan Pro, accès complet. Si plan Essentiel, appliquer les limites.
        if subscription.plan == SubscriptionPlan.PROFESSIONAL:
            return True, None  # Accès complet pour Pro pendant l'essai
        # Sinon, continuer avec les limites du plan Essentiel (voir plus bas)
    
    plan = get_subscription_plan(db, company_id)
    limits = get_plan_limits(plan)
    
    # Si illimité, autoriser
    if limits["quotes_per_month"] == -1:
        return True, None
    
    # Compter les devis créés ce mois-ci
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    
    quotes_count = db.query(func.count(Quote.id)).filter(
        Quote.company_id == company_id,
        Quote.created_at >= start_of_month
    ).scalar() or 0
    
    if quotes_count >= limits["quotes_per_month"]:
        limit = limits["quotes_per_month"]
        return False, f"Vous avez atteint la limite de {limit} devis par mois pour le plan Essentiel. Passez au plan Pro pour des devis illimités."
    
    return True, None


def check_invoices_limit(db: Session, company_id: int) -> tuple[bool, Optional[str]]:
    """
    Vérifie si l'entreprise peut créer une nouvelle facture selon son plan
    
    Returns:
        (is_allowed, error_message)
    """
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id
    ).first()
    
    # Si c'est un essai gratuit (trialing avec amount = 0)
    if subscription and subscription.status == SubscriptionStatus.TRIALING and subscription.amount == 0:
        # Pendant l'essai, appliquer les restrictions selon le plan choisi
        if subscription.plan == SubscriptionPlan.PROFESSIONAL:
            return True, None  # Accès complet pour Pro pendant l'essai
        # Sinon, continuer avec les limites du plan Essentiel
    
    plan = get_subscription_plan(db, company_id)
    limits = get_plan_limits(plan)
    
    # Si illimité, autoriser
    if limits["invoices_per_month"] == -1:
        return True, None
    
    # Compter les factures créées ce mois-ci
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    
    invoices_count = db.query(func.count(Invoice.id)).filter(
        Invoice.company_id == company_id,
        Invoice.created_at >= start_of_month
    ).scalar() or 0
    
    if invoices_count >= limits["invoices_per_month"]:
        limit = limits["invoices_per_month"]
        return False, f"Vous avez atteint la limite de {limit} factures par mois pour le plan Essentiel. Passez au plan Pro pour des factures illimitées."
    
    return True, None


def check_clients_limit(db: Session, company_id: int) -> tuple[bool, Optional[str]]:
    """
    Vérifie si l'entreprise peut créer un nouveau client selon son plan
    
    Returns:
        (is_allowed, error_message)
    """
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id
    ).first()
    
    # Si c'est un essai gratuit (trialing avec amount = 0)
    if subscription and subscription.status == SubscriptionStatus.TRIALING and subscription.amount == 0:
        # Pendant l'essai, appliquer les restrictions selon le plan choisi
        if subscription.plan == SubscriptionPlan.PROFESSIONAL:
            return True, None  # Accès complet pour Pro pendant l'essai
        # Sinon, continuer avec les limites du plan Essentiel
    
    plan = get_subscription_plan(db, company_id)
    limits = get_plan_limits(plan)
    
    # Si illimité, autoriser
    if limits["clients"] == -1:
        return True, None
    
    # Compter le nombre total de clients
    clients_count = db.query(func.count(Client.id)).filter(
        Client.company_id == company_id
    ).scalar() or 0
    
    if clients_count >= limits["clients"]:
        limit = limits["clients"]
        return False, f"Vous avez atteint la limite de {limit} clients pour le plan Essentiel. Passez au plan Pro pour des clients illimités."
    
    return True, None


def check_followups_limit(db: Session, company_id: int) -> tuple[bool, Optional[str]]:
    """
    Vérifie si l'entreprise peut envoyer une nouvelle relance selon son plan
    
    Returns:
        (is_allowed, error_message)
    """
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id
    ).first()
    
    # Si c'est un essai gratuit (trialing avec amount = 0)
    if subscription and subscription.status == SubscriptionStatus.TRIALING and subscription.amount == 0:
        # Pendant l'essai, appliquer les restrictions selon le plan choisi
        if subscription.plan == SubscriptionPlan.PROFESSIONAL:
            return True, None  # Accès complet pour Pro pendant l'essai
        # Sinon, continuer avec les limites du plan Essentiel
    
    plan = get_subscription_plan(db, company_id)
    limits = get_plan_limits(plan)
    
    # Si illimité, autoriser
    if limits.get("followups_per_month", -1) == -1:
        return True, None
    
    # Compter les relances envoyées ce mois-ci (via FollowUpHistory)
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    
    # Compter via FollowUp (FollowUpHistory a company_id directement, donc on peut aussi l'utiliser)
    from app.db.models.followup import FollowUp
    followups_sent_this_month = db.query(func.count(FollowUpHistory.id)).filter(
        FollowUpHistory.company_id == company_id,
        FollowUpHistory.sent_at >= start_of_month
    ).scalar() or 0
    
    limit = limits.get("followups_per_month", -1)
    if followups_sent_this_month >= limit:
        return False, f"Vous avez atteint la limite de {limit} relances par mois pour le plan Essentiel. Passez au plan Pro pour des relances illimitées."
    
    return True, None


def is_feature_enabled(db: Session, company_id: int, feature_name: str) -> bool:
    """
    Vérifie si une fonctionnalité est disponible pour l'entreprise selon son plan
    
    Args:
        feature_name: Nom de la fonctionnalité (ex: "excel_export", "custom_branding")
    """
    subscription = db.query(Subscription).filter(
        Subscription.company_id == company_id
    ).first()
    
    # Si c'est un essai gratuit (trialing avec amount = 0)
    if subscription and subscription.status == SubscriptionStatus.TRIALING and subscription.amount == 0:
        # Pendant l'essai, appliquer les restrictions selon le plan choisi
        if subscription.plan == SubscriptionPlan.PROFESSIONAL:
            return True  # Toutes les fonctionnalités pour Pro pendant l'essai
        # Sinon, continuer avec les restrictions du plan Essentiel
    
    plan = get_subscription_plan(db, company_id)
    limits = get_plan_limits(plan)
    
    return limits["features"].get(feature_name, False)


def get_usage_stats(db: Session, company_id: int) -> Dict[str, Any]:
    """
    Récupère les statistiques d'utilisation de l'entreprise pour son plan actuel
    """
    plan = get_subscription_plan(db, company_id)
    limits = get_plan_limits(plan)
    
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    
    # Compter les devis ce mois-ci
    quotes_count = db.query(func.count(Quote.id)).filter(
        Quote.company_id == company_id,
        Quote.created_at >= start_of_month
    ).scalar() or 0
    
    # Compter les factures ce mois-ci
    invoices_count = db.query(func.count(Invoice.id)).filter(
        Invoice.company_id == company_id,
        Invoice.created_at >= start_of_month
    ).scalar() or 0
    
    # Compter les clients
    clients_count = db.query(func.count(Client.id)).filter(
        Client.company_id == company_id
    ).scalar() or 0
    
    # Compter les relances envoyées ce mois-ci
    from app.db.models.followup import FollowUp
    followups_sent_this_month = db.query(func.count(FollowUpHistory.id)).join(
        FollowUp, FollowUpHistory.followup_id == FollowUp.id
    ).filter(
        FollowUp.company_id == company_id,
        FollowUpHistory.sent_at >= start_of_month
    ).scalar() or 0
    
    followups_limit = limits.get("followups_per_month", -1)
    
    return {
        "plan": plan.value,
        "limits": {
            "quotes_per_month": limits["quotes_per_month"],
            "invoices_per_month": limits["invoices_per_month"],
            "clients": limits["clients"],
            "followups_per_month": followups_limit,
        },
        "usage": {
            "quotes_this_month": quotes_count,
            "invoices_this_month": invoices_count,
            "clients_total": clients_count,
            "followups_this_month": followups_sent_this_month,
        },
        "remaining": {
            "quotes_this_month": limits["quotes_per_month"] - quotes_count if limits["quotes_per_month"] != -1 else -1,
            "invoices_this_month": limits["invoices_per_month"] - invoices_count if limits["invoices_per_month"] != -1 else -1,
            "clients": limits["clients"] - clients_count if limits["clients"] != -1 else -1,
            "followups_this_month": followups_limit - followups_sent_this_month if followups_limit != -1 else -1,
        }
    }

