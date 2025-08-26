from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import OTPGenerate, OTPVerify, OTPResponse
from app.services.otp_service import OTPService
from app.models import User
from app.dependencies import get_current_user, get_current_admin_user

router = APIRouter()

@router.post("/generate", response_model=OTPResponse)
async def generate_otp(
    otp_data: OTPGenerate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate and send OTP to user's phone (Future feature)"""
    otp_service = OTPService(db)
    
    otp_response, message = await otp_service.generate_otp(current_user.id, otp_data)
    
    if not otp_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return otp_response

@router.post("/verify")
async def verify_otp(
    otp_data: OTPVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify OTP code (Future feature)"""
    otp_service = OTPService(db)
    
    success, message = otp_service.verify_otp(current_user.id, otp_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"success": True, "message": message}

@router.get("/history")
async def get_otp_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's OTP history (Admin/Debug feature)"""
    otp_service = OTPService(db)
    
    # Only admin or the user themselves can view OTP history
    if not current_user.is_admin:
        # For regular users, limit to basic info
        return {"message": "OTP feature not yet active"}
    
    return otp_service.get_user_otp_history(current_user.id)

@router.post("/cleanup")
async def cleanup_expired_otps(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Clean up expired OTPs (Admin only)"""
    otp_service = OTPService(db)
    
    cleaned_count = otp_service.cleanup_expired_otps()
    
    return {
        "message": f"Cleaned up {cleaned_count} expired OTPs",
        "count": cleaned_count
    }

# Note: Dependencies are defined in main.py