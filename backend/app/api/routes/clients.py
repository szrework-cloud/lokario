from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
import re
import logging
from app.db.session import get_db
from app.db.models.client import Client
from app.api.schemas.client import ClientCreate, ClientUpdate, ClientRead, ClientWithStats
from app.api.deps import get_current_active_user
from app.db.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clients", tags=["clients"])


def clean_control_characters(text: str) -> str:
    """
    Nettoie une chaîne en supprimant les caractères problématiques pour PostgreSQL.
    Supprime les caractères de contrôle, les caractères invalides, et normalise l'encodage.
    """
    if not text:
        return text
    
    try:
        # D'abord, essayer de décoder/re-encoder pour éliminer les caractères invalides
        # Cela gère les problèmes d'encodage comme 'ð' qui est un caractère mal encodé
        text = text.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
    except:
        pass
    
    # Supprimer les caractères de contrôle problématiques (0x00-0x1F sauf \n, \r, \t)
    # Garder seulement les caractères imprimables et les retours à la ligne normaux
    cleaned = ''.join(
        char for char in text 
        if (ord(char) >= 32 and ord(char) < 0xD800) or char in '\n\r\t'
        # Exclure les caractères de substitution (0xFFFD) et autres caractères problématiques
        and ord(char) != 0xFFFD
    )
    
    # Nettoyer les espaces multiples (mais PAS les retours à la ligne, nécessaires pour le CSV)
    # Remplacer seulement les espaces/tabs multiples par un seul espace, en préservant les \n et \r
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)  # Remplacer espaces/tabs multiples par un seul espace
    # Nettoyer les retours à la ligne multiples (mais garder au moins un \n)
    cleaned = re.sub(r'\n\s*\n+', '\n', cleaned)  # Remplacer lignes vides multiples par une seule ligne vide
    cleaned = cleaned.strip()
    
    return cleaned


def sanitize_csv_text(text: str) -> str:
    """
    Nettoie le texte CSV en corrigeant les problèmes de format, notamment les retours à la ligne
    dans les champs non quotés. Cette fonction est une solution de contournement pour les CSV malformés.
    """
    if not text:
        return text
    
    lines = text.split('\n')
    if len(lines) < 2:
        return text
    
    # Lire l'en-tête et nettoyer les caractères de contrôle
    header = clean_control_characters(lines[0])
    sanitized_lines = [header]
    
    # Compter le nombre de colonnes attendues
    try:
        header_reader = csv.reader([header])
        expected_cols = len(next(header_reader))
    except:
        # Fallback : compter les virgules (approximation)
        expected_cols = header.count(',') + 1
    
    # Traiter les lignes de données
    i = 1
    while i < len(lines):
        line = clean_control_characters(lines[i].rstrip('\r'))
        
        if not line.strip():
            i += 1
            continue
        
        # Essayer de parser la ligne pour voir si elle est valide
        is_valid = False
        try:
            test_reader = csv.reader([line])
            row = next(test_reader)
            if len(row) == expected_cols:
                is_valid = True
        except (csv.Error, StopIteration):
            pass
        
        if is_valid:
            # La ligne est valide
            sanitized_lines.append(line)
            i += 1
        else:
            # La ligne n'est pas valide, probablement à cause d'un retour à la ligne dans un champ
            # Concaténer avec les lignes suivantes jusqu'à avoir une ligne valide
            combined = line
            j = i + 1
            max_attempts = 20  # Limiter les tentatives
            attempts = 0
            
            while j < len(lines) and attempts < max_attempts:
                next_line = lines[j].rstrip('\r')
                if not next_line.strip():
                    j += 1
                    continue
                
                # Ajouter un espace au lieu d'un retour à la ligne
                combined += " " + next_line
                
                # Tester si la ligne combinée est maintenant valide
                try:
                    test_reader = csv.reader([combined])
                    row = next(test_reader)
                    if len(row) == expected_cols:
                        is_valid = True
                        break
                except (csv.Error, StopIteration):
                    pass
                
                j += 1
                attempts += 1
            
            if is_valid:
                sanitized_lines.append(combined)
            else:
                # Si on n'a pas réussi à créer une ligne valide, utiliser la ligne originale
                # et remplacer les retours à la ligne par des espaces
                sanitized_lines.append(combined.replace('\n', ' ').replace('\r', ' '))
            
            i = j
    
    return '\n'.join(sanitized_lines)


