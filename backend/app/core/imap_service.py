"""
Service IMAP pour recevoir les emails directement depuis une boîte mail.
"""
import imaplib
import email
from email.message import Message
from email.header import decode_header
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import base64
import re
from html import unescape
from app.core.config import settings
import asyncio
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import uuid

executor = ThreadPoolExecutor(max_workers=2)


def decode_mime_words(s: str) -> str:
    """Décode les en-têtes MIME encodés."""
    decoded_fragments = decode_header(s)
    decoded_parts = []
    for fragment, encoding in decoded_fragments:
        if isinstance(fragment, bytes):
            decoded_parts.append(fragment.decode(encoding or 'utf-8', errors='ignore'))
        else:
            decoded_parts.append(fragment)
    return ''.join(decoded_parts)


def clean_html_to_text(html: str) -> str:
    """
    Extrait le texte brut d'un contenu HTML en supprimant les balises.
    """
    if not html:
        return ""
    
    # Décoder les entités HTML (&lt; devient <, etc.)
    text = unescape(html)
    
    # Supprimer les balises script et style avec leur contenu
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    
    # Remplacer les balises de type block par des sauts de ligne
    text = re.sub(r'</(div|p|br|h[1-6]|li|tr|td|th)>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<(div|p|br|h[1-6]|li|tr|td|th)[^>]*>', '\n', text, flags=re.IGNORECASE)
    
    # Supprimer toutes les autres balises HTML
    text = re.sub(r'<[^>]+>', '', text)
    
    # Nettoyer les espaces multiples
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def parse_email_message(msg: Message) -> Dict:
    """
    Parse un email et retourne un dictionnaire avec les informations extraites.
    """
    # Sujet
    subject = decode_mime_words(str(msg.get("Subject", "")))
    
    # Expéditeur
    from_header = msg.get("From", "")
    from_decoded = decode_mime_words(from_header)
    
    # Parser l'expéditeur (peut être "Nom <email@example.com>" ou juste "email@example.com")
    from_email = None
    from_name = "Inconnu"
    
    if "<" in from_decoded:
        match = re.search(r'<(.+?)>', from_decoded)
        if match:
            from_email = match.group(1).strip()
        from_name = from_decoded.split("<")[0].strip().strip('"')
        if not from_name:
            from_name = from_email or "Inconnu"
    else:
        from_email = from_decoded.strip()
        from_name = from_email or "Inconnu"
    
    # Destinataire
    to_header = msg.get("To", "")
    to_decoded = decode_mime_words(to_header)
    to_email = to_decoded.strip()
    
    # Message-ID
    message_id = msg.get("Message-ID", "").strip()
    if message_id:
        message_id = message_id.strip("<>")
    
    # In-Reply-To et References (pour faire le lien avec les réponses)
    in_reply_to = msg.get("In-Reply-To", "").strip()
    if in_reply_to:
        in_reply_to = in_reply_to.strip("<>")
    
    references = msg.get("References", "").strip()
    references_list = []
    if references:
        # References peut contenir plusieurs Message-IDs séparés par des espaces
        for ref in references.split():
            ref_clean = ref.strip().strip("<>")
            if ref_clean:
                references_list.append(ref_clean)
    
    # Date
    date_str = msg.get("Date", "")
    date_obj = None
    if date_str:
        try:
            from email.utils import parsedate_to_datetime
            date_obj = parsedate_to_datetime(date_str)
        except Exception:
            try:
                date_obj = datetime.strptime(date_str[:24], "%a, %d %b %Y %H:%M:%S")
            except Exception:
                pass
    
    # Contenu
    content = ""
    html_content = ""
    
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", ""))
            
            if "attachment" in content_disposition:
                continue
            
            try:
                body = part.get_payload(decode=True)
                if body:
                    charset = part.get_content_charset() or "utf-8"
                    decoded_body = body.decode(charset, errors="ignore")
                    
                    if content_type == "text/html":
                        html_content = decoded_body
                    elif content_type == "text/plain":
                        content = decoded_body
            except Exception as e:
                print(f"Erreur lors du décodage du contenu: {e}")
    else:
        try:
            body = msg.get_payload(decode=True)
            if body:
                charset = msg.get_content_charset() or "utf-8"
                decoded_body = body.decode(charset, errors="ignore")
                content_type = msg.get_content_type()
                if content_type == "text/html":
                    html_content = decoded_body
                else:
                    content = decoded_body
        except Exception as e:
            print(f"Erreur lors du décodage du contenu: {e}")
    
    # Si le contenu texte est vide mais qu'il y a du HTML, nettoyer le HTML
    if not content.strip() and html_content:
        content = clean_html_to_text(html_content)
    # Sinon, nettoyer aussi le HTML pour enlever les balises visibles
    elif html_content:
        # Nettoyer le HTML pour éviter d'afficher les balises
        cleaned_html = clean_html_to_text(html_content)
        # Garder le texte brut s'il existe, sinon utiliser le texte extrait du HTML
        if not content.strip():
            content = cleaned_html
    
    # Pièces jointes (avec contenu binaire)
    attachments = []
    if msg.is_multipart():
        for part in msg.walk():
            content_disposition = str(part.get("Content-Disposition", ""))
            if "attachment" in content_disposition:
                filename = part.get_filename()
                if filename:
                    decoded_filename = decode_mime_words(filename)
                    try:
                        # Télécharger le contenu binaire de la pièce jointe
                        attachment_data = part.get_payload(decode=True)
                        if attachment_data:
                            attachments.append({
                                "filename": decoded_filename,
                                "content_type": part.get_content_type(),
                                "content": attachment_data,  # Contenu binaire
                            })
                    except Exception as e:
                        print(f"Erreur lors du téléchargement de la pièce jointe {decoded_filename}: {e}")
                        # Ajouter quand même les métadonnées même si le téléchargement échoue
                        attachments.append({
                            "filename": decoded_filename,
                            "content_type": part.get_content_type(),
                            "content": None,
                        })
    
    return {
        "from": {
            "name": from_name,
            "email": from_email,
        },
        "to": to_email,
        "subject": subject,
        "content": content,        # Plain text content (cleaned from HTML)
        "html_content": html_content, # HTML content (original, if needed)
        "attachments": attachments,
        "message_id": message_id,
        "in_reply_to": in_reply_to,  # Message-ID du message auquel on répond
        "references": references_list,  # Liste des Message-IDs de référence
        "date": date_obj.isoformat() if date_obj else datetime.utcnow().isoformat(),
    }


