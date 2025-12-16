"""
Service pour masquer les données sensibles dans les logs.
"""
import re
import logging
from typing import Any, Dict, List


class SensitiveDataFilter(logging.Filter):
    """
    Filtre de logging qui masque automatiquement les données sensibles.
    """
    
    # Patterns pour détecter les données sensibles
    SENSITIVE_PATTERNS = [
        (r'password["\']?\s*[:=]\s*["\']?([^"\'\s]+)', r'password": "***"'),
        (r'email_password["\']?\s*[:=]\s*["\']?([^"\'\s]+)', r'email_password": "***"'),
        (r'api_key["\']?\s*[:=]\s*["\']?([^"\'\s]+)', r'api_key": "***"'),
        (r'api_secret["\']?\s*[:=]\s*["\']?([^"\'\s]+)', r'api_secret": "***"'),
        (r'webhook_secret["\']?\s*[:=]\s*["\']?([^"\'\s]+)', r'webhook_secret": "***"'),
        (r'secret["\']?\s*[:=]\s*["\']?([^"\'\s]+)', r'secret": "***"'),
        (r'token["\']?\s*[:=]\s*["\']?([^"\'\s]+)', r'token": "***"'),
        (r'authorization["\']?\s*[:=]\s*["\']?Bearer\s+([^"\'\s]+)', r'authorization": "Bearer ***"'),
    ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """
        Filtre les messages de log pour masquer les données sensibles.
        """
        if hasattr(record, 'msg') and record.msg:
            record.msg = self._sanitize(str(record.msg))
        
        if hasattr(record, 'args') and record.args:
            # Sanitiser les arguments du log
            sanitized_args = []
            for arg in record.args:
                if isinstance(arg, (str, dict, list)):
                    sanitized_args.append(self._sanitize_data(arg))
                else:
                    sanitized_args.append(arg)
            record.args = tuple(sanitized_args)
        
        return True
    
    def _sanitize(self, text: str) -> str:
        """
        Sanitise une chaîne de caractères en masquant les données sensibles.
        """
        sanitized = text
        for pattern, replacement in self.SENSITIVE_PATTERNS:
            sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
        return sanitized
    
    def _sanitize_data(self, data: Any) -> Any:
        """
        Sanitise récursivement les données (dict, list, str).
        """
        if isinstance(data, dict):
            return {k: self._sanitize_data(v) if k.lower() not in ['password', 'api_key', 'api_secret', 'webhook_secret', 'secret', 'token'] else '***' for k, v in data.items()}
        elif isinstance(data, list):
            return [self._sanitize_data(item) for item in data]
        elif isinstance(data, str):
            return self._sanitize(data)
        else:
            return data


def sanitize_log_message(message: str) -> str:
    """
    Fonction utilitaire pour sanitiser un message de log.
    
    Args:
        message: Message à sanitiser
        
    Returns:
        Message sanitisé avec les données sensibles masquées
    """
    filter_instance = SensitiveDataFilter()
    return filter_instance._sanitize(message)


def setup_sanitized_logging():
    """
    Configure le logging pour masquer automatiquement les données sensibles.
    """
    # Configurer le niveau de logging à INFO pour voir les logs
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Ajouter le filtre à tous les loggers
    root_logger = logging.getLogger()
    if not any(isinstance(f, SensitiveDataFilter) for f in root_logger.filters):
        root_logger.addFilter(SensitiveDataFilter())
    
    # Configurer les loggers spécifiques au niveau INFO
    for logger_name in ['app', 'uvicorn', 'fastapi', 'app.api.routes.checklists', 'app.api.routes.tasks']:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.INFO)
        if not any(isinstance(f, SensitiveDataFilter) for f in logger.filters):
            logger.addFilter(SensitiveDataFilter())

