"""
Script pour créer des données fictives pour le dashboard.
Génère des devis, factures, relances, tâches, etc. avec des dates variées
pour que le dashboard affiche des statistiques réalistes.
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta, date
import random

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal, init_db
from app.db.models.client import Client
from app.db.models.billing import Quote, Invoice, QuoteLine, InvoiceLine, QuoteStatus, InvoiceStatus
from app.db.models.followup import FollowUp, FollowUpHistory, FollowUpType, FollowUpStatus, FollowUpHistoryStatus
from app.db.models.task import Task, TaskStatus
from app.db.models.conversation import Conversation, InboxMessage
from app.db.models.user import User


def setup_demo_dashboard(company_id: int = 6):
    """Crée des données fictives pour le dashboard."""
    init_db()
    db = SessionLocal()
    
    try:
        print(f"\n📊 Configuration des données du dashboard pour l'entreprise ID {company_id}...")
        
        # Récupérer les clients existants
        clients = db.query(Client).filter(Client.company_id == company_id).all()
        if not clients:
            print("  ⚠️  Aucun client trouvé. Veuillez d'abord créer des clients.")
            return
        
        # Récupérer un utilisateur
        user = db.query(User).filter(
            User.company_id == company_id,
            User.role.in_(["owner", "admin"])
        ).first()
        if not user:
            print("  ⚠️  Aucun utilisateur trouvé.")
            return
        
        today = date.today()
        now = datetime.now()
        
        # ==================== DEVIS ====================
        print("\n📄 Création de devis fictifs...")
        
        # Trouver le dernier numéro de devis existant
        last_quote = db.query(Quote).filter(
            Quote.company_id == company_id
        ).order_by(Quote.number.desc()).first()
        
        if last_quote and last_quote.number:
            # Extraire le numéro du dernier devis
            try:
                parts = last_quote.number.split('-')
                if len(parts) >= 3:
                    quote_counter = int(parts[2]) + 1
                else:
                    quote_counter = 1
            except:
                quote_counter = 1
        else:
            quote_counter = 1
        
        # Devis ce mois-ci (10-15 devis)
        quotes_this_month = random.randint(10, 15)
        for i in range(quotes_this_month):
            days_ago = random.randint(0, today.day - 1)
            sent_date = today - timedelta(days=days_ago)
            client = random.choice(clients)
            
            # Statut aléatoire
            status = random.choice([
                QuoteStatus.ENVOYE,
                QuoteStatus.VU,
                QuoteStatus.ACCEPTE,
                QuoteStatus.REFUSE,
            ])
            
            quote = Quote(
                company_id=company_id,
                client_id=client.id,
                number=f"DEV-{today.year}-{str(quote_counter).zfill(3)}",
                status=status,
                sent_at=datetime.combine(sent_date, datetime.min.time()),
                amount=Decimal(str(random.randint(500, 5000))),
                total_ttc=Decimal(str(random.randint(600, 6000))),
                subtotal_ht=Decimal(str(random.randint(500, 5000))),
                total_tax=Decimal(str(random.randint(100, 1000))),
            )
            
            if status == QuoteStatus.ACCEPTE:
                quote.accepted_at = datetime.combine(sent_date + timedelta(days=random.randint(1, 5)), datetime.min.time())
            
            db.add(quote)
            db.flush()
            
            # Ajouter des lignes
            for j in range(random.randint(1, 3)):
                quantity = Decimal(str(random.randint(1, 5)))
                unit_price_ht = Decimal(str(random.randint(100, 1000)))
                tax_rate = Decimal("20.00")
                subtotal_ht = quantity * unit_price_ht
                tax_amount = subtotal_ht * tax_rate / 100
                total_ttc = subtotal_ht + tax_amount
                
                line = QuoteLine(
                    quote_id=quote.id,
                    description=f"Prestation {j+1}",
                    quantity=quantity,
                    unit_price_ht=unit_price_ht,
                    tax_rate=tax_rate,
                    subtotal_ht=subtotal_ht,
                    tax_amount=tax_amount,
                    total_ttc=total_ttc,
                    unit="unité",
                    order=j+1,
                )
                db.add(line)
            quote_counter += 1
        
        # Devis mois dernier (5-10 devis)
        first_day_last_month = (date(today.year, today.month, 1) - timedelta(days=1)).replace(day=1)
        last_day_last_month = date(today.year, today.month, 1) - timedelta(days=1)
        
        quotes_last_month = random.randint(5, 10)
        for i in range(quotes_last_month):
            days_ago = random.randint(1, (last_day_last_month - first_day_last_month).days)
            sent_date = last_day_last_month - timedelta(days=days_ago)
            client = random.choice(clients)
            
            status = random.choice([
                QuoteStatus.ENVOYE,
                QuoteStatus.VU,
                QuoteStatus.ACCEPTE,
                QuoteStatus.REFUSE,
            ])
            
            quote = Quote(
                company_id=company_id,
                client_id=client.id,
                number=f"DEV-{sent_date.year}-{str(quote_counter).zfill(3)}",
                status=status,
                sent_at=datetime.combine(sent_date, datetime.min.time()),
                amount=Decimal(str(random.randint(500, 5000))),
                total_ttc=Decimal(str(random.randint(600, 6000))),
                subtotal_ht=Decimal(str(random.randint(500, 5000))),
                total_tax=Decimal(str(random.randint(100, 1000))),
            )
            
            if status == QuoteStatus.ACCEPTE:
                quote.accepted_at = datetime.combine(sent_date + timedelta(days=random.randint(1, 5)), datetime.min.time())
            
            db.add(quote)
            db.flush()
            
            for j in range(random.randint(1, 3)):
                quantity = Decimal(str(random.randint(1, 5)))
                unit_price_ht = Decimal(str(random.randint(100, 1000)))
                tax_rate = Decimal("20.00")
                subtotal_ht = quantity * unit_price_ht
                tax_amount = subtotal_ht * tax_rate / 100
                total_ttc = subtotal_ht + tax_amount
                
                line = QuoteLine(
                    quote_id=quote.id,
                    description=f"Prestation {j+1}",
                    quantity=quantity,
                    unit_price_ht=unit_price_ht,
                    tax_rate=tax_rate,
                    subtotal_ht=subtotal_ht,
                    tax_amount=tax_amount,
                    total_ttc=total_ttc,
                    unit="unité",
                    order=j+1,
                )
                db.add(line)
            quote_counter += 1
        
        print(f"  ✅ {quotes_this_month + quotes_last_month} devis créés")
        
        # ==================== FACTURES ====================
        print("\n💰 Création de factures fictives...")
        
        # Trouver le dernier numéro de facture existant
        last_invoice = db.query(Invoice).filter(
            Invoice.company_id == company_id
        ).order_by(Invoice.number.desc()).first()
        
        if last_invoice and last_invoice.number:
            # Extraire le numéro de la dernière facture
            try:
                parts = last_invoice.number.split('-')
                if len(parts) >= 3:
                    invoice_counter = int(parts[2]) + 1
                else:
                    invoice_counter = 1
            except:
                invoice_counter = 1
        else:
            invoice_counter = 1
        
        # Factures payées ce mois-ci
        invoices_this_month = random.randint(8, 12)
        for i in range(invoices_this_month):
            days_ago = random.randint(0, today.day - 1)
            paid_date = today - timedelta(days=days_ago)
            client = random.choice(clients)
            
            invoice = Invoice(
                company_id=company_id,
                client_id=client.id,
                number=f"FAC-{today.year}-{str(invoice_counter).zfill(3)}",
                status=InvoiceStatus.PAYEE,
                paid_at=datetime.combine(paid_date, datetime.min.time()),
                amount=Decimal(str(random.randint(800, 6000))),
                total_ttc=Decimal(str(random.randint(960, 7200))),
                subtotal_ht=Decimal(str(random.randint(800, 6000))),
                total_tax=Decimal(str(random.randint(160, 1200))),
            )
            db.add(invoice)
            db.flush()
            
            for j in range(random.randint(1, 3)):
                quantity = Decimal(str(random.randint(1, 5)))
                unit_price_ht = Decimal(str(random.randint(200, 1500)))
                tax_rate = Decimal("20.00")
                subtotal_ht = quantity * unit_price_ht
                tax_amount = subtotal_ht * tax_rate / 100
                total_ttc = subtotal_ht + tax_amount
                
                line = InvoiceLine(
                    invoice_id=invoice.id,
                    description=f"Prestation {j+1}",
                    quantity=quantity,
                    unit_price_ht=unit_price_ht,
                    tax_rate=tax_rate,
                    subtotal_ht=subtotal_ht,
                    tax_amount=tax_amount,
                    total_ttc=total_ttc,
                    unit="unité",
                    order=j+1,
                )
                db.add(line)
            invoice_counter += 1
        
        # Factures payées mois dernier
        invoices_last_month = random.randint(5, 8)
        for i in range(invoices_last_month):
            days_ago = random.randint(1, (last_day_last_month - first_day_last_month).days)
            paid_date = last_day_last_month - timedelta(days=days_ago)
            client = random.choice(clients)
            
            invoice = Invoice(
                company_id=company_id,
                client_id=client.id,
                number=f"FAC-{paid_date.year}-{str(invoice_counter).zfill(3)}",
                status=InvoiceStatus.PAYEE,
                paid_at=datetime.combine(paid_date, datetime.min.time()),
                amount=Decimal(str(random.randint(800, 6000))),
                total_ttc=Decimal(str(random.randint(960, 7200))),
                subtotal_ht=Decimal(str(random.randint(800, 6000))),
                total_tax=Decimal(str(random.randint(160, 1200))),
            )
            db.add(invoice)
            db.flush()
            
            for j in range(random.randint(1, 3)):
                quantity = Decimal(str(random.randint(1, 5)))
                unit_price_ht = Decimal(str(random.randint(200, 1500)))
                tax_rate = Decimal("20.00")
                subtotal_ht = quantity * unit_price_ht
                tax_amount = subtotal_ht * tax_rate / 100
                total_ttc = subtotal_ht + tax_amount
                
                line = InvoiceLine(
                    invoice_id=invoice.id,
                    description=f"Prestation {j+1}",
                    quantity=quantity,
                    unit_price_ht=unit_price_ht,
                    tax_rate=tax_rate,
                    subtotal_ht=subtotal_ht,
                    tax_amount=tax_amount,
                    total_ttc=total_ttc,
                    unit="unité",
                    order=j+1,
                )
                db.add(line)
            invoice_counter += 1
        
        # Factures en retard (2-5 factures)
        overdue_invoices = random.randint(2, 5)
        for i in range(overdue_invoices):
            days_overdue = random.randint(1, 30)
            due_date = today - timedelta(days=days_overdue)
            client = random.choice(clients)
            
            invoice = Invoice(
                company_id=company_id,
                client_id=client.id,
                number=f"FAC-{today.year}-{str(invoice_counter).zfill(3)}",
                status=InvoiceStatus.IMPAYEE,
                due_date=due_date,
                amount=Decimal(str(random.randint(1000, 5000))),
                total_ttc=Decimal(str(random.randint(1200, 6000))),
                subtotal_ht=Decimal(str(random.randint(1000, 5000))),
                total_tax=Decimal(str(random.randint(200, 1000))),
            )
            db.add(invoice)
            db.flush()
            
            for j in range(random.randint(1, 3)):
                quantity = Decimal(str(random.randint(1, 5)))
                unit_price_ht = Decimal(str(random.randint(300, 2000)))
                tax_rate = Decimal("20.00")
                subtotal_ht = quantity * unit_price_ht
                tax_amount = subtotal_ht * tax_rate / 100
                total_ttc = subtotal_ht + tax_amount
                
                line = InvoiceLine(
                    invoice_id=invoice.id,
                    description=f"Prestation {j+1}",
                    quantity=quantity,
                    unit_price_ht=unit_price_ht,
                    tax_rate=tax_rate,
                    subtotal_ht=subtotal_ht,
                    tax_amount=tax_amount,
                    total_ttc=total_ttc,
                    unit="unité",
                    order=j+1,
                )
                db.add(line)
            invoice_counter += 1
        
        print(f"  ✅ {invoices_this_month + invoices_last_month + overdue_invoices} factures créées")
        
        # ==================== RELANCES ====================
        print("\n📧 Création de relances fictives...")
        
        # Supprimer d'abord toutes les relances existantes pour repartir de zéro
        print("  🗑️  Suppression des relances existantes...")
        
        # Supprimer tous les historiques de relances de l'entreprise
        all_history = db.query(FollowUpHistory).filter(FollowUpHistory.company_id == company_id).all()
        for history in all_history:
            db.delete(history)
        db.flush()
        print(f"    ✅ {len(all_history)} historiques supprimés")
        
        # Supprimer toutes les relances de l'entreprise
        existing_followups = db.query(FollowUp).filter(FollowUp.company_id == company_id).all()
        for followup in existing_followups:
            db.delete(followup)
        db.flush()
        print(f"    ✅ {len(existing_followups)} relances supprimées")
        
        # Créer des relances automatiques sur les 30 derniers jours
        # Exactement 18 relances automatiques par jour pour avoir 36 min/jour (18 × 2 min = 36 min)
        total_auto_followups = 0
        for day_offset in range(30):
            target_date = today - timedelta(days=day_offset)
            # Exactement 18 relances automatiques par jour
            daily_auto_followups = 18
            for i in range(daily_auto_followups):
                client = random.choice(clients)
                
                followup = FollowUp(
                    company_id=company_id,
                    client_id=client.id,
                    type=random.choice(list(FollowUpType)),
                    source_type="invoice",
                    source_id=random.randint(1, 100),
                    source_label=f"Facture #{random.randint(100, 999)}",
                    due_date=datetime.combine(target_date, datetime.min.time()),
                    status=FollowUpStatus.FAIT,
                    auto_enabled=True,  # Toujours automatique
                )
                db.add(followup)
                db.flush()
                
                # Historique de relance
                history = FollowUpHistory(
                    followup_id=followup.id,
                    company_id=company_id,
                    message=f"Relance automatique pour {followup.source_label}",
                    message_type="email",
                    status=FollowUpHistoryStatus.ENVOYE,
                    sent_by_id=user.id,
                    sent_by_name=user.full_name,
                    sent_at=datetime.combine(target_date, datetime.min.time()),
                )
                db.add(history)
                total_auto_followups += 1
        
        # Ajouter quelques relances manuelles ce mois-ci
        followups_manual = random.randint(5, 10)
        for i in range(followups_manual):
            days_ago = random.randint(0, today.day - 1)
            sent_date = today - timedelta(days=days_ago)
            client = random.choice(clients)
            
            followup = FollowUp(
                company_id=company_id,
                client_id=client.id,
                type=random.choice(list(FollowUpType)),
                source_type="invoice",
                source_id=random.randint(1, 100),
                source_label=f"Facture #{random.randint(100, 999)}",
                due_date=datetime.combine(sent_date, datetime.min.time()),
                status=FollowUpStatus.FAIT,
                auto_enabled=False,  # Manuelle
            )
            db.add(followup)
            db.flush()
            
            history = FollowUpHistory(
                followup_id=followup.id,
                company_id=company_id,
                message=f"Relance manuelle pour {followup.source_label}",
                message_type="email",
                status=FollowUpHistoryStatus.ENVOYE,
                sent_by_id=user.id,
                sent_by_name=user.full_name,
                sent_at=datetime.combine(sent_date, datetime.min.time()),
            )
            db.add(history)
        
        print(f"  ✅ {total_auto_followups} relances automatiques créées")
        print(f"  ✅ {followups_manual} relances manuelles créées")
        
        # ==================== TÂCHES ====================
        print("\n✅ Création de tâches complétées et automatiques...")
        
        # Tâches complétées cette semaine
        week_start = today - timedelta(days=today.weekday())
        tasks_this_week = random.randint(10, 20)
        for i in range(tasks_this_week):
            days_ago = random.randint(0, (today - week_start).days)
            completed_date = today - timedelta(days=days_ago)
            client = random.choice(clients)
            
            task = Task(
                company_id=company_id,
                client_id=client.id,
                title=f"Tâche complétée {i+1}",
                description="Tâche de démonstration",
                status=TaskStatus.TERMINE,
                completed_at=datetime.combine(completed_date, datetime.min.time()),
                assigned_to_id=user.id,
            )
            db.add(task)
        
        # Supprimer TOUTES les tâches automatiques existantes (même celles de plus de 30 jours)
        print("\n🗑️  Suppression des tâches automatiques existantes...")
        existing_auto_tasks = db.query(Task).filter(
            Task.company_id == company_id,
            Task.origin == "checklist"
        ).all()
        for task in existing_auto_tasks:
            db.delete(task)
        db.flush()
        print(f"  ✅ {len(existing_auto_tasks)} tâches automatiques supprimées")
        
        # Pas de nouvelles tâches automatiques pour avoir exactement 36 min/jour avec seulement les relances automatiques
        total_auto_tasks = 0
        print(f"  ✅ {tasks_this_week} tâches complétées créées")
        print(f"  ✅ {total_auto_tasks} nouvelles tâches automatiques créées (désactivées pour avoir exactement 36 min/jour)")
        
        # ==================== CONVERSATIONS AUTO-REPLY ====================
        print("\n💬 Création de conversations avec auto-reply...")
        
        # Supprimer TOUTES les conversations avec auto-reply existantes (même celles de plus de 30 jours)
        print("\n💬 Nettoyage des conversations avec auto-reply...")
        existing_conversations = db.query(Conversation).filter(
            Conversation.company_id == company_id,
            Conversation.auto_reply_sent == True
        ).all()
        existing_conversation_ids = [c.id for c in existing_conversations]
        
        if existing_conversation_ids:
            # Supprimer les messages
            existing_messages = db.query(InboxMessage).filter(InboxMessage.conversation_id.in_(existing_conversation_ids)).all()
            for message in existing_messages:
                db.delete(message)
            db.flush()
            print(f"    ✅ {len(existing_messages)} messages supprimés")
            
            # Supprimer les conversations
            for conversation in existing_conversations:
                db.delete(conversation)
            db.flush()
            print(f"  ✅ {len(existing_conversations)} conversations avec auto-reply supprimées")
        
        # Pas d'auto-replies pour avoir exactement 36 min/jour avec seulement les relances automatiques
        total_auto_replies = 0
        print(f"  ✅ {total_auto_replies} nouvelles conversations avec auto-reply créées (désactivées pour avoir exactement 36 min/jour)")
        
        # ==================== GRAPHIQUES (données historiques) ====================
        print("\n📈 Création de données historiques pour les graphiques...")
        
        # Factures payées sur les 6 derniers mois
        for month_offset in range(5, -1, -1):
            month_start = (date(today.year, today.month, 1) - timedelta(days=30*month_offset)).replace(day=1)
            if month_start.month == 12:
                month_end = date(month_start.year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = date(month_start.year, month_start.month + 1, 1) - timedelta(days=1)
            
            if month_end > today:
                month_end = today
            
            # Créer quelques factures pour ce mois
            invoices_count = random.randint(3, 8)
            for i in range(invoices_count):
                days_in_month = random.randint(0, (month_end - month_start).days)
                paid_date = month_start + timedelta(days=days_in_month)
                if paid_date > today:
                    continue
                
                client = random.choice(clients)
                invoice = Invoice(
                    company_id=company_id,
                    client_id=client.id,
                    number=f"FAC-{paid_date.year}-{str(invoice_counter).zfill(3)}",
                    status=InvoiceStatus.PAYEE,
                    paid_at=datetime.combine(paid_date, datetime.min.time()),
                    amount=Decimal(str(random.randint(800, 6000))),
                    total_ttc=Decimal(str(random.randint(960, 7200))),
                    subtotal_ht=Decimal(str(random.randint(800, 6000))),
                    total_tax=Decimal(str(random.randint(160, 1200))),
                )
                db.add(invoice)
                db.flush()
                
                for j in range(random.randint(1, 3)):
                    quantity = Decimal(str(random.randint(1, 5)))
                    unit_price_ht = Decimal(str(random.randint(200, 1500)))
                    tax_rate = Decimal("20.00")
                    subtotal_ht = quantity * unit_price_ht
                    tax_amount = subtotal_ht * tax_rate / 100
                    total_ttc = subtotal_ht + tax_amount
                    
                    line = InvoiceLine(
                        invoice_id=invoice.id,
                        description=f"Prestation {j+1}",
                        quantity=quantity,
                        unit_price_ht=unit_price_ht,
                        tax_rate=tax_rate,
                        subtotal_ht=subtotal_ht,
                        tax_amount=tax_amount,
                        total_ttc=total_ttc,
                        unit="unité",
                        order=j+1,
                    )
                    db.add(line)
                invoice_counter += 1
        
        # Devis envoyés sur les 4 dernières semaines
        for week_offset in range(3, -1, -1):
            week_start_date = week_start - timedelta(weeks=week_offset)
            week_end_date = week_start_date + timedelta(days=6)
            
            if week_end_date > today:
                week_end_date = today
            
            # Créer quelques devis pour cette semaine
            quotes_count = random.randint(2, 6)
            for i in range(quotes_count):
                days_in_week = random.randint(0, (week_end_date - week_start_date).days)
                sent_date = week_start_date + timedelta(days=days_in_week)
                if sent_date > today:
                    continue
                
                client = random.choice(clients)
                quote = Quote(
                    company_id=company_id,
                    client_id=client.id,
                    number=f"DEV-{sent_date.year}-{str(quote_counter).zfill(3)}",
                    status=random.choice([QuoteStatus.ENVOYE, QuoteStatus.VU, QuoteStatus.ACCEPTE]),
                    sent_at=datetime.combine(sent_date, datetime.min.time()),
                    amount=Decimal(str(random.randint(500, 5000))),
                    total_ttc=Decimal(str(random.randint(600, 6000))),
                    subtotal_ht=Decimal(str(random.randint(500, 5000))),
                    total_tax=Decimal(str(random.randint(100, 1000))),
                )
                db.add(quote)
                db.flush()
                
                for j in range(random.randint(1, 3)):
                    quantity = Decimal(str(random.randint(1, 5)))
                    unit_price_ht = Decimal(str(random.randint(100, 1000)))
                    tax_rate = Decimal("20.00")
                    subtotal_ht = quantity * unit_price_ht
                    tax_amount = subtotal_ht * tax_rate / 100
                    total_ttc = subtotal_ht + tax_amount
                    
                    line = QuoteLine(
                        quote_id=quote.id,
                        description=f"Prestation {j+1}",
                        quantity=quantity,
                        unit_price_ht=unit_price_ht,
                        tax_rate=tax_rate,
                        subtotal_ht=subtotal_ht,
                        tax_amount=tax_amount,
                        total_ttc=total_ttc,
                        unit="unité",
                        order=j+1,
                    )
                    db.add(line)
                quote_counter += 1
        
        print("  ✅ Données historiques créées")
        
        db.commit()
        
        print("\n" + "="*60)
        print("✅ Configuration terminée avec succès !")
        print("="*60)
        print(f"\n📊 Résumé:")
        print(f"   - Devis créés: {quotes_this_month + quotes_last_month}")
        print(f"   - Factures créées: {invoices_this_month + invoices_last_month + overdue_invoices}")
        print(f"   - Relances automatiques: {total_auto_followups}")
        print(f"   - Relances manuelles: {followups_manual}")
        print(f"   - Tâches complétées: {tasks_this_week}")
        print(f"   - Tâches automatiques: {total_auto_tasks}")
        print(f"   - Conversations auto-reply: {total_auto_replies}")
        print(f"\n⏱️  Temps gagné estimé:")
        print(f"   - Relances auto: {total_auto_followups} × 2 min = {total_auto_followups * 2} min")
        print(f"   - Auto-replies: {total_auto_replies} × 2 min = {total_auto_replies * 2} min")
        print(f"   - Tâches auto: {total_auto_tasks} × 1 min = {total_auto_tasks * 1} min")
        total_minutes = (total_auto_followups * 2) + (total_auto_replies * 2) + (total_auto_tasks * 1)
        print(f"   - Total: {total_minutes} min sur 30 jours")
        print(f"   - Moyenne par jour: ~{total_minutes // 30} min/jour")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de la configuration: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    from decimal import Decimal
    
    company_id = 6
    if len(sys.argv) > 1:
        try:
            company_id = int(sys.argv[1])
        except ValueError:
            print("❌ L'ID de l'entreprise doit être un nombre")
            sys.exit(1)
    
    setup_demo_dashboard(company_id)
