from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import Optional, List
from datetime import datetime, timedelta

from ..models.user import User
from ..models.bet import Bet
from ..models.referral import (
    ReferralSettings, ReferralCommission, ReferralLink, 
    CommissionStatus, CommissionLevel
)

class ReferralService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_active_settings(self) -> Optional[ReferralSettings]:
        """Get the currently active referral settings"""
        return self.db.query(ReferralSettings).filter(
            ReferralSettings.is_active == True
        ).order_by(ReferralSettings.created_at.desc()).first()
    
    def calculate_commission_on_bet(self, bet: Bet) -> None:
        """Calculate and create commission records when a user places a bet"""
        
        settings = self.get_active_settings()
        if not settings:
            return
        
        # Check if bet amount meets minimum requirement
        if bet.amount < settings.min_bet_for_commission:
            return
        
        user = self.db.query(User).filter(User.id == bet.user_id).first()
        if not user or not user.referred_by:
            return
        
        # Calculate commissions for up to 3 levels
        self._calculate_level_commission(
            referred_user=user,
            bet=bet,
            settings=settings,
            level=1
        )
    
    def _calculate_level_commission(
        self, 
        referred_user: User, 
        bet: Bet, 
        settings: ReferralSettings, 
        level: int
    ) -> None:
        """Recursively calculate commission for each level"""
        
        if level > 3:
            return
        
        # Get the referrer at this level
        if level == 1:
            referrer_id = referred_user.referred_by
        elif level == 2:
            # Get level 1 referrer first, then their referrer
            level1_referrer = self.db.query(User).filter(User.id == referred_user.referred_by).first()
            if not level1_referrer or not level1_referrer.referred_by:
                return
            referrer_id = level1_referrer.referred_by
        elif level == 3:
            # Get level 2 referrer
            level1_referrer = self.db.query(User).filter(User.id == referred_user.referred_by).first()
            if not level1_referrer or not level1_referrer.referred_by:
                return
            level2_referrer = self.db.query(User).filter(User.id == level1_referrer.referred_by).first()
            if not level2_referrer or not level2_referrer.referred_by:
                return
            referrer_id = level2_referrer.referred_by
        
        referrer = self.db.query(User).filter(User.id == referrer_id).first()
        if not referrer:
            return
        
        # Get commission rate for this level
        if level == 1:
            rate = settings.level_1_rate
            commission_level = CommissionLevel.LEVEL_1
        elif level == 2:
            rate = settings.level_2_rate
            commission_level = CommissionLevel.LEVEL_2
        elif level == 3:
            rate = settings.level_3_rate
            commission_level = CommissionLevel.LEVEL_3
        
        if rate <= 0:
            return
        
        # Calculate commission amount
        commission_amount = bet.amount * (rate / 100)
        
        # Create commission record
        commission = ReferralCommission(
            referrer_id=referrer.id,
            referred_user_id=referred_user.id,
            bet_id=bet.id,
            level=commission_level,
            amount=commission_amount,
            bet_amount=bet.amount,
            commission_rate=rate,
            status=CommissionStatus.PENDING
        )
        
        self.db.add(commission)
        
        # Continue to next level if applicable
        if level < 3:
            self._calculate_level_commission(
                referred_user=referred_user,
                bet=bet,
                settings=settings,
                level=level + 1
            )
    
    def process_bet_win_commission(self, bet: Bet) -> None:
        """Process commission when a bet wins - approve pending commissions"""
        
        # Get all pending commissions for this bet
        commissions = self.db.query(ReferralCommission).filter(
            ReferralCommission.bet_id == bet.id,
            ReferralCommission.status == CommissionStatus.PENDING
        ).all()
        
        for commission in commissions:
            commission.status = CommissionStatus.APPROVED
            commission.processed_at = datetime.utcnow()
    
    def process_bet_loss_commission(self, bet: Bet) -> None:
        """Process commission when a bet loses - reject pending commissions"""
        
        # Get all pending commissions for this bet
        commissions = self.db.query(ReferralCommission).filter(
            ReferralCommission.bet_id == bet.id,
            ReferralCommission.status == CommissionStatus.PENDING
        ).all()
        
        for commission in commissions:
            commission.status = CommissionStatus.REJECTED
            commission.processed_at = datetime.utcnow()
            commission.rejection_reason = "Bet lost"
    
    def register_user_with_referral(self, user: User, referral_code: Optional[str] = None) -> bool:
        """Register a user with a referral code"""
        
        if not referral_code:
            return False
        
        # Find the referral link
        referral_link = self.db.query(ReferralLink).filter(
            ReferralLink.code == referral_code,
            ReferralLink.is_active == True
        ).first()
        
        if not referral_link:
            return False
        
        # Set the referral relationship
        user.referred_by = referral_link.user_id
        user.referral_link_id = referral_link.id
        
        # Update referral link stats
        referral_link.conversion_count += 1
        
        return True
    
    def get_user_referral_stats(self, user_id: int) -> dict:
        """Get comprehensive referral statistics for a user"""
        
        # Total direct referrals
        direct_referrals = self.db.query(func.count(User.id)).filter(
            User.referred_by == user_id
        ).scalar() or 0
        
        # Total commissions earned
        total_earned = self.db.query(func.sum(ReferralCommission.amount)).filter(
            ReferralCommission.referrer_id == user_id,
            ReferralCommission.status == CommissionStatus.APPROVED
        ).scalar() or 0.0
        
        # Pending commissions
        pending_commissions = self.db.query(func.sum(ReferralCommission.amount)).filter(
            ReferralCommission.referrer_id == user_id,
            ReferralCommission.status == CommissionStatus.PENDING
        ).scalar() or 0.0
        
        # Commission breakdown by level
        level_stats = self.db.query(
            ReferralCommission.level,
            func.count(ReferralCommission.id).label('count'),
            func.sum(ReferralCommission.amount).label('total')
        ).filter(
            ReferralCommission.referrer_id == user_id,
            ReferralCommission.status == CommissionStatus.APPROVED
        ).group_by(ReferralCommission.level).all()
        
        level_breakdown = {}
        for level, count, total in level_stats:
            level_breakdown[level.value] = {
                "count": count,
                "total": float(total or 0)
            }
        
        return {
            "direct_referrals": direct_referrals,
            "total_earned": float(total_earned),
            "pending_commissions": float(pending_commissions),
            "level_breakdown": level_breakdown
        }
    
    def get_referral_chain(self, user_id: int, max_depth: int = 10) -> List[dict]:
        """Get the referral chain for a user (who referred whom)"""
        
        chain = []
        current_user_id = user_id
        depth = 0
        
        while current_user_id and depth < max_depth:
            user = self.db.query(User).filter(User.id == current_user_id).first()
            if not user:
                break
            
            chain.append({
                "user_id": user.id,
                "username": user.username,
                "level": depth,
                "referred_by": user.referred_by
            })
            
            current_user_id = user.referred_by
            depth += 1
        
        return chain
    
    def cleanup_expired_commissions(self) -> int:
        """Clean up expired pending commissions based on settings"""
        
        settings = self.get_active_settings()
        if not settings:
            return 0
        
        cutoff_date = datetime.utcnow() - timedelta(days=settings.commission_validity_days)
        
        expired_commissions = self.db.query(ReferralCommission).filter(
            ReferralCommission.status == CommissionStatus.PENDING,
            ReferralCommission.created_at < cutoff_date
        ).all()
        
        count = 0
        for commission in expired_commissions:
            commission.status = CommissionStatus.REJECTED
            commission.processed_at = datetime.utcnow()
            commission.rejection_reason = "Expired - exceeded validity period"
            count += 1
        
        return count
