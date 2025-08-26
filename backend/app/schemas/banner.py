from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime

class BannerBase(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    button_text: Optional[str] = "Learn More"
    target_page: Optional[str] = "all"
    background_color: str = "#4F46E5"
    text_color: str = "#FFFFFF"
    is_active: bool = True
    order_position: int = 0

    @validator('background_color', 'text_color')
    def validate_hex_color(cls, v):
        if not v.startswith('#') or len(v) != 7:
            raise ValueError('Color must be a valid hex color (e.g., #FF0000)')
        return v

class BannerCreate(BannerBase):
    pass

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    button_text: Optional[str] = None
    target_page: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    is_active: Optional[bool] = None
    order_position: Optional[int] = None

    @validator('background_color', 'text_color')
    def validate_hex_color(cls, v):
        if v and (not v.startswith('#') or len(v) != 7):
            raise ValueError('Color must be a valid hex color (e.g., #FF0000)')
        return v

class Banner(BannerBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
