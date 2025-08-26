from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum, JSON
from sqlalchemy.sql import func
from app.database import Base
import enum

class PaymentMethodType(enum.Enum):
    BANK_ACCOUNT = "BANK_ACCOUNT"
    UPI = "UPI"
    QR_CODE = "QR_CODE"
    WALLET = "WALLET"
    CRYPTO = "CRYPTO"

class PaymentMethodStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    MAINTENANCE = "MAINTENANCE"

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "SBI Bank", "PhonePe", "Paytm"
    type = Column(Enum(PaymentMethodType), nullable=False)
    status = Column(Enum(PaymentMethodStatus), default=PaymentMethodStatus.ACTIVE)
    
    # Method details stored as JSON for flexibility
    details = Column(JSON, nullable=False)
    # Example for bank: {"account_number": "1234567890", "ifsc": "SBIN0001234", "account_holder": "John Doe", "branch": "Main Branch"}
    # Example for UPI: {"upi_id": "user@paytm", "qr_code_url": "https://...", "phone": "9876543210"}
    # Example for QR: {"qr_code_url": "https://...", "description": "Scan and pay"}
    
    # Instructions for users
    instructions = Column(Text)  # "Transfer to this account and send screenshot with transaction ID"
    
    # For deposits, withdrawals, or both
    supports_deposit = Column(Boolean, default=True)
    supports_withdrawal = Column(Boolean, default=True)
    
    # Limits
    min_amount = Column(Integer, default=10)  # Minimum amount
    max_amount = Column(Integer, default=100000)  # Maximum amount
    
    # Admin contact for this method
    admin_contact = Column(String)  # Telegram, WhatsApp, Phone etc.
    
    # Order for display
    display_order = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
