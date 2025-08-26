from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc, or_
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..dependencies import get_current_admin_user
from ..models.user import User
from ..models.referral import (
    ReferralSettings, ReferralCommission, CommissionWithdrawal, 
    CommissionStatus, CommissionLevel, WithdrawalStatus
)
from ..schemas.referral import ReferralSettingsCreate, ReferralSettingsUpdate

router = APIRouter(prefix="/admin/referral", tags=["admin-referral"])

@router.get("/settings")
async def get_referral_settings(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get current referral system settings"""
    
    settings = db.query(ReferralSettings).order_by(desc(ReferralSettings.created_at)).first()
    
    if not settings:
        # Return default settings
        return {
            "id": None,
            "level_1_rate": 0.0,
            "level_2_rate": 0.0,
            "level_3_rate": 0.0,
            "min_bet_for_commission": 0.0,
            "min_withdrawal_amount": 100.0,
            "max_withdrawal_amount": 10000.0,
            "commission_validity_days": 30,
            "is_active": False,
            "created_at": None
        }
    
    return {
        "id": settings.id,
        "level_1_rate": float(settings.level_1_rate),
        "level_2_rate": float(settings.level_2_rate),
        "level_3_rate": float(settings.level_3_rate),
        "min_bet_for_commission": float(settings.min_bet_for_commission),
        "min_withdrawal_amount": float(settings.min_withdrawal_amount),
        "max_withdrawal_amount": float(settings.max_withdrawal_amount),
        "commission_validity_days": settings.commission_validity_days,
        "is_active": settings.is_active,
        "created_at": settings.created_at
    }

@router.post("/settings")
async def create_referral_settings(
    settings_data: dict,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Create new referral system settings"""
    
    # Deactivate previous settings
    db.query(ReferralSettings).update({"is_active": False})
    
    settings = ReferralSettings(
        level_1_rate=settings_data.get("level_1_rate", 0.0),
        level_2_rate=settings_data.get("level_2_rate", 0.0),
        level_3_rate=settings_data.get("level_3_rate", 0.0),
        min_bet_for_commission=settings_data.get("min_bet_for_commission", 0.0),
        min_withdrawal_amount=settings_data.get("min_withdrawal_amount", 100.0),
        max_withdrawal_amount=settings_data.get("max_withdrawal_amount", 10000.0),
        commission_validity_days=settings_data.get("commission_validity_days", 30),
        is_active=True,
        created_by=current_admin.id
    )
    
    db.add(settings)
    db.commit()
    db.refresh(settings)
    
    return {
        "success": True,
        "message": "Referral settings updated successfully",
        "settings": {
            "id": settings.id,
            "level_1_rate": float(settings.level_1_rate),
            "level_2_rate": float(settings.level_2_rate),
            "level_3_rate": float(settings.level_3_rate),
            "min_bet_for_commission": float(settings.min_bet_for_commission),
            "min_withdrawal_amount": float(settings.min_withdrawal_amount),
            "max_withdrawal_amount": float(settings.max_withdrawal_amount),
            "commission_validity_days": settings.commission_validity_days,
            "is_active": settings.is_active
        }
    }

@router.get("/commissions")
async def get_all_commissions(
    page: int = 1,
    limit: int = 50,
    status: Optional[str] = None,
    level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get all referral commissions with filters"""
    
    offset = (page - 1) * limit
    query = db.query(ReferralCommission)
    
    if status:
        try:
            status_enum = CommissionStatus(status)
            query = query.filter(ReferralCommission.status == status_enum)
        except ValueError:
            pass
    
    if level:
        try:
            level_enum = CommissionLevel(level)
            query = query.filter(ReferralCommission.level == level_enum)
        except ValueError:
            pass
    
    commissions = query.order_by(desc(ReferralCommission.created_at)).offset(offset).limit(limit).all()
    total = query.count()
    
    result = []
    for commission in commissions:
        referrer = db.query(User).filter(User.id == commission.referrer_id).first()
        referred_user = db.query(User).filter(User.id == commission.referred_user_id).first()
        
        result.append({
            "id": commission.id,
            "amount": float(commission.amount),
            "level": commission.level.value,
            "status": commission.status.value,
            "referrer": {
                "id": referrer.id,
                "username": referrer.username,
                "email": referrer.email
            } if referrer else None,
            "referred_user": {
                "id": referred_user.id,
                "username": referred_user.username,
                "email": referred_user.email
            } if referred_user else None,
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

@router.put("/commissions/{commission_id}/approve")
async def approve_commission(
    commission_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Approve a pending commission"""
    
    commission = db.query(ReferralCommission).filter(ReferralCommission.id == commission_id).first()
    
    if not commission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commission not found"
        )
    
    if commission.status != CommissionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Commission is not in pending status"
        )
    
    commission.status = CommissionStatus.APPROVED
    commission.processed_at = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "message": "Commission approved successfully"
    }

