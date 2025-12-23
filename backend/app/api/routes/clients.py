from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
from app.db.session import get_db
from app.db.models.client import Client
from app.api.schemas.client import ClientCreate, ClientUpdate, ClientRead, ClientWithStats
from app.api.deps import get_current_active_user
from app.db.models.user import User

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=List[ClientRead])
def get_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
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
        
        # Décoder en UTF-8 (gérer BOM si présent)
        try:
            text = content.decode('utf-8-sig')  # utf-8-sig gère le BOM
        except UnicodeDecodeError:
            try:
                text = content.decode('latin-1')
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Impossible de décoder le fichier. Utilisez UTF-8 ou Latin-1."
                )
        
        # Parser le CSV
        csv_reader = csv.DictReader(io.StringIO(text))
        
        # Vérifier que les colonnes attendues sont présentes
        expected_columns = ["Nom", "Email", "Téléphone", "Adresse", "Ville", "Code postal", "Pays", "SIRET"]
        reader_columns = csv_reader.fieldnames or []
        
        # Mapper les colonnes (gérer les variations de noms)
        column_mapping = {}
        for expected in expected_columns:
            # Chercher une correspondance exacte ou insensible à la casse
            found = None
            for col in reader_columns:
                if col.strip().lower() == expected.lower():
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
        
        # Traiter chaque ligne
        for row_num, row in enumerate(csv_reader, start=2):  # start=2 car ligne 1 = headers
            try:
                # Extraire les données (gérer les colonnes avec ou sans mapping)
                def get_value(key: str) -> Optional[str]:
                    mapped_key = column_mapping.get(key, key)
                    value = row.get(mapped_key, row.get(key, "")).strip()
                    return value if value else None
                
                name = get_value("Nom")
                email = get_value("Email")
                phone = get_value("Téléphone")
                address = get_value("Adresse")
                city = get_value("Ville")
                postal_code = get_value("Code postal")
                country = get_value("Pays")
                siret = get_value("SIRET")
                
                # Au minimum, il faut un nom ou un email
                if not name and not email:
                    error_count += 1
                    errors.append(f"Ligne {row_num}: Nom ou Email requis")
                    continue
                
                # Chercher un client existant (par email ou nom)
                existing_client = None
                if email:
                    existing_client = db.query(Client).filter(
                        Client.company_id == company_id,
                        Client.email == email
                    ).first()
                
                if not existing_client and name:
                    existing_client = db.query(Client).filter(
                        Client.company_id == company_id,
                        Client.name == name
                    ).first()
                
                if existing_client:
                    # Mettre à jour le client existant
                    if name:
                        existing_client.name = name
                    if email:
                        existing_client.email = email
                    if phone:
                        existing_client.phone = phone
                    if address:
                        existing_client.address = address
                    if city:
                        existing_client.city = city
                    if postal_code:
                        existing_client.postal_code = postal_code
                    if country:
                        existing_client.country = country
                    if siret:
                        existing_client.siret = siret
                    updated_count += 1
                else:
                    # Créer un nouveau client
                    new_client = Client(
                        company_id=company_id,
                        name=name or "Client sans nom",
                        email=email,
                        phone=phone,
                        address=address,
                        city=city,
                        postal_code=postal_code,
                        country=country,
                        siret=siret,
                    )
                    db.add(new_client)
                    created_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append(f"Ligne {row_num}: {str(e)}")
                continue
        
        # Commit toutes les modifications
        db.commit()
        
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'import: {str(e)}"
        )

