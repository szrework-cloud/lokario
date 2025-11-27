from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CompanyBase(BaseModel):
    name: str
    sector: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyRead(CompanyBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

