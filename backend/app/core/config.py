from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production"  # TODO: Load from .env in production
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 jour
    
    class Config:
        env_file = ".env"


settings = Settings()

