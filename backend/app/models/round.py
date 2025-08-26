from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class RoundType(enum.Enum):
    FR = "FR"  # First Round
    SR = "SR"  # Second Round
    FORECAST = "FORECAST"  # Forecast Round (depends on FR deadline)

class RoundStatus(enum.Enum):
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Round(Base):
    __tablename__ = "rounds"

    id = Column(Integer, primary_key=True, index=True)
    house_id = Column(Integer, ForeignKey("houses.id"), nullable=False)
    round_type = Column(Enum(RoundType), nullable=False)
    status = Column(Enum(RoundStatus), default=RoundStatus.SCHEDULED)
    
    # Timing
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    betting_closes_at = Column(DateTime(timezone=True), nullable=False)
    actual_time = Column(DateTime(timezone=True), nullable=True)
    
    # Results
    result = Column(Integer, nullable=True)  # 0-99 for the result
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    house = relationship("House", back_populates="rounds")
    bets = relationship("Bet", back_populates="round", foreign_keys="[Bet.round_id]")
    fr_bets = relationship("Bet", foreign_keys="[Bet.fr_round_id]")
    sr_bets = relationship("Bet", foreign_keys="[Bet.sr_round_id]")