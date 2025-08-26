from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Banner(Base):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)  # Changed from String(500) to Text for base64 images
    link_url = Column(Text, nullable=True)  # URL to redirect when banner is clicked
    button_text = Column(String(100), nullable=True, default="Learn More")  # Text for the CTA button
    target_page = Column(String(50), nullable=True, default="all")  # Target page: all, home, betting, etc.
    background_color = Column(String(7), default="#4F46E5")  # Hex color
    text_color = Column(String(7), default="#FFFFFF")  # Hex color
    is_active = Column(Boolean, default=True)
    order_position = Column(Integer, default=0)  # For sorting banners
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
