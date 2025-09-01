"""
Teer Round Auto-Scheduler Service
Handles automatic daily round creation and management with proper timezone support
"""

from datetime import datetime, date, time, timedelta, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
import pytz

from app.models.house import House
from app.models.round import Round, RoundType, RoundStatus
from app.database import SessionLocal

class TeerSchedulerService:
    """Service for managing automatic Teer round scheduling"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_weekday_schedule(self, target_date: date) -> dict:
        """Get which houses should run on a given weekday"""
        weekday = target_date.weekday()  # 0=Monday, 6=Sunday
        
        weekday_columns = {
            0: 'runs_monday',
            1: 'runs_tuesday', 
            2: 'runs_wednesday',
            3: 'runs_thursday',
            4: 'runs_friday',
            5: 'runs_saturday',
            6: 'runs_sunday'
        }
        
        return weekday_columns.get(weekday, 'runs_sunday')
    
    def should_house_run_today(self, house: House, target_date: date) -> bool:
        """Check if a house should run on a specific date"""
        if not house.is_active:
            return False
            
        weekday_column = self.get_weekday_schedule(target_date)
        return getattr(house, weekday_column, False)
    
    def get_houses_for_date(self, target_date: date) -> List[House]:
        """Get all houses that should run on a specific date"""
        houses = self.db.query(House).filter(House.is_active == True).all()
        return [house for house in houses if self.should_house_run_today(house, target_date)]
    
    def rounds_exist_for_date(self, house_id: int, target_date: date) -> bool:
        """Check if rounds already exist for a house on a specific date"""
        start_datetime = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
        end_datetime = datetime.combine(target_date + timedelta(days=1), time.min).replace(tzinfo=timezone.utc)
        
        existing_count = self.db.query(Round).filter(
            Round.house_id == house_id,
            Round.scheduled_time >= start_datetime,
            Round.scheduled_time < end_datetime
        ).count()
        
        return existing_count > 0
    
    def create_rounds_for_date(self, house: House, target_date: date) -> List[Round]:
        """Create FR, SR, and FORECAST rounds for a house on a specific date with proper timezone handling"""
        rounds = []
        
        try:
            # Create FR Round with timezone-aware datetime
            fr_datetime = house.get_local_datetime(target_date, house.fr_time)
            # Convert to UTC for storage
            fr_datetime_utc = fr_datetime.astimezone(pytz.UTC)
            betting_closes_fr = house.get_betting_deadline(fr_datetime_utc)
            
            fr_round = Round(
                house_id=house.id,
                round_type=RoundType.FR,
                scheduled_time=fr_datetime_utc,
                betting_closes_at=betting_closes_fr,
                status=RoundStatus.SCHEDULED
            )
            self.db.add(fr_round)
            rounds.append(fr_round)
            
            # Create SR Round with timezone-aware datetime
            sr_datetime = house.get_local_datetime(target_date, house.sr_time)
            # Convert to UTC for storage
            sr_datetime_utc = sr_datetime.astimezone(pytz.UTC)
            betting_closes_sr = house.get_betting_deadline(sr_datetime_utc)
            
            sr_round = Round(
                house_id=house.id,
                round_type=RoundType.SR,
                scheduled_time=sr_datetime_utc,
                betting_closes_at=betting_closes_sr,
                status=RoundStatus.SCHEDULED
            )
            self.db.add(sr_round)
            rounds.append(sr_round)
            
            return rounds
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to create rounds for {house.name}: {str(e)}")
    
    
    def schedule_daily_rounds(self, target_date: date = None) -> dict:
        """Schedule rounds for a specific date (default: tomorrow)"""
        if target_date is None:
            target_date = date.today() + timedelta(days=1)
        
        results = {
            'date': target_date,
            'houses_scheduled': [],
            'houses_skipped': [],
            'total_rounds_created': 0
        }
        
        houses = self.get_houses_for_date(target_date)
        
        for house in houses:
            if self.rounds_exist_for_date(house.id, target_date):
                results['houses_skipped'].append({
                    'house': house.name,
                    'reason': 'Rounds already exist'
                })
                continue
            
            try:
                created_rounds = self.create_rounds_for_date(house, target_date)
                self.db.commit()
                
                results['houses_scheduled'].append({
                    'house': house.name,
                    'fr_time': house.get_display_time(house.fr_time),
                    'sr_time': house.get_display_time(house.sr_time),
                    'timezone': house.timezone,
                    'rounds_created': len(created_rounds)
                })
                results['total_rounds_created'] += len(created_rounds)
                
            except Exception as e:
                self.db.rollback()
                results['houses_skipped'].append({
                    'house': house.name,
                    'reason': f'Error: {str(e)}'
                })
        
        return results
    
    def auto_schedule_tomorrow_after_completion(self) -> dict:
        """Auto-schedule tomorrow's rounds - New improved logic"""
        tomorrow = date.today() + timedelta(days=1)
        
        # Get houses that should run tomorrow
        houses = self.get_houses_for_date(tomorrow)
        if not houses:
            return {
                'scheduled': False,
                'reason': 'No houses configured to run tomorrow'
            }
        
        # Check if rounds already exist for tomorrow
        existing_rounds = False
        for house in houses:
            if self.rounds_exist_for_date(house.id, tomorrow):
                existing_rounds = True
                break
        
        if existing_rounds:
            return {
                'scheduled': False,
                'reason': 'Rounds already scheduled for tomorrow'
            }
        
        # Create rounds for tomorrow regardless of today's completion status
        # This ensures continuous scheduling
        return self.schedule_daily_rounds(tomorrow)
    
    def create_next_day_rounds_after_results(self, house_id: int) -> dict:
        """Create next day rounds only after BOTH FR and SR results are published"""
        today = date.today()
        tomorrow = today + timedelta(days=1)
        
        # Check if both FR and SR results are published for today
        start_datetime = datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
        end_datetime = datetime.combine(today + timedelta(days=1), time.min).replace(tzinfo=timezone.utc)
        
        today_rounds = self.db.query(Round).filter(
            Round.house_id == house_id,
            Round.scheduled_time >= start_datetime,
            Round.scheduled_time < end_datetime,
            Round.round_type.in_([RoundType.FR, RoundType.SR])
        ).all()
        
        fr_round = next((r for r in today_rounds if r.round_type == RoundType.FR), None)
        sr_round = next((r for r in today_rounds if r.round_type == RoundType.SR), None)
        
        # Check if both rounds have results
        if not (fr_round and sr_round and fr_round.result is not None and sr_round.result is not None):
            return {
                'created': False,
                'reason': 'Both FR and SR results must be published first',
                'fr_result_published': fr_round.result is not None if fr_round else False,
                'sr_result_published': sr_round.result is not None if sr_round else False
            }
        
        # Check if house should run tomorrow
        house = self.db.query(House).filter(House.id == house_id).first()
        if not house or not self.should_house_run_today(house, tomorrow):
            return {
                'created': False,
                'reason': 'House not configured to run tomorrow'
            }
        
        # Check if rounds already exist for tomorrow
        if self.rounds_exist_for_date(house_id, tomorrow):
            return {
                'created': False,
                'reason': 'Rounds already exist for tomorrow'
            }
        
        # Create rounds for tomorrow
        try:
            rounds = self.create_rounds_for_date(house, tomorrow)
            self.db.commit()
            
            return {
                'created': True,
                'rounds_created': len(rounds),
                'date': tomorrow.isoformat(),
                'house_name': house.name
            }
        except Exception as e:
            self.db.rollback()
            return {
                'created': False,
                'reason': f'Error creating rounds: {str(e)}'
            }
    
    def get_forecast_rounds(self, house_id: int, target_date: date = None) -> dict:
        """Get FR and SR rounds for forecast betting"""
        if target_date is None:
            target_date = date.today()
        
        start_datetime = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
        end_datetime = datetime.combine(target_date + timedelta(days=1), time.min).replace(tzinfo=timezone.utc)
        
        rounds = self.db.query(Round).filter(
            Round.house_id == house_id,
            Round.scheduled_time >= start_datetime,
            Round.scheduled_time < end_datetime
        ).all()
        
        fr_round = next((r for r in rounds if r.round_type == RoundType.FR), None)
        sr_round = next((r for r in rounds if r.round_type == RoundType.SR), None)
        
        now = datetime.now(timezone.utc)
        
        # Forecast is only available if BOTH FR and SR rounds exist and are still accepting bets
        forecast_available = fr_round is not None and sr_round is not None
        
        # Forecast betting is open only if BOTH rounds are scheduled and BOTH are still accepting bets
        # This means forecast closes when FR closes (earliest betting window)
        forecast_betting_open = (
            forecast_available and
            fr_round.status == RoundStatus.SCHEDULED and 
            sr_round.status == RoundStatus.SCHEDULED and
            now < fr_round.betting_closes_at and
            now < sr_round.betting_closes_at
        )
        
        # Additional check: if FR round betting has closed, forecast should also be closed
        # since forecast depends on predicting BOTH FR and SR results
        if fr_round and fr_round.status != RoundStatus.SCHEDULED:
            forecast_betting_open = False
        
        return {
            'fr_round': fr_round,
            'sr_round': sr_round,
            'forecast_available': forecast_available,
            'forecast_betting_open': forecast_betting_open,
            'fr_betting_open': fr_round and fr_round.status == RoundStatus.SCHEDULED and now < fr_round.betting_closes_at,
            'sr_betting_open': sr_round and sr_round.status == RoundStatus.SCHEDULED and now < sr_round.betting_closes_at,
            'fr_closes_at': fr_round.betting_closes_at if fr_round else None,
            'sr_closes_at': sr_round.betting_closes_at if sr_round else None
        }
    
    def update_round_statuses(self) -> dict:
        """Update round statuses based on current time - Critical for Teer betting"""
        now = datetime.now(timezone.utc)
        results = {
            'closed_rounds': 0,
            'available_for_results': [],
            'errors': []
        }
        
        try:
            # Find rounds that should be closed for betting (deadline passed)
            rounds_to_close = self.db.query(Round).filter(
                Round.status.in_([RoundStatus.SCHEDULED, RoundStatus.ACTIVE]),
                Round.betting_closes_at <= now
            ).all()
            
            for round_obj in rounds_to_close:
                round_obj.status = RoundStatus.ACTIVE  # Mark as active (betting closed)
                results['closed_rounds'] += 1
                results['available_for_results'].append({
                    'round_id': round_obj.id,
                    'house_name': round_obj.house.name,
                    'round_type': round_obj.round_type.value,
                    'scheduled_time': round_obj.scheduled_time.isoformat(),
                    'betting_closed_at': round_obj.betting_closes_at.isoformat()
                })
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            results['errors'].append(f"Error updating round statuses: {str(e)}")
        
        return results

# Background task function for daily scheduling
def schedule_daily_rounds_task():
    """Background task to schedule tomorrow's rounds"""
    db = SessionLocal()
    try:
        scheduler = TeerSchedulerService(db)
        
        # Update current round statuses
        status_results = scheduler.update_round_statuses()
        
        # Try to auto-schedule tomorrow if today is complete
        schedule_results = scheduler.auto_schedule_tomorrow_after_completion()
        
        return {
            'status_update': status_results,
            'scheduling': schedule_results
        }
        
    except Exception as e:
        return {'error': str(e)}
    finally:
        db.close()
