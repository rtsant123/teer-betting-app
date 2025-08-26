from pydantic import BaseModel, validator
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.payment_method import PaymentMethodType, PaymentMethodStatus

class PaymentMethodBase(BaseModel):
    name: str
    type: PaymentMethodType
    details: Optional[Dict[str, Any]] = None
    instructions: Optional[str] = None
    supports_deposit: bool = True
    supports_withdrawal: bool = True
    min_amount: int = 10
    max_amount: int = 100000
    admin_contact: Optional[str] = None
    display_order: int = 0

class PaymentMethodCreate(PaymentMethodBase):
    status: PaymentMethodStatus = PaymentMethodStatus.ACTIVE

class PaymentMethodUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[PaymentMethodType] = None
    status: Optional[PaymentMethodStatus] = None
    details: Optional[Dict[str, Any]] = None
    instructions: Optional[str] = None
    supports_deposit: Optional[bool] = None
    supports_withdrawal: Optional[bool] = None
    min_amount: Optional[int] = None
    max_amount: Optional[int] = None
    admin_contact: Optional[str] = None
    display_order: Optional[int] = None

class PaymentMethodResponse(PaymentMethodBase):
    id: int
    status: PaymentMethodStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PaymentMethodPublic(BaseModel):
    """Public payment method info for users (without sensitive admin details)"""
    id: int
    name: str
    type: PaymentMethodType
    instructions: Optional[str] = None
    supports_deposit: bool
    supports_withdrawal: bool
    min_amount: int
    max_amount: int
    display_order: int
    # Only include necessary details for users
    details: Dict[str, Any]

    class Config:
        from_attributes = True

# Enhanced Transaction Schemas
class TransactionCreateRequest(BaseModel):
    transaction_type: str
    amount: float
    payment_method_id: Optional[int] = None
    transaction_details: Optional[Dict[str, Any]] = None
    description: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    transaction_type: str
    amount: float
    status: str
    payment_method_id: Optional[int] = None
    description: Optional[str] = None
    transaction_details: Optional[Dict[str, Any]] = None
    reference_number: Optional[str] = None
    admin_notes: Optional[str] = None
    balance_before: float
    balance_after: float
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DepositRequest(BaseModel):
    amount: float
    payment_method_id: int
    transaction_details: Dict[str, Any]
    # Example transaction_details:
    # {
    #   "reference_id": "TXN123456",
    #   "upi_id": "user@paytm" (for UPI),
    #   "account_number": "1234567890" (for bank),
    #   "screenshot_url": "https://...",
    #   "user_notes": "Payment made via PhonePe"
    # }

class WithdrawalRequest(BaseModel):
    amount: float
    payment_method_id: int
    transaction_details: Dict[str, Any]
    # Example transaction_details:
    # {
    #   "upi_id": "user@paytm" (for UPI withdrawal),
    #   "account_number": "1234567890",
    #   "ifsc_code": "SBIN0001234" (for bank withdrawal),
    #   "account_holder_name": "John Doe"
    # }

class TransactionProcessRequest(BaseModel):
    status: str  # APPROVED, REJECTED
    admin_notes: Optional[str] = None
