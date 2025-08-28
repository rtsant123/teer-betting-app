import os
from typing import Optional, Union, List
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres123@localhost:5434/teer_betting"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours for development
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # OTP (for future use)
    OTP_EXPIRE_MINUTES: int = 5
    OTP_LENGTH: int = 6
    
    # App settings
    APP_NAME: str = "Teer Betting App"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    
    # CORS settings
    ALLOWED_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:80,http://localhost,http://127.0.0.1:3000,http://127.0.0.1:80,http://127.0.0.1"
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:80,http://localhost,http://127.0.0.1:3000,http://127.0.0.1:80,http://127.0.0.1"
    
    @field_validator('ALLOWED_ORIGINS', 'BACKEND_CORS_ORIGINS')
    @classmethod
    def validate_allowed_origins(cls, v):
        if v == "*":
            return v
        if isinstance(v, list):
            return ",".join(v)
        return v
    
    @property
    def allowed_origins_list(self) -> list:
        """Convert ALLOWED_ORIGINS string to list"""
        if self.ALLOWED_ORIGINS == "*":
            return ["*"]
        if isinstance(self.ALLOWED_ORIGINS, list):
            return self.ALLOWED_ORIGINS
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    @property
    def backend_cors_origins_list(self) -> list:
        """Convert BACKEND_CORS_ORIGINS string to list"""
        if self.BACKEND_CORS_ORIGINS == "*":
            return ["*"]
        if isinstance(self.BACKEND_CORS_ORIGINS, list):
            return self.BACKEND_CORS_ORIGINS
        # Use ALLOWED_ORIGINS if BACKEND_CORS_ORIGINS is default
        if self.BACKEND_CORS_ORIGINS == "*" and self.ALLOWED_ORIGINS != "*":
            return self.allowed_origins_list
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"

settings = Settings()