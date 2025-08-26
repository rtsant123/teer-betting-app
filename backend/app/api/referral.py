from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc, or_
from typing import List, Optional
import uuid
from datetime import datetime

from ..database import get_db
from ..dependencies import get_current_user
from ..models.user import User
from ..models.referral import ReferralLink, ReferralCommission, CommissionWithdrawal, CommissionStatus, CommissionLevel, WithdrawalStatus
from ..models.transaction import Transaction
from ..models.bet import Bet

router = APIRouter(tags=["referral"])

@router.post("/create-link")
async def create_referral_link(
    campaign_name: str = "General",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new referral link for the current user"""
    
    # Generate unique code
    referral_code = str(uuid.uuid4())[:8].upper()
    
    # Check if code already exists
    while db.query(ReferralLink).filter(ReferralLink.code == referral_code).first():
        referral_code = str(uuid.uuid4())[:8].upper()
    
    referral_link = ReferralLink(
        user_id=current_user.id,
        code=referral_code,
        campaign_name=campaign_name
    )
    
    db.add(referral_link)
    db.commit()
    db.refresh(referral_link)
    
    return {
        "success": True,
        "link": f"/register?ref={referral_code}",
        "code": referral_code,
        "campaign": campaign_name
    }

@router.get("/my-links")
async def get_my_referral_links(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all referral links for the current user"""
    
    links = db.query(ReferralLink).filter(
        ReferralLink.user_id == current_user.id,
        ReferralLink.is_active == True
    ).all()
    
    result = []
    for link in links:
        stats = db.query(func.count(User.id)).filter(
            User.referral_link_id == link.id
        ).scalar() or 0
        
        result.append({
            "id": link.id,
            "code": link.code,
            "campaign": link.campaign_name,
            "link": f"/register?ref={link.code}",
            "clicks": link.click_count,
            "conversions": stats,
            "created_at": link.created_at
        })
    
    return result

@router.get("/stats")
async def get_referral_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive referral statistics"""
    
    # Total referrals
    total_referrals = db.query(func.count(User.id)).filter(
        User.referred_by == current_user.id
    ).scalar() or 0
    
    # Total commissions earned
    total_earned = db.query(func.sum(ReferralCommission.amount)).filter(
        ReferralCommission.referrer_id == current_user.id,
        ReferralCommission.status == CommissionStatus.APPROVED
    ).scalar() or 0.0
    
    # Pending commissions
    pending_commissions = db.query(func.sum(ReferralCommission.amount)).filter(
        ReferralCommission.referrer_id == current_user.id,
        ReferralCommission.status == CommissionStatus.PENDING
    ).scalar() or 0.0
    
    # Available for withdrawal
    withdrawn = db.query(func.sum(CommissionWithdrawal.amount)).filter(
        CommissionWithdrawal.user_id == current_user.id,
        CommissionWithdrawal.status.in_([WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED])
    ).scalar() or 0.0
    
    available_withdrawal = total_earned - withdrawn
    
    # Level breakdown
    level_stats = db.query(
        ReferralCommission.level,
        func.count(ReferralCommission.id).label('count'),
        func.sum(ReferralCommission.amount).label('total')
    ).filter(
        ReferralCommission.referrer_id == current_user.id,
        ReferralCommission.status == CommissionStatus.APPROVED
    ).group_by(ReferralCommission.level).all()
    
    level_breakdown = {}
    for level, count, total in level_stats:
        level_breakdown[level.value] = {
            "count": count,
            "total": float(total or 0)
        }
    
    return {
        "total_referrals": total_referrals,
        "total_earned": float(total_earned),
        "pending_commissions": float(pending_commissions),
        "available_withdrawal": float(max(0, available_withdrawal)),
        "total_withdrawn": float(withdrawn),
        "level_breakdown": level_breakdown
    }

@router.get("/commissions")
async def get_commission_history(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get commission history for the current user"""
    
    offset = (page - 1) * limit
    
    commissions = db.query(ReferralCommission).filter(
        ReferralCommission.referrer_id == current_user.id
    ).order_by(desc(ReferralCommission.created_at)).offset(offset).limit(limit).all()
    
    total = db.query(func.count(ReferralCommission.id)).filter(
        ReferralCommission.referrer_id == current_user.id
    ).scalar()
    
    result = []
    for commission in commissions:
        referred_user = db.query(User).filter(User.id == commission.referred_user_id).first()
        
        result.append({
            "id": commission.id,
            "amount": float(commission.amount),
            "level": commission.level.value,
            "status": commission.status.value,
            "referred_user": referred_user.username if referred_user else "Unknown",
            "bet_amount": float(commission.bet_amount) if commission.bet_amount else None,
            "commission_rate": float(commission.commission_rate),
            "created_at": commission.created_at,
            "processed_at": commission.processed_at
        })
    
    return {
        "commissions": result,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.post("/withdraw")
async def request_commission_withdrawal(
    amount: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Request withdrawal of commission earnings"""
    
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdrawal amount must be positive"
        )
    
    # Calculate available balance
    total_earned = db.query(func.sum(ReferralCommission.amount)).filter(
        ReferralCommission.referrer_id == current_user.id,
        ReferralCommission.status == CommissionStatus.APPROVED
    ).scalar() or 0.0
    
    total_withdrawn = db.query(func.sum(CommissionWithdrawal.amount)).filter(
        CommissionWithdrawal.user_id == current_user.id,
        CommissionWithdrawal.status.in_([WithdrawalStatus.PENDING, WithdrawalStatus.APPROVED])
    ).scalar() or 0.0
    
    available = total_earned - total_withdrawn
    
    if amount > available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Available: {available}"
        )
    
    withdrawal = CommissionWithdrawal(
        user_id=current_user.id,
        amount=amount,
        status=WithdrawalStatus.PENDING
    )
    
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)
    
    return {
        "success": True,
        "withdrawal_id": withdrawal.id,
        "amount": amount,
        "status": withdrawal.status.value
    }

@router.get("/withdrawals")
async def get_withdrawal_history(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get withdrawal history for the current user"""
    
    offset = (page - 1) * limit
    
    withdrawals = db.query(CommissionWithdrawal).filter(
        CommissionWithdrawal.user_id == current_user.id
    ).order_by(desc(CommissionWithdrawal.created_at)).offset(offset).limit(limit).all()
    
    total = db.query(func.count(CommissionWithdrawal.id)).filter(
        CommissionWithdrawal.user_id == current_user.id
    ).scalar()
    
    result = []
    for withdrawal in withdrawals:
        result.append({
            "id": withdrawal.id,
            "amount": float(withdrawal.amount),
            "status": withdrawal.status.value,
            "created_at": withdrawal.created_at,
            "processed_at": withdrawal.processed_at,
            "notes": withdrawal.admin_notes
        })
    
    return {
        "withdrawals": result,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/referrals")
async def get_my_referrals(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of users referred by current user"""
    
    offset = (page - 1) * limit
    
    # Get direct referrals
    referrals = db.query(User).filter(
        User.referred_by == current_user.id
    ).order_by(desc(User.created_at)).offset(offset).limit(limit).all()
    
    total = db.query(func.count(User.id)).filter(
        User.referred_by == current_user.id
    ).scalar()
    
    result = []
    for user in referrals:
        # Get commission earned from this user
        commission_earned = db.query(func.sum(ReferralCommission.amount)).filter(
            ReferralCommission.referrer_id == current_user.id,
            ReferralCommission.referred_user_id == user.id,
            ReferralCommission.status == CommissionStatus.APPROVED
        ).scalar() or 0.0
        
        # Get total bets by this user
        total_bets = db.query(func.sum(Bet.amount)).filter(
            Bet.user_id == user.id
        ).scalar() or 0.0
        
        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "joined_at": user.created_at,
            "total_bets": float(total_bets),
            "commission_earned": float(commission_earned),
            "is_active": user.is_active
        })
    
    return {
        "referrals": result,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/track/{code}")
async def track_referral_link(
    code: str,
    db: Session = Depends(get_db)
):
    """Track referral link click (public endpoint)"""
    
    link = db.query(ReferralLink).filter(
        ReferralLink.code == code,
        ReferralLink.is_active == True
    ).first()
    
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral link not found"
        )
    
    # Increment click count
    link.click_count += 1
    link.last_used = datetime.utcnow()
    db.commit()
    
    return {
        "valid": True,
        "referrer": link.user.username,
        "campaign": link.campaign_name
    }
