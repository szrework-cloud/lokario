"""
Script Python pour créer les tables d'abonnements Stripe
Alternative à la migration Alembic si elle ne fonctionne pas
"""
import sqlite3
import os

# Chemin vers la base de données
db_path = os.path.join(os.path.dirname(__file__), "..", "app.db")

print(f"Connexion à la base de données : {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Lire le script SQL
sql_file = os.path.join(os.path.dirname(__file__), "create_subscription_tables.sql")
with open(sql_file, "r") as f:
    sql_script = f.read()

# Exécuter le script
try:
    cursor.executescript(sql_script)
    conn.commit()
    print("✅ Tables d'abonnements créées avec succès !")
except sqlite3.OperationalError as e:
    if "already exists" in str(e).lower():
        print("⚠️  Les tables existent déjà. C'est normal si vous avez déjà exécuté ce script.")
    else:
        print(f"❌ Erreur : {e}")
        raise
finally:
    conn.close()