def fetch_emails_imap(
    imap_server: str,
    imap_port: int,
    email_address: str,
    password: str,
    company_code: str,
    use_ssl: bool = True,
    since_hours: Optional[int] = None
) -> List[Dict]:
    """
    Récupère les nouveaux emails depuis un serveur IMAP.
    """
    mail = None
    try:
        # Nettoyer le mot de passe (supprimer les espaces pour Gmail)
        cleaned_password = password.replace(" ", "").strip()
        
        print(f"[IMAP] Connexion à {imap_server}:{imap_port} (SSL: {use_ssl})")
        if use_ssl:
            mail = imaplib.IMAP4_SSL(imap_server, imap_port)
        else:
            mail = imaplib.IMAP4(imap_server, imap_port)
        
        print(f"[IMAP] Connexion établie, authentification pour {email_address}")
        try:
            login_result = mail.login(email_address, cleaned_password)
            print(f"[IMAP] Authentification réussie: {login_result}")
        except imaplib.IMAP4.error as e:
            error_str = str(e)
            error_msg = f"Erreur d'authentification IMAP pour {email_address}: {error_str}"
            print(f"[IMAP] {error_msg}")
            
            # Messages d'erreur spécifiques pour Gmail
            if "gmail.com" in imap_server.lower():
                if "535" in error_str or "not accepted" in error_str.lower():
                    raise Exception(
                        f"Erreur d'authentification Gmail. "
                        f"Vérifiez que:\n"
                        f"1. Vous utilisez un mot de passe d'application (pas votre mot de passe Gmail)\n"
                        f"2. L'authentification à 2 facteurs est activée\n"
                        f"3. Le mot de passe d'application est correct (16 caractères sans espaces)\n"
                        f"Détails: {error_str}"
                    )
                elif "connection" in error_str.lower() or "timeout" in error_str.lower():
                    raise Exception(
                        f"Impossible de se connecter à Gmail. "
                        f"Vérifiez votre connexion internet et que Gmail IMAP est activé. "
                        f"Détails: {error_str}"
                    )
            
            raise Exception(f"Échec de l'authentification: {error_str}")
        
        print(f"[IMAP] Sélection de la boîte INBOX")
        select_result = mail.select("INBOX")
        print(f"[IMAP] INBOX sélectionné: {select_result}")
        
        # Calculer la date depuis laquelle récupérer les emails
        # Si since_hours est fourni, utiliser cette période (en heures)
        # Sinon, utiliser 14 jours par défaut (pour la première sync)
        if since_hours is not None:
            since_date = datetime.utcnow() - timedelta(hours=since_hours)
        else:
            since_date = datetime.utcnow() - timedelta(days=14)
        
        # Formater la date au format IMAP (DD-MMM-YYYY) - format: "01-Jan-2024"
        date_str = since_date.strftime("%d-%b-%Y")
        
        # Chercher tous les emails (lus et non lus) depuis la date calculée
        days_ago = (datetime.utcnow() - since_date).days
        hours_ago = (datetime.utcnow() - since_date).total_seconds() / 3600
        period_str = f"{days_ago} jours" if days_ago >= 1 else f"{int(hours_ago)} heures"
        print(f"[IMAP] Recherche des emails depuis le {date_str} ({period_str})")
        search_criteria = f'(SINCE {date_str})'
        status, messages = mail.search(None, search_criteria)
        email_ids = messages[0].split() if messages[0] else []
        print(f"[IMAP] {len(email_ids)} email(s) trouvé(s) ({period_str})")
        
        parsed_emails = []
        
        for email_id in email_ids:
            try:
                # Récupérer l'email
                status, msg_data = mail.fetch(email_id, "(RFC822)")
                email_body = msg_data[0][1]
                
                # Parser l'email
                msg = email.message_from_bytes(email_body)
                parsed = parse_email_message(msg)
                
                # Ajouter le company_code pour le webhook
                parsed["company_code"] = company_code
                
                # Ajouter l'UID IMAP pour pouvoir supprimer l'email plus tard
                # email_id est en bytes, on le décode en string
                parsed["imap_uid"] = email_id.decode('utf-8') if isinstance(email_id, bytes) else str(email_id)
                
                parsed_emails.append(parsed)
                
                # Marquer comme lu (optionnel)
                # mail.store(email_id, '+FLAGS', '\\Seen')
                
            except Exception as e:
                print(f"Erreur lors du traitement de l'email {email_id}: {e}")
                continue
        
        if mail:
            try:
                mail.close()
            except:
                pass
            try:
                mail.logout()
            except:
                pass
        
        print(f"[IMAP] {len(parsed_emails)} email(s) parsé(s) avec succès")
        return parsed_emails
        
    except imaplib.IMAP4.error as e:
        error_msg = f"Erreur IMAP pour {email_address} ({imap_server}): {str(e)}"
        print(f"[IMAP] {error_msg}")
        if mail:
            try:
                mail.logout()
            except:
                pass
        raise Exception(f"Erreur de connexion IMAP: {str(e)}")
    except Exception as e:
        error_msg = f"Erreur inattendue IMAP pour {email_address}: {str(e)}"
        print(f"[IMAP] {error_msg}")
        import traceback
        traceback.print_exc()
        if mail:
            try:
                mail.logout()
            except:
                pass
        raise Exception(f"Erreur lors de la récupération des emails: {str(e)}")


