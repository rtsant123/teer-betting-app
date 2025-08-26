from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    username: str
    phone: str
    password: str
    
    @validator('username')
    @classmethod
    def username_must_be_valid(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        return v
    
    @validator('phone')
    @classmethod
    def phone_must_be_valid(cls, v):
        if len(v) < 10:
            raise ValueError('Phone number must be at least 10 digits')
        return v
    
    @validator('password')
    @classmethod
    def password_must_be_valid(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    phone: str
    is_active: bool
    is_admin: bool
    wallet_balance: float
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None

# OTP Schemas (for future use)
class OTPGenerate(BaseModel):
    phone_number: str
    otp_type: str  # LOGIN, WITHDRAWAL, etc.

class OTPVerify(BaseModel):
    phone_number: str
    otp_code: str
    otp_type: str

class OTPResponse(BaseModel):
    success: bool
    message: str
    expires_at: Optional[datetime] = None