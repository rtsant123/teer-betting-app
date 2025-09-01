from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time

# Import required schemas for admin functionality
from app.schemas.auth import UserResponse
from app.schemas.bet import BetResponse
from app.schemas.wallet import TransactionResponse

# ==================== HOUSE SCHEMAS ====================

class HouseCreate(BaseModel):
    name: str
    location: Optional[str] = None
    timezone: str = "Asia/Kolkata"  # House timezone
    fr_time: str = "15:45:00"  # Format: "HH:MM:SS"
    sr_time: str = "16:45:00"  # Format: "HH:MM:SS"
    betting_window_minutes: int = 30
    runs_monday: bool = True
    runs_tuesday: bool = True
    runs_wednesday: bool = True
    runs_thursday: bool = True
    runs_friday: bool = True
    runs_saturday: bool = True
    runs_sunday: bool = False
    fr_direct_payout_rate: float = 70.0
    fr_house_payout_rate: float = 7.0
    fr_ending_payout_rate: float = 7.0
    sr_direct_payout_rate: float = 60.0
    sr_house_payout_rate: float = 6.0
    sr_ending_payout_rate: float = 6.0
    forecast_payout_rate: float = 400.0
    forecast_direct_payout_rate: float = 400.0
    forecast_house_payout_rate: float = 40.0
    forecast_ending_payout_rate: float = 40.0
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('House name cannot be empty')
        return v.strip()
    
    @validator('timezone')
    def validate_timezone(cls, v):
        # List of common supported timezones
        valid_timezones = [
            'Asia/Kolkata',      # India Standard Time (IST)
            'Asia/Bangkok',      # Thailand Time
            'Asia/Dhaka',        # Bangladesh Time
            'Asia/Kathmandu',    # Nepal Time
            'Asia/Jakarta',      # Indonesia Time
            'Asia/Singapore',    # Singapore Time
            'Asia/Manila',       # Philippines Time
            'UTC'                # UTC
        ]
        if v not in valid_timezones:
            raise ValueError(f'Invalid timezone. Supported: {", ".join(valid_timezones)}')
        return v
    
    @validator('fr_time', 'sr_time')
    def validate_time_format(cls, v):
        try:
            # Support both HH:MM and HH:MM:SS formats
            if len(v.split(':')) == 2:
                datetime.strptime(v, "%H:%M")
                v = v + ":00"  # Add seconds
            else:
                datetime.strptime(v, "%H:%M:%S")
            return v
        except ValueError:
            raise ValueError('Time must be in HH:MM or HH:MM:SS format')

# ==================== ROUND SCHEMAS ====================

class RoundCreate(BaseModel):
    house_id: int
    round_type: str  # "FR" or "SR"
    round_date: date
    round_time: datetime
    betting_start_time: datetime
    betting_end_time: datetime

class RoundUpdate(BaseModel):
    betting_start_time: Optional[datetime] = None
    betting_end_time: Optional[datetime] = None
    round_time: Optional[datetime] = None

class RoundResultUpdate(BaseModel):
    fr_result: Optional[int] = None
    sr_result: Optional[int] = None
    auto_settle: bool = True
    
    @validator('fr_result', 'sr_result')
    def validate_result_range(cls, v):
        if v is not None and (v < 0 or v > 99):
            raise ValueError('Result must be between 0 and 99')
        return v

class RoundResponse(BaseModel):
    id: int
    house: Dict[str, Any]
    round_type: str
    round_date: date
    betting_start_time: datetime
    betting_end_time: datetime
    round_time: datetime
    is_result_declared: bool
    fr_result: Optional[int]
    sr_result: Optional[int]
    status: str
    total_bets: int
    total_bet_amount: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== SETTLEMENT SCHEMAS ====================

class SettlementResponse(BaseModel):
    settled_bets: int
    total_winnings: float

