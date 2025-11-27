from typing import Any, Dict
from datetime import datetime
from pydantic import BaseModel
from app.api.schemas.company import CompanyRead


class CompanySettingsBase(BaseModel):
    settings: Dict[str, Any]


class CompanySettingsRead(CompanySettingsBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CompanySettingsUpdate(BaseModel):
    settings: Dict[str, Any]


class CompanyWithSettings(BaseModel):
    company: CompanyRead
    settings: CompanySettingsRead

