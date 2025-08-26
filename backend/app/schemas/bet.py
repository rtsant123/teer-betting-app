from pydantic import BaseModel, field_validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.bet import BetType, BetStatus
from app.models.round import RoundType, RoundStatus

class BetNumbers(BaseModel):
    """Schema for bet numbers with amounts"""
    numbers: Dict[str, float] = Field(..., description="Number to amount mapping, e.g., {'31': 10, '45': 20}")
    
    @field_validator('numbers')
    @classmethod
    def validate_numbers(cls, v):
        if not v:
            raise ValueError('At least one number must be selected')
        
        for number, amount in v.items():
            if not number.isdigit():
                raise ValueError(f'Invalid number format: {number}')
            if amount <= 0:
                raise ValueError(f'Amount must be positive for number {number}')
        
        return v

class ForecastPair(BaseModel):
    """Schema for forecast bet pairs - new structure"""
    fr_number: int = Field(..., ge=0, le=99, description="First Round number")
    sr_number: int = Field(..., ge=0, le=99, description="Second Round number") 
    amount: float = Field(..., gt=0, description="Bet amount for this pair")
    
class ForecastBet(BaseModel):
    """Schema for new forecast betting logic"""
    house_id: int
    forecast_type: str = Field(..., description="Type: direct, house, or ending")
    fr_number: int = Field(..., description="FR number selection")
    sr_number: int = Field(..., description="SR number selection")
    amount: float = Field(..., gt=0, description="Bet amount")
    
    @field_validator('forecast_type')
    @classmethod
    def validate_forecast_type(cls, v):
        if v not in ['direct', 'house', 'ending']:
            raise ValueError('forecast_type must be direct, house, or ending')
        return v
        
    @field_validator('fr_number', 'sr_number')
    @classmethod
    def validate_numbers(cls, v, info):
        forecast_type = info.data.get('forecast_type')
        field_name = info.field_name
        
        if forecast_type == 'direct':
            if not (0 <= v <= 99):
                raise ValueError(f'{field_name} must be between 00-99 for direct forecast')
        elif forecast_type in ['house', 'ending']:
            if not (0 <= v <= 9):
                raise ValueError(f'{field_name} must be between 0-9 for {forecast_type} forecast')
        
        return v

class BetCreate(BaseModel):
    house_id: int
    round_id: Optional[int] = None  # Not needed for forecast bets
    bet_type: BetType
    
    # For Direct, House, Ending bets
    bet_numbers: Optional[Dict[str, float]] = None
    
    # For Forecast bets
    forecast_pairs: Optional[List[ForecastPair]] = None
    fr_round_id: Optional[int] = None
    sr_round_id: Optional[int] = None
    
    @field_validator('bet_numbers')
    @classmethod
    def validate_bet_numbers(cls, v, info):
        bet_type = info.data.get('bet_type')
        
        if bet_type in [BetType.DIRECT, BetType.HOUSE, BetType.ENDING] and not v:
            raise ValueError(f'{bet_type.value} bets require bet_numbers')
        
        if v:
            for number, amount in v.items():
                if bet_type == BetType.DIRECT:
                    if not (number.isdigit() and 0 <= int(number) <= 99):
                        raise ValueError('Direct bet numbers must be between 00-99')
                elif bet_type in [BetType.HOUSE, BetType.ENDING]:
                    if not (number.isdigit() and 0 <= int(number) <= 9):
                        raise ValueError('House/Ending bet numbers must be between 0-9')
                
                if amount <= 0:
                    raise ValueError('Bet amounts must be positive')
        
        return v
    
    @field_validator('forecast_pairs')
    @classmethod
    def validate_forecast_pairs(cls, v, info):
        bet_type = info.data.get('bet_type')
        
        if bet_type == BetType.FORECAST:
            if not v:
                raise ValueError('Forecast bets require forecast_pairs')
            if len(v) == 0:
                raise ValueError('At least one forecast pair required')
        
        return v

class TicketCreate(BaseModel):
    """Schema for creating a complete betting ticket"""
    house_id: int
    
    # FR bets
    fr_direct: Optional[Dict[str, float]] = None
    fr_house: Optional[Dict[str, float]] = None
    fr_ending: Optional[Dict[str, float]] = None
    
    # SR bets  
    sr_direct: Optional[Dict[str, float]] = None
    sr_house: Optional[Dict[str, float]] = None
    sr_ending: Optional[Dict[str, float]] = None
    
    # Forecast bets
    forecast_pairs: Optional[List[ForecastPair]] = None
    forecast_type: Optional[str] = None  # Add forecast type field

class BetResponse(BaseModel):
    id: int
    user_id: int
    round_id: Optional[int] = None
    bet_type: BetType
    bet_value: Optional[str] = None  # Changed from bet_numbers to match database schema
    bet_numbers: Optional[Dict[str, float]] = None  # Keep for backward compatibility
    forecast_pairs: Optional[List[Dict[str, Any]]] = None
    forecast_combinations: Optional[str] = None  # Added to match database
    total_bet_amount: float
    status: BetStatus
    potential_payout: float
    actual_payout: float
    ticket_id: Optional[str] = None
    fr_round_id: Optional[int] = None
    sr_round_id: Optional[int] = None
    house_name: Optional[str] = None  # Added to match database
    created_at: datetime
    
    class Config:
        from_attributes = True

class TicketResponse(BaseModel):
    ticket_id: str
    user_id: int
    house_id: int
    house_name: str
    total_amount: float
    total_potential_payout: float
    status: BetStatus
    bets_summary: Dict[str, Any]
    bets: List[BetResponse]
    created_at: datetime
    
    class Config:
        from_attributes = True

class RoundResponse(BaseModel):
    id: int
    house_id: int
    house_name: str
    round_type: RoundType
    status: RoundStatus
    scheduled_time: datetime
    betting_closes_at: datetime
    actual_time: Optional[datetime] = None
    result: Optional[int] = None
    payout_rates: Optional[Dict[str, float]] = None
    min_bet_amount: float
    max_bet_amount: float
    is_betting_enabled: bool
    
    class Config:
        from_attributes = True

class HouseResponse(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    is_active: bool
    direct_payout_rate: float
    house_payout_rate: float
    ending_payout_rate: float
    forecast_payout_rate: float
    
    class Config:
        from_attributes = True

class BetSummaryResponse(BaseModel):
    total_tickets: int
    total_bets: int
    total_amount: float
    pending_bets: int
    won_bets: int
    lost_bets: int
    total_winnings: float
    
class GameSettingsResponse(BaseModel):
    house_id: int
    forecast_payout_rate: float
    forecast_min_bet: float
    forecast_max_bet: float
    max_numbers_per_bet: int
    daily_betting_limit: float
    house_commission: float
    
    class Config:
        from_attributes = True

class BetValidationResponse(BaseModel):
    can_place_bet: bool
    message: str
    current_balance: float
    daily_spent: float
    remaining_limit: float