from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from app.models.round import RoundType, RoundStatus

class RoundCreate(BaseModel):
    house_id: int
    round_type: RoundType
    scheduled_time: datetime
    betting_closes_at: datetime
    
    @validator('betting_closes_at')
    def betting_closes_before_scheduled(cls, v, values):
        scheduled_time = values.get('scheduled_time')
        if scheduled_time and v:
            # Convert both to naive UTC for comparison
            from datetime import timezone
            
            # Convert to UTC and make naive for simple comparison
            if v.tzinfo is not None:
                v_utc = v.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                v_utc = v
                
            if scheduled_time.tzinfo is not None:
                scheduled_utc = scheduled_time.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                scheduled_utc = scheduled_time
            
            if v_utc >= scheduled_utc:
                raise ValueError('Betting must close before scheduled time')
        return v

class RoundUpdate(BaseModel):
    scheduled_time: Optional[datetime] = None
    betting_closes_at: Optional[datetime] = None
    status: Optional[RoundStatus] = None
    result: Optional[int] = None
    actual_time: Optional[datetime] = None
    
    @validator('result')
    def result_must_be_valid(cls, v):
        if v is not None and not (0 <= v <= 99):
            raise ValueError('Result must be between 0-99')
        return v

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
    created_at: datetime
    
    class Config:
        from_attributes = True

class RoundWithBets(BaseModel):
    round_info: RoundResponse
    total_bets: int
    total_amount: float
    unique_players: int