class RoundSettlementResponse(BaseModel):
    message: str
    round_id: int
    fr_result: Optional[int]
    sr_result: Optional[int]
    is_result_declared: bool
    settlement: SettlementResponse

# ==================== DASHBOARD SCHEMAS ====================

class DashboardTodayStats(BaseModel):
    total_rounds: int
    open_for_betting: int
    pending_results: int
    total_bets: int
    total_bet_amount: float
    total_users_bet: int

class DashboardSystemStats(BaseModel):
    total_houses: int
    active_users: int
    total_wallet_balance: float

class DashboardAlerts(BaseModel):
    pending_results: int
    open_betting: int

class DashboardResponse(BaseModel):
    today: DashboardTodayStats
    system: DashboardSystemStats
    alerts: DashboardAlerts

# ==================== USER MANAGEMENT SCHEMAS ====================

class UserListItem(BaseModel):
    id: int
    username: str
    phone: str
    wallet_balance: float
    is_active: bool
    created_at: datetime
    total_bets: int
    total_bet_amount: float

class UserListResponse(BaseModel):
    users: List[UserListItem]
    total: int
    skip: int
    limit: int

class WalletAdjustment(BaseModel):
    amount: float
    reason: str
    operation: str = "add"  # "add" or "subtract"
    
    @validator('amount')
    def validate_positive_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v
    
    @validator('operation')
    def validate_operation(cls, v):
        if v not in ["add", "subtract"]:
            raise ValueError('Operation must be "add" or "subtract"')
        return v

class WalletAdjustmentResponse(BaseModel):
    message: str
    user_id: int
    operation: str
    amount: float
    new_balance: float

class HouseUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None
    fr_time: Optional[str] = None
    sr_time: Optional[str] = None
    betting_window_minutes: Optional[int] = None
    runs_monday: Optional[bool] = None
    runs_tuesday: Optional[bool] = None
    runs_wednesday: Optional[bool] = None
    runs_thursday: Optional[bool] = None
    runs_friday: Optional[bool] = None
    runs_saturday: Optional[bool] = None
    runs_sunday: Optional[bool] = None
    fr_direct_payout_rate: Optional[float] = None
    fr_house_payout_rate: Optional[float] = None
    fr_ending_payout_rate: Optional[float] = None
    sr_direct_payout_rate: Optional[float] = None
    sr_house_payout_rate: Optional[float] = None
    sr_ending_payout_rate: Optional[float] = None
    forecast_payout_rate: Optional[float] = None
    forecast_direct_payout_rate: Optional[float] = None
    forecast_house_payout_rate: Optional[float] = None
    forecast_ending_payout_rate: Optional[float] = None
    
    @validator('timezone')
    def validate_timezone(cls, v):
        if v is not None:
            # List of common supported timezones
            valid_timezones = [
                'Asia/Kolkata',      # India Standard Time (IST)
                'Asia/Bangkok',      # Thailand Time
                'Asia/Dhaka',        # Bangladesh Time
                'Asia/Kathmandu',    # Nepal Time
                'Asia/Jakarta',      # Indonesia Time
                'Asia/Singapore',    # Singapore Time
                'Asia/Manila',       # Philippines Time
                'UTC'                # UTC
            ]
            if v not in valid_timezones:
                raise ValueError(f'Invalid timezone. Supported: {", ".join(valid_timezones)}')
        return v
    
    @validator('fr_time', 'sr_time')
    def validate_time_format(cls, v):
        if v is not None:
            try:
                # Support both HH:MM and HH:MM:SS formats
                if len(v.split(':')) == 2:
                    datetime.strptime(v, "%H:%M")
                    v = v + ":00"  # Add seconds
                else:
                    datetime.strptime(v, "%H:%M:%S")
                return v
            except ValueError:
                raise ValueError('Time must be in HH:MM or HH:MM:SS format')
        return v

