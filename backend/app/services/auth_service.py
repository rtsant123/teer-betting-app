from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
from datetime import timedelta

from app.models import User
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse
from app.utils.password import hash_password, verify_password
from app.utils.jwt import create_access_token
from app.config import settings

class AuthService:
    def __init__(self, db: Session):
        self.db = db
    
    def register_user(self, user_data: UserRegister) -> UserResponse:
        """Register a new user"""
        try:
            hashed_password = hash_password(user_data.password)
            
            db_user = User(
                username=user_data.username,
                phone=user_data.phone,
                password_hash=hashed_password,
                wallet_balance=0.0
            )
            
            self.db.add(db_user)
            self.db.commit()
            self.db.refresh(db_user)
            
            return UserResponse.from_orm(db_user)
            
        except IntegrityError:
            self.db.rollback()
            raise ValueError("Username or phone number already exists")
    
    def authenticate_user(self, login_data: UserLogin) -> Optional[User]:
        """Authenticate user with username and password"""
        db_user = self.db.query(User).filter(
            User.username == login_data.username
        ).first()
        
        if not db_user:
            return None
        
        if not verify_password(login_data.password, db_user.password_hash):
            return None
        
        if not db_user.is_active:
            return None
        
        return db_user
    
    def create_access_token_for_user(self, user: User) -> str:
        """Create access token for user"""
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"user_id": user.id, "username": user.username},
            expires_delta=access_token_expires
        )
        return access_token
    
    def login_user(self, login_data: UserLogin) -> Optional[Token]:
        """Complete login process"""
        user = self.authenticate_user(login_data)
        if not user:
            return None
        
        access_token = self.create_access_token_for_user(user)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.from_orm(user)
        )
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()
    
    def update_user_balance(self, user_id: int, new_balance: float) -> bool:
        """Update user wallet balance"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.wallet_balance = new_balance
        self.db.commit()
        return True