from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class UserRole(enum.Enum):
    PLAYER = "PLAYER"
    AGENT = "AGENT"
    SUPER_AGENT = "SUPER_AGENT"
    ADMIN = "ADMIN"

class CommissionType(enum.Enum):
    REGISTRATION = "REGISTRATION"
    DEPOSIT = "DEPOSIT"
    BETTING = "BETTING"
    WINNING = "WINNING"
    MANUAL = "MANUAL"

class CommissionLevel(enum.Enum):
    LEVEL_1 = "LEVEL_1"
    LEVEL_2 = "LEVEL_2"
    LEVEL_3 = "LEVEL_3"

class CommissionStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class WithdrawalStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"

class ReferralSettings(Base):
    __tablename__ = "referral_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    level_1_rate = Column(Float, default=0.0)
    level_2_rate = Column(Float, default=0.0)
    level_3_rate = Column(Float, default=0.0)
    min_bet_for_commission = Column(Float, default=0.0)
    min_withdrawal_amount = Column(Float, default=100.0)
    max_withdrawal_amount = Column(Float, default=10000.0)
    commission_validity_days = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))

class ReferralCommission(Base):
    __tablename__ = "referral_commissions"
    
    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    referred_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bet_id = Column(Integer, ForeignKey("bets.id"), nullable=True)
    level = Column(Enum(CommissionLevel), nullable=False)
    amount = Column(Float, nullable=False)
    bet_amount = Column(Float, nullable=True)
    commission_rate = Column(Float, nullable=False)
    status = Column(Enum(CommissionStatus), default=CommissionStatus.PENDING)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    referrer = relationship("User", foreign_keys=[referrer_id], back_populates="given_commissions")
    referred_user = relationship("User", foreign_keys=[referred_user_id], back_populates="generated_commissions")
    bet = relationship("Bet")

class ReferralLink(Base):
    __tablename__ = "referral_links"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    campaign_name = Column(String(100), default="General")
    click_count = Column(Integer, default=0)
    conversion_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="referral_links")

class CommissionWithdrawal(Base):
    __tablename__ = "commission_withdrawals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(Enum(WithdrawalStatus), default=WithdrawalStatus.PENDING)
    admin_notes = Column(Text, nullable=True)
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="commission_withdrawals")
    processor = relationship("User", foreign_keys=[processed_by])
