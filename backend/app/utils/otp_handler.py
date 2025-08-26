import random
import string
from datetime import datetime, timedelta
from typing import Optional
from app.config import settings

class OTPHandler:
    @staticmethod
    def generate_otp(length: int = None) -> str:
        """Generate a random OTP"""
        if length is None:
            length = settings.OTP_LENGTH
        return ''.join(random.choices(string.digits, k=length))
    
    @staticmethod
    def get_expiry_time() -> datetime:
        """Get OTP expiry time"""
        return datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    
    @staticmethod
    def is_expired(expires_at: datetime) -> bool:
        """Check if OTP is expired"""
        return datetime.utcnow() > expires_at
    
    @staticmethod
    async def send_sms_otp(phone_number: str, otp_code: str) -> bool:
        """
        Send OTP via SMS - PLACEHOLDER for future implementation
        This is where you would integrate with SMS gateway like Twilio, AWS SNS, etc.
        """
        # TODO: Implement SMS gateway integration
        print(f"MOCK SMS: Sending OTP {otp_code} to {phone_number}")
        return True
    
    @staticmethod
    def validate_phone_number(phone_number: str) -> bool:
        """Validate phone number format"""
        # Basic validation - extend as needed
        return len(phone_number) >= 10 and phone_number.isdigit()