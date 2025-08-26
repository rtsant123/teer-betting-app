from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional, Tuple
from datetime import datetime, timedelta, date, time

from app.models import Round, House, Bet, User
from app.models.round import RoundType, RoundStatus
from app.models.bet import BetStatus
from app.schemas.round import RoundCreate, RoundUpdate, RoundResponse, RoundWithBets
from app.services.teer_scheduler import TeerSchedulerService

class RoundService:
    def __init__(self, db: Session):
        self.db = db
    
    def _create_round_response(self, round_obj: Round) -> RoundResponse:
        """Helper method to create RoundResponse with house_name"""
        round_data = {
            "id": round_obj.id,
            "house_id": round_obj.house_id,
            "house_name": round_obj.house.name if round_obj.house else "Unknown",
            "round_type": round_obj.round_type,
            "status": round_obj.status,
            "scheduled_time": round_obj.scheduled_time,
            "betting_closes_at": round_obj.betting_closes_at,
            "actual_time": round_obj.actual_time,
            "result": round_obj.result,
            "created_at": round_obj.created_at
        }
        return RoundResponse(**round_data)
    
    def create_round(self, round_data: RoundCreate) -> Tuple[Optional[RoundResponse], str]:
        """Create a new round"""
        try:
            # Validate house exists
            house = self.db.query(House).filter(House.id == round_data.house_id).first()
            if not house:
                return None, "House not found"
            
            if not house.is_active:
                return None, "House is not active"
            
            # Check if house already has 2 active rounds (admin limit)
            active_rounds_count = self.db.query(func.count(Round.id)).filter(
                and_(
                    Round.house_id == round_data.house_id,
                    Round.status.in_([RoundStatus.SCHEDULED, RoundStatus.ACTIVE])
                )
            ).scalar()
            
            if active_rounds_count >= 2:
                return None, "Maximum 2 active rounds per house allowed"
            
            db_round = Round(
                house_id=round_data.house_id,
                round_type=round_data.round_type,
                scheduled_time=round_data.scheduled_time,
                betting_closes_at=round_data.betting_closes_at,
                status=RoundStatus.SCHEDULED
            )
            
            self.db.add(db_round)
            self.db.commit()
            self.db.refresh(db_round)
            
            # Create response with house name
            response = self._create_round_response(db_round)
            
            return response, "Round created successfully"
            
        except Exception as e:
            self.db.rollback()
            return None, f"Error creating round: {str(e)}"
    
    def update_round(self, round_id: int, update_data: RoundUpdate) -> Tuple[Optional[RoundResponse], str]:
        """Update an existing round"""
        try:
            db_round = self.db.query(Round).filter(Round.id == round_id).first()
            if not db_round:
                return None, "Round not found"
            
            # Update fields if provided
            if update_data.scheduled_time is not None:
                db_round.scheduled_time = update_data.scheduled_time
            
            if update_data.betting_closes_at is not None:
                db_round.betting_closes_at = update_data.betting_closes_at
            
            if update_data.status is not None:
                db_round.status = update_data.status
            
            if update_data.result is not None:
                db_round.result = update_data.result
                if update_data.actual_time is None:
                    db_round.actual_time = datetime.utcnow()
            
            if update_data.actual_time is not None:
                db_round.actual_time = update_data.actual_time
            
            self.db.commit()
            self.db.refresh(db_round)
            
            # Create response with house name
            house = self.db.query(House).filter(House.id == db_round.house_id).first()
            round_data = {
                'id': db_round.id,
                'house_id': db_round.house_id,
                'house_name': house.name if house else "Unknown",
                'round_type': db_round.round_type,
                'status': db_round.status,
                'scheduled_time': db_round.scheduled_time,
                'betting_closes_at': db_round.betting_closes_at,
                'actual_time': db_round.actual_time,
                'result': db_round.result,
                'created_at': db_round.created_at
            }
            response = RoundResponse(**round_data)
            
            return response, "Round updated successfully"
            
        except Exception as e:
            self.db.rollback()
            return None, f"Error updating round: {str(e)}"
    
    def get_round(self, round_id: int) -> Optional[RoundResponse]:
        """Get a single round by ID"""
        db_round = self.db.query(Round).filter(Round.id == round_id).first()
        if not db_round:
            return None
        
        house = self.db.query(House).filter(House.id == db_round.house_id).first()
        round_data = {
            'id': db_round.id,
            'house_id': db_round.house_id,
            'house_name': house.name if house else "Unknown",
            'round_type': db_round.round_type,
            'status': db_round.status,
            'scheduled_time': db_round.scheduled_time,
            'betting_closes_at': db_round.betting_closes_at,
            'actual_time': db_round.actual_time,
            'result': db_round.result,
            'created_at': db_round.created_at
        }
        response = RoundResponse(**round_data)
        
        return response
    
    def get_rounds(self, house_id: Optional[int] = None, status: Optional[RoundStatus] = None, 
                   limit: int = 50) -> List[RoundResponse]:
        """Get rounds with optional filtering"""
        query = self.db.query(Round).join(House)
        
        if house_id:
            query = query.filter(Round.house_id == house_id)
        
        if status:
            query = query.filter(Round.status == status)
        
        rounds = query.order_by(Round.scheduled_time.desc()).limit(limit).all()
        
        result = []
        for round_obj in rounds:
            # Create a dict with all round data plus house_name
            round_data = {
                "id": round_obj.id,
                "house_id": round_obj.house_id,
                "house_name": round_obj.house.name,
                "round_type": round_obj.round_type,
                "status": round_obj.status,
                "scheduled_time": round_obj.scheduled_time,
                "betting_closes_at": round_obj.betting_closes_at,
                "actual_time": round_obj.actual_time,
                "result": round_obj.result,
                "created_at": round_obj.created_at
            }
            response = RoundResponse(**round_data)
            result.append(response)
        
        return result
    
    def get_upcoming_rounds(self, hours_ahead: int = 24) -> List[RoundResponse]:
        """Get upcoming rounds within specified hours"""
        end_time = datetime.utcnow() + timedelta(hours=hours_ahead)
        
        rounds = self.db.query(Round).join(House).filter(
            and_(
                Round.status == RoundStatus.SCHEDULED,
                Round.scheduled_time <= end_time,
                Round.scheduled_time >= datetime.utcnow(),
                House.is_active == True
            )
        ).order_by(Round.scheduled_time.asc()).all()
        
        result = []
        for round_obj in rounds:
            response = self._create_round_response(round_obj)
            result.append(response)
        
        return result
    
    def get_round_with_bets(self, round_id: int) -> Optional[RoundWithBets]:
        """Get round information with betting statistics"""
        db_round = self.db.query(Round).filter(Round.id == round_id).first()
        if not db_round:
            return None
        
        # Get betting statistics
        bet_stats = self.db.query(
            func.count(Bet.id).label('total_bets'),
            func.sum(Bet.bet_amount).label('total_amount'),
            func.count(func.distinct(Bet.user_id)).label('unique_players')
        ).filter(Bet.round_id == round_id).first()
        
        house = self.db.query(House).filter(House.id == db_round.house_id).first()
        round_data = {
            'id': db_round.id,
            'house_id': db_round.house_id,
            'house_name': house.name if house else "Unknown",
            'round_type': db_round.round_type,
            'status': db_round.status,
            'scheduled_time': db_round.scheduled_time,
            'betting_closes_at': db_round.betting_closes_at,
            'actual_time': db_round.actual_time,
            'result': db_round.result,
            'created_at': db_round.created_at
        }
        round_response = RoundResponse(**round_data)
        
        return RoundWithBets(
            round_info=round_response,
            total_bets=bet_stats.total_bets or 0,
            total_amount=float(bet_stats.total_amount or 0),
            unique_players=bet_stats.unique_players or 0
        )
    
    def publish_result(self, round_id: int, result: int) -> Tuple[bool, str]:
        """Publish result for a round and process all bets"""
        try:
            db_round = self.db.query(Round).filter(Round.id == round_id).first()
            if not db_round:
                return False, "Round not found"
            
            if db_round.status != RoundStatus.SCHEDULED:
                return False, "Round is not in scheduled status"
            
            # Update round with result
            db_round.result = result
            db_round.status = RoundStatus.COMPLETED
            db_round.actual_time = datetime.utcnow()
            
            # Process all bets for this round
            from app.services.bet_service import BetService
            bet_service = BetService(self.db)
            winners_count = bet_service.process_round_results(round_id, result)
            
            self.db.commit()
            
            return True, f"Result published successfully. {winners_count} winners found."
            
        except Exception as e:
            self.db.rollback()
            return False, f"Error publishing result: {str(e)}"
    
    def cancel_round(self, round_id: int, reason: str = None) -> Tuple[bool, str]:
        """Cancel a round and refund all bets"""
        try:
            db_round = self.db.query(Round).filter(Round.id == round_id).first()
            if not db_round:
                return False, "Round not found"
            
            if db_round.status != RoundStatus.SCHEDULED:
                return False, "Only scheduled rounds can be cancelled"
            
            # Get all pending bets for this round
            bets = self.db.query(Bet).filter(
                and_(
                    Bet.round_id == round_id,
                    Bet.status == BetStatus.PENDING
                )
            ).all()
            
            # Refund all bets
            for bet in bets:
                bet.status = BetStatus.CANCELLED
                
                # Refund to user wallet
                user = self.db.query(User).filter(User.id == bet.user_id).first()
                if user:
                    user.wallet_balance += bet.bet_amount
            
            # Update round status
            db_round.status = RoundStatus.CANCELLED
            
            self.db.commit()
            
            return True, f"Round cancelled successfully. {len(bets)} bets refunded."
            
        except Exception as e:
            self.db.rollback()
            return False, f"Error cancelling round: {str(e)}"
    
    def get_results(self, house_id: Optional[int] = None, limit: int = 20) -> List[RoundResponse]:
        """Get completed rounds with results"""
        query = self.db.query(Round).join(House).filter(
            Round.status == RoundStatus.COMPLETED,
            Round.result.isnot(None)
        )
        
        if house_id:
            query = query.filter(Round.house_id == house_id)
        
        rounds = query.order_by(Round.actual_time.desc()).limit(limit).all()
        
        result = []
        for round_obj in rounds:
            round_data = {
                'id': round_obj.id,
                'house_id': round_obj.house_id,
                'house_name': round_obj.house.name,
                'round_type': round_obj.round_type,
                'status': round_obj.status,
                'scheduled_time': round_obj.scheduled_time,
                'betting_closes_at': round_obj.betting_closes_at,
                'actual_time': round_obj.actual_time,
                'result': round_obj.result,
                'created_at': round_obj.created_at
            }
            response = RoundResponse(**round_data)
            result.append(response)
        
        return result
    
    def get_active_rounds(self) -> List[RoundResponse]:
        """Get active rounds (scheduled and in progress)"""
        # First update round statuses based on current time
        self._update_round_statuses()
        
        active_statuses = [RoundStatus.SCHEDULED, RoundStatus.ACTIVE]
        rounds = self.db.query(Round).join(House).filter(
            Round.status.in_(active_statuses)
        ).order_by(Round.scheduled_time.asc()).all()
        
        return [self._create_round_response(round) for round in rounds]
    
    def _update_round_statuses(self):
        """Update round statuses based on current time"""
        try:
            current_time = datetime.utcnow()
            
            # Update SCHEDULED rounds to ACTIVE if betting has opened but not closed
            scheduled_rounds = self.db.query(Round).filter(
                and_(
                    Round.status == RoundStatus.SCHEDULED,
                    Round.scheduled_time <= current_time,
                    Round.betting_closes_at > current_time
                )
            ).all()
            
            for round in scheduled_rounds:
                round.status = RoundStatus.ACTIVE
                
            # Automatically close rounds where betting time has passed 
            # (move to COMPLETED only if no result has been published)
            expired_rounds = self.db.query(Round).filter(
                and_(
                    Round.status.in_([RoundStatus.SCHEDULED, RoundStatus.ACTIVE]),
                    Round.betting_closes_at <= current_time,
                    Round.result.is_(None)  # Only if no result published yet
                )
            ).all()
            
            for round in expired_rounds:
                # Just mark as ACTIVE if it was SCHEDULED, don't auto-complete without result
                if round.status == RoundStatus.SCHEDULED:
                    round.status = RoundStatus.ACTIVE
                    
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            print(f"Error updating round statuses: {str(e)}")
    
    def get_active_rounds_old(self) -> List[RoundResponse]:
        """Get active rounds (scheduled and in progress)"""
        active_statuses = [RoundStatus.SCHEDULED]
        
        rounds = self.db.query(Round).join(House).filter(
            Round.status.in_(active_statuses)
        ).order_by(Round.scheduled_time.asc()).all()
        
        result = []
        for round_obj in rounds:
            round_data = {
                'id': round_obj.id,
                'house_id': round_obj.house_id,
                'house_name': round_obj.house.name,
                'round_type': round_obj.round_type,
                'status': round_obj.status,
                'scheduled_time': round_obj.scheduled_time,
                'betting_closes_at': round_obj.betting_closes_at,
                'actual_time': round_obj.actual_time,
                'result': round_obj.result,
                'created_at': round_obj.created_at
            }
            response = RoundResponse(**round_data)
            result.append(response)
        
        return result
    
    def get_todays_rounds(self) -> List[RoundResponse]:
        """Get today's rounds"""
        from datetime import date
        today = date.today()
        
        rounds = self.db.query(Round).join(House).filter(
            func.date(Round.scheduled_time) == today
        ).order_by(Round.scheduled_time.asc()).all()
        
        result = []
        for round_obj in rounds:
            round_data = {
                'id': round_obj.id,
                'house_id': round_obj.house_id,
                'house_name': round_obj.house.name,
                'round_type': round_obj.round_type,
                'status': round_obj.status,
                'scheduled_time': round_obj.scheduled_time,
                'betting_closes_at': round_obj.betting_closes_at,
                'actual_time': round_obj.actual_time,
                'result': round_obj.result,
                'created_at': round_obj.created_at
            }
            response = RoundResponse(**round_data)
            result.append(response)
        
        return result
    
    def schedule_daily_rounds(self, target_date: date = None) -> dict:
        """Schedule rounds for a specific date using the scheduler service"""
        scheduler = TeerSchedulerService(self.db)
        return scheduler.schedule_daily_rounds(target_date)
    
    def update_round_statuses(self) -> dict:
        """Update round statuses based on current time"""
        scheduler = TeerSchedulerService(self.db)
        return scheduler.update_round_statuses()
    
    def get_forecast_rounds(self, house_id: int, target_date: date = None) -> dict:
        """Get FR and SR rounds for forecast betting"""
        scheduler = TeerSchedulerService(self.db)
        return scheduler.get_forecast_rounds(house_id, target_date)
    
    def create_daily_rounds_for_house(self, house_id: int, target_date: date = None) -> Tuple[bool, str]:
        """Create FR, SR, and Forecast rounds for a house on a specific date"""
        try:
            if target_date is None:
                target_date = date.today()
            
            # Check if house exists and is active
            house = self.db.query(House).filter(House.id == house_id).first()
            if not house:
                return False, "House not found"
            
            if not house.is_active:
                return False, "House is not active"
            
            # Check if rounds already exist for this date
            existing_rounds = self.db.query(Round).filter(
                and_(
                    Round.house_id == house_id,
                    func.date(Round.scheduled_time) == target_date
                )
            ).count()
            
            if existing_rounds > 0:
                return False, f"Rounds already exist for {target_date}"
            
            # Use house's actual configured times instead of hardcoded times
            from datetime import timezone as tz
            
            # Create FR round using house's FR time
            fr_time = datetime.combine(target_date, house.fr_time).replace(tzinfo=tz.utc)
            fr_betting_closes = fr_time - timedelta(minutes=house.betting_window_minutes)
            
            fr_round = Round(
                house_id=house_id,
                round_type=RoundType.FR,
                scheduled_time=fr_time,
                betting_closes_at=fr_betting_closes,
                status=RoundStatus.SCHEDULED
            )
            
            # Create SR round using house's SR time
            sr_time = datetime.combine(target_date, house.sr_time).replace(tzinfo=tz.utc)
            sr_betting_closes = sr_time - timedelta(minutes=house.betting_window_minutes)
            
            sr_round = Round(
                house_id=house_id,
                round_type=RoundType.SR,
                scheduled_time=sr_time,
                betting_closes_at=sr_betting_closes,
                status=RoundStatus.SCHEDULED
            )
            
            # Create Forecast round (closes same time as FR)
            forecast_round = Round(
                house_id=house_id,
                round_type=RoundType.FORECAST,
                scheduled_time=sr_time,  # Results announced with SR
                betting_closes_at=fr_betting_closes,  # Closes with FR
                status=RoundStatus.SCHEDULED
            )
            
            self.db.add_all([fr_round, sr_round, forecast_round])
            self.db.commit()
            
            return True, f"Daily rounds created for house {house.name} on {target_date}"
            
        except Exception as e:
            self.db.rollback()
            return False, f"Error creating daily rounds: {str(e)}"
    
    def create_daily_rounds_for_all_houses(self, target_date: date = None) -> dict:
        """Create daily rounds for all active houses"""
        try:
            if target_date is None:
                target_date = date.today()
            
            results = {
                "success": [],
                "errors": [],
                "total_houses": 0
            }
            
            # Get all active houses
            active_houses = self.db.query(House).filter(House.is_active == True).all()
            results["total_houses"] = len(active_houses)
            
            for house in active_houses:
                success, message = self.create_daily_rounds_for_house(house.id, target_date)
                if success:
                    results["success"].append(f"House {house.name}: {message}")
                else:
                    results["errors"].append(f"House {house.name}: {message}")
            
            return results
            
        except Exception as e:
            return {
                "success": [],
                "errors": [f"Fatal error: {str(e)}"],
                "total_houses": 0
            }
    
    def auto_complete_rounds_with_results(self) -> dict:
        """Auto-complete rounds when admin publishes results and create next day rounds"""
        try:
            results = {
                "completed_rounds": [],
                "next_day_created": False,
                "errors": []
            }
            
            # Find rounds that have results but are not completed
            rounds_to_complete = self.db.query(Round).filter(
                and_(
                    Round.result.isnot(None),
                    Round.status != RoundStatus.COMPLETED
                )
            ).all()
            
            for round_obj in rounds_to_complete:
                try:
                    round_obj.status = RoundStatus.COMPLETED
                    if not round_obj.actual_time:
                        round_obj.actual_time = datetime.utcnow()
                    
                    results["completed_rounds"].append(
                        f"Round {round_obj.id} ({round_obj.house.name} - {round_obj.round_type.value})"
                    )
                except Exception as e:
                    results["errors"].append(
                        f"Error completing round {round_obj.id}: {str(e)}"
                    )
            
            if rounds_to_complete:
                self.db.commit()
                
                # Check if all rounds for today are completed, then create tomorrow's
                tomorrow = date.today() + timedelta(days=1)
                self.create_daily_rounds_for_all_houses(tomorrow)
                results["next_day_created"] = True
            
            return results
            
        except Exception as e:
            self.db.rollback()
            return {
                "completed_rounds": [],
                "next_day_created": False,
                "errors": [f"Fatal error: {str(e)}"]
            }