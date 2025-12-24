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
            "auto_followups": {
                "quotes_enabled": False,  # Relances automatiques pour les devis non signés (désactivé par défaut)
                "invoices_enabled": False,  # Relances automatiques pour les factures impayées (désactivé par défaut)
            },
            "quote_design": {
                "primary_color": "#F97316",  # Couleur principale (orange par défaut)
                "secondary_color": "#F0F0F0",  # Couleur secondaire (gris clair)
                "logo_path": None,  # Chemin vers le logo de l'entreprise
            },
            "numbering": {
                "quotes": {
                    "prefix": "DEV",
                    "separator": "-",
                    "year_format": "YYYY",  # "YYYY" ou "YY"
                    "number_padding": 3,  # Nombre de chiffres (3 = 001, 4 = 0001)
                    "start_number": 1,  # Numéro de départ
                },
                "invoices": {
                    "prefix": "FAC",
                    "separator": "-",
                    "year_format": "YYYY",
                    "number_padding": 4,
                    "start_number": 1,
                },
                "credit_notes": {
                    "prefix": "AVO",
                    "separator": "-",
                    "year_format": "YYYY",
                    "number_padding": 4,
                    "suffix": "AVOIR",  # Suffixe pour les avoirs
                    "start_number": 1,
                },
            },
        },
        "clients": {
            "blocked_client_domains": [
                "@amazon.com",
                "@paypal.com",
                "@noreply",
                "@no-reply",
                "@notifications",
                "@notification",
                "@automated",
                "@system",
                "@service",
                "@donotreply"
            ],  # Domaines bloqués pour la création automatique de clients
        },
    }

