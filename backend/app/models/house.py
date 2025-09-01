from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Time
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import pytz
from datetime import datetime, time as dt_time, timedelta

class House(Base):
    __tablename__ = "houses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # e.g., "Shillong", "Khanapara"
    location = Column(String, nullable=True)
    timezone = Column(String, nullable=False, default='Asia/Kolkata')  # House timezone
    is_active = Column(Boolean, default=True)
    
    # Daily Schedule (Teer runs Monday-Saturday)
    # These are LOCAL times in the house timezone
    fr_time = Column(Time, nullable=False, default='15:30:00')  # 3:30 PM local time
    sr_time = Column(Time, nullable=False, default='17:00:00')  # 5:00 PM local time  
    betting_window_minutes = Column(Integer, default=15)  # Betting closes 15 min before
    
    # Weekly Schedule
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
    
    def get_local_datetime(self, date_part, time_part):
        """Convert date and time to house timezone aware datetime"""
        try:
            house_tz = pytz.timezone(self.timezone)
            # Create naive datetime first
            naive_dt = datetime.combine(date_part, time_part)
            # Localize to house timezone
            local_dt = house_tz.localize(naive_dt)
            return local_dt
        except Exception:
            # Fallback to UTC if timezone conversion fails
            naive_dt = datetime.combine(date_part, time_part)
            return pytz.UTC.localize(naive_dt)
    
    def get_betting_deadline(self, round_datetime):
        """Get betting deadline time for a round"""
        return round_datetime - timedelta(minutes=self.betting_window_minutes)
    
    def get_display_time(self, time_field):
        """Get time formatted for display in house timezone"""
        return time_field.strftime('%H:%M') if time_field else "00:00"