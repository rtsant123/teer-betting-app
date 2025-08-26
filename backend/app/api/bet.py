from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.bet import BetCreate, BetResponse, BetSummaryResponse, TicketCreate, TicketResponse, BetValidationResponse, ForecastBet
from app.schemas.round import RoundResponse
from app.schemas.admin import HouseResponse, GameSettingsResponse
from app.services.bet_service import EnhancedBetService
from app.models import User, Round
from app.models.bet import BetStatus, BetType, Bet
from app.models.round import RoundType, RoundStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus

router = APIRouter()

@router.post("/ticket", response_model=TicketResponse)
async def place_bet_ticket(
    ticket_data: TicketCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Place a complete betting ticket with multiple bet types"""
    # Debug: Print the received data
    print(f"DEBUG: Received ticket data: {ticket_data}")
    print(f"DEBUG: User ID: {current_user.id}")
    
    bet_service = EnhancedBetService(db)
    
    ticket_response, message = bet_service.place_bet_ticket(current_user.id, ticket_data)
    
    if not ticket_response:
        print(f"DEBUG: Bet service failed with message: {message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    return ticket_response


@router.post("/forecast")
async def place_forecast_bet(
    forecast_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Place a forecast bet with FR and SR numbers"""
    from app.services.bet_service import EnhancedBetService
    from app.models.round import Round, RoundStatus
    from datetime import datetime, timezone
    
    try:
        bet_service = EnhancedBetService(db)
        
        # Extract forecast bet data
        fr_round_id = forecast_data.get('fr_round_id')
        sr_round_id = forecast_data.get('sr_round_id')
        fr_number = forecast_data.get('fr_number')
        sr_number = forecast_data.get('sr_number')
        amount = forecast_data.get('amount')
        
        if not all([fr_round_id, sr_round_id, fr_number is not None, sr_number is not None, amount]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required forecast bet data"
            )
        
        # Validate rounds exist and are still accepting bets
        fr_round = db.query(Round).filter(Round.id == fr_round_id).first()
        sr_round = db.query(Round).filter(Round.id == sr_round_id).first()
        
        if not fr_round or not sr_round:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid round IDs"
            )
        
        now = datetime.now(timezone.utc)
        
        # Check if FR round is still accepting bets (most critical for forecast)
        if fr_round.status != RoundStatus.SCHEDULED or now >= fr_round.betting_closes_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="FR round betting has closed. Forecast betting is no longer available."
            )
        
        # Check if SR round is still accepting bets
        if sr_round.status != RoundStatus.SCHEDULED or now >= sr_round.betting_closes_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SR round betting has closed. Forecast betting is no longer available."
            )
        
        # Ensure both rounds are from the same house
        if fr_round.house_id != sr_round.house_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="FR and SR rounds must be from the same house"
            )
        
        # Validate numbers are in range
        if not (0 <= fr_number <= 99) or not (0 <= sr_number <= 99):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Numbers must be between 00 and 99"
            )
        
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bet amount must be greater than 0"
            )
        
        # Check user balance
        if current_user.wallet_balance < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )
        
        # Create forecast combination string
        forecast_combination = f"{fr_number:02d}-{sr_number:02d}"
        
        # Create ticket data for forecast bet
        ticket_data = TicketCreate(
            house_id=None,  # Will be determined from rounds
            direct_numbers={},
            house_numbers={},
            ending_numbers={},
            forecast_amount=amount,
            forecast_combinations=[forecast_combination],
            fr_round_id=fr_round_id,
            sr_round_id=sr_round_id
        )
        
        ticket_response, message = bet_service.place_bet_ticket(current_user.id, ticket_data)
        
        if not ticket_response:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return {
            "success": True,
            "message": f"Forecast bet placed successfully: {forecast_combination}",
            "ticket": ticket_response,
            "bet_details": {
                "fr_number": fr_number,
                "sr_number": sr_number,
                "amount": amount,
                "combination": forecast_combination
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error placing forecast bet: {str(e)}"
        )

@router.post("/forecast-new")
async def place_new_forecast_bet(
    forecast_bet: ForecastBet,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Place a forecast bet with new logic"""
    try:
        from app.models import House, Round
        from app.models.round import RoundStatus, RoundType
        import uuid
        from datetime import datetime
        
        # Validate house
        house = db.query(House).filter(House.id == forecast_bet.house_id).first()
        if not house or not house.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="House not found or inactive"
            )
        
        # Get FR and SR rounds
        now = datetime.utcnow()
        fr_round = db.query(Round).filter(
            Round.house_id == forecast_bet.house_id,
            Round.round_type == RoundType.FR,
            Round.status == RoundStatus.SCHEDULED,
            Round.betting_closes_at > now
        ).first()
        
        sr_round = db.query(Round).filter(
            Round.house_id == forecast_bet.house_id,
            Round.round_type == RoundType.SR,
            Round.status == RoundStatus.SCHEDULED,
            Round.betting_closes_at > now
        ).first()
        
        if not fr_round or not sr_round:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both FR and SR rounds required for forecast betting"
            )
        
        # Check user balance
        if current_user.wallet_balance < forecast_bet.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient wallet balance"
            )
        
        # Calculate payout based on forecast type
        if forecast_bet.forecast_type == "direct":
            payout_rate = house.forecast_direct_payout_rate
        elif forecast_bet.forecast_type == "house":
            payout_rate = house.forecast_house_payout_rate
        elif forecast_bet.forecast_type == "ending":
            payout_rate = house.forecast_ending_payout_rate
        else:
            # Fallback to general forecast rate
            payout_rate = house.forecast_payout_rate
            
        potential_payout = forecast_bet.amount * payout_rate
        
        # Create forecast combination string
        forecast_combination = f"{forecast_bet.forecast_type}:{forecast_bet.fr_number}-{forecast_bet.sr_number}"
        
        # Create bet record
        bet = Bet(
            user_id=current_user.id,
            round_id=None,  # No single round for forecast
            bet_type=BetType.FORECAST,
            bet_value=forecast_combination,
            bet_amount=forecast_bet.amount,
            status=BetStatus.PENDING,
            potential_payout=potential_payout,
            ticket_id=str(uuid.uuid4())[:8],
            forecast_combinations=forecast_combination,
            fr_round_id=fr_round.id,
            sr_round_id=sr_round.id,
            house_name=house.name
        )
        
        db.add(bet)
        
        # Update user balance
        current_user.wallet_balance -= forecast_bet.amount
        
        # Create transaction record
        transaction = Transaction(
            user_id=current_user.id,
            amount=forecast_bet.amount,
            transaction_type=TransactionType.BET_PLACED,
            status=TransactionStatus.COMPLETED,
            description=f"Forecast {forecast_bet.forecast_type} bet: {forecast_bet.fr_number}-{forecast_bet.sr_number} on {house.name}"
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(bet)
        
        return {
            "success": True,
            "message": "Forecast bet placed successfully",
            "bet_id": bet.id,
            "ticket_id": bet.ticket_id,
            "forecast_type": forecast_bet.forecast_type,
            "fr_number": forecast_bet.fr_number,
            "sr_number": forecast_bet.sr_number,
            "amount": forecast_bet.amount,
            "potential_payout": potential_payout,
            "house": house.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error placing forecast bet: {str(e)}"
        )

@router.get("/validate-ticket")
async def validate_bet_ticket(
    house_id: int,
    # FR bets
    fr_direct_amount: Optional[float] = Query(0),
    fr_house_amount: Optional[float] = Query(0),
    fr_ending_amount: Optional[float] = Query(0),
    # SR bets
    sr_direct_amount: Optional[float] = Query(0),
    sr_house_amount: Optional[float] = Query(0),
    sr_ending_amount: Optional[float] = Query(0),
    # Forecast
    forecast_amount: Optional[float] = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate ticket before placement"""
    bet_service = EnhancedBetService(db)
    
    total_amount = (fr_direct_amount + fr_house_amount + fr_ending_amount +
                   sr_direct_amount + sr_house_amount + sr_ending_amount +
                   forecast_amount)
    
    daily_spent = bet_service.get_daily_bet_amount(current_user.id, house_id)
    
    return BetValidationResponse(
        can_place_bet=current_user.wallet_balance >= total_amount,
        message="Validation successful" if current_user.wallet_balance >= total_amount else "Insufficient balance",
        current_balance=current_user.wallet_balance,
        daily_spent=daily_spent,
        remaining_limit=max(0, 50000 - daily_spent)  # Default daily limit
    )

@router.get("/my-tickets", response_model=List[TicketResponse])
async def get_my_tickets(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's recent betting tickets"""
    bet_service = EnhancedBetService(db)
    return bet_service.get_user_tickets(current_user.id, limit)

@router.get("/summary", response_model=BetSummaryResponse)
async def get_bet_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's betting summary"""
    bet_service = EnhancedBetService(db)
    return bet_service.get_bet_summary(current_user.id)

@router.get("/houses-with-rounds")
async def get_houses_with_active_rounds(db: Session = Depends(get_db)):
    """Get all active houses with structured game modes (FR, SR, Forecast) - automatically includes next available rounds"""
    from app.models import House, Round
    from app.models.round import RoundStatus, RoundType
    from datetime import datetime, timezone, date, timedelta
    
    now = datetime.now(timezone.utc)
    today = now.date()
    tomorrow = today + timedelta(days=1)
    
    # Get all active houses
    houses = db.query(House).filter(House.is_active == True).all()
    
    result = []
    for house in houses:
        # First try to get today's active rounds for this house
        rounds = db.query(Round).filter(
            Round.house_id == house.id,
            Round.status == RoundStatus.SCHEDULED,
            Round.betting_closes_at > now,
            # Filter for today's rounds only
            Round.scheduled_time >= datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc),
            Round.scheduled_time < datetime.combine(today + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc)
        ).all()
        
        # If no rounds available for today, check if we should auto-open tomorrow's rounds
        if not rounds:
            # Check if today's rounds exist and are completed (both deadline passed and results published)
            today_rounds = db.query(Round).filter(
                Round.house_id == house.id,
                Round.scheduled_time >= datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc),
                Round.scheduled_time < datetime.combine(today + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc)
            ).all()
            
            # Auto-open tomorrow's rounds only if:
            # 1. Today's rounds exist AND all have passed their deadlines AND all have results published
            # 2. OR if no rounds exist for today (first time setup)
            should_open_tomorrow = False
            
            if today_rounds:
                # Check if ALL today's rounds have closed AND have results
                all_closed_with_results = all(
                    round_obj.betting_closes_at <= now and round_obj.result is not None 
                    for round_obj in today_rounds
                )
                should_open_tomorrow = all_closed_with_results
            else:
                # No rounds for today, allow tomorrow's rounds
                should_open_tomorrow = True
            
            if should_open_tomorrow:
                # Get tomorrow's rounds 
                rounds = db.query(Round).filter(
                    Round.house_id == house.id,
                    Round.status == RoundStatus.SCHEDULED,
                    Round.scheduled_time >= datetime.combine(tomorrow, datetime.min.time()).replace(tzinfo=timezone.utc),
                    Round.scheduled_time < datetime.combine(tomorrow + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc)
                ).all()
                
                # If tomorrow's rounds don't exist, try to create them  
                if not rounds:
                    # Check if house runs on tomorrow's weekday
                    tomorrow_weekday = tomorrow.weekday()  # 0=Monday, 6=Sunday
                    house_runs_tomorrow = (
                        (tomorrow_weekday == 0 and house.runs_monday) or
                        (tomorrow_weekday == 1 and house.runs_tuesday) or
                        (tomorrow_weekday == 2 and house.runs_wednesday) or
                        (tomorrow_weekday == 3 and house.runs_thursday) or
                        (tomorrow_weekday == 4 and house.runs_friday) or
                        (tomorrow_weekday == 5 and house.runs_saturday) or
                        (tomorrow_weekday == 6 and house.runs_sunday)
                    )
                    
                    if house_runs_tomorrow:
                        # Auto-create tomorrow's rounds
                        try:
                            from app.services.round_service import RoundService
                            round_service = RoundService(db)
                            success, message = round_service.create_daily_rounds_for_house(house.id, tomorrow)
                            if success:
                                # Refetch the newly created rounds
                                rounds = db.query(Round).filter(
                                    Round.house_id == house.id,
                                    Round.status == RoundStatus.SCHEDULED,
                                    Round.scheduled_time >= datetime.combine(tomorrow, datetime.min.time()).replace(tzinfo=timezone.utc),
                                    Round.scheduled_time < datetime.combine(tomorrow + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc)
                                ).all()
                        except Exception as e:
                            print(f"Error auto-creating rounds for house {house.id}: {e}")
                            continue
        
        # If still no rounds, try the next available rounds within 7 days (fallback)
        if not rounds:
            rounds = db.query(Round).filter(
                Round.house_id == house.id,
                Round.status == RoundStatus.SCHEDULED,
                Round.scheduled_time > now,
                Round.scheduled_time <= now + timedelta(days=7)
            ).order_by(Round.scheduled_time).limit(3).all()  # Get FR, SR, and potentially FORECAST
        
        # Structure rounds by type
        house_rounds = {}
        fr_round = None
        sr_round = None
        
        for round_obj in rounds:
            house_rounds[round_obj.round_type.value] = {
                "id": round_obj.id,
                "round_type": round_obj.round_type.value,
                "scheduled_time": round_obj.scheduled_time.isoformat(),
                "betting_closes_at": round_obj.betting_closes_at.isoformat(),
                "status": round_obj.status.value,
                "house_id": round_obj.house_id
            }
            
            if round_obj.round_type == RoundType.FR:
                fr_round = round_obj
            elif round_obj.round_type == RoundType.SR:
                sr_round = round_obj
        
        # If we have FR and SR rounds but no FORECAST round, check if there's an existing FORECAST round
        if fr_round and sr_round and "FORECAST" not in house_rounds:
            # Check for existing FORECAST round for the same date
            forecast_round = db.query(Round).filter(
                Round.house_id == house.id,
                Round.round_type == RoundType.FORECAST,
                Round.status == RoundStatus.SCHEDULED,
                Round.scheduled_time >= datetime.combine(fr_round.scheduled_time.date(), datetime.min.time()).replace(tzinfo=timezone.utc),
                Round.scheduled_time < datetime.combine(fr_round.scheduled_time.date() + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc)
            ).first()
            
            if forecast_round and forecast_round.betting_closes_at > now:
                # Add existing FORECAST round to house_rounds
                house_rounds["FORECAST"] = {
                    "id": forecast_round.id,
                    "round_type": "FORECAST",
                    "scheduled_time": forecast_round.scheduled_time.isoformat(),
                    "betting_closes_at": forecast_round.betting_closes_at.isoformat(),
                    "status": forecast_round.status.value,
                    "house_id": forecast_round.house_id
                }
        
        # Create new FORECAST round if needed (when both FR and SR exist, FR is still open, and no existing FORECAST)
        if (fr_round and sr_round and "FORECAST" not in house_rounds and 
            fr_round.betting_closes_at > now):  # Only create if FR betting is still open
            # Create forecast round that closes with FR (earliest closing time)
            new_forecast_round = Round(
                house_id=house.id,
                round_type=RoundType.FORECAST,
                scheduled_time=sr_round.scheduled_time,  # Results announced with SR
                betting_closes_at=fr_round.betting_closes_at,  # Closes with FR (dependency)
                status=RoundStatus.SCHEDULED
            )
            db.add(new_forecast_round)
            db.commit()
            
            # Add to house_rounds
            house_rounds["FORECAST"] = {
                "id": new_forecast_round.id,
                "round_type": "FORECAST",
                "scheduled_time": new_forecast_round.scheduled_time.isoformat(),
                "betting_closes_at": new_forecast_round.betting_closes_at.isoformat(),
                "status": new_forecast_round.status.value,
                "house_id": new_forecast_round.house_id
            }
        
        # Check actual availability based on current time and betting deadlines
        fr_available = "FR" in house_rounds and house_rounds["FR"]["betting_closes_at"] > now.isoformat()
        sr_available = "SR" in house_rounds and house_rounds["SR"]["betting_closes_at"] > now.isoformat()
        # FORECAST is available only when FR is available (closes when FR closes)
        forecast_available = ("FORECAST" in house_rounds and 
                            fr_available and sr_available and 
                            house_rounds["FORECAST"]["betting_closes_at"] > now.isoformat())

        # Create house structure with all game types and modes
        house_data = {
            "house": {
                "id": house.id,
                "name": house.name,
                "location": house.location,
                "is_active": house.is_active,
                "fr_direct_payout_rate": float(house.fr_direct_payout_rate),
                "fr_house_payout_rate": float(house.fr_house_payout_rate),
                "fr_ending_payout_rate": float(house.fr_ending_payout_rate),
                "sr_direct_payout_rate": float(house.sr_direct_payout_rate),
                "sr_house_payout_rate": float(house.sr_house_payout_rate),
                "sr_ending_payout_rate": float(house.sr_ending_payout_rate),
                "forecast_payout_rate": float(house.forecast_payout_rate),
                "forecast_direct_payout_rate": float(house.forecast_direct_payout_rate),
                "forecast_house_payout_rate": float(house.forecast_house_payout_rate),
                "forecast_ending_payout_rate": float(house.forecast_ending_payout_rate)
            },
            "rounds": house_rounds,
            "game_types": {
                "FR": {
                    "name": "First Round",
                    "available": fr_available,
                    "round_id": house_rounds.get("FR", {}).get("id"),
                    "deadline": house_rounds.get("FR", {}).get("betting_closes_at"),
                    "scheduled_time": house_rounds.get("FR", {}).get("scheduled_time"),
                    "modes": [
                        {
                            "name": "Direct",
                            "type": "direct",
                            "description": "Select 2-digit number (00-99)",
                            "number_range": "00-99",
                            "payout_rate": float(house.fr_direct_payout_rate)
                        },
                        {
                            "name": "House",
                            "type": "house", 
                            "description": "Select house digit (0-9)",
                            "number_range": "0-9",
                            "payout_rate": float(house.fr_house_payout_rate)
                        },
                        {
                            "name": "Ending",
                            "type": "ending",
                            "description": "Select ending digit (0-9)", 
                            "number_range": "0-9",
                            "payout_rate": float(house.fr_ending_payout_rate)
                        }
                    ]
                },
                "SR": {
                    "name": "Second Round",
                    "available": sr_available,
                    "round_id": house_rounds.get("SR", {}).get("id"),
                    "deadline": house_rounds.get("SR", {}).get("betting_closes_at"),
                    "scheduled_time": house_rounds.get("SR", {}).get("scheduled_time"),
                    "modes": [
                        {
                            "name": "Direct",
                            "type": "direct",
                            "description": "Select 2-digit number (00-99)",
                            "number_range": "00-99",
                            "payout_rate": float(house.sr_direct_payout_rate)
                        },
                        {
                            "name": "House",
                            "type": "house",
                            "description": "Select house digit (0-9)",
                            "number_range": "0-9", 
                            "payout_rate": float(house.sr_house_payout_rate)
                        },
                        {
                            "name": "Ending",
                            "type": "ending",
                            "description": "Select ending digit (0-9)",
                            "number_range": "0-9",
                            "payout_rate": float(house.sr_ending_payout_rate)
                        }
                    ]
                },
                "FORECAST": {
                    "name": "Forecast",
                    "available": forecast_available,
                    "forecast_round_id": house_rounds.get("FORECAST", {}).get("id"),
                    "fr_round_id": house_rounds.get("FR", {}).get("id"),
                    "sr_round_id": house_rounds.get("SR", {}).get("id"),
                    "deadline": house_rounds.get("FORECAST", {}).get("betting_closes_at"),
                    "scheduled_time": house_rounds.get("FORECAST", {}).get("scheduled_time"),
                    "modes": [
                        {
                            "name": "Direct",
                            "type": "direct",
                            "description": "Select FR number (00-99) & SR number (00-99)",
                            "fr_range": "00-99",
                            "sr_range": "00-99",
                            "payout_rate": float(house.forecast_direct_payout_rate)
                        },
                        {
                            "name": "House", 
                            "type": "house",
                            "description": "Select FR house digit (0-9) & SR house digit (0-9)",
                            "fr_range": "0-9",
                            "sr_range": "0-9",
                            "payout_rate": float(house.forecast_house_payout_rate)
                        },
                        {
                            "name": "Ending",
                            "type": "ending", 
                            "description": "Select FR ending digit (0-9) & SR ending digit (0-9)",
                            "fr_range": "0-9",
                            "sr_range": "0-9",
                            "payout_rate": float(house.forecast_ending_payout_rate)
                        }
                    ]
                }
            }
        }
        
        result.append(house_data)
    
    return result

@router.get("/house/{house_id}/rounds")
async def get_house_rounds(
    house_id: int,
    db: Session = Depends(get_db)
):
    """Get active rounds for a specific house"""
    bet_service = EnhancedBetService(db)
    rounds = bet_service.get_active_rounds_by_house(house_id)
    
    if not rounds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active rounds found for this house"
        )
    
    return rounds