@router.get("", response_model=List[ClientRead])
def get_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),  # Augmenté à 10000 pour permettre l'export complet
    search: Optional[str] = Query(None, description="Recherche par nom, email, téléphone"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère la liste des clients de l'entreprise de l'utilisateur.
    Chaque entreprise voit uniquement ses propres clients.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Base query : filtrer par company_id
    query = db.query(Client).filter(Client.company_id == current_user.company_id)
    
    # Recherche optionnelle
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            (Client.name.ilike(search_term)) |
            (Client.email.ilike(search_term)) |
            (Client.phone.ilike(search_term))
        )
    
    # Pagination
    clients = query.order_by(Client.name.asc()).offset(skip).limit(limit).all()
    
    return clients


@router.get("/{client_id}", response_model=ClientRead)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Récupère un client spécifique par son ID.
    Vérifie que le client appartient à l'entreprise de l'utilisateur.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.company_id == current_user.company_id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    return client


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Crée un nouveau client pour l'entreprise de l'utilisateur.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Créer le client
    client = Client(
        company_id=current_user.company_id,
        name=client_data.name,
        email=client_data.email,
        phone=client_data.phone,
        sector=client_data.sector,
        address=client_data.address,
        city=client_data.city,
        postal_code=client_data.postal_code,
        country=client_data.country,
        siret=client_data.siret,
        notes=client_data.notes,
        type=client_data.type or "Client",
        tags=client_data.tags or [],
    )
    
    db.add(client)
    db.commit()
    db.refresh(client)
    
    return client


