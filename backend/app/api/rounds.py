from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from typing import List, Optional
from datetime import date
from pydantic import BaseModel

from app.database import get_db
from app.schemas.round import RoundResponse, RoundWithBets
from app.schemas.admin import HouseResponse
from app.services.round_service import RoundService
from app.services.teer_scheduler import TeerSchedulerService
from app.models.round import RoundStatus, RoundType
from app.models.house import House
from app.models import Round

router = APIRouter()

class LatestResultsResponse(BaseModel):
    date: str
    house_id: int
    house_name: str
    fr_result: Optional[int] = None
    sr_result: Optional[int] = None
    fr_time: Optional[str] = None
    sr_time: Optional[str] = None
    is_complete: bool = False

# Public houses endpoint
@router.get("/houses", response_model=List[HouseResponse])
async def get_public_houses(db: Session = Depends(get_db)):
    """Get all active houses for public viewing"""
    houses = db.query(House).filter(House.is_active == True).all()
    return [HouseResponse(
        id=house.id,
        name=house.name,
        location=house.location,
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
        created_at=house.created_at,
        updated_at=house.updated_at
    ) for house in houses]

# Static routes first to avoid conflicts with /{round_id}
@router.get("/upcoming", response_model=List[RoundResponse])
async def get_upcoming_rounds(
    hours_ahead: int = Query(24, ge=1, le=168),  # Max 1 week
    db: Session = Depends(get_db)
):
    """Get upcoming rounds within specified hours"""
    round_service = RoundService(db)
    return round_service.get_upcoming_rounds(hours_ahead)