def get_message_ids_from_imap(
    imap_server: str,
    imap_port: int,
    email_address: str,
    password: str,
    use_ssl: bool = True
) -> List[str]:
    """
    Récupère tous les Message-IDs présents sur le serveur IMAP.
    Pour Gmail, utilise le dossier "[Gmail]/All Mail" (tous les messages).
    Pour les autres, utilise INBOX.
    Utilisé pour détecter les emails supprimés.
    
    Returns:
        Liste des Message-IDs présents
    """
    mail = None
    try:
        # Nettoyer le mot de passe (supprimer les espaces pour Gmail)
        cleaned_password = password.replace(" ", "").strip()
        
        print(f"[IMAP SYNC] Connexion à {imap_server}:{imap_port} (SSL: {use_ssl}) pour récupérer les Message-IDs")
        if use_ssl:
            mail = imaplib.IMAP4_SSL(imap_server, imap_port)
        else:
            mail = imaplib.IMAP4(imap_server, imap_port)
        
        print(f"[IMAP SYNC] Authentification pour {email_address}")
        mail.login(email_address, cleaned_password)
        
        # Déterminer le dossier à utiliser
        is_gmail = "gmail.com" in imap_server.lower() or "gmail" in imap_server.lower()
        folder_to_search = "INBOX"
        
        if is_gmail:
            # Pour Gmail, essayer de trouver le dossier "All Mail"
            print(f"[IMAP SYNC] Détection Gmail, recherche du dossier '[Gmail]/All Mail'")
            try:
                # Lister tous les dossiers
                status, folder_list = mail.list()
                all_mail_found = False
                
                # Noms possibles pour le dossier "All Mail" dans Gmail
                all_mail_names = [
                    "[Gmail]/All Mail",
                    "[Google Mail]/All Mail",
                    "All Mail",
                    "[Gmail]/Tous les messages",
                ]
                
                for folder_info in folder_list:
                    folder_str = folder_info.decode('utf-8')
                    # Chercher les noms entre guillemets
                    matches = re.findall(r'"([^"]+)"', folder_str)
                    for match in matches:
                        if match in all_mail_names:
                            folder_to_search = match
                            all_mail_found = True
                            print(f"[IMAP SYNC] Dossier 'All Mail' trouvé: {folder_to_search}")
                            break
                    if all_mail_found:
                        break
                
                if not all_mail_found:
                    print(f"[IMAP SYNC] Dossier 'All Mail' non trouvé, utilisation de INBOX")
                    folder_to_search = "INBOX"
            except Exception as e:
                print(f"[IMAP SYNC] Erreur lors de la recherche du dossier All Mail: {e}, utilisation de INBOX")
                folder_to_search = "INBOX"
        
        print(f"[IMAP SYNC] Sélection du dossier: {folder_to_search}")
        try:
            mail.select(folder_to_search)
        except Exception as e:
            print(f"[IMAP SYNC] Erreur lors de la sélection de {folder_to_search}, utilisation de INBOX: {e}")
            folder_to_search = "INBOX"
            mail.select("INBOX")
        
        # Calculer la date d'il y a 14 jours (même période que la synchronisation)
        fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
        date_str = fourteen_days_ago.strftime("%d-%b-%Y")
        
        # Chercher tous les emails des 14 derniers jours
        print(f"[IMAP SYNC] Recherche des Message-IDs depuis le {date_str} (14 derniers jours) dans {folder_to_search}")
        search_criteria = f'(SINCE {date_str})'
        status, messages = mail.search(None, search_criteria)
        email_ids = messages[0].split() if messages[0] else []
        print(f"[IMAP SYNC] {len(email_ids)} email(s) trouvé(s) dans {folder_to_search}")
        
        message_ids = []
        
        # Pour chaque email, récupérer uniquement le Message-ID (sans charger tout l'email)
        for email_id in email_ids:
            try:
                # Récupérer uniquement les en-têtes (plus rapide que RFC822)
                status, msg_data = mail.fetch(email_id, "(BODY[HEADER.FIELDS (MESSAGE-ID)])")
                if msg_data[0] and msg_data[0][1]:
                    header_data = msg_data[0][1]
                    if isinstance(header_data, bytes):
                        header_str = header_data.decode('utf-8', errors='ignore')
                    else:
                        header_str = str(header_data)
                    
                    # Extraire le Message-ID de l'en-tête
                    # Format: "Message-ID: <xxx@example.com>"
                    message_id_match = re.search(r'Message-ID:\s*<(.+?)>', header_str, re.IGNORECASE)
                    if message_id_match:
                        message_id = message_id_match.group(1).strip()
                        message_ids.append(message_id)
                        print(f"[IMAP SYNC] Message-ID trouvé: {message_id[:50]}...")
            except Exception as e:
                print(f"[IMAP SYNC] Erreur lors de la récupération du Message-ID pour l'email {email_id}: {e}")
                continue
        
        if mail:
            try:
                mail.close()
            except:
                pass
            try:
                mail.logout()
            except:
                pass
        
        print(f"[IMAP SYNC] {len(message_ids)} Message-ID(s) récupéré(s) depuis {folder_to_search}")
        return message_ids
        
    except Exception as e:
        error_msg = f"Erreur lors de la récupération des Message-IDs IMAP: {str(e)}"
        print(f"[IMAP SYNC] {error_msg}")
        import traceback
        traceback.print_exc()
        if mail:
            try:
                mail.logout()
            except:
                pass
        # En cas d'erreur, retourner une liste vide plutôt que d'échouer complètement
        # Cela évite de supprimer des emails par erreur si la connexion IMAP échoue
        return []


