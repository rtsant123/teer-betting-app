from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Float, Enum, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class TransactionType(enum.Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    BET_PLACED = "BET_PLACED"
    BET_WON = "BET_WON"
    BET_REFUND = "BET_REFUND"

class TransactionStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    transaction_type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    
    # Payment method reference
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), nullable=True)
    
    # For deposits/withdrawals
    description = Column(Text, nullable=True)
    payment_proof_url = Column(String, nullable=True)  # For deposit proof
    
    # Transaction details as JSON for flexibility
    transaction_details = Column(JSON, nullable=True)
    # Example: {"reference_id": "TXN123", "upi_id": "user@paytm", "account_number": "1234", "screenshot_url": "..."}
    
    # Legacy fields (kept for compatibility)
    reference_number = Column(String, nullable=True)  # Transaction reference
    deposit_method = Column(String, nullable=True)  # UPI, Bank Transfer, etc.
    deposit_bank = Column(String, nullable=True)  # Bank used for deposit
    deposit_upi_id = Column(String, nullable=True)  # UPI ID used
    
    admin_notes = Column(Text, nullable=True)
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who processed
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Balance tracking
    balance_before = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions", foreign_keys=[user_id])
    processed_by_admin = relationship("User", foreign_keys=[processed_by])