@router.get("/results", response_model=List[RoundResponse])
async def get_results(
    house_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get completed rounds with results"""
    round_service = RoundService(db)
    return round_service.get_results(house_id, limit)

@router.get("/results/latest", response_model=List[LatestResultsResponse])
async def get_latest_results(
    days_back: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db)
):
    """Get latest results grouped by house and date for public display"""
    
    # Get completed rounds from recent days
    completed_rounds = db.query(Round).join(House).filter(
        and_(
            Round.status == RoundStatus.COMPLETED,
            Round.result.isnot(None),
            func.date(Round.actual_time) >= func.current_date() - days_back
        )
    ).order_by(desc(Round.actual_time)).all()
    
    # Group by date and house
    grouped = {}
    for round_obj in completed_rounds:
        date_str = round_obj.actual_time.date().isoformat()
        key = f"{date_str}_{round_obj.house_id}"
        
        if key not in grouped:
            grouped[key] = LatestResultsResponse(
                date=date_str,
                house_id=round_obj.house_id,
                house_name=round_obj.house.name
            )
        
        if round_obj.round_type == RoundType.FR:
            grouped[key].fr_result = round_obj.result
            grouped[key].fr_time = round_obj.actual_time.isoformat()
        elif round_obj.round_type == RoundType.SR:
            grouped[key].sr_result = round_obj.result
            grouped[key].sr_time = round_obj.actual_time.isoformat()
    
    # Mark complete entries and convert to list
    results = []
    for item in grouped.values():
        item.is_complete = (item.fr_result is not None and item.sr_result is not None)
        results.append(item)
    
    # Sort by date descending
    results.sort(key=lambda x: x.date, reverse=True)
    return results

@router.get("/active", response_model=List[RoundResponse])
async def get_active_rounds(db: Session = Depends(get_db)):
    """Get active rounds (scheduled and in progress)"""
    round_service = RoundService(db)
    return round_service.get_active_rounds()

@router.get("/live/active", response_model=List[RoundResponse])
async def get_live_rounds(db: Session = Depends(get_db)):
    """Get rounds that are currently accepting bets"""
    round_service = RoundService(db)
    return round_service.get_upcoming_rounds(hours_ahead=1)  # Next hour only

@router.get("/results-display")
async def get_results_display(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get results for display - shows 'XX' for today until published, past results with actual values"""
    try:
        from datetime import datetime, timezone, date, timedelta
        
        # Get current date in local timezone
        now = datetime.now(timezone.utc)
        today = now.date()
        
        results_display = []
        
        # 1. Get today's rounds (show as XX until results published)
        today_rounds = db.query(Round).join(House).filter(
            and_(
                House.is_active == True,
                func.date(Round.scheduled_time) == today,
                Round.round_type.in_([RoundType.FR, RoundType.SR])
            )
        ).order_by(Round.house_id, Round.round_type).all()
        
        # Group today's rounds by house
        today_by_house = {}
        for round_obj in today_rounds:
            house_key = round_obj.house.id
            if house_key not in today_by_house:
                today_by_house[house_key] = {
                    "date": today.strftime("%d/%m/%Y"),
                    "house_name": round_obj.house.name,
                    "house_location": round_obj.house.location,
                    "fr_result": "XX",  # Always XX until published
                    "sr_result": "XX",  # Always XX until published
                    "fr_time": None,
                    "sr_time": None,
                    "is_today": True,
                    "status": "Live"
                }
            
            # If round has actual result and is completed, show it, otherwise XX
            if round_obj.round_type == RoundType.FR:
                if round_obj.status == RoundStatus.COMPLETED and round_obj.result is not None:
                    today_by_house[house_key]["fr_result"] = round_obj.result
                    today_by_house[house_key]["fr_time"] = round_obj.actual_time.strftime("%H:%M") if round_obj.actual_time else None
                else:
                    today_by_house[house_key]["fr_result"] = "XX"
            elif round_obj.round_type == RoundType.SR:
                if round_obj.status == RoundStatus.COMPLETED and round_obj.result is not None:
                    today_by_house[house_key]["sr_result"] = round_obj.result
                    today_by_house[house_key]["sr_time"] = round_obj.actual_time.strftime("%H:%M") if round_obj.actual_time else None
                else:
                    today_by_house[house_key]["sr_result"] = "XX"
        
        # Add today's results to display
        results_display.extend(list(today_by_house.values()))
        
        # 2. Get past completed results (last 'limit' days, excluding today)
        past_rounds = db.query(Round).join(House).filter(
            and_(
                Round.status == RoundStatus.COMPLETED,
                Round.result.isnot(None),
                func.date(Round.scheduled_time) < today,  # Past dates only
                Round.round_type.in_([RoundType.FR, RoundType.SR])
            )
        ).order_by(desc(Round.scheduled_time)).limit(limit * 6).all()  # Get more to ensure we have enough after grouping
        
        # Group past rounds by date and house
        past_by_date_house = {}
        for round_obj in past_rounds:
            date_key = round_obj.scheduled_time.date().strftime("%d/%m/%Y")
            house_key = f"{date_key}_{round_obj.house.id}"
            
            if house_key not in past_by_date_house:
                past_by_date_house[house_key] = {
                    "date": date_key,
                    "house_name": round_obj.house.name,
                    "house_location": round_obj.house.location,
                    "fr_result": None,
                    "sr_result": None,
                    "fr_time": None,
                    "sr_time": None,
                    "is_today": False,
                    "status": "Complete"
                }
            
            group = past_by_date_house[house_key]
            if round_obj.round_type == RoundType.FR:
                group["fr_result"] = round_obj.result
                group["fr_time"] = round_obj.actual_time.strftime("%H:%M") if round_obj.actual_time else None
            elif round_obj.round_type == RoundType.SR:
                group["sr_result"] = round_obj.result
                group["sr_time"] = round_obj.actual_time.strftime("%H:%M") if round_obj.actual_time else None
        
        # Add past results to display (only complete entries with both FR and SR)
        for result in past_by_date_house.values():
            if result["fr_result"] is not None and result["sr_result"] is not None:
                results_display.append(result)
        
        # Sort by date (today first, then most recent past)
        results_display.sort(key=lambda x: (not x["is_today"], x["date"]), reverse=True)
        
        return results_display[:limit + 1]  # +1 to include today
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting results display: {str(e)}"
        )

