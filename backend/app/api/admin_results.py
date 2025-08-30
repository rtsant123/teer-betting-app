from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, desc, text
from typing import List, Optional
from datetime import datetime, date, timezone, timedelta
from pydantic import BaseModel

from app.database import get_db
from app.schemas.round import RoundResponse
from app.services.round_service import RoundService
from app.models import User, House, Round
from app.models.round import RoundStatus, RoundType
from app.dependencies import get_current_admin_user

router = APIRouter()

class ResultPublishRequest(BaseModel):
    result: int
    notes: Optional[str] = None

class ResultsOverview(BaseModel):
    date: str
    house_id: int
    house_name: str
    fr_round_id: Optional[int] = None
    fr_result: Optional[int] = None
    fr_status: Optional[str] = None
    sr_round_id: Optional[int] = None
    sr_result: Optional[int] = None
    sr_status: Optional[str] = None
    is_complete: bool = False

@router.get("/overview", response_model=List[ResultsOverview])
async def get_results_overview(
    days_back: int = 7,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get overview of results for the last N days, grouped by date and house"""
    
    # Get all rounds from the last N days
    start_date = datetime.now(timezone.utc).date() - timedelta(days=days_back)
    
    rounds = db.query(Round).join(House).filter(
        func.date(Round.scheduled_time) >= start_date
    ).order_by(
        desc(func.date(Round.scheduled_time)),
        Round.house_id,
        Round.round_type
    ).all()
    
    # Group by date and house
    overview = {}
    for round_obj in rounds:
        date_str = round_obj.scheduled_time.date().isoformat()
        key = f"{date_str}_{round_obj.house_id}"
        
        if key not in overview:
            overview[key] = ResultsOverview(
                date=date_str,
                house_id=round_obj.house_id,
                house_name=round_obj.house.name
            )
        
        if round_obj.round_type == RoundType.FR:
            overview[key].fr_round_id = round_obj.id
            overview[key].fr_result = round_obj.result
            overview[key].fr_status = round_obj.status.value
        elif round_obj.round_type == RoundType.SR:
            overview[key].sr_round_id = round_obj.id
            overview[key].sr_result = round_obj.result
            overview[key].sr_status = round_obj.status.value
    
    # Mark complete entries
    for item in overview.values():
        item.is_complete = (
            item.fr_result is not None and 
            item.sr_result is not None and
            item.fr_status == "COMPLETED" and
            item.sr_status == "COMPLETED"
        )
    
    return list(overview.values())

@router.get("/pending")
async def get_pending_results(
    days_back: int = 7,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get ALL rounds that need results - improved logic for admin convenience"""
    
    # Update round statuses first
    from app.services.teer_scheduler import TeerSchedulerService
    scheduler = TeerSchedulerService(db)
    scheduler.update_round_statuses()
    
    # Get ALL rounds from recent days that don't have results yet
    # This allows admin to see and update results anytime, even future rounds
    start_date = datetime.now(timezone.utc) - timedelta(days=days_back)
    
    query = text("""
    SELECT r.id, r.house_id, h.name as house_name, r.round_type, r.status, 
           r.scheduled_time, r.betting_closes_at, r.actual_time, r.result, r.created_at,
           CASE 
               WHEN r.betting_closes_at <= :now_param THEN 'ready'
               ELSE 'scheduled'
           END as result_status
    FROM rounds r 
    JOIN houses h ON r.house_id = h.id 
    WHERE r.created_at >= :start_date
    AND r.result IS NULL 
    AND r.round_type IN ('FR', 'SR')
    AND h.is_active = true
    ORDER BY r.scheduled_time DESC, h.name, r.round_type
    """)
    
    result = db.execute(query, {"now_param": datetime.now(timezone.utc), "start_date": start_date})
    rounds = result.fetchall()
    
    # Convert to dict format with enhanced information
    response_data = []
    for row in rounds:
        betting_closed = row[6] <= datetime.now(timezone.utc) if row[6] else False
        
        response_data.append({
            "id": row[0],
            "house_id": row[1], 
            "house_name": row[2],
            "round_type": row[3],
            "status": row[4],
            "scheduled_time": row[5].isoformat() if row[5] else None,
            "betting_closes_at": row[6].isoformat() if row[6] else None,
            "actual_time": row[7].isoformat() if row[7] else None,
            "result": row[8],
            "created_at": row[9].isoformat() if row[9] else None,
            "result_status": row[10],
            "betting_closed": betting_closed,
            "can_update_result": True,  # Admin can always update results
            "is_past_due": betting_closed
        })
    
    return response_data

@router.post("/{round_id}/publish")
async def publish_result(
    round_id: int,
    request: ResultPublishRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Publish result for a round and process all bets"""
    from app.services.bet_service import EnhancedBetService
    
    # Validate result range
    if not (0 <= request.result <= 99):
        raise HTTPException(
            status_code=400,
            detail="Result must be between 0 and 99"
        )
    
    round_service = RoundService(db)
    bet_service = EnhancedBetService(db)
    
    # Get the round
    round_obj = db.query(Round).filter(Round.id == round_id).first()
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Check if round is ready for results
    betting_closed = round_obj.betting_closes_at <= datetime.now(timezone.utc)
    
    # REMOVED RESTRICTION: Admin can update results anytime for convenience
    # if not betting_closed:
    #     raise HTTPException(
    #         status_code=400,
    #         detail="Cannot publish results before betting deadline"
    #     )
    
    if round_obj.result is not None:
        raise HTTPException(
            status_code=400,
            detail="Result already published for this round"
        )
    
    try:
        # Update round with result
        round_obj.result = request.result
        round_obj.status = RoundStatus.COMPLETED
        round_obj.actual_time = datetime.now(timezone.utc)
        
        # Process regular bets for this round
        regular_winners = bet_service.process_round_results(round_id, request.result)
        
        # Check for forecast bet processing
        forecast_winners = 0
        forecast_details = {}
        
        if round_obj.round_type == RoundType.SR:
            # If this is an SR round, check for corresponding FR round to process forecasts
            fr_round = db.query(Round).filter(
                and_(
                    Round.house_id == round_obj.house_id,
                    Round.round_type == RoundType.FR,
                    Round.status == RoundStatus.COMPLETED,
                    Round.result.isnot(None),
                    func.date(Round.scheduled_time) == func.date(round_obj.scheduled_time)
                )
            ).first()
            
            if fr_round:
                # Get forecast preview before processing
                forecast_preview = bet_service.get_house_forecast_winner_statistics(
                    round_obj.house_id, fr_round.result, request.result
                )
                
                # Process forecast bets
                forecast_result = bet_service.process_forecast_bets(
                    round_obj.house_id, 
                    str(fr_round.result).zfill(2), 
                    str(request.result).zfill(2)
                )
                forecast_winners = forecast_result.get("winning_bets", 0)
                forecast_details = {
                    "fr_result": fr_round.result,
                    "sr_result": request.result,
                    "total_payout": forecast_result.get("total_payout", 0),
                    "preview": forecast_preview
                }
        
        elif round_obj.round_type == RoundType.FR:
            # If this is an FR round, check if there's a completed SR round to process forecasts
            sr_round = db.query(Round).filter(
                and_(
                    Round.house_id == round_obj.house_id,
                    Round.round_type == RoundType.SR,
                    Round.status == RoundStatus.COMPLETED,
                    Round.result.isnot(None),
                    func.date(Round.scheduled_time) == func.date(round_obj.scheduled_time)
                )
            ).first()
            
            if sr_round:
                # Get forecast preview before processing
                forecast_preview = bet_service.get_house_forecast_winner_statistics(
                    round_obj.house_id, request.result, sr_round.result
                )
                
                # Process forecast bets
                forecast_result = bet_service.process_forecast_bets(
                    round_obj.house_id, 
                    str(request.result).zfill(2), 
                    str(sr_round.result).zfill(2)
                )
                forecast_winners = forecast_result.get("winning_bets", 0)
                forecast_details = {
                    "fr_result": request.result,
                    "sr_result": sr_round.result,
                    "total_payout": forecast_result.get("total_payout", 0),
                    "preview": forecast_preview
                }
        
        db.commit()
        
        # NEW LOGIC: Auto-create next day rounds if both FR and SR results are now published
        next_day_creation_result = None
        try:
            from app.services.teer_scheduler import TeerSchedulerService
            scheduler = TeerSchedulerService(db)
            next_day_creation_result = scheduler.create_next_day_rounds_after_results(round_obj.house_id)
        except Exception as e:
            # Don't fail the result publication if next day creation fails
            next_day_creation_result = {"created": False, "reason": f"Error: {str(e)}"}
        
        return {
            "message": "Result published successfully",
            "round_id": round_id,
            "round_type": round_obj.round_type.value,
            "house_name": round_obj.house.name,
            "result": request.result,
            "regular_winners": regular_winners,
            "forecast_winners": forecast_winners,
            "total_winners": regular_winners + forecast_winners,
            "forecast_details": forecast_details,
            "next_day_rounds": next_day_creation_result
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error publishing result: {str(e)}"
        )

@router.post("/create-next-day-rounds/{house_id}")
async def create_next_day_rounds(
    house_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Manually trigger next day round creation for a house"""
    try:
        from app.services.teer_scheduler import TeerSchedulerService
        scheduler = TeerSchedulerService(db)
        result = scheduler.create_next_day_rounds_after_results(house_id)
        
        if result.get("created"):
            return {
                "success": True,
                "message": f"Next day rounds created successfully for {result.get('house_name')}",
                "details": result
            }
        else:
            return {
                "success": False,
                "message": result.get("reason", "Failed to create rounds"),
                "details": result
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating next day rounds: {str(e)}"
        )

@router.post("/schedule-tomorrow")
async def schedule_tomorrow_rounds(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Manually trigger tomorrow's round scheduling for all houses"""
    try:
        from app.services.teer_scheduler import TeerSchedulerService
        scheduler = TeerSchedulerService(db)
        result = scheduler.schedule_daily_rounds()
        
        return {
            "success": True,
            "message": "Tomorrow's rounds scheduled successfully",
            "details": result
        }
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error scheduling tomorrow's rounds: {str(e)}"
        )

@router.get("/latest", response_model=List[ResultsOverview])
async def get_latest_results(
    limit: int = 10,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get latest published results"""
    
    # Get completed rounds
    completed_rounds = db.query(Round).join(House).filter(
        and_(
            Round.status == RoundStatus.COMPLETED,
            Round.result.isnot(None)
        )
    ).order_by(desc(Round.actual_time)).limit(limit * 2).all()
    
    # Group by date and house
    overview = {}
    for round_obj in completed_rounds:
        date_str = round_obj.actual_time.date().isoformat()
        key = f"{date_str}_{round_obj.house_id}"
        
        if key not in overview:
            overview[key] = ResultsOverview(
                date=date_str,
                house_id=round_obj.house_id,
                house_name=round_obj.house.name
            )
        
        if round_obj.round_type == RoundType.FR:
            overview[key].fr_round_id = round_obj.id
            overview[key].fr_result = round_obj.result
            overview[key].fr_status = round_obj.status.value
        elif round_obj.round_type == RoundType.SR:
            overview[key].sr_round_id = round_obj.id
            overview[key].sr_result = round_obj.result
            overview[key].sr_status = round_obj.status.value
    
    # Mark complete and sort
    results = []
    for item in overview.values():
        item.is_complete = (
            item.fr_result is not None and 
            item.sr_result is not None
        )
        results.append(item)
    
    # Sort by date descending and limit
    results.sort(key=lambda x: x.date, reverse=True)
    return results[:limit]

@router.get("/forecast-preview/{house_id}")
async def preview_forecast_results(
    house_id: int,
    fr_result: int,
    sr_result: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Preview forecast betting results before publishing"""
    from app.services.bet_service import EnhancedBetService
    
    if not (0 <= fr_result <= 99) or not (0 <= sr_result <= 99):
        raise HTTPException(
            status_code=400,
            detail="Results must be between 0 and 99"
        )
    
    bet_service = EnhancedBetService(db)
    
    # Get forecast winner statistics
    forecast_stats = bet_service.get_house_forecast_winner_statistics(
        house_id, fr_result, sr_result
    )
    
    if "error" in forecast_stats:
        raise HTTPException(status_code=404, detail=forecast_stats["error"])
    
    return forecast_stats

@router.get("/forecast-statistics/{house_id}")
async def get_forecast_statistics(
    house_id: int,
    date_filter: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get forecast betting statistics for a house"""
    from app.services.bet_service import EnhancedBetService
    
    bet_service = EnhancedBetService(db)
    
    filter_date = None
    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    
    stats = bet_service.get_forecast_bet_statistics(house_id, filter_date)
    return stats
