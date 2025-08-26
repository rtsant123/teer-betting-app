from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from typing import List, Optional, Dict, Tuple
from datetime import datetime, date
import uuid

from app.models import Bet, Round, House, User, Transaction, BetTicket
from app.models.bet import BetType, BetStatus
from app.models.round import RoundStatus, RoundType
from app.models.transaction import TransactionType, TransactionStatus
from app.schemas.bet import BetCreate, BetResponse, BetSummaryResponse, TicketCreate, TicketResponse, BetValidationResponse
from app.schemas.round import RoundResponse
from app.schemas.admin import HouseResponse
from app.services.referral_service import ReferralService

class EnhancedBetService:
    def __init__(self, db: Session):
        self.db = db
    
    def validate_bet_ticket(self, user_id: int, ticket_data: TicketCreate) -> Tuple[bool, str, float]:
        """Validate complete betting ticket before placement"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "User not found", 0.0
        
        house = self.db.query(House).filter(House.id == ticket_data.house_id).first()
        if not house or not house.is_active:
            return False, "House not found or inactive", 0.0
        
        # Calculate total bet amount
        total_amount = 0.0
        
        # Get active rounds for this house
        now = datetime.utcnow()
        fr_round = self.db.query(Round).filter(
            and_(
                Round.house_id == ticket_data.house_id,
                Round.round_type == RoundType.FR,
                Round.status == RoundStatus.SCHEDULED,
                Round.betting_closes_at > now
            )
        ).order_by(Round.scheduled_time).first()
        
        sr_round = self.db.query(Round).filter(
            and_(
                Round.house_id == ticket_data.house_id,
                Round.round_type == RoundType.SR,
                Round.status == RoundStatus.SCHEDULED,
                Round.betting_closes_at > now
            )
        ).order_by(Round.scheduled_time).first()
        
        # Validate FR bets
        if ticket_data.fr_direct:
            if not fr_round:
                return False, "FR round not available for betting", 0.0
            fr_direct_amount = sum(ticket_data.fr_direct.values())
            total_amount += fr_direct_amount
        
        if ticket_data.fr_house:
            if not fr_round:
                return False, "FR round not available for betting", 0.0
            fr_house_amount = sum(ticket_data.fr_house.values())
            total_amount += fr_house_amount
        
        if ticket_data.fr_ending:
            if not fr_round:
                return False, "FR round not available for betting", 0.0
            fr_ending_amount = sum(ticket_data.fr_ending.values())
            total_amount += fr_ending_amount
        
        # Validate SR bets
        if ticket_data.sr_direct:
            if not sr_round:
                return False, "SR round not available for betting", 0.0
            sr_direct_amount = sum(ticket_data.sr_direct.values())
            total_amount += sr_direct_amount
        
        if ticket_data.sr_house:
            if not sr_round:
                return False, "SR round not available for betting", 0.0
            sr_house_amount = sum(ticket_data.sr_house.values())
            total_amount += sr_house_amount
        
        if ticket_data.sr_ending:
            if not sr_round:
                return False, "SR round not available for betting", 0.0
            sr_ending_amount = sum(ticket_data.sr_ending.values())
            total_amount += sr_ending_amount
        
        # Validate forecast bets
        if ticket_data.forecast_pairs:
            if not fr_round or not sr_round:
                return False, "Both FR and SR rounds required for forecast betting", 0.0
            forecast_amount = sum(pair.amount for pair in ticket_data.forecast_pairs)
            total_amount += forecast_amount
        
        # Check user balance
        if user.wallet_balance < total_amount:
            return False, "Insufficient wallet balance", total_amount
        
        # Check daily limit (using default)
        daily_limit = 50000.0  # Default daily limit
        daily_spent = self.get_daily_bet_amount(user_id, ticket_data.house_id)
        if daily_spent + total_amount > daily_limit:
            return False, f"Daily betting limit exceeded. Limit: {daily_limit}", total_amount
        
        return True, "Ticket validation successful", total_amount
    
    def place_bet_ticket(self, user_id: int, ticket_data: TicketCreate) -> Tuple[Optional[TicketResponse], str]:
        """Place a complete betting ticket with multiple bet types"""
        try:
            # Validate ticket
            is_valid, message, total_amount = self.validate_bet_ticket(user_id, ticket_data)
            if not is_valid:
                return None, message
            
            # Generate unique ticket ID
            ticket_id = f"TKT{datetime.now().strftime('%Y%m%d')}{str(uuid.uuid4())[:8].upper()}"
            
            # Get rounds
            now = datetime.utcnow()
            fr_round = self.db.query(Round).filter(
                and_(
                    Round.house_id == ticket_data.house_id,
                    Round.round_type == RoundType.FR,
                    Round.status == RoundStatus.SCHEDULED,
                    Round.betting_closes_at > now
                )
            ).order_by(Round.scheduled_time).first()
            
            sr_round = self.db.query(Round).filter(
                and_(
                    Round.house_id == ticket_data.house_id,
                    Round.round_type == RoundType.SR,
                    Round.status == RoundStatus.SCHEDULED,
                    Round.betting_closes_at > now
                )
            ).order_by(Round.scheduled_time).first()
            
            house = self.db.query(House).filter(House.id == ticket_data.house_id).first()
            user = self.db.query(User).filter(User.id == user_id).first()
            
            bets = []
            max_possible_payout = 0.0  # Track the maximum possible win from any single outcome
            bets_summary = {
                "fr_bets": {},
                "sr_bets": {},
                "forecast_bets": []
            }
            
            # Create FR bets
            if fr_round:
                if ticket_data.fr_direct:
                    bet, payout = self.create_single_bet(
                        user_id, fr_round.id, BetType.DIRECT, 
                        ticket_data.fr_direct, ticket_id, house
                    )
                    bets.append(bet)
                    # Find maximum single number payout for FR direct
                    max_single_amount = max(ticket_data.fr_direct.values()) if ticket_data.fr_direct else 0
                    max_single_payout = max_single_amount * house.fr_direct_payout_rate
                    max_possible_payout = max(max_possible_payout, max_single_payout)
                    bets_summary["fr_bets"]["direct"] = ticket_data.fr_direct
                
                if ticket_data.fr_house:
                    bet, payout = self.create_single_bet(
                        user_id, fr_round.id, BetType.HOUSE,
                        ticket_data.fr_house, ticket_id, house
                    )
                    bets.append(bet)
                    # Find maximum single number payout for FR house
                    max_single_amount = max(ticket_data.fr_house.values()) if ticket_data.fr_house else 0
                    max_single_payout = max_single_amount * house.fr_house_payout_rate
                    max_possible_payout = max(max_possible_payout, max_single_payout)
                    bets_summary["fr_bets"]["house"] = ticket_data.fr_house
                
                if ticket_data.fr_ending:
                    bet, payout = self.create_single_bet(
                        user_id, fr_round.id, BetType.ENDING,
                        ticket_data.fr_ending, ticket_id, house
                    )
                    bets.append(bet)
                    # Find maximum single number payout for FR ending
                    max_single_amount = max(ticket_data.fr_ending.values()) if ticket_data.fr_ending else 0
                    max_single_payout = max_single_amount * house.fr_ending_payout_rate
                    max_possible_payout = max(max_possible_payout, max_single_payout)
                    bets_summary["fr_bets"]["ending"] = ticket_data.fr_ending
            
            # Create SR bets
            if sr_round:
                if ticket_data.sr_direct:
                    bet, payout = self.create_single_bet(
                        user_id, sr_round.id, BetType.DIRECT,
                        ticket_data.sr_direct, ticket_id, house
                    )
                    bets.append(bet)
                    # Find maximum single number payout for SR direct
                    max_single_amount = max(ticket_data.sr_direct.values()) if ticket_data.sr_direct else 0
                    max_single_payout = max_single_amount * house.sr_direct_payout_rate
                    max_possible_payout = max(max_possible_payout, max_single_payout)
                    bets_summary["sr_bets"]["direct"] = ticket_data.sr_direct
                
                if ticket_data.sr_house:
                    bet, payout = self.create_single_bet(
                        user_id, sr_round.id, BetType.HOUSE,
                        ticket_data.sr_house, ticket_id, house
                    )
                    bets.append(bet)
                    # Find maximum single number payout for SR house
                    max_single_amount = max(ticket_data.sr_house.values()) if ticket_data.sr_house else 0
                    max_single_payout = max_single_amount * house.sr_house_payout_rate
                    max_possible_payout = max(max_possible_payout, max_single_payout)
                    bets_summary["sr_bets"]["house"] = ticket_data.sr_house
                
                if ticket_data.sr_ending:
                    bet, payout = self.create_single_bet(
                        user_id, sr_round.id, BetType.ENDING,
                        ticket_data.sr_ending, ticket_id, house
                    )
                    bets.append(bet)
                    # Find maximum single number payout for SR ending
                    max_single_amount = max(ticket_data.sr_ending.values()) if ticket_data.sr_ending else 0
                    max_single_payout = max_single_amount * house.sr_ending_payout_rate
                    max_possible_payout = max(max_possible_payout, max_single_payout)
                    bets_summary["sr_bets"]["ending"] = ticket_data.sr_ending
            
            # Create forecast bets
            if ticket_data.forecast_pairs and fr_round and sr_round:
                forecast_data = [{"fr": p.fr_number, "sr": p.sr_number, "amount": p.amount} 
                               for p in ticket_data.forecast_pairs]
                
                # Get forecast rate from house based on forecast type
                if ticket_data.forecast_type == "direct":
                    forecast_rate = house.forecast_direct_payout_rate
                elif ticket_data.forecast_type == "house":
                    forecast_rate = house.forecast_house_payout_rate
                elif ticket_data.forecast_type == "ending":
                    forecast_rate = house.forecast_ending_payout_rate
                else:
                    forecast_rate = house.forecast_payout_rate  # fallback
                
                total_forecast_amount = sum(p.amount for p in ticket_data.forecast_pairs)
                
                # For forecast, only one pair can win, so max possible is the highest single bet * rate
                max_forecast_amount = max(p.amount for p in ticket_data.forecast_pairs) if ticket_data.forecast_pairs else 0
                max_forecast_payout = max_forecast_amount * forecast_rate
                max_possible_payout = max(max_possible_payout, max_forecast_payout)
                
                forecast_bet = Bet(
                    user_id=user_id,
                    round_id=fr_round.id,  # Use FR round as primary
                    bet_type=BetType.FORECAST,
                    bet_value=f"FR{fr_round.id}SR{sr_round.id}",  # Store as string identifier
                    bet_amount=total_forecast_amount,
                    potential_payout=max_forecast_payout,  # Store only max possible, not total
                    ticket_id=ticket_id,
                    forecast_combinations=str(forecast_data),  # Store as string
                    fr_round_id=fr_round.id,  # Set FR round ID
                    sr_round_id=sr_round.id   # Set SR round ID
                )
                
                bets.append(forecast_bet)
                # Don't add to total_potential_payout since max_possible_payout already includes it
                bets_summary["forecast_bets"] = forecast_data
            
            # Create ticket record - Use max_possible_payout for realistic expectations
            # Only create ticket if we have actual bets and non-zero amounts
            if total_amount <= 0 or not bets:
                return None, "Cannot create ticket with zero amounts or no bets"
            
            # Ensure max_possible_payout is calculated correctly
            if max_possible_payout <= 0:
                # Recalculate if needed
                max_possible_payout = total_amount * 70  # Use default FR direct rate as fallback
            
            ticket = BetTicket(
                ticket_id=ticket_id,
                user_id=user_id,
                house_id=ticket_data.house_id,
                total_amount=total_amount,
                total_potential_payout=max_possible_payout,  # Store realistic maximum possible win
                bets_summary=bets_summary
            )
            
            # Deduct from wallet
            user.wallet_balance -= total_amount
            
            # Create transaction record
            transaction = Transaction(
                user_id=user_id,
                transaction_type=TransactionType.BET_PLACED,
                amount=total_amount,
                status=TransactionStatus.COMPLETED,
                balance_before=user.wallet_balance + total_amount,
                balance_after=user.wallet_balance,
                description=f"Bet ticket placed: {ticket_id}"
            )
            
            # Save all to database
            self.db.add(ticket)
            self.db.add(transaction)
            for bet in bets:
                self.db.add(bet)
            
            self.db.commit()
            
            # Calculate referral commissions for each bet
            referral_service = ReferralService(self.db)
            for bet in bets:
                referral_service.calculate_commission_on_bet(bet)
            
            self.db.commit()
            
            # Refresh and return
            self.db.refresh(ticket)
            
            return TicketResponse(
                ticket_id=ticket.ticket_id,
                user_id=ticket.user_id,
                house_id=ticket.house_id,
                house_name=house.name,
                total_amount=ticket.total_amount,
                total_potential_payout=ticket.total_potential_payout,
                status=ticket.status,
                bets_summary=ticket.bets_summary,
                bets=[BetResponse(
                    id=bet.id,
                    user_id=bet.user_id,
                    round_id=bet.round_id,
                    bet_type=bet.bet_type,
                    bet_numbers={bet.bet_value: bet.bet_amount} if bet.bet_value else {},
                    total_bet_amount=bet.bet_amount,
                    status=bet.status,
                    potential_payout=bet.potential_payout,
                    actual_payout=bet.actual_payout,
                    ticket_id=ticket.ticket_id,
                    fr_round_id=bet.fr_round_id,
                    sr_round_id=bet.sr_round_id,
                    created_at=bet.created_at
                ) for bet in bets],
                created_at=ticket.created_at
            ), "Ticket placed successfully"
            
        except Exception as e:
            self.db.rollback()
            return None, f"Error placing ticket: {str(e)}"
    
    def create_single_bet(self, user_id: int, round_id: int, bet_type: BetType, 
                         numbers: Dict[str, float], ticket_id: str, house: House) -> Tuple[Bet, float]:
        """Create a single bet with multiple numbers"""
        total_amount = sum(numbers.values())
        
        # For now, take the first number as the bet value (database expects single value)
        # In a real implementation, you might need multiple bet records for multiple numbers
        bet_value = list(numbers.keys())[0] if numbers else "0"
        
        # Get payout rate based on round type and bet type
        round_obj = self.db.query(Round).filter(Round.id == round_id).first()
        
        if round_obj.round_type == RoundType.FR:
            if bet_type == BetType.DIRECT:
                rate = house.fr_direct_payout_rate
            elif bet_type == BetType.HOUSE:
                rate = house.fr_house_payout_rate
            elif bet_type == BetType.ENDING:
                rate = house.fr_ending_payout_rate
            else:
                rate = 1.0
        else:  # SR
            if bet_type == BetType.DIRECT:
                rate = house.sr_direct_payout_rate
            elif bet_type == BetType.HOUSE:
                rate = house.sr_house_payout_rate
            elif bet_type == BetType.ENDING:
                rate = house.sr_ending_payout_rate
            else:
                rate = 1.0
        
        # Only one number can win, so potential payout is the max single bet amount * rate
        max_single_amount = max(numbers.values()) if numbers else 0
        potential_payout = max_single_amount * rate
        
        bet = Bet(
            user_id=user_id,
            round_id=round_id,
            bet_type=bet_type,
            bet_value=bet_value,
            bet_amount=total_amount,
            potential_payout=potential_payout,
            ticket_id=ticket_id  # Add the missing ticket_id
        )
        
        return bet, potential_payout
    
    def get_user_tickets(self, user_id: int, limit: int = 50) -> List[TicketResponse]:
        """Get user's recent betting tickets - return all tickets with non-zero amounts"""
        # Get tickets that have non-zero amounts (regardless of individual bet records)
        tickets_with_bets = self.db.query(BetTicket).filter(
            and_(
                BetTicket.user_id == user_id,
                BetTicket.total_amount > 0
            )
        ).order_by(desc(BetTicket.created_at)).limit(limit).all()
        
        # Return all tickets with non-zero amounts since bets_summary contains the bet info
        result = []
        for ticket in tickets_with_bets:
            house = self.db.query(House).filter(House.id == ticket.house_id).first()
            bets = self.db.query(Bet).filter(Bet.ticket_id == ticket.ticket_id).all()
            
            result.append(TicketResponse(
                ticket_id=ticket.ticket_id,
                user_id=ticket.user_id,
                house_id=ticket.house_id,
                house_name=house.name if house else "Unknown",
                total_amount=ticket.total_amount,
                total_potential_payout=ticket.total_potential_payout,
                status=ticket.status,
                bets_summary=ticket.bets_summary,
                bets=[BetResponse(
                    id=bet.id,
                    user_id=bet.user_id,
                    round_id=bet.round_id,
                    bet_type=bet.bet_type,
                    bet_numbers={bet.bet_value: bet.bet_amount} if bet.bet_value else {},
                    total_bet_amount=bet.bet_amount,
                    status=bet.status,
                    potential_payout=bet.potential_payout,
                    actual_payout=bet.actual_payout,
                    ticket_id=bet.ticket_id,
                    fr_round_id=bet.fr_round_id,
                    sr_round_id=bet.sr_round_id,
                    created_at=bet.created_at
                ) for bet in bets],
                created_at=ticket.created_at
            ))
        
        return result
    
    def get_active_rounds_by_house(self, house_id: int) -> Dict[str, RoundResponse]:
        """Get active rounds for a specific house (open for betting)"""
        now = datetime.utcnow()
        
        rounds = self.db.query(Round).join(House).filter(
            and_(
                Round.house_id == house_id,
                Round.status.in_([RoundStatus.SCHEDULED, RoundStatus.ACTIVE]),
                Round.betting_closes_at > now,
                House.is_active == True
            )
        ).order_by(Round.scheduled_time).all()
        
        result = {}
        for round_obj in rounds:
            round_type_key = round_obj.round_type.value
            # Only store the first (earliest) round for each type since we ordered by scheduled_time
            if round_type_key not in result:
                round_response = RoundResponse(
                    id=round_obj.id,
                    house_id=round_obj.house_id,
                    house_name=round_obj.house.name,
                    round_type=round_obj.round_type,
                    status=round_obj.status,
                    scheduled_time=round_obj.scheduled_time,
                    betting_closes_at=round_obj.betting_closes_at,
                    actual_time=round_obj.actual_time,
                    result=round_obj.result,
                    created_at=round_obj.created_at
                )
                result[round_type_key] = round_response
        
        return result
    
    def get_houses_with_active_rounds(self) -> List[Dict]:
        """Get all houses that have active rounds (open for betting)"""
        houses = self.db.query(House).filter(House.is_active == True).all()
        result = []
        
        for house in houses:
            rounds = self.get_active_rounds_by_house(house.id)
            if rounds:
                result.append({
                    "house": HouseResponse(
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
                    ),
                    "rounds": rounds
                })
        
        return result
    
    def get_all_active_rounds(self) -> List[RoundResponse]:
        """Get all active rounds across all houses"""
        now = datetime.utcnow()
        
        rounds = self.db.query(Round).join(House).filter(
            and_(
                Round.status == RoundStatus.SCHEDULED,
                Round.betting_closes_at > now,
                House.is_active == True
            )
        ).order_by(Round.scheduled_time).all()
        
        result = []
        for round_obj in rounds:
            round_response = RoundResponse(
                id=round_obj.id,
                house_id=round_obj.house_id,
                house_name=round_obj.house.name,
                round_type=round_obj.round_type,
                status=round_obj.status,
                scheduled_time=round_obj.scheduled_time,
                betting_closes_at=round_obj.betting_closes_at,
                actual_time=round_obj.actual_time,
                result=round_obj.result,
                created_at=round_obj.created_at
            )
            result.append(round_response)
        
        return result
    
    def get_daily_bet_amount(self, user_id: int, house_id: int) -> float:
        """Get user's total bet amount for today for a specific house"""
        today = date.today()
        
        total = self.db.query(func.sum(BetTicket.total_amount)).filter(
            and_(
                BetTicket.user_id == user_id,
                BetTicket.house_id == house_id,
                func.date(BetTicket.created_at) == today
            )
        ).scalar()
        
        return float(total or 0)

    def get_bet_summary(self, user_id: int) -> BetSummaryResponse:
        """Get user's betting summary"""
        tickets = self.db.query(BetTicket).filter(BetTicket.user_id == user_id).all()
        bets = self.db.query(Bet).filter(Bet.user_id == user_id).all()
        
        total_tickets = len(tickets)
        total_bets = len(bets)
        total_amount = sum(ticket.total_amount for ticket in tickets)
        pending_bets = len([bet for bet in bets if bet.status == BetStatus.PENDING])
        won_bets = len([bet for bet in bets if bet.status == BetStatus.WON])
        lost_bets = len([bet for bet in bets if bet.status == BetStatus.LOST])
        total_winnings = sum(bet.actual_payout for bet in bets if bet.status == BetStatus.WON)
        
        return BetSummaryResponse(
            total_tickets=total_tickets,
            total_bets=total_bets,
            total_amount=total_amount,
            pending_bets=pending_bets,
            won_bets=won_bets,
            lost_bets=lost_bets,
            total_winnings=total_winnings
        )
    
    def process_round_results(self, round_id: int, result: int) -> int:
        """Process regular bets for a round result and return number of winners"""
        winners = 0
        referral_service = ReferralService(self.db)
        
        # Get all pending bets for this round
        bets = self.db.query(Bet).filter(
            and_(
                Bet.round_id == round_id,
                Bet.status == BetStatus.PENDING,
                Bet.bet_type != BetType.FORECAST  # Handle forecasts separately
            )
        ).all()
        
        for bet in bets:
            is_winner = self._check_bet_winner(bet, result)
            
            if is_winner:
                bet.status = BetStatus.WON
                bet.actual_payout = bet.potential_payout
                winners += 1
                
                # Process referral commissions for winning bets
                referral_service.process_bet_win_commission(bet)
                
                # Add winnings to user's wallet
                user = self.db.query(User).filter(User.id == bet.user_id).first()
                if user:
                    balance_before = user.wallet_balance
                    user.wallet_balance += bet.actual_payout
                    balance_after = user.wallet_balance
                    
                    # Create transaction record
                    transaction = Transaction(
                        user_id=user.id,
                        amount=bet.actual_payout,
                        transaction_type=TransactionType.BET_WON,
                        status=TransactionStatus.COMPLETED,
                        description=f"Winnings from {bet.bet_type.value} bet - Round {round_id}",
                        balance_before=balance_before,
                        balance_after=balance_after
                    )
                    self.db.add(transaction)
            else:
                bet.status = BetStatus.LOST
                # Reject referral commissions for losing bets
                referral_service.process_bet_loss_commission(bet)
        
        self.db.commit()
        return winners
    
    def process_forecast_bets(self, house_id: int, fr_result: str, sr_result: str) -> dict:
        """Process forecast bets when both FR and SR results are available"""
        referral_service = ReferralService(self.db)
        
        # Get all pending forecast bets for this house
        forecast_bets = self.db.query(Bet).filter(
            and_(
                Bet.bet_type == BetType.FORECAST,
                Bet.status == BetStatus.PENDING,
                Bet.fr_round_id.isnot(None),
                Bet.sr_round_id.isnot(None)
            )
        ).all()
        
        # Filter to only bets for this house
        house_forecast_bets = []
        for bet in forecast_bets:
            fr_round = self.db.query(Round).filter(Round.id == bet.fr_round_id).first()
            if fr_round and fr_round.house_id == house_id:
                house_forecast_bets.append(bet)
        
        winners = 0
        total_payout = 0
        
        for bet in house_forecast_bets:
            is_winner = False
            
            # Handle new forecast format: "type:fr_number-sr_number"
            if bet.bet_value and ":" in bet.bet_value:
                try:
                    forecast_type, numbers = bet.bet_value.split(":")
                    fr_number, sr_number = numbers.split("-")
                    
                    # Convert results to appropriate format based on forecast type
                    fr_res = int(fr_result)
                    sr_res = int(sr_result)
                    fr_num = int(fr_number)
                    sr_num = int(sr_number)
                    
                    if forecast_type == "direct":
                        # Direct: Both FR and SR numbers must match exactly (00-99)
                        is_winner = (fr_num == fr_res) and (sr_num == sr_res)
                        
                    elif forecast_type == "house":
                        # House: Both FR and SR house digits (first digit) must match
                        fr_house_result = int(str(fr_res).zfill(2)[0])  # First digit
                        sr_house_result = int(str(sr_res).zfill(2)[0])  # First digit
                        is_winner = (fr_num == fr_house_result) and (sr_num == sr_house_result)
                        
                    elif forecast_type == "ending":
                        # Ending: Both FR and SR ending digits (last digit) must match
                        fr_ending_result = fr_res % 10  # Last digit
                        sr_ending_result = sr_res % 10  # Last digit
                        is_winner = (fr_num == fr_ending_result) and (sr_num == sr_ending_result)
                        
                except (ValueError, IndexError) as e:
                    # Invalid format, mark as lost
                    pass
                    
            # Fallback to old forecast combinations format for backward compatibility
            elif bet.forecast_combinations:
                try:
                    import json
                    combinations = json.loads(bet.forecast_combinations.replace("'", '"'))
                    
                    for combo in combinations:
                        predicted_fr = str(combo["fr"]).zfill(2)
                        predicted_sr = str(combo["sr"]).zfill(2)
                        
                        # WIN only if BOTH FR and SR predictions are correct
                        if predicted_fr == fr_result and predicted_sr == sr_result:
                            is_winner = True
                            break
                            
                except (json.JSONDecodeError, KeyError, TypeError) as e:
                    pass
            
            if is_winner:
                bet.status = BetStatus.WON
                bet.actual_payout = bet.potential_payout
                winners += 1
                total_payout += bet.actual_payout
                
                # Process referral commissions for winning bets
                referral_service.process_bet_win_commission(bet)
                
                # Add winnings to user's wallet
                user = self.db.query(User).filter(User.id == bet.user_id).first()
                if user:
                    balance_before = user.wallet_balance
                    user.wallet_balance += bet.actual_payout
                    balance_after = user.wallet_balance
                    
                    # Create transaction record
                    transaction = Transaction(
                        user_id=user.id,
                        amount=bet.actual_payout,
                        transaction_type=TransactionType.BET_WON,
                        status=TransactionStatus.COMPLETED,
                        balance_before=balance_before,
                        balance_after=balance_after,
                        description=f"Forecast win: FR={fr_result}, SR={sr_result}"
                    )
                    self.db.add(transaction)
            else:
                bet.status = BetStatus.LOST
                # Reject referral commissions for losing bets
                referral_service.process_bet_loss_commission(bet)
        
        self.db.commit()
        
        return {
            "house_id": house_id,
            "winning_bets": winners,
            "total_payout": total_payout,
            "fr_result": fr_result,
            "sr_result": sr_result
        }
    
    def _check_bet_winner(self, bet: Bet, result: int) -> bool:
        """Check if a bet wins based on the result"""
        result_str = str(result).zfill(2)
        first_digit = int(result_str[0])  # House is first digit
        last_digit = result % 10          # Ending is last digit
        
        # Use bet_value field which exists in the database
        if not bet.bet_value:
            return False
            
        try:
            bet_number = int(bet.bet_value)
            
            if bet.bet_type == BetType.DIRECT:
                # Direct bet: exact match with result (2 digits)
                return bet_number == result
            elif bet.bet_type == BetType.HOUSE:
                # House bet: match with FIRST digit
                return bet_number == first_digit
            elif bet.bet_type == BetType.ENDING:
                # Ending bet: match with LAST digit
                return bet_number == last_digit
        except (ValueError, TypeError):
            return False
        
        return False

    def get_round_bet_statistics(self, round_id: int) -> dict:
        """Get comprehensive bet statistics for a round"""
        bets = self.db.query(Bet).filter(Bet.round_id == round_id).all()
        
        total_bets = len(bets)
        total_amount = sum(bet.bet_amount for bet in bets)
        
        # Breakdown by bet type
        bet_type_stats = {}
        for bet in bets:
            bet_type = bet.bet_type.value
            if bet_type not in bet_type_stats:
                bet_type_stats[bet_type] = {
                    "count": 0,
                    "total_amount": 0,
                    "numbers": {}
                }
            
            bet_type_stats[bet_type]["count"] += 1
            bet_type_stats[bet_type]["total_amount"] += bet.bet_amount
            
            # Track numbers bet on
            number = str(bet.bet_value)
            if number not in bet_type_stats[bet_type]["numbers"]:
                bet_type_stats[bet_type]["numbers"][number] = {
                    "count": 0,
                    "total_amount": 0
                }
            bet_type_stats[bet_type]["numbers"][number]["count"] += 1
            bet_type_stats[bet_type]["numbers"][number]["total_amount"] += bet.bet_amount
        
        return {
            "total_bets": total_bets,
            "total_amount": total_amount,
            "bet_type_breakdown": bet_type_stats
        }

    def get_round_winner_statistics(self, round_id: int, result: int) -> dict:
        """Get winner statistics for a completed round"""
        bets = self.db.query(Bet).filter(Bet.round_id == round_id).all()
        
        winning_bets = []
        total_winners = 0
        total_payout = 0
        
        for bet in bets:
            if self._check_bet_winner(bet, result):
                winning_bets.append(bet)
                total_winners += 1
                total_payout += bet.actual_payout or 0
        
        # Breakdown by bet type
        winner_type_stats = {}
        for bet in winning_bets:
            bet_type = bet.bet_type.value
            if bet_type not in winner_type_stats:
                winner_type_stats[bet_type] = {
                    "count": 0,
                    "total_payout": 0,
                    "numbers": {}
                }
            
            winner_type_stats[bet_type]["count"] += 1
            winner_type_stats[bet_type]["total_payout"] += bet.actual_payout or 0
            
            # Track winning numbers
            number = str(bet.bet_value)
            if number not in winner_type_stats[bet_type]["numbers"]:
                winner_type_stats[bet_type]["numbers"][number] = {
                    "count": 0,
                    "total_payout": 0
                }
            winner_type_stats[bet_type]["numbers"][number]["count"] += 1
            winner_type_stats[bet_type]["numbers"][number]["total_payout"] += bet.actual_payout or 0
        
        return {
            "total_winners": total_winners,
            "total_payout": total_payout,
            "winning_bets": len(winning_bets),
            "winner_type_breakdown": winner_type_stats
        }

    def get_forecast_bet_statistics(self, house_id: int, date_filter: Optional[date] = None) -> dict:
        """Get comprehensive forecast bet statistics for a house"""
        query = self.db.query(Bet).filter(
            Bet.bet_type == BetType.FORECAST,
            Bet.house_name == (self.db.query(House).filter(House.id == house_id).first().name if house_id else None)
        )
        
        if date_filter:
            query = query.filter(func.date(Bet.created_at) == date_filter)
        
        forecast_bets = query.all()
        
        total_bets = len(forecast_bets)
        total_amount = sum(bet.bet_amount for bet in forecast_bets)
        
        # Breakdown by forecast type
        type_stats = {
            "direct": {"count": 0, "total_amount": 0, "winners": 0, "total_payout": 0},
            "house": {"count": 0, "total_amount": 0, "winners": 0, "total_payout": 0},
            "ending": {"count": 0, "total_amount": 0, "winners": 0, "total_payout": 0}
        }
        
        for bet in forecast_bets:
            if bet.bet_value and ":" in bet.bet_value:
                forecast_type = bet.bet_value.split(":")[0]
                if forecast_type in type_stats:
                    type_stats[forecast_type]["count"] += 1
                    type_stats[forecast_type]["total_amount"] += bet.bet_amount
                    
                    if bet.status == BetStatus.WON:
                        type_stats[forecast_type]["winners"] += 1
                        type_stats[forecast_type]["total_payout"] += bet.actual_payout or 0
        
        return {
            "total_forecast_bets": total_bets,
            "total_forecast_amount": total_amount,
            "forecast_type_breakdown": type_stats,
            "house_id": house_id
        }

    def get_house_forecast_winner_statistics(self, house_id: int, fr_result: int, sr_result: int) -> dict:
        """Get forecast winner statistics for a house when both results are available"""
        fr_result_str = str(fr_result).zfill(2)
        sr_result_str = str(sr_result).zfill(2)
        
        house = self.db.query(House).filter(House.id == house_id).first()
        if not house:
            return {"error": "House not found"}
        
        # Get all forecast bets for this house
        forecast_bets = self.db.query(Bet).filter(
            Bet.bet_type == BetType.FORECAST,
            Bet.house_name == house.name,
            Bet.status == BetStatus.PENDING
        ).all()
        
        potential_winners = {
            "direct": [],
            "house": [],
            "ending": []
        }
        
        for bet in forecast_bets:
            if bet.bet_value and ":" in bet.bet_value:
                try:
                    forecast_type, numbers = bet.bet_value.split(":")
                    fr_number, sr_number = numbers.split("-")
                    
                    fr_num = int(fr_number)
                    sr_num = int(sr_number)
                    
                    is_winner = False
                    
                    if forecast_type == "direct":
                        is_winner = (fr_num == fr_result) and (sr_num == sr_result)
                    elif forecast_type == "house":
                        fr_house_result = int(fr_result_str[0])
                        sr_house_result = int(sr_result_str[0])
                        is_winner = (fr_num == fr_house_result) and (sr_num == sr_house_result)
                    elif forecast_type == "ending":
                        fr_ending_result = fr_result % 10
                        sr_ending_result = sr_result % 10
                        is_winner = (fr_num == fr_ending_result) and (sr_num == sr_ending_result)
                    
                    if is_winner:
                        potential_winners[forecast_type].append({
                            "bet_id": bet.id,
                            "user_id": bet.user_id,
                            "bet_amount": bet.bet_amount,
                            "potential_payout": bet.potential_payout,
                            "fr_number": fr_num,
                            "sr_number": sr_num
                        })
                        
                except (ValueError, IndexError):
                    continue
        
        total_winners = sum(len(winners) for winners in potential_winners.values())
        total_payout = sum(
            sum(bet["potential_payout"] for bet in winners) 
            for winners in potential_winners.values()
        )
        
        return {
            "house_id": house_id,
            "house_name": house.name,
            "fr_result": fr_result,
            "sr_result": sr_result,
            "total_potential_winners": total_winners,
            "total_potential_payout": total_payout,
            "winners_by_type": potential_winners
        }