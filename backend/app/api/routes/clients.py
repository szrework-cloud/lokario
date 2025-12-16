from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
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