def delete_email_imap(
    imap_server: str,
    imap_port: int,
    email_address: str,
    password: str,
    message_id: str,
    use_ssl: bool = True
) -> bool:
    """
    Déplace un email vers la corbeille (Trash) sur le serveur IMAP en utilisant son Message-ID.
    Retourne True si le déplacement a réussi, False sinon.
    """
    mail = None
    try:
        # Nettoyer le mot de passe (supprimer les espaces pour Gmail)
        cleaned_password = password.replace(" ", "").strip()
        
        print(f"[IMAP DELETE] Connexion à {imap_server}:{imap_port} (SSL: {use_ssl})")
        if use_ssl:
            mail = imaplib.IMAP4_SSL(imap_server, imap_port)
        else:
            mail = imaplib.IMAP4(imap_server, imap_port)
        
        print(f"[IMAP DELETE] Authentification pour {email_address}")
        mail.login(email_address, cleaned_password)
        
        print(f"[IMAP DELETE] Sélection de la boîte INBOX")
        mail.select("INBOX")
        
        # Rechercher l'email par Message-ID
        # Format: Message-ID avec ou sans < >
        search_id = message_id
        if not search_id.startswith("<"):
            search_id = f"<{search_id}>"
        if not search_id.endswith(">"):
            search_id = f"{search_id}>"
        
        print(f"[IMAP DELETE] Recherche de l'email avec Message-ID: {search_id}")
        status, messages = mail.search(None, f'HEADER Message-ID "{search_id}"')
        
        email_ids = messages[0].split() if messages[0] else []
        
        if not email_ids:
            print(f"[IMAP DELETE] Aucun email trouvé avec ce Message-ID")
            return False
        
        # Trouver le dossier de corbeille (Trash)
        trash_folder = None
        
        # Lister les dossiers disponibles
        status, folder_list = mail.list()
        available_folders = []
        
        # Parser les dossiers disponibles (plusieurs formats possibles)
        import re
        print(f"[IMAP DELETE] DEBUG: Analyse des dossiers IMAP (raw):")
        for folder_info in folder_list:
            raw_str = folder_info.decode('utf-8')
            print(f"  RAW: {raw_str}")
        
        for folder_info in folder_list:
            folder_str = folder_info.decode('utf-8')
            folder_name = None
            
            # Format IMAP LIST peut être:
            # - '(\HasNoChildren) "/" "INBOX"'
            # - '(\HasNoChildren) "/" "INBOX/Trash"'
            # - '(\HasNoChildren) "." "INBOX"'
            # - '(\HasNoChildren) "INBOX" "INBOX"'
            # Pour OVH, peut être différent
            
            # Méthode 1: Chercher tous les noms entre guillemets
            matches = re.findall(r'"([^"]+)"', folder_str)
            if matches:
                print(f"  Matches trouvés: {matches}")
                # Le séparateur est généralement la partie entre les guillemets
                # Le nom du dossier est généralement la dernière partie entre guillemets
                separators = ['/', '.', '\\']
                for match in reversed(matches):
                    match_clean = match.strip()
                    if match_clean and match_clean not in separators:
                        # Si le match contient un séparateur, c'est un chemin complet
                        if '/' in match_clean or '\\' in match_clean:
                            folder_name = match_clean
                        else:
                            folder_name = match_clean
                        print(f"  -> Nom de dossier extrait: {folder_name}")
                        break
            
            # Méthode 2: Si pas trouvé, parser le format standard IMAP
            if not folder_name:
                parts = folder_str.split('"')
                print(f"  Parts split par '\"': {parts}")
                for i in range(len(parts) - 1, -1, -1):
                    part = parts[i].strip()
                    if part and part not in ['/', '.', '\\', '']:
                        if not part.startswith('(') and not part.endswith(')'):
                            folder_name = part
                            print(f"  -> Nom de dossier extrait (méthode 2): {folder_name}")
                            break
            
            if folder_name and folder_name not in available_folders and folder_name != '.':
                available_folders.append(folder_name)
        
        # Si on n'a trouvé que '.', essayer de lister différemment
        if len(available_folders) <= 1 and ('.' in available_folders or not available_folders):
            print(f"[IMAP DELETE] Parsing initial échoué, essai avec LIST pattern '*'")
            try:
                status2, folder_list2 = mail.list(pattern='*')
                print(f"[IMAP DELETE] Pattern '*': {len(folder_list2)} résultats")
                for folder_info in folder_list2:
                    folder_str = folder_info.decode('utf-8')
                    print(f"  Pattern '*': {folder_str}")
                    matches = re.findall(r'"([^"]+)"', folder_str)
                    for match in matches:
                        match_clean = match.strip()
                        if match_clean and match_clean not in ['/', '.', '\\', ''] and match_clean not in available_folders:
                            available_folders.append(match_clean)
            except Exception as e:
                print(f"[IMAP DELETE] Erreur lors de la 2e tentative de liste: {e}")
        
        # Nettoyer la liste (retirer les séparateurs)
        available_folders = [f for f in available_folders if f and f not in ['/', '.', '\\']]
        available_folders = list(dict.fromkeys(available_folders))  # Retirer doublons
        
        print(f"[IMAP DELETE] Dossiers disponibles après parsing: {available_folders}")
        
        # Liste prioritaire des noms de corbeille (du plus spécifique au plus générique)
        # Pour OVH, INBOX.INBOX.Trash semble être le vrai dossier de corbeille visible dans l'interface
        trash_patterns = [
            "[Gmail]/Trash",  # Gmail
            "INBOX.INBOX.Trash",  # OVH - vrai dossier corbeille visible (prioritaire)
            "INBOX.INBOX.Corbeille",  # OVH français - vrai dossier corbeille
            "Corbeille",  # OVH français
            "Trash",  # Standard anglais
            "INBOX/Trash",  # Format avec séparateur /
            "INBOX.Trash",  # Format avec séparateur . (peut être un dossier système, utiliser en dernier recours)
            "INBOX\\Trash",  # Format avec séparateur \ (Windows)
            "Deleted Messages",  # Outlook/Exchange
            "INBOX.Deleted",  # Alternative
            "INBOX/Deleted",  # Alternative avec /
            "INBOX\\Deleted",  # Alternative avec \
            "INBOX/Corbeille",  # OVH avec INBOX
            "INBOX.Corbeille",  # OVH avec INBOX et .
            "INBOX\\Corbeille",  # OVH avec INBOX et \
        ]
        
        # Aussi chercher des variations avec différents séparateurs pour chaque pattern
        # (certains serveurs utilisent des formats différents)
        
        # Chercher d'abord avec correspondance exacte
        for trash_name in trash_patterns:
            if trash_name in available_folders:
                trash_folder = trash_name
                print(f"[IMAP DELETE] Dossier corbeille trouvé (correspondance exacte): {trash_folder}")
                break
        
        # Si pas trouvé, chercher avec correspondance partielle (insensible à la casse)
        if not trash_folder:
            for folder in available_folders:
                folder_lower = folder.lower()
                # Chercher des mots-clés
                keywords = ['trash', 'corbeille', 'deleted', 'supprim', 'poubelle']
                for keyword in keywords:
                    if keyword in folder_lower:
                        trash_folder = folder
                        print(f"[IMAP DELETE] Dossier corbeille trouvé (recherche partielle): {trash_folder}")
                        break
                if trash_folder:
                    break
        
        # Si toujours pas trouvé, essayer de créer le dossier Trash
        if not trash_folder:
            print(f"[IMAP DELETE] Aucun dossier corbeille trouvé, tentative de création...")
            try:
                # Essayer de créer "Trash"
                mail.create("Trash")
                trash_folder = "Trash"
                print(f"[IMAP DELETE] Dossier 'Trash' créé avec succès")
            except Exception as e:
                print(f"[IMAP DELETE] Impossible de créer le dossier Trash: {e}")
                # Essayer "Corbeille" pour OVH français
                try:
                    mail.create("Corbeille")
                    trash_folder = "Corbeille"
                    print(f"[IMAP DELETE] Dossier 'Corbeille' créé avec succès")
                except Exception as e2:
                    print(f"[IMAP DELETE] Impossible de créer le dossier Corbeille: {e2}")
        
        if not trash_folder:
            print(f"[IMAP DELETE] ERREUR: Aucun dossier corbeille trouvé parmi les dossiers disponibles.")
            print(f"[IMAP DELETE] Dossiers disponibles: {available_folders}")
            print(f"[IMAP DELETE] L'email ne sera PAS supprimé pour éviter la perte de données.")
            mail.close()
            mail.logout()
            return False
        
        # Déplacer tous les emails trouvés vers la corbeille
        moved_count = 0
        for email_id in email_ids:
            try:
                if trash_folder:
                    # Copier vers la corbeille
                    try:
                        copy_result = mail.copy(email_id, trash_folder)
                        print(f"[IMAP DELETE] Résultat copie vers {trash_folder}: {copy_result}")
                        
                        if copy_result[0] == 'OK':
                            print(f"[IMAP DELETE] Email {email_id.decode('utf-8')} copié vers {trash_folder}")
                            
                            # Vérifier que l'email existe bien dans le dossier trash avant de supprimer de INBOX
                            try:
                                # Sélectionner le dossier trash pour vérifier
                                trash_select = mail.select(trash_folder)
                                if trash_select[0] == 'OK':
                                    # Chercher l'email dans le dossier trash par Message-ID
                                    status, trash_messages = mail.search(None, f'HEADER Message-ID "{search_id}"')
                                    if trash_messages[0] and trash_messages[0].strip():
                                        print(f"[IMAP DELETE] Vérification: Email trouvé dans {trash_folder}, suppression de INBOX autorisée")
                                        # Revenir à INBOX
                                        mail.select("INBOX")
                                        
                                        # Marquer comme supprimé dans INBOX
                                        store_result = mail.store(email_id, '+FLAGS', '\\Deleted')
                                        print(f"[IMAP DELETE] Résultat marquage comme supprimé: {store_result}")
                                        
                                        moved_count += 1
                                    else:
                                        print(f"[IMAP DELETE] ERREUR: Email non trouvé dans {trash_folder} après copie, suppression annulée")
                                        mail.select("INBOX")  # Revenir à INBOX
                                        continue
                                else:
                                    print(f"[IMAP DELETE] Avertissement: Impossible de sélectionner {trash_folder} pour vérification")
                                    # Revenir à INBOX et continuer quand même
                                    mail.select("INBOX")
                                    mail.store(email_id, '+FLAGS', '\\Deleted')
                                    moved_count += 1
                            except Exception as verify_error:
                                print(f"[IMAP DELETE] Erreur lors de la vérification dans {trash_folder}: {verify_error}")
                                # Revenir à INBOX
                                try:
                                    mail.select("INBOX")
                                except:
                                    pass
                                # Ne pas supprimer si la vérification échoue
                                continue
                        else:
                            # Si la copie échoue, essayer de sélectionner le dossier trash d'abord
                            print(f"[IMAP DELETE] Première tentative de copie échouée, essai avec sélection du dossier...")
                            try:
                                # Sélectionner le dossier trash
                                mail.select(trash_folder)
                                # Revenir à INBOX
                                mail.select("INBOX")
                                # Réessayer la copie
                                copy_result2 = mail.copy(email_id, trash_folder)
                                if copy_result2[0] == 'OK':
                                    print(f"[IMAP DELETE] Email {email_id.decode('utf-8')} copié vers {trash_folder} (2e tentative)")
                                    mail.store(email_id, '+FLAGS', '\\Deleted')
                                    moved_count += 1
                                else:
                                    print(f"[IMAP DELETE] Échec de la copie après 2 tentatives: {copy_result2}")
                            except Exception as e2:
                                print(f"[IMAP DELETE] Erreur lors de la 2e tentative de copie: {e2}")
                    except Exception as copy_error:
                        print(f"[IMAP DELETE] Exception lors de la copie vers {trash_folder}: {copy_error}")
                        # En cas d'erreur, ne pas supprimer définitivement, laisser l'email dans INBOX
                        continue
                else:
                    # Pas de corbeille trouvée - NE PAS supprimer définitivement pour éviter la perte de données
                    print(f"[IMAP DELETE] ERREUR: Aucun dossier corbeille trouvé. L'email n'a PAS été supprimé pour éviter la perte de données.")
                    print(f"[IMAP DELETE] Dossiers disponibles: {available_folders}")
                    # Retourner False pour indiquer l'échec
                    mail.close()
                    mail.logout()
                    return False
            except Exception as e:
                print(f"[IMAP DELETE] Erreur lors du déplacement de l'email {email_id}: {e}")
                continue
        
        # Expurger les emails marqués comme supprimés dans INBOX
        if moved_count > 0:
            mail.expunge()
            if trash_folder:
                print(f"[IMAP DELETE] {moved_count} email(s) déplacé(s) vers {trash_folder}")
            else:
                print(f"[IMAP DELETE] {moved_count} email(s) supprimé(s) définitivement")
        
        mail.close()
        mail.logout()
        
        return moved_count > 0
        
    except Exception as e:
        error_msg = f"Erreur lors du déplacement IMAP vers la corbeille: {str(e)}"
        print(f"[IMAP DELETE] {error_msg}")
        import traceback
        traceback.print_exc()
        if mail:
            try:
                mail.logout()
            except:
                pass
        return False


async def fetch_emails_async(
    imap_server: str,
    imap_port: int,
    email_address: str,
    password: str,
    company_code: str,
    use_ssl: bool = True,
    since_hours: Optional[int] = None
) -> List[Dict]:
    """Version asynchrone de fetch_emails_imap."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        executor,
        fetch_emails_imap,
        imap_server,
        imap_port,
        email_address,
        password,
        company_code,
        use_ssl,
        since_hours
    )


async def delete_email_imap_async(
    imap_server: str,
    imap_port: int,
    email_address: str,
    password: str,
    message_id: str,
    use_ssl: bool = True
) -> bool:
    """Version asynchrone de delete_email_imap."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        executor,
        delete_email_imap,
        imap_server,
        imap_port,
        email_address,
        password,
        message_id,
        use_ssl
    )


async def get_message_ids_from_imap_async(
    imap_server: str,
    imap_port: int,
    email_address: str,
    password: str,
    use_ssl: bool = True
) -> List[str]:
    """Version asynchrone de get_message_ids_from_imap."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        executor,
        get_message_ids_from_imap,
        imap_server,
        imap_port,
        email_address,
        password,
        use_ssl
    )
