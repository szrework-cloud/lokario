#!/usr/bin/env python3
"""
Script de démarrage pour Railway
Lit le PORT depuis les variables d'environnement et lance uvicorn
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    print(f"🚀 Démarrage sur le port {port}")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
