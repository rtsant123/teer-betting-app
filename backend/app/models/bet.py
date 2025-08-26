from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Float, Enum, JSON, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class BetType(enum.Enum):
    DIRECT = "DIRECT"      # 00-99 (2 digits)
    HOUSE = "HOUSE"        # 0-9 (single digit from house result)  
    ENDING = "ENDING"      # 0-9 (single digit from ending result)
    FORECAST = "FORECAST"  # FR-SR pair (e.g., "23-45")

class BetStatus(enum.Enum):
    PENDING = "PENDING"
    WON = "WON"
    LOST = "LOST"
    CANCELLED = "CANCELLED"

class Bet(Base):
    __tablename__ = "bets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=False)
    
    bet_type = Column(Enum(BetType), nullable=False)
    
    # Match actual database schema
    bet_value = Column(String, nullable=False)  # Single bet value as string
    bet_amount = Column(Float, nullable=False)  # Bet amount
    
    status = Column(Enum(BetStatus), default=BetStatus.PENDING)
    potential_payout = Column(Float, nullable=False)
    actual_payout = Column(Float, default=0.0)
    
    # Link to betting ticket
    ticket_id = Column(String, nullable=True, index=True)  # Added for bet grouping
    
    # For forecast bets - match database schema
    forecast_combinations = Column(Text, nullable=True)  # Text field for forecast combinations
    fr_round_id = Column(Integer, ForeignKey("rounds.id"), nullable=True)
    sr_round_id = Column(Integer, ForeignKey("rounds.id"), nullable=True)
    house_name = Column(String, nullable=True)  # Added to match database
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="bets")
    round = relationship("Round", back_populates="bets", foreign_keys=[round_id])
    fr_round = relationship("Round", foreign_keys=[fr_round_id], overlaps="fr_bets")
    sr_round = relationship("Round", foreign_keys=[sr_round_id], overlaps="sr_bets")
    sr_round = relationship("Round", foreign_keys=[sr_round_id])

class BetTicket(Base):
    __tablename__ = "bet_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    house_id = Column(Integer, ForeignKey("houses.id"), nullable=False)
    
    # Ticket summary
    total_amount = Column(Float, nullable=False)
    total_potential_payout = Column(Float, nullable=False)
    status = Column(Enum(BetStatus), default=BetStatus.PENDING)
    
    # Ticket contains multiple bets
    bets_summary = Column(JSON, nullable=False)  # Summary of all bets in this ticket
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    house = relationship("House")