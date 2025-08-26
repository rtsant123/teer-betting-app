from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class OTPType(enum.Enum):
    LOGIN = "LOGIN"
    WITHDRAWAL = "WITHDRAWAL"
    PASSWORD_RESET = "PASSWORD_RESET"
    PHONE_VERIFICATION = "PHONE_VERIFICATION"

class OTPStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    USED = "USED"
    EXPIRED = "EXPIRED"

class OTP(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    otp_code = Column(String(6), nullable=False)
    otp_type = Column(Enum(OTPType), nullable=False)
    status = Column(Enum(OTPStatus), default=OTPStatus.ACTIVE)
    
    # Metadata
    phone_number = Column(String, nullable=False)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    
    # Timing
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User")