class HouseResponse(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    is_active: bool = True
    fr_time: str = "15:45:00"
    sr_time: str = "16:45:00"
    betting_window_minutes: int = 30
    runs_monday: bool = True
    runs_tuesday: bool = True
    runs_wednesday: bool = True
    runs_thursday: bool = True
    runs_friday: bool = True
    runs_saturday: bool = True
    runs_sunday: bool = False
    fr_direct_payout_rate: float = 70.0
    fr_house_payout_rate: float = 7.0
    fr_ending_payout_rate: float = 7.0
    sr_direct_payout_rate: float = 60.0
    sr_house_payout_rate: float = 6.0
    sr_ending_payout_rate: float = 6.0
    forecast_payout_rate: float = 400.0
    forecast_direct_payout_rate: float = 400.0
    forecast_house_payout_rate: float = 40.0
    forecast_ending_payout_rate: float = 40.0
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class GameSettingsResponse(BaseModel):
    house_id: int
    house_name: str
    direct_payout_rate: float
    house_payout_rate: float
    ending_payout_rate: float
    forecast_payout_rate: float
    
    class Config:
        from_attributes = True

class UserManagement(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    wallet_balance: Optional[float] = None

class AdminUserCreate(BaseModel):
    username: str
    phone: str
    password: str
    role: str  # "ADMIN", "SUPER_AGENT", "AGENT"
    is_admin: bool = True
    
    @validator('username')
    def username_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Username cannot be empty')
        return v.strip()
    
    @validator('phone')
    def phone_must_be_valid(cls, v):
        import re
        if not re.match(r'^\+?[\d\s\-\(\)]{10,15}$', v):
            raise ValueError('Invalid phone number format')
        return v
    
    @validator('role')
    def validate_role(cls, v):
        valid_roles = ["ADMIN", "SUPER_AGENT", "AGENT"]
        if v not in valid_roles:
            raise ValueError(f'Role must be one of: {", ".join(valid_roles)}')
        return v

class UserRoleUpdate(BaseModel):
    role: str
    is_admin: bool
    
    @validator('role')
    def validate_role(cls, v):
        valid_roles = ["PLAYER", "AGENT", "SUPER_AGENT", "ADMIN"]
        if v not in valid_roles:
            raise ValueError(f'Role must be one of: {", ".join(valid_roles)}')
        return v

class TaskAssignment(BaseModel):
    user_id: int
    task_type: str  # "RESULT_MANAGEMENT", "PAYMENT_APPROVAL", "USER_MANAGEMENT", "HOUSE_MANAGEMENT"
    task_description: str
    priority: str = "MEDIUM"  # "LOW", "MEDIUM", "HIGH"
    due_date: Optional[datetime] = None
    
    @validator('task_type')
    def validate_task_type(cls, v):
        valid_types = ["RESULT_MANAGEMENT", "PAYMENT_APPROVAL", "USER_MANAGEMENT", "HOUSE_MANAGEMENT", "SYSTEM_MAINTENANCE"]
        if v not in valid_types:
            raise ValueError(f'Task type must be one of: {", ".join(valid_types)}')
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        valid_priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]
        if v not in valid_priorities:
            raise ValueError(f'Priority must be one of: {", ".join(valid_priorities)}')
        return v

class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_houses: int
    active_houses: int
    todays_rounds: int
    pending_deposits: int
    pending_withdrawals: int
    total_bets: int
    today_bets: int
    total_deposits: float
    total_withdrawals: float
    today_deposits: float
    today_withdrawals: float
    total_bet_amount: float
    total_payouts: float
    today_bet_amount: float
    today_payouts: float
    system_profit: float
    today_profit: float

class UserStats(BaseModel):
    user: UserResponse
    total_bets: int
    bet_amount: float
    won_bets: int
    payouts: float
    direct_bets: int
    house_bets: int
    ending_bets: int
    forecast_bets: int
    total_deposits: float
    total_withdrawals: float
    profit_loss: float
    recent_bets: List[BetResponse]
    recent_transactions: List[TransactionResponse]

    class Config:
        from_attributes = True
