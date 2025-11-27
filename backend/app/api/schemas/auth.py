from pydantic import BaseModel, EmailStr
from typing import Optional


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: int
    company_id: Optional[int] = None
    role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

