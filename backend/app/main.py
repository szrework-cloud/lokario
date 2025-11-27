from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, users, companies
from app.db.session import init_db

app = FastAPI(
    title="Local Assistant API",
    description="API backend pour Local Assistant SaaS",
    version="1.0.0"
)

# CORS - Configuration pour permettre les requêtes depuis le frontend Next.js
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(companies.router)


@app.on_event("startup")
async def startup_event():
    """Initialise la base de données au démarrage de l'application."""
    init_db()


@app.get("/health")
def health_check():
    """Endpoint de santé pour vérifier que l'API fonctionne."""
    return {"status": "ok"}