@router.put("/commissions/{commission_id}/reject")
async def reject_commission(
    commission_id: int,
    reason: str = "Admin rejected",
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Reject a pending commission"""
    
    commission = db.query(ReferralCommission).filter(ReferralCommission.id == commission_id).first()
    
    if not commission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commission not found"
        )
    
    if commission.status != CommissionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Commission is not in pending status"
        )
    
    commission.status = CommissionStatus.REJECTED
    commission.processed_at = datetime.utcnow()
    commission.rejection_reason = reason
    db.commit()
    
    return {
        "success": True,
        "message": "Commission rejected successfully"
    }

@router.get("/withdrawals")
async def get_all_withdrawals(
    page: int = 1,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get all commission withdrawal requests"""
    
    offset = (page - 1) * limit
    query = db.query(CommissionWithdrawal)
    
    if status:
        try:
            status_enum = WithdrawalStatus(status)
            query = query.filter(CommissionWithdrawal.status == status_enum)
        except ValueError:
            pass
    
    withdrawals = query.order_by(desc(CommissionWithdrawal.created_at)).offset(offset).limit(limit).all()
    total = query.count()
    
    result = []
    for withdrawal in withdrawals:
        user = db.query(User).filter(User.id == withdrawal.user_id).first()
        
        result.append({
            "id": withdrawal.id,
            "amount": float(withdrawal.amount),
            "status": withdrawal.status.value,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "phone": user.phone_number
            } if user else None,
            "created_at": withdrawal.created_at,
            "processed_at": withdrawal.processed_at,
            "admin_notes": withdrawal.admin_notes
        })
    
    return {
        "withdrawals": result,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.put("/withdrawals/{withdrawal_id}/approve")
async def approve_withdrawal(
    withdrawal_id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Approve a withdrawal request"""
    
    withdrawal = db.query(CommissionWithdrawal).filter(CommissionWithdrawal.id == withdrawal_id).first()
    
    if not withdrawal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Withdrawal request not found"
        )
    
    if withdrawal.status != WithdrawalStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdrawal is not in pending status"
        )
    
    withdrawal.status = WithdrawalStatus.APPROVED
    withdrawal.processed_at = datetime.utcnow()
    withdrawal.processed_by = current_admin.id
    if notes:
        withdrawal.admin_notes = notes
    
    db.commit()
    
    return {
        "success": True,
        "message": "Withdrawal approved successfully"
    }

@router.put("/withdrawals/{withdrawal_id}/reject")
async def reject_withdrawal(
    withdrawal_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Reject a withdrawal request"""
    
    withdrawal = db.query(CommissionWithdrawal).filter(CommissionWithdrawal.id == withdrawal_id).first()
    
    if not withdrawal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Withdrawal request not found"
        )
    
    if withdrawal.status != WithdrawalStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdrawal is not in pending status"
        )
    
    withdrawal.status = WithdrawalStatus.REJECTED
    withdrawal.processed_at = datetime.utcnow()
    withdrawal.processed_by = current_admin.id
    withdrawal.admin_notes = reason
    
    db.commit()
    
    return {
        "success": True,
        "message": "Withdrawal rejected successfully"
    }

@router.get("/stats")
async def get_referral_system_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get overall referral system statistics"""
    
    # Total users with referrals
    total_referrers = db.query(func.count(func.distinct(ReferralCommission.referrer_id))).scalar() or 0
    
    # Total referrals made
    total_referrals = db.query(func.count(User.id)).filter(User.referred_by.isnot(None)).scalar() or 0
    
    # Total commissions paid
    total_commissions_paid = db.query(func.sum(ReferralCommission.amount)).filter(
        ReferralCommission.status == CommissionStatus.APPROVED
    ).scalar() or 0.0
    
    # Pending commissions
    pending_commissions = db.query(func.sum(ReferralCommission.amount)).filter(
        ReferralCommission.status == CommissionStatus.PENDING
    ).scalar() or 0.0
    
    # Pending withdrawals
    pending_withdrawals = db.query(func.sum(CommissionWithdrawal.amount)).filter(
        CommissionWithdrawal.status == WithdrawalStatus.PENDING
    ).scalar() or 0.0
    
    # Top referrers
    top_referrers = db.query(
        User.id,
        User.username,
        func.count(func.distinct(ReferralCommission.referred_user_id)).label('referral_count'),
        func.sum(ReferralCommission.amount).label('total_earned')
    ).join(
        ReferralCommission, User.id == ReferralCommission.referrer_id
    ).filter(
        ReferralCommission.status == CommissionStatus.APPROVED
    ).group_by(User.id, User.username).order_by(
        desc('total_earned')
    ).limit(10).all()
    
    top_referrers_list = []
    for user_id, username, referral_count, total_earned in top_referrers:
        top_referrers_list.append({
            "user_id": user_id,
            "username": username,
            "referral_count": referral_count,
            "total_earned": float(total_earned or 0)
        })
    
    return {
        "total_referrers": total_referrers,
        "total_referrals": total_referrals,
        "total_commissions_paid": float(total_commissions_paid),
        "pending_commissions": float(pending_commissions),
        "pending_withdrawals": float(pending_withdrawals),
        "top_referrers": top_referrers_list
    }