@router.get("/ticket/{ticket_id}", response_model=TicketResponse)
async def get_ticket_details(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific ticket details"""
    from app.models import BetTicket, House, Bet
    
    ticket = db.query(BetTicket).filter(
        BetTicket.ticket_id == ticket_id,
        BetTicket.user_id == current_user.id
    ).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    house = db.query(House).filter(House.id == ticket.house_id).first()
    bets = db.query(Bet).filter(Bet.ticket_id == ticket_id).all()
    
    return TicketResponse(
        ticket_id=ticket.ticket_id,
        user_id=ticket.user_id,
        house_id=ticket.house_id,
        house_name=house.name if house else "Unknown",
        total_amount=ticket.total_amount,
        total_potential_payout=ticket.total_potential_payout,
        status=ticket.status,
        bets_summary=ticket.bets_summary,
        bets=[BetResponse.from_orm(bet) for bet in bets],
        created_at=ticket.created_at
    )

# Legacy bet placement (single bet) - for backward compatibility
@router.post("/place", response_model=BetResponse)
async def place_single_bet(
    bet_data: BetCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Place a single bet (legacy endpoint)"""
    # This could convert single bet to ticket format
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Please use /ticket endpoint for placing bets"
    )

# Additional endpoints that frontend expects
@router.get("/houses", response_model=List[HouseResponse])
async def get_all_houses(db: Session = Depends(get_db)):
    """Get all houses"""
    from app.models import House
    houses = db.query(House).all()
    return [HouseResponse(
        id=house.id,
        name=house.name,
        location=house.location,
        is_active=house.is_active,
        fr_time=str(house.fr_time) if house.fr_time else "15:45:00",
        sr_time=str(house.sr_time) if house.sr_time else "16:45:00",
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

@router.get("/active-rounds", response_model=List[RoundResponse])
async def get_all_active_rounds(db: Session = Depends(get_db)):
    """Get all active rounds across all houses"""
    bet_service = EnhancedBetService(db)
    return bet_service.get_all_active_rounds()

@router.get("/my-bets", response_model=List[TicketResponse])
async def get_my_bets(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's recent bets (alias for my-tickets)"""
    bet_service = EnhancedBetService(db)
    return bet_service.get_user_tickets(current_user.id, limit)

# Note: get_current_user dependency is defined in main.py

@router.get("/houses-with-structured-rounds")
async def get_houses_with_structured_rounds(db: Session = Depends(get_db)):
    """Get houses with their active rounds structured for frontend"""
    from app.models import House, Round
    from app.models.round import RoundStatus
    from datetime import datetime, timezone, date, timedelta
    
    now = datetime.now(timezone.utc)
    today = now.date()
    
    # Get all active houses
    houses = db.query(House).filter(House.is_active == True).all()
    
    result = []
    for house in houses:
        # Get today's active rounds for this house that are still accepting bets
        rounds = db.query(Round).filter(
            Round.house_id == house.id,
            Round.status == RoundStatus.SCHEDULED,
            Round.betting_closes_at > now,
            # Filter for today's rounds only
            Round.scheduled_time >= datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc),
            Round.scheduled_time < datetime.combine(today + timedelta(days=1), datetime.min.time()).replace(tzinfo=timezone.utc)
        ).all()
        
        # Structure rounds by type
        house_rounds = {}
        for round_obj in rounds:
            house_rounds[round_obj.round_type.value] = {
                "id": round_obj.id,
                "round_type": round_obj.round_type.value,
                "scheduled_time": round_obj.scheduled_time.isoformat(),
                "betting_closes_at": round_obj.betting_closes_at.isoformat(),
                "status": round_obj.status.value
            }
        
        # Only include houses that have active rounds for today
        if house_rounds:
            result.append({
                "house": {
                    "id": house.id,
                    "name": house.name,
                    "location": house.location,
                    "is_active": house.is_active,
                    "fr_direct_payout_rate": house.fr_direct_payout_rate,
                    "fr_house_payout_rate": house.fr_house_payout_rate,
                    "fr_ending_payout_rate": house.fr_ending_payout_rate,
                    "sr_direct_payout_rate": house.sr_direct_payout_rate,
                    "sr_house_payout_rate": house.sr_house_payout_rate,
                    "sr_ending_payout_rate": house.sr_ending_payout_rate,
                    "forecast_payout_rate": house.forecast_payout_rate
                },
                "rounds": house_rounds
            })
    
    return result

@router.get("/summary", response_model=BetSummaryResponse)
async def get_bet_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get betting summary for current user"""
    bet_service = EnhancedBetService(db)
    return bet_service.get_user_betting_summary(current_user.id)

@router.get("/validate-bet")
async def validate_single_bet(
    round_id: int,
    bet_amount: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate a single bet before placing"""
    bet_service = EnhancedBetService(db)
    
    # Check user balance
    if current_user.wallet_balance < bet_amount:
        return BetValidationResponse(
            is_valid=False,
            message="Insufficient wallet balance",
            required_amount=bet_amount,
            current_balance=float(current_user.wallet_balance)
        )
    
    # Check round exists and is active
    from app.models import Round
    from app.models.round import RoundStatus
    
    round_obj = db.query(Round).filter(Round.id == round_id).first()
    if not round_obj:
        return BetValidationResponse(
            is_valid=False,
            message="Round not found"
        )
    
    if round_obj.status != RoundStatus.SCHEDULED:
        return BetValidationResponse(
            is_valid=False,
            message="Round is not available for betting"
        )
    
    return BetValidationResponse(
        is_valid=True,
        message="Bet is valid",
        required_amount=bet_amount,
        current_balance=float(current_user.wallet_balance)
    )

@router.get("/payout-rates")
async def get_payout_rates(db: Session = Depends(get_db)):
    """Get payout rates for all bet types"""
    from app.models import House
    
    houses = db.query(House).filter(House.is_active == True).all()
    
    return {
        "houses": [
            {
                "id": house.id,
                "name": house.name,
                "payout_rates": {
                    "fr_direct": float(house.fr_direct_payout_rate),
                    "fr_house": float(house.fr_house_payout_rate),
                    "fr_ending": float(house.fr_ending_payout_rate),
                    "sr_direct": float(house.sr_direct_payout_rate),
                    "sr_house": float(house.sr_house_payout_rate),
                    "sr_ending": float(house.sr_ending_payout_rate),
                    "forecast": float(house.forecast_payout_rate)
                }
            }
            for house in houses
        ]
    }

@router.get("/forecast-options")
async def get_forecast_options(db: Session = Depends(get_db)):
    """Get houses with both FR and SR available for forecast betting"""
    from app.models import House, Round
    from app.models.round import RoundStatus, RoundType
    from sqlalchemy import and_, func
    from datetime import datetime
    
    # Get all active houses
    houses = db.query(House).filter(House.is_active == True).all()
    
    # Check each house for FR and SR rounds
    forecast_houses = []
    for house in houses:
        # Check for FR rounds
        fr_rounds = db.query(Round).filter(
            and_(
                Round.house_id == house.id,
                Round.status == RoundStatus.SCHEDULED,
                Round.round_type == RoundType.FR,
                Round.betting_closes_at > datetime.utcnow()
            )
        ).count()
        
        # Check for SR rounds
        sr_rounds = db.query(Round).filter(
            and_(
                Round.house_id == house.id,
                Round.status == RoundStatus.SCHEDULED,
                Round.round_type == RoundType.SR,
                Round.betting_closes_at > datetime.utcnow()
            )
        ).count()
        
        # Include house if it has both FR and SR rounds
        if fr_rounds > 0 and sr_rounds > 0:
            forecast_houses.append(house)
    
    return [HouseResponse(
        id=house.id,
        name=house.name,
        location=house.location,
        is_active=house.is_active,
        fr_time=str(house.fr_time) if house.fr_time else "15:45:00",
        sr_time=str(house.sr_time) if house.sr_time else "16:45:00",
        fr_direct_payout_rate=house.fr_direct_payout_rate,
        fr_house_payout_rate=house.fr_house_payout_rate,
        fr_ending_payout_rate=house.fr_ending_payout_rate,
        sr_direct_payout_rate=house.sr_direct_payout_rate,
        sr_house_payout_rate=house.sr_house_payout_rate,
        sr_ending_payout_rate=house.sr_ending_payout_rate,
        forecast_payout_rate=house.forecast_payout_rate,
        created_at=house.created_at,
        updated_at=house.updated_at
    ) for house in forecast_houses]

# Legacy endpoint for compatibility
@router.post("/place")
async def place_single_bet(
    bet_data: BetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Place a single bet (converts to ticket format internally)"""
    bet_service = EnhancedBetService(db)
    
    # Convert single bet to ticket format
    ticket_data = TicketCreate(
        house_id=bet_data.round.house_id if hasattr(bet_data, 'round') else 1,  # This needs proper handling
        fr_direct_amount=bet_data.bet_amount if bet_data.bet_type.value.startswith('FR_') else 0,
        sr_direct_amount=bet_data.bet_amount if bet_data.bet_type.value.startswith('SR_') else 0,
        forecast_amount=bet_data.bet_amount if bet_data.bet_type.value == 'FORECAST' else 0
    )
    
    ticket_response, message = bet_service.place_bet_ticket(current_user.id, ticket_data)
    
    if not ticket_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return ticket_response