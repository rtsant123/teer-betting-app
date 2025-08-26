from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime

class ReferralSettingsBase(BaseModel):
    level_1_rate: float
    level_2_rate: float
    level_3_rate: float
    min_bet_for_commission: float
    min_withdrawal_amount: float
    max_withdrawal_amount: float
    commission_validity_days: int

class ReferralSettingsCreate(ReferralSettingsBase):
    @validator('level_1_rate', 'level_2_rate', 'level_3_rate')
    def validate_rates(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Commission rates must be between 0 and 100')
        return v
    
    @validator('min_bet_for_commission', 'min_withdrawal_amount')
    def validate_positive_amounts(cls, v):
        if v < 0:
            raise ValueError('Amounts must be positive')
        return v
    
    @validator('max_withdrawal_amount')
    def validate_max_withdrawal(cls, v):
        if v <= 0:
            raise ValueError('Max withdrawal amount must be positive')
        return v
    
    @validator('commission_validity_days')
    def validate_validity_days(cls, v):
        if v < 1 or v > 365:
            raise ValueError('Commission validity days must be between 1 and 365')
        return v

class ReferralSettingsUpdate(BaseModel):
    level_1_rate: Optional[float] = None
    level_2_rate: Optional[float] = None
    level_3_rate: Optional[float] = None
    min_bet_for_commission: Optional[float] = None
    min_withdrawal_amount: Optional[float] = None
    max_withdrawal_amount: Optional[float] = None
    commission_validity_days: Optional[int] = None
    is_active: Optional[bool] = None

class ReferralSettingsResponse(ReferralSettingsBase):
    id: int
    is_active: bool
    created_at: datetime
    created_by: int
    
    class Config:
        from_attributes = True

class ReferralLinkCreate(BaseModel):
    campaign_name: Optional[str] = "General"

class ReferralLinkResponse(BaseModel):
    id: int
    code: str
    campaign_name: str
    click_count: int
    conversion_count: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class CommissionResponse(BaseModel):
    id: int
    amount: float
    level: str
    status: str
    bet_amount: Optional[float]
    commission_rate: float
    created_at: datetime
    processed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class WithdrawalRequest(BaseModel):
    amount: float
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Withdrawal amount must be positive')
        return v

class WithdrawalResponse(BaseModel):
    id: int
    amount: float
    status: str
    created_at: datetime
    processed_at: Optional[datetime]
    admin_notes: Optional[str]
    
    class Config:
        from_attributes = True

class ReferralStatsResponse(BaseModel):
    total_referrals: int
    total_earned: float
    pending_commissions: float
    available_withdrawal: float
    total_withdrawn: float
    level_breakdown: dict

class ReferralUser(BaseModel):
    id: int
    username: str
    email: str
    joined_at: datetime
    total_bets: float
    commission_earned: float
    is_active: bool
    
    class Config:
        from_attributes = True
