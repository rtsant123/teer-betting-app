from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from app.models.transaction import TransactionType, TransactionStatus

class UserBankDetails(BaseModel):
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_holder_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None

class UserInfo(BaseModel):
    id: int
    username: str
    phone: str
    wallet_balance: float
    bank_details: UserBankDetails
    created_at: datetime
    
    class Config:
        from_attributes = True

class DepositRequest(BaseModel):
    amount: float
    description: Optional[str] = None
    payment_proof_url: Optional[str] = None
    deposit_method: Optional[str] = None  # UPI, Bank Transfer, etc.
    reference_number: Optional[str] = None
    deposit_bank: Optional[str] = None
    deposit_upi_id: Optional[str] = None
    
    @validator('amount')
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class WithdrawalRequest(BaseModel):
    amount: float
    description: Optional[str] = None
    
    @validator('amount')
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    transaction_type: TransactionType
    amount: float
    status: TransactionStatus
    description: Optional[str] = None
    payment_proof_url: Optional[str] = None
    
    # Deposit specific details
    deposit_method: Optional[str] = None
    reference_number: Optional[str] = None
    deposit_bank: Optional[str] = None
    deposit_upi_id: Optional[str] = None
    
    admin_notes: Optional[str] = None
    processed_by: Optional[int] = None
    processed_at: Optional[datetime] = None
    balance_before: float
    balance_after: float
    created_at: datetime
    
    class Config:
        from_attributes = True

class DetailedTransactionResponse(BaseModel):
    id: int
    user: UserInfo
    transaction_type: TransactionType
    amount: float
    status: TransactionStatus
    description: Optional[str] = None
    payment_proof_url: Optional[str] = None
    
    # Deposit specific details
    deposit_method: Optional[str] = None
    reference_number: Optional[str] = None
    deposit_bank: Optional[str] = None
    deposit_upi_id: Optional[str] = None
    
    admin_notes: Optional[str] = None
    processed_by: Optional[int] = None
    processed_at: Optional[datetime] = None
    balance_before: float
    balance_after: float
    created_at: datetime
    
    class Config:
        from_attributes = True

class WalletResponse(BaseModel):
    user_id: int
    balance: float
    recent_transactions: List[TransactionResponse]

class TransactionUpdate(BaseModel):
    status: TransactionStatus
    admin_notes: Optional[str] = None