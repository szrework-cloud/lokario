from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import os
from app.api.routes import auth, users, companies, clients, inbox, inbox_webhooks, inbox_integrations, tasks, checklists, projects, appointments, followups, invoices, quotes, billing_line_templates, notifications, chatbot, dashboard, stripe, contact
from app.db.session import init_db
from app.core.log_sanitizer import setup_sanitized_logging
from app.core.config import settings

app = FastAPI(
    title="Local Assistant API",
    description="API backend pour Local Assistant SaaS",
    version="1.0.0"
)

# Configuration des headers de sécurité (doit être avant CORS)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Ajoute les headers de sécurité HTTP à toutes les réponses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

# Configuration du rate limiting
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - Configuration pour permettre les requêtes depuis le frontend Next.js
# Déterminer les origines en fonction de l'environnement
if settings.ENVIRONMENT.lower() in ["production", "prod"]:
    origins = [
        "https://lokario.fr",
        "https://www.lokario.fr",
    ]
    # Ajouter l'URL Railway si définie dans les variables d'environnement
    railway_url = os.getenv("RAILWAY_PUBLIC_DOMAIN") or os.getenv("RAILWAY_STATIC_URL")
    if railway_url:
        origins.append(f"https://{railway_url}")
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    # En développement, aussi autoriser l'URL Railway si elle existe
    railway_url = os.getenv("RAILWAY_PUBLIC_DOMAIN") or os.getenv("RAILWAY_STATIC_URL")
    if railway_url:
        origins.append(f"https://{railway_url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Middleware de logging pour debug
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import logging
    logger = logging.getLogger(__name__)
    
    if request.url.path in ["/followups/stats", "/followups/weekly"]:
        logger.info(f"[MIDDLEWARE] Requête reçue: {request.method} {request.url.path}")
        logger.info(f"[MIDDLEWARE] Query params: {request.query_params}")
    
    response = await call_next(request)
    
    if request.url.path in ["/followups/stats", "/followups/weekly"]:
        logger.info(f"[MIDDLEWARE] Réponse: {response.status_code} pour {request.method} {request.url.path}")
    
    return response


# Exception handler personnalisé pour s'assurer que les headers CORS sont toujours inclus
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Gestionnaire d'exceptions HTTP personnalisé qui garantit que les headers CORS
    sont toujours inclus, même en cas d'erreur.
    """
    origin = request.headers.get("origin")
    if origin in origins:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    else:
        headers = {}
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Gestionnaire d'exceptions de validation qui garantit que les headers CORS
    sont toujours inclus.
    """
    origin = request.headers.get("origin")
    if origin in origins:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    else:
        headers = {}
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers=headers,
    )


@app.exception_handler(ResponseValidationError)
async def response_validation_exception_handler(request: Request, exc: ResponseValidationError):
    """
    Gestionnaire d'exceptions de validation de réponse (422).
    Log les détails pour debug.
    """
    import logging
    import traceback
    from decimal import Decimal
    logger = logging.getLogger(__name__)

    logger.error("=" * 80)
    logger.error("[RESPONSE VALIDATION ERROR] ⚠️ ERREUR 422 DÉTECTÉE")
    logger.error(f"[RESPONSE VALIDATION ERROR] Path: {request.url.path}")
    logger.error(f"[RESPONSE VALIDATION ERROR] Method: {request.method}")
    logger.error(f"[RESPONSE VALIDATION ERROR] Erreurs: {exc.errors()}")
    logger.error(f"[RESPONSE VALIDATION ERROR] Body type: {type(exc.body)}")
    logger.error(f"[RESPONSE VALIDATION ERROR] Body: {exc.body}")
    logger.error(f"[RESPONSE VALIDATION ERROR] Traceback:")
    logger.error(traceback.format_exc())
    logger.error("=" * 80)

    origin = request.headers.get("origin")
    if origin in origins:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    else:
        headers = {}
    
    # Convertir les Decimal en float pour la sérialisation JSON
    def convert_decimals(obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: convert_decimals(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_decimals(item) for item in obj]
        return obj
    
    errors = convert_decimals(exc.errors())
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": errors,
            "message": "Response validation error. Check server logs for details."
        },
        headers=headers,
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Gestionnaire d'exceptions génériques (500) qui garantit que les headers CORS
    sont toujours inclus même en cas d'erreur serveur.
    
    En production, ne pas exposer les détails de l'erreur au client.
    """
    import traceback
    import logging
    from app.core.config import settings
    
    logger = logging.getLogger(__name__)
    # Toujours logger les erreurs complètes côté serveur
    logger.error(f"Erreur non gérée: {exc}", exc_info=True)
    
    origin = request.headers.get("origin")
    if origin in origins:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    else:
        headers = {}
    
    # En production, ne pas exposer les détails
    if settings.ENVIRONMENT.lower() in ["production", "prod"]:
        error_detail = "Internal server error. Please check the logs for details."
    else:
        # En développement, montrer plus de détails
        error_detail = f"Internal server error: {str(exc)}"
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": error_detail},
        headers=headers,
    )

# Inclusion des routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(companies.router)
app.include_router(clients.router)
app.include_router(tasks.router)
app.include_router(checklists.router)
app.include_router(projects.router)
app.include_router(appointments.router)
app.include_router(followups.router)
app.include_router(inbox.router)
app.include_router(inbox_webhooks.router)
app.include_router(inbox_integrations.router)
app.include_router(invoices.router)
app.include_router(quotes.router)
app.include_router(billing_line_templates.router)
app.include_router(notifications.router)
app.include_router(chatbot.router)
app.include_router(dashboard.router)
app.include_router(stripe.router)
app.include_router(contact.router)


@app.on_event("startup")
async def startup_event():
    """Initialise la base de données au démarrage de l'application."""
    init_db()
    # SÉCURITÉ: Configurer le logging pour masquer automatiquement les données sensibles
    setup_sanitized_logging()
    
    # Nettoyer automatiquement les tâches complétées depuis au moins un jour
    from app.db.session import SessionLocal
    from app.api.routes.tasks import cleanup_completed_tasks
    
    db = SessionLocal()
    try:
        cleanup_completed_tasks(db, company_id=None)  # Nettoie toutes les entreprises
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur lors du nettoyage automatique des tâches: {e}")
    finally:
        db.close()


@app.get("/health")
def health_check():
    """Endpoint de santé pour vérifier que l'API fonctionne."""
    return {"status": "ok"}

