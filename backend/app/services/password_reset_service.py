import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.user import User
from app.models.otp import OTP, OTPType, OTPStatus  
from app.utils.password import hash_password, verify_password
from app.schemas.password_reset import PasswordResetRequest, PasswordResetConfirm, ChangePasswordRequest

class PasswordResetService:
    def __init__(self, db: Session):
        self.db = db
    
    def generate_reset_code(self) -> str:
        """Generate a 6-digit reset code"""
        return ''.join(secrets.choice(string.digits) for _ in range(6))
    
    def request_password_reset(self, username: str) -> tuple[bool, str]:
        """Initiate password reset process"""
        try:
            # Find user by username
            user = self.db.query(User).filter(User.username == username).first()
            if not user:
                # Return success for security (don't reveal if username exists)
                return True, "If the username exists, a reset code will be sent to your registered phone number."
            
            # Generate reset code
            reset_code = self.generate_reset_code()
            
            # Deactivate any existing password reset OTPs for this user
            existing_otps = self.db.query(OTP).filter(
                and_(
                    OTP.user_id == user.id,
                    OTP.otp_type == OTPType.PASSWORD_RESET,
                    OTP.status == OTPStatus.ACTIVE
                )
            ).all()
            
            for otp in existing_otps:
                otp.status = OTPStatus.EXPIRED
            
            # Create new password reset OTP
            new_otp = OTP(
                user_id=user.id,
                phone_number=user.phone,
                otp_code=reset_code,
                otp_type=OTPType.PASSWORD_RESET,
                status=OTPStatus.ACTIVE,
                expires_at=datetime.utcnow() + timedelta(minutes=15)  # 15 minutes validity
            )
            
            self.db.add(new_otp)
            self.db.commit()
            
            # In a real implementation, you would send SMS here
            # For now, we'll just log it (development only)
            print(f"Password reset code for {username}: {reset_code}")
            
            return True, "If the username exists, a reset code will be sent to your registered phone number."
            
        except Exception as e:
            self.db.rollback()
            print(f"Error in password reset request: {str(e)}")
            return False, "An error occurred. Please try again later."
    
    def verify_reset_code(self, username: str, reset_code: str) -> tuple[bool, str, Optional[User]]:
        """Verify the reset code"""
        try:
            # Find user by username
            user = self.db.query(User).filter(User.username == username).first()
            if not user:
                return False, "Invalid username or reset code.", None
            
            # Find valid OTP
            otp = self.db.query(OTP).filter(
                and_(
                    OTP.user_id == user.id,
                    OTP.otp_code == reset_code,
                    OTP.otp_type == OTPType.PASSWORD_RESET,
                    OTP.status == OTPStatus.ACTIVE,
                    OTP.expires_at > datetime.utcnow()
                )
            ).first()
            
            if not otp:
                return False, "Invalid or expired reset code.", None
            
            return True, "Reset code verified successfully.", user
            
        except Exception as e:
            print(f"Error in reset code verification: {str(e)}")
            return False, "An error occurred. Please try again later.", None
    
    def reset_password(self, username: str, reset_code: str, new_password: str) -> tuple[bool, str]:
        """Reset password using the reset code"""
        try:
            # Verify reset code first
            is_valid, message, user = self.verify_reset_code(username, reset_code)
            if not is_valid:
                return False, message
            
            # Update password
            user.password_hash = hash_password(new_password)
            
            # Mark OTP as used
            otp = self.db.query(OTP).filter(
                and_(
                    OTP.user_id == user.id,
                    OTP.otp_code == reset_code,
                    OTP.otp_type == OTPType.PASSWORD_RESET,
                    OTP.status == OTPStatus.ACTIVE
                )
            ).first()
            
            if otp:
                otp.status = OTPStatus.USED
            
            self.db.commit()
            
            return True, "Password reset successfully. You can now login with your new password."
            
        except Exception as e:
            self.db.rollback()
            print(f"Error in password reset: {str(e)}")
            return False, "An error occurred. Please try again later."
    
    def change_password(self, user_id: int, current_password: str, new_password: str) -> tuple[bool, str]:
        """Change password for authenticated user"""
        try:
            # Get user
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return False, "User not found."
            
            # Verify current password
            if not verify_password(current_password, user.password_hash):
                return False, "Current password is incorrect."
            
            # Update password
            user.password_hash = hash_password(new_password)
            self.db.commit()
            
            return True, "Password changed successfully."
            
        except Exception as e:
            self.db.rollback()
            print(f"Error in password change: {str(e)}")
            return False, "An error occurred. Please try again later."
