#!/usr/bin/env python3
"""
Script de démarrage pour Railway - Approche robuste style entreprise
Lit le PORT depuis les variables d'environnement et lance uvicorn
"""
import os
import sys

def main():
    """Point d'entrée principal du script."""
    # Lire le port depuis l'environnement (Railway l'injecte automatiquement)
    port_str = os.getenv("PORT", "8080")
    try:
        port = int(port_str)
    except (ValueError, TypeError):
        print(f"⚠️  PORT invalide: {port_str}, utilisation du port par défaut 8080", file=sys.stderr)
        port = 8080
    
    print(f"🚀 Démarrage sur le port {port}")
    sys.stdout.flush()
    
    # Importer uvicorn ici pour éviter les problèmes d'import si uvicorn n'est pas installé
    import uvicorn
    
    # Lancer uvicorn avec configuration optimale
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )

if __name__ == "__main__":
    main()
