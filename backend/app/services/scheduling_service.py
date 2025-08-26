from sqlalchemy.orm import Session
from datetime import datetime, timedelta, time
from typing import List, Optional
import calendar

from app.models.house import House
from app.models.round import Round, RoundType, RoundStatus
from app.models.bet import Bet, BetType

class SchedulingService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_house_with_schedule(self, house_data: dict, days_ahead: int = 30) -> House:
        """Create a new house and auto-schedule rounds for the next N days"""
        try:
            # Create the house
            house = House(**house_data)
            self.db.add(house)
            self.db.flush()  # Get the house ID
            
            # Auto-schedule rounds for the next N days
            self.auto_schedule_house_rounds(house.id, days_ahead)
            
            self.db.commit()
            return house
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def auto_schedule_house_rounds(self, house_id: int, days_ahead: int = 30) -> int:
        """Auto-schedule FR, SR, and Forecast rounds for a house for the next N days"""
        house = self.db.query(House).filter(House.id == house_id).first()
        if not house:
            raise ValueError("House not found")
        
        created_rounds = 0
        today = datetime.now().date()
        
        for day_offset in range(days_ahead):
            target_date = today + timedelta(days=day_offset)
            weekday = target_date.weekday()  # 0=Monday, 6=Sunday
            
            # Check if house operates on this day
            if not self._house_operates_on_day(house, weekday):
                continue
                
            # Check if rounds already exist for this date
            existing_rounds = self.db.query(Round).filter(
                Round.house_id == house_id,
                Round.scheduled_time >= datetime.combine(target_date, time.min),
                Round.scheduled_time < datetime.combine(target_date + timedelta(days=1), time.min)
            ).count()
            
            if existing_rounds > 0:
                continue  # Skip if rounds already exist for this date
            
            # Create FR round
            fr_datetime = datetime.combine(target_date, house.fr_time)
            fr_betting_closes = fr_datetime - timedelta(minutes=house.betting_window_minutes)
            
            fr_round = Round(
                house_id=house_id,
                round_type=RoundType.FR,
                status=RoundStatus.SCHEDULED,
                scheduled_time=fr_datetime,
                betting_closes_at=fr_betting_closes
            )
            self.db.add(fr_round)
            created_rounds += 1
            
            # Create SR round
            sr_datetime = datetime.combine(target_date, house.sr_time)
            sr_betting_closes = sr_datetime - timedelta(minutes=house.betting_window_minutes)
            
            sr_round = Round(
                house_id=house_id,
                round_type=RoundType.SR,
                status=RoundStatus.SCHEDULED,
                scheduled_time=sr_datetime,
                betting_closes_at=sr_betting_closes
            )
            self.db.add(sr_round)
            created_rounds += 1
        
        self.db.commit()
        return created_rounds
    
    def _house_operates_on_day(self, house: House, weekday: int) -> bool:
        """Check if house operates on the given weekday (0=Monday, 6=Sunday)"""
        day_flags = [
            house.runs_monday,    # 0
            house.runs_tuesday,   # 1
            house.runs_wednesday, # 2
            house.runs_thursday,  # 3
            house.runs_friday,    # 4
            house.runs_saturday,  # 5
            house.runs_sunday     # 6
        ]
        return day_flags[weekday]
    
    def update_house_schedule(self, house_id: int, schedule_data: dict) -> bool:
        """Update house schedule and regenerate future rounds"""
        try:
            house = self.db.query(House).filter(House.id == house_id).first()
            if not house:
                return False
            
            # Update house schedule
            for key, value in schedule_data.items():
                if hasattr(house, key):
                    setattr(house, key, value)
            
            # Delete future scheduled rounds (not yet active)
            future_rounds = self.db.query(Round).filter(
                Round.house_id == house_id,
                Round.status == RoundStatus.SCHEDULED,
                Round.scheduled_time > datetime.now()
            ).all()
            
            for round_obj in future_rounds:
                # Check if round has bets
                bet_count = self.db.query(Bet).filter(
                    (Bet.round_id == round_obj.id) |
                    (Bet.fr_round_id == round_obj.id) |
                    (Bet.sr_round_id == round_obj.id)
                ).count()
                
                if bet_count == 0:
                    self.db.delete(round_obj)
            
            # Regenerate rounds with new schedule
            self.auto_schedule_house_rounds(house_id, days_ahead=30)
            
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def update_round_details(self, round_id: int, update_data: dict) -> bool:
        """Update specific round details (timing, payout rates, etc.)"""
        try:
            round_obj = self.db.query(Round).filter(Round.id == round_id).first()
            if not round_obj:
                return False
            
            # Update round fields
            for key, value in update_data.items():
                if hasattr(round_obj, key):
                    setattr(round_obj, key, value)
            
            # If timing is updated, update betting_closes_at
            if 'scheduled_time' in update_data:
                house = round_obj.house
                round_obj.betting_closes_at = round_obj.scheduled_time - timedelta(
                    minutes=house.betting_window_minutes
                )
            
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def close_forecast_with_fr(self, fr_round_id: int) -> int:
        """When FR round closes, close all forecast betting for that day/house"""
        try:
            fr_round = self.db.query(Round).filter(
                Round.id == fr_round_id,
                Round.round_type == RoundType.FR
            ).first()
            
            if not fr_round:
                return 0
            
            # Get the date of the FR round
            fr_date = fr_round.scheduled_time.date()
            
            # Find all forecast bets for the same house and date that are still pending
            forecast_bets = self.db.query(Bet).filter(
                Bet.bet_type == BetType.FORECAST,
                Bet.fr_round_id == fr_round_id,
                Bet.status.in_(["PENDING", "ACTIVE"])
            ).all()
            
            closed_bets = 0
            for bet in forecast_bets:
                bet.status = "CLOSED_FOR_BETTING"
                closed_bets += 1
            
            self.db.commit()
            return closed_bets
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_house_schedule_preview(self, house_id: int, days_ahead: int = 7) -> List[dict]:
        """Get a preview of scheduled rounds for a house"""
        house = self.db.query(House).filter(House.id == house_id).first()
        if not house:
            return []
        
        rounds = self.db.query(Round).filter(
            Round.house_id == house_id,
            Round.scheduled_time >= datetime.now(),
            Round.scheduled_time <= datetime.now() + timedelta(days=days_ahead)
        ).order_by(Round.scheduled_time).all()
        
        schedule = []
        for round_obj in rounds:
            schedule.append({
                "id": round_obj.id,
                "date": round_obj.scheduled_time.date().isoformat(),
                "time": round_obj.scheduled_time.time().isoformat(),
                "type": round_obj.round_type.value,
                "status": round_obj.status.value,
                "betting_closes_at": round_obj.betting_closes_at.isoformat(),
                "has_bets": self._round_has_bets(round_obj.id)
            })
        
        return schedule
    
    def _round_has_bets(self, round_id: int) -> bool:
        """Check if a round has any bets"""
        bet_count = self.db.query(Bet).filter(
            (Bet.round_id == round_id) |
            (Bet.fr_round_id == round_id) |
            (Bet.sr_round_id == round_id)
        ).count()
        return bet_count > 0
    
    def get_operating_days_summary(self, house_id: int) -> dict:
        """Get summary of which days the house operates"""
        house = self.db.query(House).filter(House.id == house_id).first()
        if not house:
            return {}
        
        return {
            "monday": house.runs_monday,
            "tuesday": house.runs_tuesday,
            "wednesday": house.runs_wednesday,
            "thursday": house.runs_thursday,
            "friday": house.runs_friday,
            "saturday": house.runs_saturday,
            "sunday": house.runs_sunday,
            "fr_time": house.fr_time.isoformat() if house.fr_time else None,
            "sr_time": house.sr_time.isoformat() if house.sr_time else None,
            "betting_window_minutes": house.betting_window_minutes
        }