@router.patch("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Met à jour un client existant.
    Vérifie que le client appartient à l'entreprise de l'utilisateur.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.company_id == current_user.company_id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Mettre à jour uniquement les champs fournis
    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Supprime un client.
    Vérifie que le client appartient à l'entreprise de l'utilisateur.
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.company_id == current_user.company_id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    db.delete(client)
    db.commit()
    
    return


@router.post("/import", response_model=dict)
async def import_clients_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Importe des clients depuis un fichier CSV.
    Format attendu : Nom, Email, Téléphone, Adresse, Ville, Code postal, Pays, SIRET
    """
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not attached to a company"
        )
    
    # Vérifier que c'est un fichier CSV
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier doit être au format CSV"
        )
    
    company_id = current_user.company_id
    created_count = 0
    updated_count = 0
    error_count = 0
    errors = []
    
    try:
        # Lire le contenu du fichier
        content = await file.read()
        
        # Détecter si c'est un fichier Excel/Numbers (format binaire) plutôt qu'un CSV texte
        # Les fichiers Excel/Numbers commencent souvent par des signatures binaires spécifiques
        excel_signatures = [
            b'PK\x03\x04',  # ZIP/Excel (.xlsx)
            b'\xd0\xcf\x11\xe0',  # OLE2/Excel (.xls)
            b'PK\x05\x06',  # ZIP (Numbers peut utiliser ZIP)
        ]
        
        is_binary = any(content.startswith(sig) for sig in excel_signatures)
        
        # Vérifier aussi si le fichier contient beaucoup de caractères non-textuels
        if not is_binary:
            # Compter les caractères non-textuels (hors ASCII imprimable, \n, \r, \t)
            non_text_count = sum(1 for b in content[:1000] if b < 32 and b not in [9, 10, 13])
            if non_text_count > 50:  # Si plus de 5% de caractères non-textuels dans les 1000 premiers bytes
                is_binary = True
        
        if is_binary:
            logger.error(f"[CSV Import] Fichier détecté comme binaire (Excel/Numbers), pas un CSV texte")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Le fichier semble être un fichier Excel ou Numbers, pas un fichier CSV texte. "
                    "Veuillez exporter votre fichier en format CSV depuis Excel/Numbers : "
                    "Fichier > Exporter > CSV (ou Format CSV)."
                )
            )
        
        logger.info(f"[CSV Import] Début import: {file.filename} ({len(content) / (1024*1024):.2f} MB)")
        logger.info(f"[CSV Import] Premiers 200 bytes (hex): {content[:200].hex()}")
        logger.info(f"[CSV Import] Premiers 200 bytes (repr): {repr(content[:200])}")
        
        # Décoder en UTF-8 (gérer BOM si présent)
        try:
            text = content.decode('utf-8-sig')  # utf-8-sig gère le BOM
            logger.info(f"[CSV Import] Décodage UTF-8-sig réussi")
        except UnicodeDecodeError:
            try:
                text = content.decode('latin-1')
                logger.info(f"[CSV Import] Décodage Latin-1 réussi")
            except UnicodeDecodeError:
                logger.error(f"[CSV Import] Impossible de décoder le fichier (ni UTF-8, ni Latin-1)")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Impossible de décoder le fichier. Utilisez UTF-8 ou Latin-1."
                )
        
        # Log les premiers caractères du texte décodé
        logger.info(f"[CSV Import] Premiers 500 caractères du texte décodé: {repr(text[:500])}")
        
        # Normaliser les retours à la ligne (unifier en \n)
        text_normalized = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Supprimer les caractères de contrôle problématiques (NUL, etc.)
        text_normalized = clean_control_characters(text_normalized)
        
        logger.info(f"[CSV Import] Texte normalisé - longueur: {len(text_normalized)} caractères")
        logger.info(f"[CSV Import] Premiers 500 caractères après normalisation: {repr(text_normalized[:500])}")
        
        # Nettoyer le CSV pour corriger les problèmes de format (retours à la ligne dans les champs non quotés)
        try:
            text_sanitized = sanitize_csv_text(text_normalized)
        except Exception as e:
            # Si le nettoyage échoue, utiliser le texte original
            text_sanitized = text_normalized
        
        # Parser le CSV avec une configuration robuste
        csv_file = io.StringIO(text_sanitized)
        
        try:
            csv_reader = csv.DictReader(
                csv_file,
                quoting=csv.QUOTE_MINIMAL,
                doublequote=True,
                skipinitialspace=True
            )
        except csv.Error as e:
            # Si erreur de parsing CSV, fournir un message plus clair
            error_msg = str(e)
            if "new-line character seen in unquoted field" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Erreur de format CSV : des champs contiennent des retours à la ligne "
                        "sans être entre guillemets. Le fichier a été automatiquement corrigé mais "
                        "l'erreur persiste. Veuillez vérifier que tous les champs contenant des "
                        "retours à la ligne sont entre guillemets, ou exporter à nouveau le fichier "
                        "depuis Lokario pour obtenir un format valide."
                    )
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Erreur de format CSV : {error_msg}"
                )
        
        # Vérifier que les colonnes attendues sont présentes
        expected_columns = ["Nom", "Email", "Téléphone", "Adresse", "Ville", "Code postal", "Pays", "SIRET"]
        reader_columns = csv_reader.fieldnames or []
        
        logger.info(f"[CSV Import] Colonnes trouvées dans le fichier: {reader_columns}")
        logger.info(f"[CSV Import] Nombre de colonnes: {len(reader_columns) if reader_columns else 0}")
        
        # Vérifier si les colonnes semblent corrompues (contiennent beaucoup de caractères non-ASCII imprimables)
        if reader_columns:
            corrupted = False
            for col in reader_columns:
                if col:
                    # Compter les caractères non-ASCII imprimables
                    non_printable = sum(1 for c in col if ord(c) < 32 or ord(c) > 126)
                    if non_printable > len(col) * 0.3:  # Si plus de 30% de caractères non-ASCII imprimables
                        corrupted = True
                        logger.error(f"[CSV Import] Colonne corrompue détectée: {repr(col[:100])}")
                        break
            
            if corrupted:
                logger.error(f"[CSV Import] Les colonnes semblent corrompues. Le fichier n'est probablement pas un CSV texte valide.")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Le fichier CSV semble corrompu ou n'est pas un fichier CSV texte valide. "
                        "Si vous avez exporté depuis Excel ou Numbers, assurez-vous d'utiliser "
                        "'Fichier > Exporter > CSV' et non simplement renommer le fichier."
                    )
                )
        
        # Mapper les colonnes (gérer les variations de noms)
        column_mapping = {}
        for expected in expected_columns:
            # Chercher une correspondance exacte ou insensible à la casse
            found = None
            for col in reader_columns:
                if col and col.strip().lower() == expected.lower():
                    found = col
                    break
            if found:
                column_mapping[expected] = found
        
        # Si aucune colonne n'a été trouvée, essayer avec les colonnes du fichier telles quelles
        if not column_mapping and reader_columns:
            # Utiliser les colonnes du fichier directement
            for i, col in enumerate(reader_columns):
                if i < len(expected_columns):
                    column_mapping[expected_columns[i]] = col
        
        logger.info(f"[CSV Import] Mapping des colonnes: {column_mapping}")
        
        if not column_mapping:
            logger.warning(f"[CSV Import] Aucune colonne n'a pu être mappée. Colonnes du fichier: {reader_columns}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Aucune colonne attendue n'a été trouvée dans le fichier. "
                    f"Colonnes trouvées: {', '.join(reader_columns[:10]) if reader_columns else 'Aucune'}. "
                    f"Colonnes attendues: {', '.join(expected_columns)}"
                )
            )
        
        # Traiter chaque ligne
        try:
            all_rows = list(csv_reader)  # Lire toutes les lignes d'un coup pour détecter les erreurs de format tôt
            logger.info(f"[CSV Import] Nombre total de lignes lues: {len(all_rows)}")
            
            # Log la première ligne pour debug
            if all_rows:
                logger.info(f"[CSV Import] Première ligne de données: {dict(list(all_rows[0].items())[:5])}")
            
            # Filtrer les lignes complètement vides (toutes les valeurs sont vides ou None)
            rows = []
            for row in all_rows:
                # Vérifier si la ligne a au moins une valeur non vide
                has_data = any(
                    value and str(value).strip() 
                    for value in row.values() 
                    if value is not None
                )
                if has_data:
                    rows.append(row)
            
            logger.info(f"[CSV Import] Nombre de lignes avec données après filtrage: {len(rows)}")
            
            if len(rows) == 0:
                logger.warning(f"[CSV Import] Aucune ligne avec données trouvée après filtrage. Toutes les lignes sont vides.")
                # Log quelques lignes pour comprendre pourquoi elles sont filtrées
                for i, row in enumerate(all_rows[:5]):
                    logger.info(f"[CSV Import] Ligne {i+2} (exemple filtré): {dict(list(row.items())[:3])}")
        except csv.Error as e:
            error_msg = str(e)
            if "new-line character seen in unquoted field" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Erreur de format CSV : des champs contiennent des retours à la ligne "
                        "sans être entre guillemets. Veuillez mettre des guillemets autour des "
                        "champs contenant des retours à la ligne, ou exporter à nouveau le fichier "
                        "depuis Lokario pour obtenir un format valide."
                    )
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Erreur de format CSV lors de la lecture : {error_msg}"
                )
        
        # Faire un flush périodique pour éviter les problèmes de mémoire avec les gros fichiers
        flush_interval = 100  # Flush tous les 100 clients
        
        for row_num, row in enumerate(rows, start=2):  # start=2 car ligne 1 = headers
            # Utiliser un try/except pour chaque ligne avec rollback en cas d'erreur
            try:
                # Extraire les données (gérer les colonnes avec ou sans mapping)
                # Les cases vides sont ignorées (retourne None)
                def get_value(key: str) -> Optional[str]:
                    mapped_key = column_mapping.get(key, key)
                    value = row.get(mapped_key, row.get(key, ""))
                    if value:
                        try:
                            # Nettoyer les caractères de contrôle problématiques
                            value = clean_control_characters(str(value))
                            value = value.strip()
                            # Retourner None si la valeur est vide après nettoyage
                            return value if value else None
                        except Exception as e:
                            # Si le nettoyage échoue, retourner None
                            return None
                    return None  # Case vide = None (ignoré)
                
                name = get_value("Nom")
                email = get_value("Email")
                phone = get_value("Téléphone")
                address = get_value("Adresse")
                city = get_value("Ville")
                postal_code = get_value("Code postal")
                country = get_value("Pays")
                siret = get_value("SIRET")
                
                # Log pour debug (premières lignes seulement)
                if row_num <= 5:
                    logger.info(f"[CSV Import] Ligne {row_num} - Nom: '{name}', Email: '{email}', Phone: '{phone}'")
                    logger.info(f"[CSV Import] Ligne {row_num} - Row data (premiers champs): {dict(list(row.items())[:3])}")
                
                # Vérifier si la ligne est complètement vide (tous les champs sont vides)
                # Cela inclut les lignes avec seulement des espaces, des virgules, ou des caractères vides
                all_empty = not any([name, email, phone, address, city, postal_code, country, siret])
                if all_empty:
                    # Ignorer silencieusement les lignes complètement vides
                    # Ces lignes sont probablement des lignes vides dans le CSV (espaces, virgules seules, etc.)
                    if row_num <= 5:
                        logger.info(f"[CSV Import] Ligne {row_num} ignorée (complètement vide)")
                    continue
                
                # Au minimum, il faut un nom ou un email pour créer/mettre à jour un client
                if not name and not email:
                    error_count += 1
                    error_msg = f"Ligne {row_num}: Nom ou Email requis"
                    errors.append(error_msg)
                    if row_num <= 5:
                        logger.warning(f"[CSV Import] {error_msg}")
                    continue
                
                # Normaliser l'email (lowercase, trim) pour éviter les doublons
                normalized_email = email.lower().strip() if email else None
                normalized_name = name.strip() if name else None
                
                # Chercher un client existant
                # Règle : Si on a un email, chercher uniquement par email (le plus fiable)
                # Si on n'a pas d'email mais un nom, chercher par nom
                existing_client = None
                if normalized_email:
                    # Priorité 1: Chercher par email (le plus fiable, évite les doublons)
                    existing_client = db.query(Client).filter(
                        Client.company_id == company_id,
                        Client.email.ilike(normalized_email)  # Case-insensitive
                    ).first()
                elif normalized_name:
                    # Priorité 2: Chercher par nom seulement si on n'a pas d'email
                    # (moins fiable car plusieurs clients peuvent avoir le même nom)
                    existing_client = db.query(Client).filter(
                        Client.company_id == company_id,
                        Client.name.ilike(normalized_name),  # Case-insensitive
                        Client.email.is_(None)  # Seulement si le client n'a pas d'email
                    ).first()
                    
                    # Si pas trouvé avec email=None, chercher par nom seul (même avec email)
                    if not existing_client:
                        existing_client = db.query(Client).filter(
                            Client.company_id == company_id,
                            Client.name.ilike(normalized_name)  # Case-insensitive
                        ).first()
                
                if existing_client:
                    # Mettre à jour le client existant (ne pas recréer)
                    # Mettre à jour seulement les champs qui ont des valeurs (cases vides = ignorées)
                    if normalized_name:
                        existing_client.name = normalized_name
                    if normalized_email:
                        existing_client.email = normalized_email
                    if phone:  # Si case vide, phone est None, donc on ne met pas à jour
                        existing_client.phone = phone
                    if address:  # Si case vide, address est None, donc on ne met pas à jour
                        existing_client.address = address
                    if city:  # Si case vide, city est None, donc on ne met pas à jour
                        existing_client.city = city
                    if postal_code:  # Si case vide, postal_code est None, donc on ne met pas à jour
                        existing_client.postal_code = postal_code
                    if country:  # Si case vide, country est None, donc on ne met pas à jour
                        existing_client.country = country
                    if siret:  # Si case vide, siret est None, donc on ne met pas à jour
                        existing_client.siret = siret
                    # S'assurer que le type est défini si ce n'est pas déjà le cas
                    if not existing_client.type:
                        existing_client.type = "Client"
                    updated_count += 1
                else:
                    # Créer un nouveau client seulement si on n'a pas trouvé de client existant
                    if not normalized_name and not normalized_email:
                        # Ne devrait pas arriver car on a déjà vérifié plus haut
                        error_count += 1
                        errors.append(f"Ligne {row_num}: Impossible de créer un client sans nom ni email")
                        continue
                    
                    # Créer un nouveau client
                    # Les cases vides (None) sont passées directement, elles seront NULL en base de données
                    new_client = Client(
                        company_id=company_id,
                        name=normalized_name or "Client sans nom",
                        email=normalized_email,  # Peut être None si case vide
                        phone=phone,  # Peut être None si case vide (ignoré)
                        address=address,  # Peut être None si case vide (ignoré)
                        city=city,  # Peut être None si case vide (ignoré)
                        postal_code=postal_code,  # Peut être None si case vide (ignoré)
                        country=country,  # Peut être None si case vide (ignoré)
                        siret=siret,  # Peut être None si case vide (ignoré)
                        type="Client",  # Définir le type par défaut
                    )
                    db.add(new_client)
                    created_count += 1
                
                # Flush et commit périodique pour éviter les problèmes de mémoire et de transaction
                if (created_count + updated_count) % flush_interval == 0:
                    try:
                        db.flush()
                        db.commit()  # Commit périodique pour éviter les transactions trop longues
                    except Exception as flush_error:
                        # Si le flush/commit échoue, rollback et continuer
                        db.rollback()
                        error_count += 1
                        errors.append(f"Ligne {row_num}: Erreur lors du flush/commit - {str(flush_error)}")
                        continue
                
            except Exception as e:
                # En cas d'erreur, rollback cette transaction et continuer avec la ligne suivante
                try:
                    db.rollback()
                except:
                    pass  # Ignorer les erreurs de rollback
                
                error_count += 1
                error_msg = str(e)
                # Raccourcir les messages d'erreur très longs
                if len(error_msg) > 200:
                    error_msg = error_msg[:200] + "..."
                errors.append(f"Ligne {row_num}: {error_msg}")
                continue
        
        # Commit toutes les modifications
        db.commit()
        
        logger.info(f"[CSV Import] Import terminé. Créés: {created_count}, Mis à jour: {updated_count}, Erreurs: {error_count}")
        
        return {
            "message": "Import terminé",
            "created": created_count,
            "updated": updated_count,
            "errors": error_count,
            "error_details": errors[:10] if errors else []  # Limiter à 10 erreurs pour la réponse
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[CSV Import] Erreur fatale lors de l'import: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'import: {str(e)}"
        )

