from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, date, timezone, timedelta

from app.database import get_db
from app.schemas.admin import HouseCreate, HouseUpdate, UserManagement, DashboardStats, UserStats, HouseResponse, AdminUserCreate, UserRoleUpdate, TaskAssignment
from app.schemas.round import RoundCreate, RoundUpdate, RoundResponse
from app.schemas.wallet import TransactionUpdate, TransactionResponse, DetailedTransactionResponse
from app.schemas.auth import UserResponse
from app.schemas.bet import BetResponse
from app.schemas.payment import PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodResponse
from app.schemas.banner import Banner as BannerSchema, BannerCreate, BannerUpdate
from app.services.round_service import RoundService
from app.services.wallet_service import WalletService
from app.services.teer_scheduler import TeerSchedulerService
from app.models import User, House, Round, Transaction, Bet
from app.models.round import RoundStatus, RoundType
import pytz

async def reschedule_future_rounds(house_id: int, db: Session):
    """Reschedule all future scheduled rounds for a house when timings change"""
    try:
        house = db.query(House).filter(House.id == house_id).first()
        if not house:
            return
        
        # Get all future scheduled rounds for this house
        from datetime import datetime
        now_utc = datetime.now(pytz.UTC)
        
        future_rounds = db.query(Round).filter(
            and_(
                Round.house_id == house_id,
                Round.status == RoundStatus.SCHEDULED,
                Round.scheduled_time > now_utc
            )
        ).all()
        
        # Update each round with new timing
        for round_obj in future_rounds:
            # Get the date part of the original scheduled time
            original_datetime = round_obj.scheduled_time
            round_date = original_datetime.date()
            
            # Calculate new time based on round type
            if round_obj.round_type == RoundType.FR:
                new_datetime = house.get_local_datetime(round_date, house.fr_time)
            elif round_obj.round_type == RoundType.SR:
                new_datetime = house.get_local_datetime(round_date, house.sr_time)
            else:
                continue  # Skip other round types
            
            # Convert to UTC for storage
            new_datetime_utc = new_datetime.astimezone(pytz.UTC)
            new_betting_deadline = house.get_betting_deadline(new_datetime_utc)
            
            # Update the round
            round_obj.scheduled_time = new_datetime_utc
            round_obj.betting_closes_at = new_betting_deadline
        
        db.commit()
        
    except Exception as e:
        db.rollback()
        print(f"Error rescheduling rounds for house {house_id}: {str(e)}")
from app.models.payment_method import PaymentMethod, PaymentMethodType
from app.models.banner import Banner
from app.models.transaction import TransactionType, TransactionStatus
from app.models.round import RoundStatus, RoundType
from app.models.bet import BetType, BetStatus
from app.models.admin_task import AdminTask, TaskType, TaskPriority, TaskStatus
from app.models.referral import UserRole
from app.dependencies import get_current_admin_user

router = APIRouter()

# Dashboard and Statistics
@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""
    today = date.today()
    
    # Basic counts
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    total_houses = db.query(func.count(House.id)).scalar()
    active_houses = db.query(func.count(House.id)).filter(House.is_active == True).scalar()
    
    # Today's data
    todays_rounds = db.query(func.count(Round.id)).filter(
        func.date(Round.scheduled_time) == today
    ).scalar()
    
    pending_deposits = db.query(func.count(Transaction.id)).filter(
        and_(
            Transaction.transaction_type == TransactionType.DEPOSIT,
            Transaction.status == TransactionStatus.PENDING
        )
    ).scalar()
    
    pending_withdrawals = db.query(func.count(Transaction.id)).filter(
        and_(
            Transaction.transaction_type == TransactionType.WITHDRAWAL,
            Transaction.status == TransactionStatus.PENDING
        )
    ).scalar()
    
    # Betting stats
    total_bets = db.query(func.count(Bet.id)).scalar()
    total_bet_amount = db.query(func.sum(Bet.bet_amount)).scalar()
    
    todays_bets = db.query(
        func.count(Bet.id),
        func.sum(Bet.bet_amount)
    ).filter(
        func.date(Bet.created_at) == today
    ).first()
    
    today_bets = todays_bets[0] or 0
    today_bet_amount = float(todays_bets[1] or 0)
    
    # Transaction stats
    total_deposits = db.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == TransactionType.DEPOSIT,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar()
    
    total_withdrawals = db.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == TransactionType.WITHDRAWAL,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar()
    
    today_deposits = db.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == TransactionType.DEPOSIT,
        Transaction.status == TransactionStatus.COMPLETED,
        func.date(Transaction.created_at) == today
    ).scalar()
    
    today_withdrawals = db.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == TransactionType.WITHDRAWAL,
        Transaction.status == TransactionStatus.COMPLETED,
        func.date(Transaction.created_at) == today
    ).scalar()
    
    # Calculate profits (simplified)
    total_payouts = float(total_bet_amount or 0) * 0.8  # Assuming 80% average payout
    today_payouts = float(today_bet_amount) * 0.8
    system_profit = float(total_bet_amount or 0) - total_payouts
    today_profit = today_bet_amount - today_payouts
    
    return DashboardStats(
        total_users=total_users or 0,
        active_users=active_users or 0,
        total_houses=total_houses or 0,
        active_houses=active_houses or 0,
        todays_rounds=todays_rounds or 0,
        pending_deposits=pending_deposits or 0,
        pending_withdrawals=pending_withdrawals or 0,
        total_bets=total_bets or 0,
        today_bets=today_bets,
        total_deposits=float(total_deposits or 0),
        total_withdrawals=float(total_withdrawals or 0),
        today_deposits=float(today_deposits or 0),
        today_withdrawals=float(today_withdrawals or 0),
        total_bet_amount=float(total_bet_amount or 0),
        total_payouts=total_payouts,
        today_bet_amount=today_bet_amount,
        today_payouts=today_payouts,
        system_profit=system_profit,
        today_profit=today_profit
    )

@router.get("/rounds", response_model=List[RoundResponse])
async def get_all_rounds(
    status: Optional[RoundStatus] = Query(None),
    house_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all rounds with optional filtering for admin"""
    try:
        query = db.query(Round).join(House)
        
        if status:
            query = query.filter(Round.status == status)
        
        if house_id:
            query = query.filter(Round.house_id == house_id)
        
        # Order by scheduled time, most recent first
        query = query.order_by(Round.scheduled_time.desc())
        
        rounds = query.limit(limit).all()
        
        # Convert to response format
        return [
            RoundResponse(
                id=round.id,
                house_id=round.house_id,
                house_name=round.house.name,
                round_type=round.round_type,
                status=round.status,
                scheduled_time=round.scheduled_time,
                betting_closes_at=round.betting_closes_at,
                actual_time=round.actual_time,
                result=round.result,
                created_at=round.created_at
            )
            for round in rounds
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching rounds: {str(e)}"
        )

@router.post("/rounds", response_model=RoundResponse)
async def create_round(
    round_data: RoundCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new round"""
    try:
        round_service = RoundService(db)
        round_response, message = round_service.create_round(round_data)
        
        if not round_response:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return round_response
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating round: {str(e)}"
        )

