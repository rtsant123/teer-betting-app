from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.referral import UserRole

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    wallet_balance = Column(Float, default=0.0)
    
    # Referral and Agent System
    role = Column(Enum(UserRole), nullable=False, default=UserRole.PLAYER)
    referral_code = Column(String(20), unique=True, nullable=True)
    referred_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    agent_commission_rate = Column(Float, default=0.0)
    total_referrals = Column(Integer, default=0)
    active_referrals = Column(Integer, default=0)
    total_commission_earned = Column(Float, default=0.0)
    commission_balance = Column(Float, default=0.0)
    is_agent_approved = Column(Boolean, default=False)
    agent_approved_at = Column(DateTime(timezone=True), nullable=True)
    agent_notes = Column(Text, nullable=True)
    
    # Bank account details for deposits/withdrawals
    bank_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    account_holder_name = Column(String, nullable=True)
    ifsc_code = Column(String, nullable=True)
    upi_id = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    bets = relationship("Bet", back_populates="user")
    transactions = relationship("Transaction", back_populates="user", foreign_keys="Transaction.user_id")
    processed_transactions = relationship("Transaction", foreign_keys="Transaction.processed_by")
    
    # Referral relationships
    referrer = relationship("User", remote_side=[id], back_populates="referrals")
    referrals = relationship("User", back_populates="referrer")
    referral_links = relationship("ReferralLink", back_populates="user")
    given_commissions = relationship("ReferralCommission", back_populates="referrer", foreign_keys="ReferralCommission.referrer_id")
    generated_commissions = relationship("ReferralCommission", back_populates="referred_user", foreign_keys="ReferralCommission.referred_user_id")
    commission_withdrawals = relationship("CommissionWithdrawal", back_populates="user", foreign_keys="CommissionWithdrawal.user_id")
    
    # Admin task relationships (forward references)
    assigned_tasks = relationship("AdminTask", back_populates="assigned_to", foreign_keys="[AdminTask.assigned_to_id]")
    created_tasks = relationship("AdminTask", back_populates="assigned_by", foreign_keys="[AdminTask.assigned_by_id]")