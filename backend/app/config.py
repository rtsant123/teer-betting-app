import os
from typing import Optional, Union, List
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    # Database (will be overridden by environment variables in production)
    DATABASE_URL: str = "postgresql://postgres:postgres123@db:5432/teer_betting"
    
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
    ENVIRONMENT: str = "development"
    
    # VPS and Network settings
    VPS_IP: Optional[str] = os.getenv("VPS_IP")
    DOMAIN: Optional[str] = os.getenv("DOMAIN")
    
    # CORS settings (Enhanced with automatic VPS IP detection)
    ALLOWED_ORIGINS: Union[str, List[str]] = os.getenv("ALLOWED_ORIGINS", "http://178.128.61.118,http://178.128.61.118:80,https://178.128.61.118,http://frontend:80")
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = os.getenv("BACKEND_CORS_ORIGINS", "http://178.128.61.118,http://178.128.61.118:80,https://178.128.61.118,http://frontend:80")
    
    # Additional production settings
    FORCE_HTTPS: bool = os.getenv("FORCE_HTTPS", "False").lower() == "true"
    
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
        """Convert ALLOWED_ORIGINS string to list with automatic VPS IP inclusion"""
        if self.ALLOWED_ORIGINS == "*":
            return ["*"]
        
        origins = []
        if isinstance(self.ALLOWED_ORIGINS, list):
            origins = self.ALLOWED_ORIGINS
        else:
            origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        
        # Automatically add VPS IP origins if VPS_IP is set
        if self.VPS_IP:
            vps_origins = [
                f"http://{self.VPS_IP}",
                f"http://{self.VPS_IP}:80",
                f"https://{self.VPS_IP}",
                f"https://{self.VPS_IP}:443",
                f"http://{self.VPS_IP}:3000"
            ]
            for origin in vps_origins:
                if origin not in origins:
                    origins.append(origin)
        
        # Add container networking origins
        container_origins = ["http://frontend:80", "http://teer_frontend:80", "http://teer_frontend_prod:80"]
        for origin in container_origins:
            if origin not in origins:
                origins.append(origin)
        
        return origins
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