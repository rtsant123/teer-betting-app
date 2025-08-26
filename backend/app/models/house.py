from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Time
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class House(Base):
    __tablename__ = "houses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # e.g., "Shillong", "Khanapara"
    location = Column(String, nullable=True)
    timezone = Column(String, nullable=False, default='Asia/Kolkata')  # House timezone
    is_active = Column(Boolean, default=True)
    
    # Daily Schedule (Teer runs Monday-Saturday)
    fr_time = Column(Time, nullable=False, default='15:45:00')  # 3:45 PM
    sr_time = Column(Time, nullable=False, default='16:45:00')  # 4:45 PM
    betting_window_minutes = Column(Integer, default=30)  # Betting closes 30 min before
    runs_monday = Column(Boolean, default=True)
    runs_tuesday = Column(Boolean, default=True) 
    runs_wednesday = Column(Boolean, default=True)
    runs_thursday = Column(Boolean, default=True)
    runs_friday = Column(Boolean, default=True)
    runs_saturday = Column(Boolean, default=True)
    runs_sunday = Column(Boolean, default=False)  # Teer usually closed on Sunday
    
    # FR Round Payout rates
    fr_direct_payout_rate = Column(Float, default=70.0)   # 70x for FR direct
    fr_house_payout_rate = Column(Float, default=7.0)     # 7x for FR house
    fr_ending_payout_rate = Column(Float, default=7.0)    # 7x for FR ending
    
    # SR Round Payout rates  
    sr_direct_payout_rate = Column(Float, default=60.0)   # 60x for SR direct
    sr_house_payout_rate = Column(Float, default=6.0)     # 6x for SR house
    sr_ending_payout_rate = Column(Float, default=6.0)    # 6x for SR ending
    
    # Forecast Payout rates
    forecast_direct_payout_rate = Column(Float, default=400.0)   # 400x for forecast direct
    forecast_house_payout_rate = Column(Float, default=40.0)    # 40x for forecast house  
    forecast_ending_payout_rate = Column(Float, default=40.0)   # 40x for forecast ending
    
    # Legacy forecast rate for backward compatibility
    forecast_payout_rate = Column(Float, default=400.0)   # Keep for existing code
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    rounds = relationship("Round", back_populates="house")