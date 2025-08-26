from sqlalchemy.orm import Session
from typing import Optional, Tuple
from datetime import datetime

from app.models import OTP, User
from app.models.otp import OTPType, OTPStatus
from app.schemas.auth import OTPGenerate, OTPVerify, OTPResponse
from app.utils.otp_handler import OTPHandler

class OTPService:
    def __init__(self, db: Session):
        self.db = db
    
    async def generate_otp(self, user_id: int, otp_data: OTPGenerate) -> Tuple[Optional[OTPResponse], str]:
        """Generate and send OTP to user's phone"""
        try:
            # Validate user exists
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return None, "User not found"
            
            # Validate phone number
            if not OTPHandler.validate_phone_number(otp_data.phone_number):
                return None, "Invalid phone number format"
            
            # Check if there's an active OTP for this user and type
            existing_otp = self.db.query(OTP).filter(
                OTP.user_id == user_id,
                OTP.otp_type == OTPType(otp_data.otp_type),
                OTP.status == OTPStatus.ACTIVE,
                OTP.expires_at > datetime.utcnow()
            ).first()
            
            if existing_otp:
                return None, "Active OTP already exists. Please wait for it to expire."
            
            # Generate new OTP
            otp_code = OTPHandler.generate_otp()
            expires_at = OTPHandler.get_expiry_time()
            
            # Create OTP record
            db_otp = OTP(
                user_id=user_id,
                otp_code=otp_code,
                otp_type=OTPType(otp_data.otp_type),
                phone_number=otp_data.phone_number,
                expires_at=expires_at
            )
            
            self.db.add(db_otp)
            self.db.commit()
            
            # Send OTP via SMS (mock implementation)
            sms_sent = await OTPHandler.send_sms_otp(otp_data.phone_number, otp_code)
            
            if not sms_sent:
                # Rollback if SMS failed
                self.db.delete(db_otp)
                self.db.commit()
                return None, "Failed to send OTP. Please try again."
            
            return OTPResponse(
                success=True,
                message="OTP sent successfully",
                expires_at=expires_at
            ), "OTP generated successfully"
            
        except Exception as e:
            self.db.rollback()
            return None, f"Error generating OTP: {str(e)}"
    
    def verify_otp(self, user_id: int, otp_data: OTPVerify) -> Tuple[bool, str]:
        """Verify OTP code"""
        try:
            # Find active OTP
            db_otp = self.db.query(OTP).filter(
                OTP.user_id == user_id,
                OTP.phone_number == otp_data.phone_number,
                OTP.otp_type == OTPType(otp_data.otp_type),
                OTP.status == OTPStatus.ACTIVE
            ).first()
            
            if not db_otp:
                return False, "No active OTP found for this request"
            
            # Check if OTP is expired
            if OTPHandler.is_expired(db_otp.expires_at):
                db_otp.status = OTPStatus.EXPIRED
                self.db.commit()
                return False, "OTP has expired"
            
            # Check attempts limit
            if db_otp.attempts >= db_otp.max_attempts:
                db_otp.status = OTPStatus.EXPIRED
                self.db.commit()
                return False, "Maximum verification attempts exceeded"
            
            # Increment attempts
            db_otp.attempts += 1
            
            # Verify OTP code
            if db_otp.otp_code != otp_data.otp_code:
                self.db.commit()
                remaining_attempts = db_otp.max_attempts - db_otp.attempts
                if remaining_attempts > 0:
                    return False, f"Invalid OTP. {remaining_attempts} attempts remaining"
                else:
                    db_otp.status = OTPStatus.EXPIRED
                    self.db.commit()
                    return False, "Invalid OTP. Maximum attempts exceeded"
            
            # OTP is valid
            db_otp.status = OTPStatus.USED
            db_otp.used_at = datetime.utcnow()
            self.db.commit()
            
            return True, "OTP verified successfully"
            
        except Exception as e:
            self.db.rollback()
            return False, f"Error verifying OTP: {str(e)}"
    
    def cleanup_expired_otps(self) -> int:
        """Clean up expired OTPs (run as background task)"""
        try:
            expired_otps = self.db.query(OTP).filter(
                OTP.status == OTPStatus.ACTIVE,
                OTP.expires_at <= datetime.utcnow()
            ).all()
            
            count = 0
            for otp in expired_otps:
                otp.status = OTPStatus.EXPIRED
                count += 1
            
            self.db.commit()
            return count
            
        except Exception as e:
            self.db.rollback()
            return 0
    
    def get_user_otp_history(self, user_id: int, limit: int = 10) -> list:
        """Get user's OTP history for debugging/admin purposes"""
        otps = self.db.query(OTP).filter(
            OTP.user_id == user_id
        ).order_by(OTP.created_at.desc()).limit(limit).all()
        
        return [
            {
                "id": otp.id,
                "otp_type": otp.otp_type.value,
                "phone_number": otp.phone_number,
                "status": otp.status.value,
                "attempts": otp.attempts,
                "created_at": otp.created_at,
                "expires_at": otp.expires_at,
                "used_at": otp.used_at
            }
            for otp in otps
        ]