@router.get("/rounds/ready-for-results", response_model=List[RoundResponse])
async def get_rounds_ready_for_results(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get rounds that are ready for result entry (betting closed, no result yet)"""
    scheduler = TeerSchedulerService(db)
    
    # First update round statuses to close any rounds past deadline
    status_update = scheduler.update_round_statuses()
    
    # Get rounds that are active and past betting deadline but don't have results yet
    # Exclude FORECAST rounds since they are automatically processed when FR and SR are published
    ready_rounds = db.query(Round).filter(
        Round.status == RoundStatus.ACTIVE,
        Round.betting_closes_at <= datetime.now(timezone.utc),
        Round.result.is_(None),
        Round.round_type.in_([RoundType.FR, RoundType.SR])
    ).join(House).order_by(Round.scheduled_time.asc()).all()
    
    return [
        RoundResponse(
            id=round_obj.id,
            house_id=round_obj.house_id,
            house_name=round_obj.house.name,
            round_type=round_obj.round_type,
            scheduled_time=round_obj.scheduled_time,
            betting_closes_at=round_obj.betting_closes_at,
            status=round_obj.status,
            result=round_obj.result,
            actual_time=round_obj.actual_time,
            total_bets=0,  # Can be calculated if needed
            created_at=round_obj.created_at
        )
        for round_obj in ready_rounds
    ]

@router.post("/rounds/{round_id}/result")
async def publish_result(
    round_id: int,
    result: int = Query(..., ge=0, le=99),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Publish result for a round and process all bets including forecasts"""
    from app.services.bet_service import EnhancedBetService
    
    round_service = RoundService(db)
    bet_service = EnhancedBetService(db)
    
    # Get the round
    round_obj = db.query(Round).filter(Round.id == round_id).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Check if round is ready for results
    betting_closed = round_obj.betting_closes_at <= datetime.now(timezone.utc)
    valid_statuses = [RoundStatus.SCHEDULED, RoundStatus.ACTIVE] if betting_closed else [RoundStatus.SCHEDULED]
    
    if round_obj.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Round must be ready for results (betting deadline passed)"
        )
    
    if not betting_closed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish results before betting deadline"
        )
    
    try:
        # Update round with result
        round_obj.result = result
        round_obj.status = RoundStatus.COMPLETED
        round_obj.actual_time = datetime.utcnow()
        
        # Process regular bets for this round
        regular_winners = bet_service.process_round_results(round_id, result)
        
        # Check for forecast bet processing
        forecast_winners = 0
        if round_obj.round_type == RoundType.SR:
            # If this is an SR round, check for corresponding FR round to process forecasts
            fr_round = db.query(Round).filter(
                and_(
                    Round.house_id == round_obj.house_id,
                    Round.round_type == RoundType.FR,
                    Round.status == RoundStatus.COMPLETED,
                    Round.result.isnot(None)
                )
            ).order_by(Round.actual_time.desc()).first()
            
            if fr_round:
                forecast_result = bet_service.process_forecast_bets(
                    round_obj.house_id, 
                    str(fr_round.result).zfill(2), 
                    str(result).zfill(2)
                )
                forecast_winners = forecast_result.get("winning_bets", 0)
        
        elif round_obj.round_type == RoundType.FR:
            # If this is an FR round, check if there's a completed SR round to process forecasts
            sr_round = db.query(Round).filter(
                and_(
                    Round.house_id == round_obj.house_id,
                    Round.round_type == RoundType.SR,
                    Round.status == RoundStatus.COMPLETED,
                    Round.result.isnot(None)
                )
            ).order_by(Round.actual_time.desc()).first()
            
            if sr_round:
                forecast_result = bet_service.process_forecast_bets(
                    round_obj.house_id, 
                    str(result).zfill(2), 
                    str(sr_round.result).zfill(2)
                )
                forecast_winners = forecast_result.get("winning_bets", 0)
        
        db.commit()
        
        total_winners = regular_winners + forecast_winners
        message = f"Result published successfully. {regular_winners} regular winners"
        if forecast_winners:
            message += f", {forecast_winners} forecast winners"
        message += " found."
        
        return {
            "message": message,
            "regular_winners": regular_winners,
            "forecast_winners": forecast_winners,
            "total_winners": total_winners
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error publishing result: {str(e)}"
        )

@router.put("/rounds/{round_id}/result")
async def update_result(
    round_id: int,
    result: int = Query(..., ge=0, le=99),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update result for a completed round and reprocess all bets"""
    from app.services.bet_service import EnhancedBetService
    
    bet_service = EnhancedBetService(db)
    
    # Get the round
    round_obj = db.query(Round).filter(Round.id == round_id).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    if round_obj.status != RoundStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update results for completed rounds"
        )
    
    try:
        # Store old result for forecast reprocessing
        old_result = round_obj.result
        
        # Update round with new result
        round_obj.result = result
        round_obj.actual_time = datetime.utcnow()
        
        # Reprocess regular bets for this round
        regular_winners = bet_service.process_round_results(round_id, result, reprocess=True)
        
        # Reprocess forecast bets if needed
        forecast_winners = 0
        if round_obj.round_type == RoundType.SR:
            fr_round = db.query(Round).filter(
                and_(
                    Round.house_id == round_obj.house_id,
                    Round.round_type == RoundType.FR,
                    Round.status == RoundStatus.COMPLETED,
                    Round.result.isnot(None)
                )
            ).order_by(Round.actual_time.desc()).first()
            
            if fr_round:
                forecast_result = bet_service.process_forecast_bets(
                    round_obj.house_id, 
                    str(fr_round.result).zfill(2), 
                    str(result).zfill(2),
                    reprocess=True
                )
                forecast_winners = forecast_result.get("winning_bets", 0)
        
        elif round_obj.round_type == RoundType.FR:
            sr_round = db.query(Round).filter(
                and_(
                    Round.house_id == round_obj.house_id,
                    Round.round_type == RoundType.SR,
                    Round.status == RoundStatus.COMPLETED,
                    Round.result.isnot(None)
                )
            ).order_by(Round.actual_time.desc()).first()
            
            if sr_round:
                forecast_result = bet_service.process_forecast_bets(
                    round_obj.house_id, 
                    str(result).zfill(2), 
                    str(sr_round.result).zfill(2),
                    reprocess=True
                )
                forecast_winners = forecast_result.get("winning_bets", 0)
        
        db.commit()
        
        total_winners = regular_winners + forecast_winners
        message = f"Result updated successfully. {regular_winners} regular winners"
        if forecast_winners:
            message += f", {forecast_winners} forecast winners"
        message += " found."
        
        return {
            "message": message,
            "regular_winners": regular_winners,
            "forecast_winners": forecast_winners,
            "total_winners": total_winners,
            "old_result": old_result,
            "new_result": result
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating result: {str(e)}"
        )

@router.get("/rounds/{round_id}/analytics")
async def get_round_analytics(
    round_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed analytics for a round including bet statistics and winners"""
    from app.services.bet_service import EnhancedBetService
    
    bet_service = EnhancedBetService(db)
    
    # Get the round
    round_obj = db.query(Round).filter(Round.id == round_id).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    try:
        # Get bet statistics
        bet_stats = bet_service.get_round_bet_statistics(round_id)
        
        # Get winner statistics if round is completed
        winner_stats = None
        if round_obj.status == RoundStatus.COMPLETED and round_obj.result is not None:
            winner_stats = bet_service.get_round_winner_statistics(round_id, round_obj.result)
        
        return {
            "round": {
                "id": round_obj.id,
                "house_name": round_obj.house.name,
                "round_type": round_obj.round_type.value,
                "status": round_obj.status.value,
                "result": round_obj.result,
                "scheduled_time": round_obj.scheduled_time,
                "actual_time": round_obj.actual_time
            },
            "bet_statistics": bet_stats,
            "winner_statistics": winner_stats
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting round analytics: {str(e)}"
        )

@router.put("/rounds/{round_id}", response_model=RoundResponse)
async def update_round(
    round_id: int,
    round_data: RoundUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a round (only if still scheduled)"""
    try:
        # Get the round
        round_obj = db.query(Round).filter(Round.id == round_id).first()
        if not round_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Round not found"
            )
        
        # Only allow updates if round is still scheduled
        if round_obj.status != RoundStatus.SCHEDULED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only update scheduled rounds"
            )
        
        # Update only the fields provided in the update schema
        update_data = round_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(round_obj, field, value)
        
        db.commit()
        db.refresh(round_obj)
        
        # Get house name for response
        house = db.query(House).filter(House.id == round_obj.house_id).first()
        
        return RoundResponse(
            id=round_obj.id,
            house_id=round_obj.house_id,
            house_name=house.name,
            round_type=round_obj.round_type,
            status=round_obj.status,
            scheduled_time=round_obj.scheduled_time,
            betting_closes_at=round_obj.betting_closes_at,
            actual_time=round_obj.actual_time,
            result=round_obj.result,
            created_at=round_obj.created_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating round: {str(e)}"
        )

@router.post("/rounds/{round_id}/cancel")
async def cancel_round(
    round_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Cancel a round and refund all bets"""
    try:
        # Get the round
        round_obj = db.query(Round).filter(Round.id == round_id).first()
        if not round_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Round not found"
            )
        
        # Only allow cancellation if round is scheduled
        if round_obj.status != RoundStatus.SCHEDULED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only cancel scheduled rounds"
            )
        
        # Get all bets for this round
        bets = db.query(Bet).filter(
            Bet.round_id == round_id,
            Bet.status == BetStatus.PENDING
        ).all()
        
        wallet_service = WalletService(db)
        refunded_amount = 0
        refunded_bets = 0
        
        # Refund all pending bets
        for bet in bets:
            # Refund the bet amount to user's wallet
            try:
                wallet_service.add_balance(bet.user_id, bet.bet_amount, "Round cancellation refund")
                bet.status = BetStatus.CANCELLED
                refunded_amount += bet.bet_amount
                refunded_bets += 1
            except Exception as bet_error:
                pass  # Continue with other bets
                continue
        
        # Update round status
        round_obj.status = RoundStatus.CANCELLED
        
        db.commit()
        
        return {
            "message": f"Round cancelled successfully. Refunded {refunded_bets} bets totaling ₹{refunded_amount}",
            "refunded_bets": refunded_bets,
            "refunded_amount": refunded_amount
        }
        
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        pass  # Error handled by exception
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cancelling round: {str(e)}"
        )

