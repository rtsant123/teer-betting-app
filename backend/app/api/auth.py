from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import timedelta
from typing import Optional

from app.database import get_db
from app.models import User
from app.schemas.auth import UserRegister, UserLogin, UserResponse, Token
from app.schemas.password_reset import PasswordResetRequest, PasswordResetConfirm, PasswordResetResponse, ChangePasswordRequest, ChangePasswordResponse
from app.utils.jwt import create_user_token
from app.config import settings
from app.dependencies import get_current_user
from app.services.referral_service import ReferralService
from app.services.password_reset_service import PasswordResetService

router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def authenticate_user(db: Session, username: str, password: str) -> User:
    """Authenticate a user by username and password"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserRegister, 
    db: Session = Depends(get_db),
    ref: Optional[str] = Query(None, description="Referral code")
):
    """Register a new user"""
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if phone already exists
    existing_phone = db.query(User).filter(User.phone == user_data.phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        phone=user_data.phone,
        password_hash=hashed_password,
        is_active=True,
        is_admin=False,
        wallet_balance=0.0
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Handle referral registration
    if ref:
        referral_service = ReferralService(db)
        referral_success = referral_service.register_user_with_referral(db_user, ref)
        if referral_success:
            db.commit()
    
    return UserResponse(
        id=db_user.id,
        username=db_user.username,
        phone=db_user.phone,
        is_active=db_user.is_active,
        is_admin=db_user.is_admin,
        wallet_balance=db_user.wallet_balance,
        created_at=db_user.created_at
    )

@router.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token"""
    
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create access token with user_id
    access_token = create_user_token(user.id, user.username)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            username=user.username,
            phone=user.phone,
            is_active=user.is_active,
            is_admin=user.is_admin,
            wallet_balance=user.wallet_balance,
            created_at=user.created_at
        )
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh access token"""
    # Create new access token
    access_token = create_user_token(current_user.id, current_user.username)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=current_user.id,
            username=current_user.username,
            phone=current_user.phone,
            is_active=current_user.is_active,
            is_admin=current_user.is_admin,
            wallet_balance=current_user.wallet_balance,
            created_at=current_user.created_at
        )
    )

@router.post("/logout")
async def logout_user():
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        phone=current_user.phone,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        wallet_balance=current_user.wallet_balance,
        created_at=current_user.created_at
    )

@router.post("/forgot-password", response_model=PasswordResetResponse)
async def forgot_password(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request password reset"""
    password_reset_service = PasswordResetService(db)
    success, message = password_reset_service.request_password_reset(request.username)
    
    return PasswordResetResponse(
        success=success,
        message=message
    )

@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(
    request: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Reset password using reset code"""
    password_reset_service = PasswordResetService(db)
    success, message = password_reset_service.reset_password(
        request.username,
        request.reset_code,
        request.new_password
    )
    
    return PasswordResetResponse(
        success=success,
        message=message
    )

@router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password for authenticated user"""
    password_reset_service = PasswordResetService(db)
    success, message = password_reset_service.change_password(
        current_user.id,
        request.current_password,
        request.new_password
    )
    
    return ChangePasswordResponse(
        success=success,
        message=message
    )