@router.get("/grouped-recent-results")
async def get_grouped_recent_results(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get recent completed rounds grouped by date and house with FR/SR together"""
    try:
        from app.models.bet import Bet
        from sqlalchemy import func as sql_func
        
        # Get recent completed rounds
        rounds = db.query(Round).join(House).filter(
            Round.status == RoundStatus.COMPLETED,
            Round.result.isnot(None)
        ).order_by(desc(Round.scheduled_time)).limit(limit * 2).all()
        
        # Group by date and house
        grouped_results = {}
        
        for round_obj in rounds:
            date_key = round_obj.scheduled_time.date().isoformat()
            house_key = f"{round_obj.house.name}"
            group_key = f"{date_key}_{house_key}"
            
            if group_key not in grouped_results:
                grouped_results[group_key] = {
                    "date": date_key,
                    "house_id": round_obj.house.id,
                    "house_name": round_obj.house.name,
                    "house_location": round_obj.house.location,
                    "fr_result": None,
                    "sr_result": None,
                    "fr_time": None,
                    "sr_time": None,
                    "fr_total_bets": 0,
                    "sr_total_bets": 0,
                    "fr_total_winners": 0,
                    "sr_total_winners": 0,
                    "fr_status": "waiting",
                    "sr_status": "waiting",
                    "is_complete": False
                }
            
            group = grouped_results[group_key]
            
            # Get betting statistics for this round
            total_bets = db.query(sql_func.count(Bet.id)).filter(Bet.round_id == round_obj.id).scalar() or 0
            total_bet_amount = db.query(sql_func.sum(Bet.bet_amount)).filter(Bet.round_id == round_obj.id).scalar() or 0
            
            if round_obj.round_type == RoundType.FR:
                group["fr_result"] = round_obj.result
                group["fr_time"] = round_obj.scheduled_time.strftime("%H:%M")
                group["fr_total_bets"] = total_bet_amount
                group["fr_total_winners"] = total_bets  # Use bet count as winners for now
                group["fr_status"] = "completed"
            elif round_obj.round_type == RoundType.SR:
                group["sr_result"] = round_obj.result
                group["sr_time"] = round_obj.scheduled_time.strftime("%H:%M")
                group["sr_total_bets"] = total_bet_amount
                group["sr_total_winners"] = total_bets  # Use bet count as winners for now
                group["sr_status"] = "completed"
            
            # Mark as complete if both FR and SR have results
            group["is_complete"] = (group["fr_result"] is not None and group["sr_result"] is not None)
        
        # Convert to list and sort by date (newest first)
        results_list = list(grouped_results.values())
        results_list.sort(key=lambda x: x["date"], reverse=True)
        
        return results_list[:limit]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting grouped results: {str(e)}"
        )

@router.get("/recent-results", response_model=List[RoundResponse])
async def get_recent_results(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get recent completed rounds with results"""
    round_service = RoundService(db)
    return round_service.get_results(None, limit)

@router.get("/today", response_model=List[RoundResponse])
async def get_todays_rounds(db: Session = Depends(get_db)):
    """Get today's rounds"""
    round_service = RoundService(db)
    return round_service.get_todays_rounds()

@router.get("/house/{house_id}", response_model=List[RoundResponse])
async def get_rounds_by_house(
    house_id: int,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get rounds for a specific house"""
    round_service = RoundService(db)
    return round_service.get_rounds(house_id, None, limit)

@router.get("/", response_model=List[RoundResponse])
async def get_rounds(
    house_id: Optional[int] = Query(None),
    status: Optional[RoundStatus] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get rounds with optional filtering"""
    round_service = RoundService(db)
    return round_service.get_rounds(house_id, status, limit)

# Parameterized routes last to avoid conflicts
@router.get("/{round_id}", response_model=RoundResponse)
async def get_round(
    round_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific round by ID"""
    round_service = RoundService(db)
    
    round_info = round_service.get_round(round_id)
    if not round_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    
    return round_info

@router.get("/{round_id}/details", response_model=RoundWithBets)
async def get_round_details(
    round_id: int,
    db: Session = Depends(get_db)
):
    """Get round details with betting statistics"""
    round_service = RoundService(db)
    
    round_details = round_service.get_round_with_bets(round_id)
    if not round_details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    
    return round_details

@router.get("/{round_id}/results", response_model=RoundResponse)
async def get_round_results(
    round_id: int,
    db: Session = Depends(get_db)
):
    """Get results for a specific round"""
    round_service = RoundService(db)
    round_info = round_service.get_round(round_id)
    if not round_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    
    if round_info.status != RoundStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Round results not yet available"
        )
    
    return round_info

@router.get("/forecast/{house_id}")
async def get_forecast_rounds(
    house_id: int,
    target_date: Optional[date] = Query(None, description="Date to check (default: today)"),
    db: Session = Depends(get_db)
):
    """Get FR and SR rounds for forecast betting"""
    try:
        # Verify house exists and is active
        house = db.query(House).filter(House.id == house_id, House.is_active == True).first()
        if not house:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="House not found or not active"
            )
        
        scheduler = TeerSchedulerService(db)
        results = scheduler.get_forecast_rounds(house_id, target_date)
        
        # Add house information
        results['house'] = {
            'id': house.id,
            'name': house.name,
            'location': house.location
        }
        
        return results
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting forecast rounds: {str(e)}"
        )

@router.get("/today")
async def get_todays_rounds(db: Session = Depends(get_db)):
    """Get today's rounds for all houses"""
    try:
        round_service = RoundService(db)
        todays_rounds = round_service.get_todays_rounds()
        
        # Group by house for better organization
        grouped_rounds = {}
        for round_obj in todays_rounds:
            house_name = round_obj.house_name
            if house_name not in grouped_rounds:
                grouped_rounds[house_name] = {
                    "house_id": round_obj.house_id,
                    "house_name": house_name,
                    "rounds": []
                }
            grouped_rounds[house_name]["rounds"].append(round_obj)
        
        return {
            "date": date.today(),
            "houses": list(grouped_rounds.values())
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting today's rounds: {str(e)}"
        )
    return round_info