@router.delete("/rounds/{round_id}")
async def delete_round(
    round_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a round (only if no bets have been placed)"""
    try:
        # Get the round
        round_obj = db.query(Round).filter(Round.id == round_id).first()
        if not round_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Round not found"
            )
        
        # Check if round has any bets
        bet_count = db.query(func.count(Bet.id)).filter(Bet.round_id == round_id).scalar()
        if bet_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete round with existing bets. Use cancel instead."
            )
        
        # Only allow deletion if round is scheduled
        if round_obj.status not in [RoundStatus.SCHEDULED, RoundStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only delete scheduled or cancelled rounds"
            )
        
        db.delete(round_obj)
        db.commit()
        
        return {"message": "Round deleted successfully"}
        
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        pass  # Error handled by exception
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting round: {str(e)}"
        )

@router.get("/rounds/{round_id}/bets")
async def get_round_bets(
    round_id: int,
    bet_type: Optional[BetType] = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all bets for a specific round"""
    query = db.query(Bet).filter(Bet.round_id == round_id)
    
    if bet_type:
        query = query.filter(Bet.bet_type == bet_type)
    
    bets = query.all()
    
    # Calculate statistics
    total_bets = len(bets)
    total_amount = sum(bet.bet_amount for bet in bets)
    potential_payout = sum(bet.potential_payout for bet in bets if bet.status == BetStatus.PENDING)
    
    bet_type_breakdown = {}
    for bet in bets:
        bet_type_key = bet.bet_type.value
        if bet_type_key not in bet_type_breakdown:
            bet_type_breakdown[bet_type_key] = {"count": 0, "amount": 0}
        bet_type_breakdown[bet_type_key]["count"] += 1
        bet_type_breakdown[bet_type_key]["amount"] += bet.bet_amount
    
    return {
        "round_id": round_id,
        "statistics": {
            "total_bets": total_bets,
            "total_amount": total_amount,
            "potential_payout": potential_payout,
            "bet_type_breakdown": bet_type_breakdown
        },
        "bets": [
            {
                "id": bet.id,
                "user_id": bet.user_id,
                "bet_type": bet.bet_type.value,
                "bet_value": bet.bet_value,
                "bet_amount": bet.bet_amount,
                "status": bet.status.value,
                "potential_payout": bet.potential_payout,
                "actual_payout": bet.actual_payout,
                "created_at": bet.created_at
            }
            for bet in bets
        ]
    }

@router.get("/forecast-bets")
async def get_forecast_bets(
    house_id: Optional[int] = None,
    status: Optional[BetStatus] = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all forecast bets with detailed information"""
    query = db.query(Bet).filter(Bet.bet_type == BetType.FORECAST)
    
    if house_id:
        query = query.join(Round).filter(Round.house_id == house_id)
    
    if status:
        query = query.filter(Bet.status == status)
    
    forecast_bets = query.order_by(Bet.created_at.desc()).all()
    
    results = []
    for bet in forecast_bets:
        fr_round = db.query(Round).filter(Round.id == bet.fr_round_id).first()
        sr_round = db.query(Round).filter(Round.id == bet.sr_round_id).first()
        
        results.append({
            "id": bet.id,
            "user_id": bet.user_id,
            "house_name": bet.house_name if hasattr(bet, 'house_name') else "Unknown",
            "combinations": bet.bet_value,
            "bet_amount": bet.bet_amount,
            "potential_payout": bet.potential_payout,
            "actual_payout": bet.actual_payout,
            "status": bet.status.value,
            "fr_round": {
                "id": fr_round.id if fr_round else None,
                "result": fr_round.result if fr_round else None,
                "status": fr_round.status.value if fr_round else None
            },
            "sr_round": {
                "id": sr_round.id if sr_round else None,
                "result": sr_round.result if sr_round else None,
                "status": sr_round.status.value if sr_round else None
            },
            "created_at": bet.created_at
        })
    
    return {
        "total_forecast_bets": len(results),
        "bets": results
    }

# House Management
@router.post("/houses", response_model=HouseResponse)
async def create_house(
    house_data: HouseCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new house"""
    try:
        # Create house with correct field mapping
        db_house = House(
            name=house_data.name,
            location=house_data.location,
            timezone=house_data.timezone,
            is_active=True,
            fr_time=house_data.fr_time,
            sr_time=house_data.sr_time,
            betting_window_minutes=house_data.betting_window_minutes,
            runs_monday=house_data.runs_monday,
            runs_tuesday=house_data.runs_tuesday,
            runs_wednesday=house_data.runs_wednesday,
            runs_thursday=house_data.runs_thursday,
            runs_friday=house_data.runs_friday,
            runs_saturday=house_data.runs_saturday,
            runs_sunday=house_data.runs_sunday,
            fr_direct_payout_rate=house_data.fr_direct_payout_rate,
            fr_house_payout_rate=house_data.fr_house_payout_rate,
            fr_ending_payout_rate=house_data.fr_ending_payout_rate,
            sr_direct_payout_rate=house_data.sr_direct_payout_rate,
            sr_house_payout_rate=house_data.sr_house_payout_rate,
            sr_ending_payout_rate=house_data.sr_ending_payout_rate,
            forecast_payout_rate=house_data.forecast_payout_rate,
            forecast_direct_payout_rate=house_data.forecast_direct_payout_rate,
            forecast_house_payout_rate=house_data.forecast_house_payout_rate,
            forecast_ending_payout_rate=house_data.forecast_ending_payout_rate
        )
        
        db.add(db_house)
        db.commit()
        db.refresh(db_house)
        
        return HouseResponse(
            id=db_house.id,
            name=db_house.name,
            location=db_house.location,
            timezone=db_house.timezone,
            is_active=db_house.is_active,
            fr_time=str(db_house.fr_time) if db_house.fr_time else "15:45:00",
            sr_time=str(db_house.sr_time) if db_house.sr_time else "16:45:00",
            betting_window_minutes=db_house.betting_window_minutes,
            runs_monday=db_house.runs_monday,
            runs_tuesday=db_house.runs_tuesday,
            runs_wednesday=db_house.runs_wednesday,
            runs_thursday=db_house.runs_thursday,
            runs_friday=db_house.runs_friday,
            runs_saturday=db_house.runs_saturday,
            runs_sunday=db_house.runs_sunday,
            fr_direct_payout_rate=db_house.fr_direct_payout_rate,
            fr_house_payout_rate=db_house.fr_house_payout_rate,
            fr_ending_payout_rate=db_house.fr_ending_payout_rate,
            sr_direct_payout_rate=db_house.sr_direct_payout_rate,
            sr_house_payout_rate=db_house.sr_house_payout_rate,
            sr_ending_payout_rate=db_house.sr_ending_payout_rate,
            forecast_payout_rate=db_house.forecast_payout_rate,
            forecast_direct_payout_rate=db_house.forecast_direct_payout_rate,
            forecast_house_payout_rate=db_house.forecast_house_payout_rate,
            forecast_ending_payout_rate=db_house.forecast_ending_payout_rate,
            created_at=db_house.created_at,
            updated_at=db_house.updated_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating house: {str(e)}"
        )

@router.get("/houses", response_model=List[HouseResponse])
async def get_all_houses(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all houses"""
    houses = db.query(House).all()
    return [
        HouseResponse(
            id=house.id,
            name=house.name,
            location=house.location,
            timezone=house.timezone,
            is_active=house.is_active,
            fr_time=str(house.fr_time) if house.fr_time else "15:45:00",
            sr_time=str(house.sr_time) if house.sr_time else "16:45:00",
            betting_window_minutes=house.betting_window_minutes,
            runs_monday=house.runs_monday,
            runs_tuesday=house.runs_tuesday,
            runs_wednesday=house.runs_wednesday,
            runs_thursday=house.runs_thursday,
            runs_friday=house.runs_friday,
            runs_saturday=house.runs_saturday,
            runs_sunday=house.runs_sunday,
            fr_direct_payout_rate=house.fr_direct_payout_rate,
            fr_house_payout_rate=house.fr_house_payout_rate,
            fr_ending_payout_rate=house.fr_ending_payout_rate,
            sr_direct_payout_rate=house.sr_direct_payout_rate,
            sr_house_payout_rate=house.sr_house_payout_rate,
            sr_ending_payout_rate=house.sr_ending_payout_rate,
            forecast_payout_rate=house.forecast_payout_rate,
            forecast_direct_payout_rate=house.forecast_direct_payout_rate,
            forecast_house_payout_rate=house.forecast_house_payout_rate,
            forecast_ending_payout_rate=house.forecast_ending_payout_rate,
            created_at=house.created_at,
            updated_at=house.updated_at
        ) for house in houses
    ]

@router.get("/houses/{house_id}", response_model=HouseResponse)
async def get_house(
    house_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get a specific house by ID"""
    house = db.query(House).filter(House.id == house_id).first()
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    
    return HouseResponse(
        id=house.id,
        name=house.name,
        location=house.location,
        timezone=house.timezone,
        is_active=house.is_active,
        fr_time=str(house.fr_time) if house.fr_time else "15:45:00",
        sr_time=str(house.sr_time) if house.sr_time else "16:45:00",
        betting_window_minutes=house.betting_window_minutes,
        runs_monday=house.runs_monday,
        runs_tuesday=house.runs_tuesday,
        runs_wednesday=house.runs_wednesday,
        runs_thursday=house.runs_thursday,
        runs_friday=house.runs_friday,
        runs_saturday=house.runs_saturday,
        runs_sunday=house.runs_sunday,
        fr_direct_payout_rate=house.fr_direct_payout_rate,
        fr_house_payout_rate=house.fr_house_payout_rate,
        fr_ending_payout_rate=house.fr_ending_payout_rate,
        sr_direct_payout_rate=house.sr_direct_payout_rate,
        sr_house_payout_rate=house.sr_house_payout_rate,
        sr_ending_payout_rate=house.sr_ending_payout_rate,
        forecast_payout_rate=house.forecast_payout_rate,
        forecast_direct_payout_rate=house.forecast_direct_payout_rate,
        forecast_house_payout_rate=house.forecast_house_payout_rate,
        forecast_ending_payout_rate=house.forecast_ending_payout_rate,
        created_at=house.created_at,
        updated_at=house.updated_at
    )

@router.put("/houses/{house_id}", response_model=HouseResponse)
async def update_house(
    house_id: int,
    house_data: HouseUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a house - when times are changed, future rounds are automatically rescheduled"""
    house = db.query(House).filter(House.id == house_id).first()
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    
    try:
        update_data = house_data.model_dump(exclude_unset=True)
        
        # Check if timing fields are being updated
        timing_changed = any(field in update_data for field in 
                           ['fr_time', 'sr_time', 'betting_window_minutes', 'timezone'])
        
        # Apply updates
        for field, value in update_data.items():
            if field in ['fr_time', 'sr_time'] and value:
                # Convert string time to Time object
                from datetime import datetime
                time_obj = datetime.strptime(value, "%H:%M:%S").time()
                setattr(house, field, time_obj)
            else:
                setattr(house, field, value)
        
        db.commit()
        
        # If timing was changed, reschedule future rounds
        if timing_changed:
            await reschedule_future_rounds(house_id, db)
        
        db.refresh(house)
        
        return HouseResponse(
            id=house.id,
            name=house.name,
            location=house.location,
            timezone=house.timezone,
            is_active=house.is_active,
            fr_time=str(house.fr_time) if house.fr_time else "15:30:00",
            sr_time=str(house.sr_time) if house.sr_time else "17:00:00",
            betting_window_minutes=house.betting_window_minutes,
            runs_monday=house.runs_monday,
            runs_tuesday=house.runs_tuesday,
            runs_wednesday=house.runs_wednesday,
            runs_thursday=house.runs_thursday,
            runs_friday=house.runs_friday,
            runs_saturday=house.runs_saturday,
            runs_sunday=house.runs_sunday,
            fr_direct_payout_rate=house.fr_direct_payout_rate,
            fr_house_payout_rate=house.fr_house_payout_rate,
            fr_ending_payout_rate=house.fr_ending_payout_rate,
            sr_direct_payout_rate=house.sr_direct_payout_rate,
            sr_house_payout_rate=house.sr_house_payout_rate,
            sr_ending_payout_rate=house.sr_ending_payout_rate,
            forecast_payout_rate=house.forecast_payout_rate,
            forecast_direct_payout_rate=house.forecast_direct_payout_rate,
            forecast_house_payout_rate=house.forecast_house_payout_rate,
            forecast_ending_payout_rate=house.forecast_ending_payout_rate,
            created_at=house.created_at,
            updated_at=house.updated_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating house: {str(e)}"
        )

@router.delete("/houses/{house_id}")
async def delete_house(
    house_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a house"""
    house = db.query(House).filter(House.id == house_id).first()
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    
    # Check if house has any rounds
    round_count = db.query(func.count(Round.id)).filter(Round.house_id == house_id).scalar()
    if round_count > 0:
        # Get a sample of rounds for better error message
        sample_rounds = db.query(Round).filter(Round.house_id == house_id).limit(3).all()
        round_info = ", ".join([f"{r.round_type.value}-{r.status.value}" for r in sample_rounds])
        more_text = f" and {round_count - 3} more" if round_count > 3 else ""
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete house '{house.name}'. It has {round_count} associated rounds ({round_info}{more_text}). Please delete or cancel all rounds first."
        )
    
    try:
        db.delete(house)
        db.commit()
        
        return {"message": "House deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deleting house: {str(e)}"
        )

@router.delete("/houses/{house_id}/rounds")
async def delete_all_house_rounds(
    house_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete all rounds for a house (helps with house deletion)"""
    house = db.query(House).filter(House.id == house_id).first()
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    
    try:
        # Get all rounds for this house
        rounds = db.query(Round).filter(Round.house_id == house_id).all()
        
        deleted_count = 0
        skipped_with_bets = 0
        
        for round_obj in rounds:
            # Check if round has bets
            bet_count = db.query(func.count(Bet.id)).filter(
                (Bet.round_id == round_obj.id) | 
                (Bet.fr_round_id == round_obj.id) | 
                (Bet.sr_round_id == round_obj.id)
            ).scalar()
            
            if bet_count > 0:
                skipped_with_bets += 1
            elif round_obj.status in [RoundStatus.ACTIVE, RoundStatus.COMPLETED]:
                skipped_with_bets += 1
            else:
                # Safe to delete (SCHEDULED or CANCELLED rounds without bets)
                db.delete(round_obj)
                deleted_count += 1
        
        db.commit()
        
        message = f"Deleted {deleted_count} rounds"
        if skipped_with_bets > 0:
            message += f", skipped {skipped_with_bets} rounds with bets or active/completed status"
        
        return {"message": message, "deleted_count": deleted_count, "skipped_count": skipped_with_bets}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deleting rounds: {str(e)}"
        )

# User Management
@router.get("/users", response_model=List[UserStats])
async def get_all_users(
    limit: int = Query(100, ge=1, le=500),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users with statistics"""
    users = db.query(User).limit(limit).all()
    
    user_stats = []
    for user in users:
        # Get user betting stats
        total_bets = db.query(func.count(Bet.id)).filter(Bet.user_id == user.id).scalar() or 0
        bet_amount = db.query(func.sum(Bet.bet_amount)).filter(Bet.user_id == user.id).scalar() or 0.0
        won_bets = db.query(func.count(Bet.id)).filter(
            and_(Bet.user_id == user.id, Bet.status == BetStatus.WON)
        ).scalar() or 0
        payouts = db.query(func.sum(Bet.actual_payout)).filter(
            and_(Bet.user_id == user.id, Bet.status == BetStatus.WON)
        ).scalar() or 0.0
        
        # Get bet type counts
        direct_bets = db.query(func.count(Bet.id)).filter(
            and_(Bet.user_id == user.id, Bet.bet_type == BetType.DIRECT)
        ).scalar() or 0
        house_bets = db.query(func.count(Bet.id)).filter(
            and_(Bet.user_id == user.id, Bet.bet_type == BetType.HOUSE)
        ).scalar() or 0
        ending_bets = db.query(func.count(Bet.id)).filter(
            and_(Bet.user_id == user.id, Bet.bet_type == BetType.ENDING)
        ).scalar() or 0
        forecast_bets = db.query(func.count(Bet.id)).filter(
            and_(Bet.user_id == user.id, Bet.bet_type == BetType.FORECAST)
        ).scalar() or 0
        
        # Get transaction stats
        total_deposits = db.query(func.sum(Transaction.amount)).filter(
            and_(Transaction.user_id == user.id, Transaction.transaction_type == TransactionType.DEPOSIT)
        ).scalar() or 0.0
        total_withdrawals = db.query(func.sum(Transaction.amount)).filter(
            and_(Transaction.user_id == user.id, Transaction.transaction_type == TransactionType.WITHDRAWAL)
        ).scalar() or 0.0
        
        # Calculate profit/loss
        profit_loss = float(payouts) - float(bet_amount)
        
        # Get recent bets (last 5)
        recent_bets = db.query(Bet).filter(Bet.user_id == user.id).order_by(
            Bet.created_at.desc()
        ).limit(5).all()
        
        # Get recent transactions (last 5)
        recent_transactions = db.query(Transaction).filter(Transaction.user_id == user.id).order_by(
            Transaction.created_at.desc()
        ).limit(5).all()
        
        user_stats.append(UserStats(
            user=UserResponse(
                id=user.id,
                username=user.username,
                phone=user.phone,
                wallet_balance=user.wallet_balance,
                is_active=user.is_active,
                is_admin=user.is_admin,
                created_at=user.created_at
            ),
            total_bets=total_bets,
            bet_amount=float(bet_amount),
            won_bets=won_bets,
            payouts=float(payouts),
            direct_bets=direct_bets,
            house_bets=house_bets,
            ending_bets=ending_bets,
            forecast_bets=forecast_bets,
            total_deposits=float(total_deposits),
            total_withdrawals=float(total_withdrawals),
            profit_loss=profit_loss,
            recent_bets=[BetResponse(
                id=bet.id,
                user_id=bet.user_id,
                round_id=bet.round_id,
                bet_type=bet.bet_type,
                bet_value=bet.bet_value,  # Use bet_value directly
                bet_numbers=None,  # Keep None for backward compatibility
                forecast_pairs=None,
                forecast_combinations=bet.forecast_combinations,
                total_bet_amount=bet.bet_amount,
                status=bet.status,
                potential_payout=bet.potential_payout,
                actual_payout=bet.actual_payout,
                ticket_id=bet.ticket_id,
                fr_round_id=bet.fr_round_id,
                sr_round_id=bet.sr_round_id,
                house_name=bet.house_name,
                created_at=bet.created_at
            ) for bet in recent_bets],
            recent_transactions=[TransactionResponse(
                id=trans.id,
                user_id=trans.user_id,
                amount=trans.amount,
                transaction_type=trans.transaction_type,
                status=trans.status,
                description=trans.description,
                payment_proof_url=trans.payment_proof_url,
                deposit_method=trans.deposit_method,
                reference_number=trans.reference_number,
                deposit_bank=trans.deposit_bank,
                deposit_upi_id=trans.deposit_upi_id,
                admin_notes=trans.admin_notes,
                processed_by=trans.processed_by,
                processed_at=trans.processed_at,
                balance_before=0.0,  # Legacy field
                balance_after=0.0,   # Legacy field
                created_at=trans.created_at
            ) for trans in recent_transactions]
        ))
    
    return user_stats

# Transaction Management
@router.get("/transactions", response_model=List[TransactionResponse])
async def get_all_transactions(
    status: Optional[TransactionStatus] = Query(None),
    transaction_type: Optional[TransactionType] = Query(None),
    limit: int = Query(50, le=500),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all transactions with optional filtering"""
    query = db.query(Transaction)
    
    if status:
        query = query.filter(Transaction.status == status)
    
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    
    transactions = query.order_by(Transaction.created_at.desc()).limit(limit).all()
    
    return [TransactionResponse(
        id=trans.id,
        user_id=trans.user_id,
        transaction_type=trans.transaction_type,
        amount=trans.amount,
        status=trans.status,
        description=trans.description,
        payment_proof_url=trans.payment_proof_url,
        payment_method_id=trans.payment_method_id,
        transaction_details=trans.transaction_details,
        deposit_method=trans.deposit_method,
        reference_number=trans.reference_number,
        deposit_bank=trans.deposit_bank,
        deposit_upi_id=trans.deposit_upi_id,
        admin_notes=trans.admin_notes,
        processed_by=trans.processed_by,
        processed_at=trans.processed_at,
        balance_before=trans.balance_before,
        balance_after=trans.balance_after,
        created_at=trans.created_at
    ) for trans in transactions]

@router.get("/transactions/pending", response_model=List[TransactionResponse])
async def get_pending_transactions(
    transaction_type: Optional[TransactionType] = Query(None),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all pending transactions"""
    wallet_service = WalletService(db)
    return wallet_service.get_pending_transactions(transaction_type)

@router.get("/transactions/detailed", response_model=List[DetailedTransactionResponse])
async def get_detailed_transactions(
    status: Optional[TransactionStatus] = Query(None),
    transaction_type: Optional[TransactionType] = Query(None),
    limit: int = Query(50, le=500),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed transactions with user information"""
    query = db.query(Transaction).join(User, Transaction.user_id == User.id)
    
    if status:
        query = query.filter(Transaction.status == status)
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    
    transactions = query.order_by(Transaction.created_at.desc()).limit(limit).all()
    
    detailed_transactions = []
    for transaction in transactions:
        user_bank_details = {
            "bank_name": transaction.user.bank_name,
            "account_number": transaction.user.account_number,
            "account_holder_name": transaction.user.account_holder_name,
            "ifsc_code": transaction.user.ifsc_code,
            "upi_id": transaction.user.upi_id
        }
        
        user_info = {
            "id": transaction.user.id,
            "username": transaction.user.username,
            "phone": transaction.user.phone,
            "wallet_balance": transaction.user.wallet_balance,
            "bank_details": user_bank_details,
            "created_at": transaction.user.created_at
        }
        
        detailed_transaction = {
            "id": transaction.id,
            "user": user_info,
            "transaction_type": transaction.transaction_type,
            "amount": transaction.amount,
            "status": transaction.status,
            "description": transaction.description,
            "payment_proof_url": transaction.payment_proof_url,
            "payment_method_id": transaction.payment_method_id,
            "transaction_details": transaction.transaction_details,
            "deposit_method": transaction.deposit_method,
            "reference_number": transaction.reference_number,
            "deposit_bank": transaction.deposit_bank,
            "deposit_upi_id": transaction.deposit_upi_id,
            "admin_notes": transaction.admin_notes,
            "processed_by": transaction.processed_by,
            "processed_at": transaction.processed_at,
            "balance_before": transaction.balance_before,
            "balance_after": transaction.balance_after,
            "created_at": transaction.created_at
        }
        detailed_transactions.append(detailed_transaction)
    
    return detailed_transactions

@router.post("/transactions/{transaction_id}/approve")
async def approve_transaction(
    transaction_id: int,
    admin_notes: Optional[str] = Query(None),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Approve a pending transaction"""
    wallet_service = WalletService(db)
    
    # Get transaction to check type
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    if transaction.transaction_type == TransactionType.DEPOSIT:
        success, message = wallet_service.approve_deposit(transaction_id, current_admin.id, admin_notes)
    elif transaction.transaction_type == TransactionType.WITHDRAWAL:
        success, message = wallet_service.approve_withdrawal(transaction_id, current_admin.id, admin_notes)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction type for approval"
        )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

@router.post("/transactions/{transaction_id}/reject")
async def reject_transaction(
    transaction_id: int,
    admin_notes: Optional[str] = Query(None),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Reject a pending transaction"""
    wallet_service = WalletService(db)
    
    # Get transaction to check if it exists and is pending
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    success, message = wallet_service.reject_transaction(transaction_id, current_admin.id, admin_notes or "Rejected by admin")
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

# User Wallet Management
@router.put("/users/{user_id}/wallet")
async def adjust_user_wallet(
    user_id: int,
    amount: float,
    reason: str,
    operation: str = "add",  # "add" or "subtract"
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Adjust user wallet balance (admin only)"""
    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    wallet_service = WalletService(db)
    
    try:
        if operation == "add":
            success, message = wallet_service.add_balance(user_id, amount, reason)
        else:  # subtract
            success, message = wallet_service.subtract_balance(user_id, amount, reason)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        # Refresh user to get updated balance
        db.refresh(user)
        
        return {
            "message": message,
            "new_balance": user.wallet_balance,
            "operation": operation,
            "amount": amount
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adjusting wallet: {str(e)}"
        )

# Test endpoint for debugging
@router.get("/test")
async def test_admin_endpoint(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Test endpoint to verify admin authentication is working"""
    return {
        "message": "Admin authentication working!",
        "admin_user": {
            "id": current_admin.id,
            "username": current_admin.username,
            "is_admin": current_admin.is_admin
        }
    }

# Bets Management
@router.get("/bets", response_model=List[BetResponse])
async def get_all_bets(
    limit: int = Query(50, ge=1, le=100),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all bets with details"""
    bets = db.query(Bet).order_by(Bet.created_at.desc()).limit(limit).all()
    
    result = []
    for bet in bets:
        result.append(BetResponse(
            id=bet.id,
            user_id=bet.user_id,
            round_id=bet.round_id,
            bet_type=bet.bet_type,
            bet_value=bet.bet_value,
            bet_numbers=None,
            forecast_pairs=None,
            forecast_combinations=bet.forecast_combinations,
            total_bet_amount=bet.bet_amount,
            status=bet.status,
            potential_payout=bet.potential_payout,
            actual_payout=bet.actual_payout,
            ticket_id=bet.ticket_id,
            fr_round_id=bet.fr_round_id,
            sr_round_id=bet.sr_round_id,
            house_name=bet.house_name,
            created_at=bet.created_at
        ))
    
    return result

# System Stats
@router.get("/stats")
async def get_system_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed system statistics"""
    from datetime import datetime, timedelta
    
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # User stats
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    new_users_week = db.query(func.count(User.id)).filter(func.date(User.created_at) >= week_ago).scalar()
    
    # House stats
    total_houses = db.query(func.count(House.id)).scalar()
    active_houses = db.query(func.count(House.id)).filter(House.is_active == True).scalar()
    
    # Round stats
    total_rounds = db.query(func.count(Round.id)).scalar()
    completed_rounds = db.query(func.count(Round.id)).filter(Round.status == RoundStatus.COMPLETED).scalar()
    todays_rounds = db.query(func.count(Round.id)).filter(func.date(Round.scheduled_time) == today).scalar()
    
    # Bet stats
    total_bets = db.query(func.count(Bet.id)).scalar()
    total_bet_amount = db.query(func.coalesce(func.sum(Bet.bet_amount), 0)).scalar()
    total_payout = db.query(func.coalesce(func.sum(Bet.payout_amount), 0)).filter(Bet.payout_amount.isnot(None)).scalar()
    
    # Transaction stats
    pending_deposits = db.query(func.count(Transaction.id)).filter(
        and_(
            Transaction.transaction_type == TransactionType.DEPOSIT,
            Transaction.status == TransactionStatus.PENDING
        )
    ).scalar()
    
    pending_withdrawals = db.query(func.count(Transaction.id)).filter(
        and_(
            Transaction.transaction_type == TransactionType.WITHDRAWAL,
            Transaction.status == TransactionStatus.PENDING
        )
    ).scalar()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "new_this_week": new_users_week
        },
        "houses": {
            "total": total_houses,
            "active": active_houses
        },
        "rounds": {
            "total": total_rounds,
            "completed": completed_rounds,
            "today": todays_rounds
        },
        "bets": {
            "total": total_bets,
            "total_amount": float(total_bet_amount),
            "total_payout": float(total_payout),
            "profit": float(total_bet_amount - total_payout)
        },
        "transactions": {
            "pending_deposits": pending_deposits,
            "pending_withdrawals": pending_withdrawals
        }
    }

# Daily Scheduling Management
@router.post("/schedule/daily")
async def schedule_daily_rounds(
    target_date: Optional[date] = Query(None, description="Date to schedule (default: tomorrow)"),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Schedule daily rounds for a specific date"""
    try:
        scheduler = TeerSchedulerService(db)
        results = scheduler.schedule_daily_rounds(target_date)
        
        return {
            "success": True,
            "message": f"Scheduled rounds for {results['date']}",
            "results": results
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error scheduling daily rounds: {str(e)}"
        )

@router.post("/schedule/update-statuses")
async def update_round_statuses(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update round statuses based on current time"""
    try:
        scheduler = TeerSchedulerService(db)
        results = scheduler.update_round_statuses()
        
        return {
            "success": True,
            "message": "Round statuses updated",
            "results": results
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating round statuses: {str(e)}"
        )

@router.post("/scheduling/houses/{house_id}/auto-schedule")
async def auto_schedule_house_rounds(
    house_id: int,
    request_data: dict,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Auto-schedule rounds for a specific house for the next N days"""
    try:
        days_ahead = request_data.get("days_ahead", 30)
        
        # Verify house exists
        house = db.query(House).filter(House.id == house_id).first()
        if not house:
            raise HTTPException(status_code=404, detail="House not found")
        
        scheduler = TeerSchedulerService(db)
        total_rounds_created = 0
        
        # Schedule rounds for each day in the next N days
        for i in range(1, days_ahead + 1):
            target_date = date.today() + timedelta(days=i)
            
            # Check if house is supposed to run on this day
            weekday = target_date.weekday()  # 0=Monday, 6=Sunday
            day_mapping = {
                0: house.runs_monday,
                1: house.runs_tuesday, 
                2: house.runs_wednesday,
                3: house.runs_thursday,
                4: house.runs_friday,
                5: house.runs_saturday,
                6: house.runs_sunday
            }
            
            if not day_mapping.get(weekday, False):
                continue  # Skip days when house doesn't run
            
            # Check if rounds already exist for this date
            existing_rounds = db.query(Round).filter(
                Round.house_id == house_id,
                func.date(Round.scheduled_time) == target_date
            ).count()
            
            if existing_rounds > 0:
                continue  # Skip if rounds already exist
            
            # Create FR and SR rounds for this house on this date using house timezone
            try:
                from zoneinfo import ZoneInfo
                house_tz = ZoneInfo(house.timezone) if hasattr(house, 'timezone') else ZoneInfo('Asia/Kolkata')
                
                # Create times in house timezone first
                fr_time_local = datetime.combine(target_date, house.fr_time).replace(tzinfo=house_tz)
                sr_time_local = datetime.combine(target_date, house.sr_time).replace(tzinfo=house_tz)
                
                # Convert to UTC for database storage
                fr_time = fr_time_local.astimezone(timezone.utc)
                sr_time = sr_time_local.astimezone(timezone.utc)
            except:
                # Fallback to UTC if timezone handling fails
                fr_time = datetime.combine(target_date, house.fr_time).replace(tzinfo=timezone.utc)
                sr_time = datetime.combine(target_date, house.sr_time).replace(tzinfo=timezone.utc)
            
            # Calculate betting close times
            fr_betting_closes = fr_time - timedelta(minutes=house.betting_window_minutes)
            sr_betting_closes = sr_time - timedelta(minutes=house.betting_window_minutes)
            
            # Create FR Round
            fr_round = Round(
                house_id=house_id,
                round_type=RoundType.FR,
                scheduled_time=fr_time,
                betting_closes_at=fr_betting_closes,
                status=RoundStatus.SCHEDULED
            )
            db.add(fr_round)
            total_rounds_created += 1
            
            # Create SR Round  
            sr_round = Round(
                house_id=house_id,
                round_type=RoundType.SR,
                scheduled_time=sr_time,
                betting_closes_at=sr_betting_closes,
                status=RoundStatus.SCHEDULED
            )
            db.add(sr_round)
            total_rounds_created += 1
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Auto-scheduled {total_rounds_created} rounds for {house.name} (Timezone: {getattr(house, 'timezone', 'Asia/Kolkata')})",
            "rounds_created": total_rounds_created,
            "house_name": house.name,
            "house_timezone": getattr(house, 'timezone', 'Asia/Kolkata'),
            "days_scheduled": days_ahead
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error auto-scheduling rounds: {str(e)}"
        )

@router.get("/schedule/forecast/{house_id}")
async def get_forecast_rounds(
    house_id: int,
    target_date: Optional[date] = Query(None, description="Date to check (default: today)"),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get FR and SR rounds for forecast betting"""
    try:
        scheduler = TeerSchedulerService(db)
        results = scheduler.get_forecast_rounds(house_id, target_date)
        
        return results
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting forecast rounds: {str(e)}"
        )

@router.get("/schedule/houses-for-date")
async def get_houses_for_date(
    target_date: date = Query(..., description="Date to check"),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get houses that should run on a specific date"""
    try:
        scheduler = TeerSchedulerService(db)
        houses = scheduler.get_houses_for_date(target_date)
        
        return {
            "date": target_date,
            "houses": [
                {
                    "id": house.id,
                    "name": house.name,
                    "location": house.location,
                    "fr_time": house.fr_time.strftime('%H:%M'),
                    "sr_time": house.sr_time.strftime('%H:%M'),
                    "betting_window_minutes": house.betting_window_minutes,
                    "weekday_schedule": {
                        "monday": house.runs_monday,
                        "tuesday": house.runs_tuesday,
                        "wednesday": house.runs_wednesday,
                        "thursday": house.runs_thursday,
                        "friday": house.runs_friday,
                        "saturday": house.runs_saturday,
                        "sunday": house.runs_sunday
                    }
                }
                for house in houses
            ]
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting houses for date: {str(e)}"
        )

@router.put("/houses/{house_id}/schedule")
async def update_house_schedule(
    house_id: int,
    schedule_data: dict,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update house schedule and automatically reschedule future rounds"""
    house = db.query(House).filter(House.id == house_id).first()
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    
    try:
        # Update house schedule
        for field, value in schedule_data.items():
            if field in ['fr_time', 'sr_time'] and value:
                from datetime import datetime
                # Handle both HH:MM and HH:MM:SS formats
                if len(value.split(':')) == 2:
                    value = value + ":00"
                time_obj = datetime.strptime(value, "%H:%M:%S").time()
                setattr(house, field, time_obj)
            elif hasattr(house, field):
                setattr(house, field, value)
        
        db.commit()
        
        # Reschedule all future rounds
        await reschedule_future_rounds(house_id, db)
        
        return {
            "success": True,
            "message": f"House schedule updated and future rounds rescheduled",
            "house_id": house_id,
            "new_fr_time": str(house.fr_time),
            "new_sr_time": str(house.sr_time),
            "timezone": house.timezone
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating house schedule: {str(e)}"
        )

@router.put("/houses/{house_id}/schedule")
async def update_house_schedule(
    house_id: int,
    fr_time: str = Query(..., description="FR time in HH:MM format"),
    sr_time: str = Query(..., description="SR time in HH:MM format"),
    betting_window_minutes: int = Query(5, description="Minutes before round time to close betting"),
    runs_monday: bool = Query(True),
    runs_tuesday: bool = Query(True),
    runs_wednesday: bool = Query(True),
    runs_thursday: bool = Query(True),
    runs_friday: bool = Query(True),
    runs_saturday: bool = Query(True),
    runs_sunday: bool = Query(True),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update house schedule and weekday settings"""
    try:
        from datetime import time
        
        house = db.query(House).filter(House.id == house_id).first()
        if not house:
            raise HTTPException(status_code=404, detail="House not found")
        
        # Parse time strings
        try:
            fr_hour, fr_minute = map(int, fr_time.split(':'))
            sr_hour, sr_minute = map(int, sr_time.split(':'))
            house.fr_time = time(fr_hour, fr_minute)
            house.sr_time = time(sr_hour, sr_minute)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid time format. Use HH:MM format."
            )
        
        # Update schedule settings
        house.betting_window_minutes = betting_window_minutes
        house.runs_monday = runs_monday
        house.runs_tuesday = runs_tuesday
        house.runs_wednesday = runs_wednesday
        house.runs_thursday = runs_thursday
        house.runs_friday = runs_friday
        house.runs_saturday = runs_saturday
        house.runs_sunday = runs_sunday
        
        db.commit()
        
        return {
            "message": "House schedule updated successfully",
            "house": {
                "id": house.id,
                "name": house.name,
                "fr_time": house.fr_time.strftime('%H:%M'),
                "sr_time": house.sr_time.strftime('%H:%M'),
                "betting_window_minutes": house.betting_window_minutes,
                "weekday_schedule": {
                    "monday": house.runs_monday,
                    "tuesday": house.runs_tuesday,
                    "wednesday": house.runs_wednesday,
                    "thursday": house.runs_thursday,
                    "friday": house.runs_friday,
                    "saturday": house.runs_saturday,
                    "sunday": house.runs_sunday
                }
            }
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating house schedule: {str(e)}"
        )

# Banner Management
@router.get("/banners", response_model=List[BannerSchema])
async def get_all_banners(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all banners"""
    banners = db.query(Banner).order_by(Banner.order_position.asc(), Banner.id.desc()).all()
    return banners

@router.post("/banners", response_model=BannerSchema)
async def create_banner(
    banner_data: BannerCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new banner"""
    try:
        banner = Banner(**banner_data.model_dump())
        db.add(banner)
        db.commit()
        db.refresh(banner)
        return banner
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating banner: {str(e)}")

@router.put("/banners/{banner_id}", response_model=BannerSchema)
async def update_banner(
    banner_id: int,
    banner_data: BannerUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a banner"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    try:
        update_data = banner_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(banner, field, value)
        
        db.commit()
        db.refresh(banner)
        return banner
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating banner: {str(e)}")

@router.delete("/banners/{banner_id}")
async def delete_banner(
    banner_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a banner"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    try:
        db.delete(banner)
        db.commit()
        return {"message": "Banner deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error deleting banner: {str(e)}")

@router.patch("/banners/{banner_id}/toggle")
async def toggle_banner_status(
    banner_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Toggle banner active status"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    try:
        banner.is_active = not banner.is_active
        db.commit()
        db.refresh(banner)
        return banner
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error toggling banner: {str(e)}")

# Payment Methods Management
@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def get_payment_methods(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all payment methods for admin management"""
    payment_methods = db.query(PaymentMethod).order_by(PaymentMethod.display_order).all()
    return payment_methods

@router.post("/payment-methods", response_model=PaymentMethodResponse)
async def create_payment_method(
    payment_method: PaymentMethodCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new payment method"""
    # Auto-generate details if not provided
    if not payment_method.details:
        if payment_method.type == PaymentMethodType.UPI:
            payment_method.details = {
                "upi_id": payment_method.admin_contact or "",
                "qr_supported": True
            }
        elif payment_method.type == PaymentMethodType.BANK:
            payment_method.details = {
                "account_number": "",
                "ifsc_code": "",
                "bank_name": ""
            }
        elif payment_method.type == PaymentMethodType.WALLET:
            payment_method.details = {
                "wallet_id": "",
                "provider": ""
            }
        elif payment_method.type == PaymentMethodType.CRYPTO:
            payment_method.details = {
                "wallet_address": "",
                "currency": "USDT"
            }
        else:
            payment_method.details = {}
    
    db_payment_method = PaymentMethod(**payment_method.dict())
    db.add(db_payment_method)
    db.commit()
    db.refresh(db_payment_method)
    return db_payment_method

@router.put("/payment-methods/{payment_method_id}", response_model=PaymentMethodResponse)
async def update_payment_method(
    payment_method_id: int,
    payment_method: PaymentMethodUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a payment method"""
    db_payment_method = db.query(PaymentMethod).filter(PaymentMethod.id == payment_method_id).first()
    if not db_payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    update_data = payment_method.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_payment_method, field, value)
    
    db.commit()
    db.refresh(db_payment_method)
    return db_payment_method

@router.delete("/payment-methods/{payment_method_id}")
async def delete_payment_method(
    payment_method_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a payment method"""
    db_payment_method = db.query(PaymentMethod).filter(PaymentMethod.id == payment_method_id).first()
    if not db_payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    db.delete(db_payment_method)
    db.commit()
    return {"message": "Payment method deleted successfully"}

# Results endpoints for admin dashboard
# Note: All /results/* endpoints moved to admin_results.py to avoid conflicts

# New endpoints for daily round management
@router.post("/houses/{house_id}/create-daily-rounds")
async def create_daily_rounds_for_house(
    house_id: int,
    target_date: date = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create FR, SR, and Forecast rounds for a specific house"""
    try:
        round_service = RoundService(db)
        success, message = round_service.create_daily_rounds_for_house(house_id, target_date)
        
        if success:
            return {"message": message, "success": True}
        else:
            raise HTTPException(status_code=400, detail=message)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating daily rounds: {str(e)}")


@router.post("/rounds/create-daily-all")
async def create_daily_rounds_all_houses(
    target_date: date = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create daily rounds for all active houses (FR, SR, Forecast for each house)"""
    try:
        round_service = RoundService(db)
        results = round_service.create_daily_rounds_for_all_houses(target_date)
        
        return {
            "message": "Daily round creation completed",
            "results": results,
            "success": len(results["errors"]) == 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating daily rounds: {str(e)}")


@router.post("/rounds/auto-complete-and-create-next")
async def auto_complete_rounds_and_create_next(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Auto-complete rounds with published results and create next day rounds"""
    try:
        round_service = RoundService(db)
        results = round_service.auto_complete_rounds_with_results()
        
        return {
            "message": "Round completion and next day creation completed",
            "results": results,
            "success": len(results["errors"]) == 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in auto-completion: {str(e)}")


@router.get("/rounds/forecast-info/{house_id}")
async def get_forecast_info(
    house_id: int,
    target_date: date = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get FR and SR round info for forecast betting configuration"""
    try:
        if target_date is None:
            target_date = date.today()
        
        # Get FR and SR rounds for the house on the target date
        rounds = db.query(Round).filter(
            and_(
                Round.house_id == house_id,
                func.date(Round.scheduled_time) == target_date,
                Round.round_type.in_([RoundType.FR, RoundType.SR])
            )
        ).order_by(Round.scheduled_time.asc()).all()
        
        forecast_round = db.query(Round).filter(
            and_(
                Round.house_id == house_id,
                func.date(Round.scheduled_time) == target_date,
                Round.round_type == RoundType.FORECAST
            )
        ).first()
        
        result = {
            "house_id": house_id,
            "target_date": target_date,
            "fr_round": None,
            "sr_round": None,
            "forecast_round": None
        }
        
        for round_obj in rounds:
            round_data = {
                "id": round_obj.id,
                "round_type": round_obj.round_type,
                "scheduled_time": round_obj.scheduled_time,
                "betting_closes_at": round_obj.betting_closes_at,
                "status": round_obj.status,
                "result": round_obj.result
            }
            
            if round_obj.round_type == RoundType.FR:
                result["fr_round"] = round_data
            elif round_obj.round_type == RoundType.SR:
                result["sr_round"] = round_data
        
        if forecast_round:
            result["forecast_round"] = {
                "id": forecast_round.id,
                "round_type": forecast_round.round_type,
                "scheduled_time": forecast_round.scheduled_time,
                "betting_closes_at": forecast_round.betting_closes_at,
                "status": forecast_round.status,
                "result": forecast_round.result
            }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting forecast info: {str(e)}")

# ==================== ADMIN USER MANAGEMENT ====================

@router.post("/users/create-admin")
async def create_admin_user(
    user_data: AdminUserCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new admin user (only accessible to existing admins)"""
    
    # Check if current user is a super admin (for now, any admin can create other admins)
    if not current_admin.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create admin users"
        )
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Check if phone already exists
    existing_phone = db.query(User).filter(User.phone == user_data.phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already exists"
        )
    
    # Import password hashing
    from app.services.auth_service import get_password_hash
    
    # Create new admin user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        phone=user_data.phone,
        password_hash=hashed_password,
        is_active=True,
        is_admin=user_data.is_admin,
        role=UserRole(user_data.role),
        wallet_balance=0.0
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return {
        "message": "Admin user created successfully",
        "user": {
            "id": db_user.id,
            "username": db_user.username,
            "phone": db_user.phone,
            "role": db_user.role,
            "is_admin": db_user.is_admin,
            "created_at": db_user.created_at
        }
    }

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role_data: UserRoleUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update user role and admin privileges"""
    
    if not current_admin.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update user roles"
        )
    
    # Get the user to update
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from removing their own admin privileges
    if user.id == current_admin.id and not role_data.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin privileges"
        )
    
    # Update user role and admin status
    user.role = UserRole(role_data.role)
    user.is_admin = role_data.is_admin
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "User role updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "is_admin": user.is_admin
        }
    }

# ==================== TASK MANAGEMENT ====================

@router.post("/tasks/assign")
async def assign_task(
    task_data: TaskAssignment,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Assign a task to an admin user"""
    
    if not current_admin.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can assign tasks"
        )
    
    # Check if assigned user exists and is admin
    assigned_user = db.query(User).filter(User.id == task_data.user_id).first()
    if not assigned_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not assigned_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tasks can only be assigned to admin users"
        )
    
    # Create new task
    new_task = AdminTask(
        assigned_to_id=task_data.user_id,
        assigned_by_id=current_admin.id,
        task_type=TaskType(task_data.task_type),
        task_description=task_data.task_description,
        priority=TaskPriority(task_data.priority),
        due_date=task_data.due_date,
        status=TaskStatus.PENDING
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    return {
        "message": "Task assigned successfully",
        "task": {
            "id": new_task.id,
            "assigned_to": assigned_user.username,
            "task_type": new_task.task_type,
            "description": new_task.task_description,
            "priority": new_task.priority,
            "status": new_task.status,
            "due_date": new_task.due_date,
            "created_at": new_task.created_at
        }
    }

@router.get("/tasks/my-tasks")
async def get_my_tasks(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get tasks assigned to current admin user"""
    
    if not current_admin.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view tasks"
        )
    
    tasks = db.query(AdminTask).filter(AdminTask.assigned_to_id == current_admin.id).order_by(
        AdminTask.priority.desc(), AdminTask.created_at.desc()
    ).all()
    
    return [
        {
            "id": task.id,
            "task_type": task.task_type,
            "description": task.task_description,
            "priority": task.priority,
            "status": task.status,
            "due_date": task.due_date,
            "assigned_by": task.assigned_by.username,
            "created_at": task.created_at,
            "updated_at": task.updated_at
        }
        for task in tasks
    ]

@router.put("/tasks/{task_id}/status")
async def update_task_status(
    task_id: int,
    status: str,
    completion_notes: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update task status"""
    
    if not current_admin.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update task status"
        )
    
    # Validate status
    try:
        task_status = TaskStatus(status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task status"
        )
    
    # Get the task
    task = db.query(AdminTask).filter(AdminTask.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check if current user is assigned to this task or created it
    if task.assigned_to_id != current_admin.id and task.assigned_by_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update tasks assigned to you or created by you"
        )
    
    # Update task
    task.status = task_status
    if completion_notes:
        task.completion_notes = completion_notes
    
    if task_status == TaskStatus.COMPLETED:
        task.completed_at = func.now()
    
    db.commit()
    
    return {
        "message": "Task status updated successfully",
        "task": {
            "id": task.id,
            "status": task.status,
            "completion_notes": task.completion_notes,
            "completed_at": task.completed_at
        }
    }

@router.get("/tasks/all")
async def get_all_tasks(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all tasks (for super admins)"""
    
    if not current_admin.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view all tasks"
        )
    
    tasks = db.query(AdminTask).order_by(
        AdminTask.priority.desc(), AdminTask.created_at.desc()
    ).all()
    
    return [
        {
            "id": task.id,
            "assigned_to": task.assigned_to.username,
            "assigned_by": task.assigned_by.username,
            "task_type": task.task_type,
            "description": task.task_description,
            "priority": task.priority,
            "status": task.status,
            "due_date": task.due_date,
            "completion_notes": task.completion_notes,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "completed_at": task.completed_at
        }
        for task in tasks
    ]