from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.wallet import (
    TransactionResponse, 
    WalletResponse, TransactionUpdate
)
from app.schemas.payment import DepositRequest, WithdrawalRequest, PaymentMethodPublic
from app.services.wallet_service import WalletService
from app.models import User, PaymentMethod, PaymentMethodStatus, PaymentMethodType
from app.models.transaction import TransactionType
from app.dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=WalletResponse)
async def get_wallet_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's wallet information and recent transactions"""
    wallet_service = WalletService(db)
    wallet_info = wallet_service.get_wallet_info(current_user.id)
    
    if not wallet_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )
    
    return wallet_info

@router.post("/deposit", response_model=TransactionResponse)
async def request_deposit(
    deposit_data: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request a deposit (requires admin approval)"""
    wallet_service = WalletService(db)
    
    transaction, message = wallet_service.request_deposit(current_user.id, deposit_data)
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return transaction

@router.post("/withdraw", response_model=TransactionResponse)
async def request_withdrawal(
    withdrawal_data: WithdrawalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request a withdrawal (requires admin approval)"""
    wallet_service = WalletService(db)
    
    transaction, message = wallet_service.request_withdrawal(current_user.id, withdrawal_data)
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return transaction

@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    transaction_type: Optional[TransactionType] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's transaction history"""
    wallet_service = WalletService(db)
    return wallet_service.get_user_transactions(current_user.id, transaction_type, limit)

@router.get("/balance")
async def get_balance(
    current_user: User = Depends(get_current_user)
):
    """Get current wallet balance"""
    return {
        "user_id": current_user.id,
        "balance": current_user.wallet_balance
    }

@router.post("/add")
async def add_money(
    request: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add money to wallet (creates a deposit request)"""
    wallet_service = WalletService(db)
    
    transaction, message = wallet_service.request_deposit(current_user.id, request)
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {
        "message": "Deposit request created successfully",
        "transaction": transaction
    }

@router.get("/summary")
async def get_wallet_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get wallet summary with balance and recent activity"""
    wallet_service = WalletService(db)
    wallet_info = wallet_service.get_wallet_info(current_user.id)
    
    if not wallet_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )
    
    # Get recent transactions
    recent_transactions = wallet_service.get_user_transactions(current_user.id, None, 5)
    
    return {
        "balance": current_user.wallet_balance,
        "user_id": current_user.id,
        "username": current_user.username,
        "recent_transactions": recent_transactions,
        "wallet_info": wallet_info
    }

@router.get("/payment-methods/deposit", response_model=List[PaymentMethodPublic])
async def get_deposit_payment_methods(db: Session = Depends(get_db)):
    """Get available payment methods for deposits"""
    try:
        # Query using string comparison since enum might not work properly
        methods = db.query(PaymentMethod).filter(
            PaymentMethod.status == "ACTIVE",
            PaymentMethod.supports_deposit == True
        ).all()
        
        result = []
        for method in methods:
            result.append(PaymentMethodPublic(
                id=method.id,
                name=method.name,
                type=method.type,
                supports_deposit=method.supports_deposit,
                supports_withdrawal=method.supports_withdrawal,
                min_amount=method.min_amount or 0,
                max_amount=method.max_amount or 0,
                instructions=method.instructions or "",
                display_order=method.display_order or 0,
                details=method.details or {}
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/payment-methods/withdrawal", response_model=List[PaymentMethodPublic])
async def get_withdrawal_payment_methods(db: Session = Depends(get_db)):
    """Get available payment methods for withdrawals"""
    try:
        methods = db.query(PaymentMethod).filter(
            PaymentMethod.status == "ACTIVE",
            PaymentMethod.supports_withdrawal == True
        ).all()
        
        result = []
        for method in methods:
            result.append(PaymentMethodPublic(
                id=method.id,
                name=method.name,
                type=method.type,
                supports_deposit=method.supports_deposit,
                supports_withdrawal=method.supports_withdrawal,
                min_amount=method.min_amount or 0,
                max_amount=method.max_amount or 0,
                instructions=method.instructions or "",
                display_order=method.display_order or 0,
                details=method.details or {}
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/payment-methods/debug")
async def debug_payment_methods(db: Session = Depends(get_db)):
    """Debug endpoint to check all payment methods in database"""
    try:
        # Get all payment methods without any filters
        all_methods = db.query(PaymentMethod).all()
        
        return {
            "total_count": len(all_methods),
            "methods": [
                {
                    "id": m.id,
                    "name": m.name,
                    "status": str(m.status),
                    "supports_deposit": m.supports_deposit,
                    "supports_withdrawal": m.supports_withdrawal,
                    "type": str(m.type)
                } for m in all_methods
            ]
        }
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}

@router.post("/payment-methods/create-sample")
async def create_sample_payment_methods(db: Session = Depends(get_db)):
    """Create sample payment methods for testing"""
    try:
        # Clear existing payment methods first
        db.query(PaymentMethod).delete()
        
        # Create sample payment methods
        sample_methods = [
            PaymentMethod(
                name="PhonePe UPI",
                type=PaymentMethodType.UPI,
                status=PaymentMethodStatus.ACTIVE,
                supports_deposit=True,
                supports_withdrawal=True,
                min_amount=10,
                max_amount=10000,
                instructions="Send money to the UPI ID provided",
                display_order=1,
                details={"upi_id": "teer@phonepe"}
            ),
            PaymentMethod(
                name="Paytm UPI",
                type=PaymentMethodType.UPI,
                status=PaymentMethodStatus.ACTIVE,
                supports_deposit=True,
                supports_withdrawal=True,
                min_amount=10,
                max_amount=10000,
                instructions="Send money to the UPI ID provided",
                display_order=2,
                details={"upi_id": "teer@paytm"}
            ),
            PaymentMethod(
                name="State Bank of India",
                type=PaymentMethodType.BANK_ACCOUNT,
                status=PaymentMethodStatus.ACTIVE,
                supports_deposit=True,
                supports_withdrawal=True,
                min_amount=100,
                max_amount=50000,
                instructions="Transfer to the bank account details provided",
                display_order=3,
                details={
                    "account_number": "12345678901",
                    "ifsc": "SBIN0001234",
                    "account_holder": "Teer Platform",
                    "bank_name": "State Bank of India"
                }
            )
        ]
        
        for method in sample_methods:
            db.add(method)
        
        db.commit()
        
        return {
            "message": "Sample payment methods created successfully",
            "count": len(sample_methods)
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e), "type": type(e).__name__}
