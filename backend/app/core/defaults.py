"""
Fonctions pour les valeurs par défaut du système.
"""
from typing import Dict, Any


def get_default_settings() -> Dict[str, Any]:
    """
    Retourne la structure par défaut des settings d'une entreprise.
    
    TODO: Valider la structure des settings plus tard
    TODO: Gérer des plans (Starter/Pro/etc.) avec des settings différents
    """
    return {
        "modules": {
            "dashboard": {"enabled": True},
            "tasks": {"enabled": True},
            "inbox": {"enabled": True},
            "relances": {"enabled": True},
            "clients": {"enabled": True},
            "projects": {"enabled": True},
            "billing": {"enabled": True},
            "reporting": {"enabled": True},
            "chatbot_internal": {"enabled": True},
            "chatbot_site": {"enabled": False},
            "appointments": {"enabled": True},
        },
        "ia": {
            "ai_relances": True,
            "ai_summary": True,
            "ai_chatbot_internal": True,
            "ai_chatbot_site": False,
            "inbox": {
                # Pas de valeurs par défaut - les prompts doivent être configurés manuellement
            },
        },
        "integrations": {
            "email_provider": None,
            "email_from": None,
        },
        "company_info": {
            "email": None,  # Sera rempli depuis l'intégration inbox ou manuellement
            "phone": None,  # Numéro de téléphone de l'entreprise
            "address": None,  # Adresse complète
            "city": None,  # Ville
            "postal_code": None,  # Code postal
            "country": None,  # Pays
            "siren": None,  # Numéro SIREN
            "siret": None,  # Numéro SIRET
            "vat_number": None,  # Numéro de TVA intracommunautaire
            "timezone": "Europe/Paris",  # Fuseau horaire par défaut
        },
        "billing": {
            "tax_rates": [0, 2.1, 5.5, 10, 20],  # Taux de TVA autorisés (en pourcentage)
            "quote_design": {
                "primary_color": "#F97316",  # Couleur principale (orange par défaut)
                "secondary_color": "#F0F0F0",  # Couleur secondaire (gris clair)
                "logo_path": None,  # Chemin vers le logo de l'entreprise
            },
        },
    }

