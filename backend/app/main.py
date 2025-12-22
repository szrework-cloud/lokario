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
import logging
logger = logging.getLogger(__name__)

# Toujours inclure les origines de production
origins = [
    "https://lokario.fr",
    "https://www.lokario.fr",
]

# Ajouter les origines de staging
origins.extend([
    "https://staging-lokario.vercel.app",
    "https://lokario-staging.vercel.app",  # Au cas où il y aurait une autre variante
])

# Ajouter l'URL du frontend depuis les variables d'environnement si définie
frontend_url = settings.FRONTEND_URL
if frontend_url and frontend_url not in origins:
    # Nettoyer l'URL (enlever le trailing slash si présent)
    frontend_url_clean = frontend_url.rstrip('/')
    if frontend_url_clean.startswith('http://') or frontend_url_clean.startswith('https://'):
        origins.append(frontend_url_clean)

# Ajouter les origines de développement si on n'est pas en production
if settings.ENVIRONMENT.lower() not in ["production", "prod"]:
    origins.extend([
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ])

# Ajouter l'URL Railway si définie dans les variables d'environnement
railway_url = os.getenv("RAILWAY_PUBLIC_DOMAIN") or os.getenv("RAILWAY_STATIC_URL")
if railway_url:
    origins.append(f"https://{railway_url}")

# Fonction pour vérifier si une origine est autorisée (pour les previews Vercel)
def is_origin_allowed(origin: str) -> bool:
    """Vérifie si une origine est autorisée, y compris les previews Vercel en staging"""
    if origin in origins:
        return True
    
    # En staging/dev, autoriser toutes les URLs Vercel (pour les previews)
    if settings.ENVIRONMENT.lower() not in ["production", "prod"]:
        if origin.startswith("https://") and ".vercel.app" in origin:
            return True
    
    return False

# Configuration CORS avec support des previews Vercel
# Note: Les logs CORS sont affichés dans startup_event() après configuration du logging
# En staging/dev, utiliser allow_origin_regex pour autoriser toutes les previews Vercel
# En production, utiliser allow_origins avec la liste fixe
if settings.ENVIRONMENT.lower() not in ["production", "prod"]:
    # Staging/dev : autoriser toutes les URLs Vercel via regex + les origines spécifiques
    # IMPORTANT: allow_origin_regex et allow_origins peuvent être utilisés ensemble
    # Le regex matchera les URLs Vercel, et allow_origins contiendra les autres origines
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https://.*\.vercel\.app",  # Toutes les URLs Vercel
        allow_origins=origins,  # Origines spécifiques (localhost, lokario.fr, etc.)
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )
else:
    # Production : seulement les origines spécifiques
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )

# Middleware de secours pour garantir les headers CORS sur toutes les réponses
# Ce middleware s'exécute APRÈS le middleware CORS et ajoute les headers si manquants
@app.middleware("http")
async def cors_fallback_middleware(request: Request, call_next):
    """Middleware de secours pour garantir les headers CORS sur toutes les réponses"""
    origin = request.headers.get("origin")
    
    response = await call_next(request)
    
    # Si c'est une requête OPTIONS ou si les headers CORS sont manquants, les ajouter
    if origin:
        # En staging/dev, autoriser toutes les URLs Vercel
        if settings.ENVIRONMENT.lower() not in ["production", "prod"]:
            if origin.startswith("https://") and ".vercel.app" in origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "*"
                response.headers["Access-Control-Max-Age"] = "3600"
                return response
        
        # Si les headers CORS ne sont pas déjà présents, les ajouter
        if "Access-Control-Allow-Origin" not in response.headers:
            if is_origin_allowed(origin):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "*"
            elif settings.ENVIRONMENT.lower() not in ["production", "prod"]:
                # En staging/dev, autoriser quand même pour éviter les erreurs CORS
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# Middleware pour logger les requêtes CORS et s'assurer que les headers sont toujours présents
@app.middleware("http")
async def cors_debug_middleware(request: Request, call_next):
    """Middleware pour debug CORS et garantir les headers"""
    import logging
    logger = logging.getLogger(__name__)
    
    origin = request.headers.get("origin")
    
    try:
        response = await call_next(request)
    except Exception as e:
        # En cas d'erreur, créer une réponse avec headers CORS
        logger.error(f"❌ Erreur dans cors_debug_middleware: {e}")
        from fastapi.responses import JSONResponse
        cors_headers = {}
        if origin:
            cors_headers = {
                "Access-Control-Allow-Origin": origin if origin in origins else "*",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            }
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
            headers=cors_headers
        )
        return response
    
    # S'assurer que les headers CORS sont toujours présents
    if origin:
        # Vérifier si l'origine est autorisée (y compris les previews Vercel)
        if is_origin_allowed(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
        else:
            # En staging/dev, autoriser quand même pour éviter les erreurs CORS
            if settings.ENVIRONMENT.lower() not in ["production", "prod"]:
                response.headers["Access-Control-Allow-Origin"] = origin
            else:
                response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        if "Access-Control-Max-Age" not in response.headers:
            response.headers["Access-Control-Max-Age"] = "3600"
    
    return response

# Middleware de logging pour debug
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import logging
    logger = logging.getLogger(__name__)
    
    # Logger les health checks et requêtes importantes
    if request.url.path in ["/health", "/", "/followups/stats", "/followups/weekly"]:
        logger.info(f"[MIDDLEWARE] Requête reçue: {request.method} {request.url.path} - User-Agent: {request.headers.get('user-agent', 'N/A')}")
        if request.url.path in ["/followups/stats", "/followups/weekly"]:
            logger.info(f"[MIDDLEWARE] Query params: {request.query_params}")
    
    response = await call_next(request)
    
    if request.url.path in ["/health", "/", "/followups/stats", "/followups/weekly"]:
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
    if origin and is_origin_allowed(origin):
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    elif origin and settings.ENVIRONMENT.lower() not in ["production", "prod"] and ".vercel.app" in origin:
        # Autoriser les previews Vercel en staging
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
    if origin and is_origin_allowed(origin):
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
    if origin and is_origin_allowed(origin):
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
    
    # Toujours inclure les headers CORS, même si l'origin n'est pas dans la liste
    # (pour éviter les erreurs CORS en plus de l'erreur 500)
    if origin:
        if is_origin_allowed(origin):
            headers = {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            }
        else:
            # En staging/dev, autoriser quand même pour éviter les erreurs CORS
            if settings.ENVIRONMENT.lower() not in ["production", "prod"]:
                headers = {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                }
            else:
                headers = {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
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
    """
    Initialise l'application au démarrage.
    RAPIDE et NON-BLOQUANT pour éviter les timeouts Railway.
    """
    import logging
    import asyncio
    logger = logging.getLogger(__name__)
    
    # SÉCURITÉ: Configurer le logging IMMÉDIATEMENT (rapide)
    setup_sanitized_logging()
    logger.info("✅ Logging configuré")
    
    # Afficher la configuration CORS après que le logging soit configuré
    logger.info(f"🌐 CORS - Origines autorisées: {origins}")
    logger.info(f"🌐 CORS - Environnement détecté: {settings.ENVIRONMENT}")
    logger.info(f"🌐 CORS - Preview Vercel autorisées en staging: {settings.ENVIRONMENT.lower() not in ['production', 'prod']}")
    if settings.ENVIRONMENT.lower() not in ["production", "prod"]:
        logger.info(f"🌐 CORS - Configuration staging: regex + {len(origins)} origines spécifiques")
    else:
        logger.info(f"🌐 CORS - Configuration production: {len(origins)} origines spécifiques")
    
    # Initialiser la base de données en arrière-plan (non-bloquant)
    # En production, init_db() ne fait RIEN (pas de requête DB au démarrage)
    # Les tables existent déjà, les connexions seront testées lors de la première requête
    async def init_db_async():
        try:
            # Exécuter init_db() dans un thread pour ne pas bloquer
            import concurrent.futures
            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                await loop.run_in_executor(executor, init_db)
            logger.info("✅ Base de données initialisée (en arrière-plan)")
        except Exception as e:
            # Ne jamais faire échouer le démarrage
            logger.warning(f"⚠️ Initialisation DB: {e} - L'application continue le démarrage")
    
    # Lancer l'initialisation DB en arrière-plan (ne bloque pas le démarrage)
    asyncio.create_task(init_db_async())
    
    # Nettoyer automatiquement les tâches complétées (seulement en dev)
    # Note: settings est déjà importé au niveau du module
    if settings.ENVIRONMENT.lower() not in ["production", "prod"]:
        # Seulement en développement/staging - en arrière-plan aussi
        async def cleanup_tasks_async():
            try:
                from app.db.session import SessionLocal
                from app.api.routes.tasks import cleanup_completed_tasks
                
                db = SessionLocal()
                try:
                    cleanup_completed_tasks(db, company_id=None)
                except Exception as e:
                    logger.error(f"Erreur lors du nettoyage automatique des tâches: {e}")
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Erreur lors de la création de la session pour le nettoyage: {e}")
        
        asyncio.create_task(cleanup_tasks_async())
    else:
        logger.info("⏭️ Nettoyage des tâches désactivé au démarrage en production")
    
    logger.info("✅ Application démarrée (startup non-bloquant)")


# Le handler OPTIONS explicite n'est plus nécessaire car le middleware log_options_requests
# gère maintenant les requêtes OPTIONS directement et répond immédiatement avec les headers CORS


@app.get("/health")
def health_check():
    """
    Endpoint de santé pour vérifier que l'API fonctionne.
    Utilisé par Railway pour vérifier que le container est prêt.
    Ne fait PAS de requête DB pour éviter les erreurs SSL au démarrage.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.debug("🏥 Health check appelé")
    return {
        "status": "ok",
        "service": "lokario-backend",
        "version": "1.0.0"
    }

@app.get("/")
def root():
    """Endpoint racine pour vérifier que l'API répond."""
    import logging
    logger = logging.getLogger(__name__)
    logger.debug("🏠 Root endpoint appelé")
    return {
        "message": "Lokario API",
        "status": "running",
        "health": "/health"
    }

