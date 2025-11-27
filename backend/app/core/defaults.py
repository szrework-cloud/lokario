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
            "tasks": {"enabled": True},
            "inbox": {"enabled": True},
            "relances": {"enabled": True},
            "projects": {"enabled": True},
            "billing": {"enabled": True},
            "reporting": {"enabled": True},
            "chatbot_internal": {"enabled": True},
            "chatbot_site": {"enabled": False},
        },
        "ia": {
            "ai_relances": True,
            "ai_summary": True,
            "ai_chatbot_internal": True,
            "ai_chatbot_site": False,
        },
        "integrations": {
            "email_provider": None,
            "email_from": None,
        },
    }

