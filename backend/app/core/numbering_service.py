"""
Service pour la génération et le formatage de numéros de documents (devis, factures, avoirs).
Gère la configuration personnalisable de la numérotation.
"""
from typing import Dict, Any, Optional
from datetime import datetime


def get_numbering_config(company_settings: Optional[Dict[str, Any]], document_type: str) -> Dict[str, Any]:
    """
    Récupère la configuration de numérotation pour un type de document.
    
    Args:
        company_settings: Settings de l'entreprise (dictionnaire JSON)
        document_type: Type de document ("quotes", "invoices", "credit_notes")
        
    Returns:
        Configuration de numérotation avec valeurs par défaut si non configuré
    """
    # Valeurs par défaut pour chaque type
    defaults = {
        "quotes": {
            "prefix": "DEV",
            "separator": "-",
            "year_format": "YYYY",
            "number_padding": 3,
            "start_number": 1,
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
            "suffix": "AVOIR",
            "start_number": 1,
        },
    }
    
    # Si pas de settings, retourner les valeurs par défaut
    if not company_settings or "billing" not in company_settings:
        return defaults.get(document_type, defaults["quotes"])
    
    billing_settings = company_settings.get("billing", {})
    numbering_config = billing_settings.get("numbering", {})
    document_config = numbering_config.get(document_type, {})
    
    # Fusionner avec les valeurs par défaut pour s'assurer que tous les champs sont présents
    default_config = defaults.get(document_type, defaults["quotes"])
    merged_config = {**default_config, **document_config}
    
    return merged_config


def format_document_number(
    year: int,
    number: int,
    config: Dict[str, Any],
    suffix: Optional[str] = None
) -> str:
    """
    Formate un numéro de document selon la configuration.
    
    Args:
        year: Année (ex: 2025)
        number: Numéro séquentiel (ex: 1, 51, 123)
        config: Configuration de numérotation
        suffix: Suffixe optionnel (pour les avoirs)
        
    Returns:
        Numéro formaté (ex: "DEV-2025-001", "FAC-2025-0001", "AVO-2025-0001-AVOIR")
    """
    prefix = config.get("prefix", "DEV")
    separator = config.get("separator", "-")
    year_format = config.get("year_format", "YYYY")
    number_padding = config.get("number_padding", 3)
    
    # Formater l'année
    if year_format == "YY":
        year_str = str(year)[-2:]
    else:
        year_str = str(year)
    
    # Formater le numéro avec padding
    number_str = f"{number:0{number_padding}d}"
    
    # Construire le numéro
    parts = [prefix, year_str, number_str]
    
    # Ajouter le suffixe si fourni (ou depuis la config pour les avoirs)
    if suffix:
        parts.append(suffix)
    elif "suffix" in config and config["suffix"]:
        parts.append(config["suffix"])
    
    return separator.join(parts)


def parse_document_number(number: str, config: Dict[str, Any]) -> Optional[int]:
    """
    Parse un numéro de document pour extraire le numéro séquentiel.
    
    Args:
        number: Numéro formaté (ex: "DEV-2025-001")
        config: Configuration de numérotation
        
    Returns:
        Numéro séquentiel (ex: 1) ou None si le parsing échoue
    """
    try:
        separator = config.get("separator", "-")
        parts = number.split(separator)
        
        # Le numéro séquentiel est généralement l'avant-dernier élément
        # (avant le suffixe s'il existe)
        if len(parts) >= 3:
            # Si on a un suffixe, le numéro est l'avant-dernier
            # Sinon, c'est le dernier
            number_str = parts[-2] if len(parts) > 3 and "suffix" in config else parts[-1]
            return int(number_str)
        
        return None
    except (ValueError, IndexError):
        return None


def get_next_number(
    last_number: Optional[int],
    start_number: int,
    existing_numbers: Optional[list] = None
) -> int:
    """
    Calcule le prochain numéro en tenant compte du numéro de départ.
    
    Args:
        last_number: Dernier numéro utilisé (None si aucun document)
        start_number: Numéro de départ configuré
        existing_numbers: Liste optionnelle de tous les numéros existants (pour validation)
        
    Returns:
        Prochain numéro à utiliser
    """
    if last_number is None:
        return start_number
    
    # Utiliser le maximum entre (dernier + 1) et (start_number)
    # Cela permet de respecter le start_number même si on a déjà des documents
    next_number = max(last_number + 1, start_number)
    
    # Si on a une liste de numéros existants, vérifier que le numéro n'existe pas déjà
    if existing_numbers:
        while next_number in existing_numbers:
            next_number += 1
    
    return next_number

