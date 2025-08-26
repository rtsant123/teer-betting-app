from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
from datetime import datetime

from app.models import User, Transaction, PaymentMethod
from app.models.transaction import TransactionType, TransactionStatus
from app.schemas.wallet import TransactionResponse, WalletResponse, TransactionUpdate
from app.schemas.payment import DepositRequest, WithdrawalRequest

class WalletService:
    def __init__(self, db: Session):
        self.db = db
    
    def request_deposit(self, user_id: int, deposit_data: DepositRequest) -> Tuple[Optional[TransactionResponse], str]:
        """Request a deposit (requires admin approval)"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return None, "User not found"
            
            # Validate payment method
            payment_method = self.db.query(PaymentMethod).filter(
                PaymentMethod.id == deposit_data.payment_method_id,
                PaymentMethod.supports_deposit == True
            ).first()
            
            if not payment_method:
                return None, "Invalid payment method for deposits"
            
            # Check amount limits
            if deposit_data.amount < payment_method.min_amount:
                return None, f"Minimum deposit amount is ₹{payment_method.min_amount}"
            
            if deposit_data.amount > payment_method.max_amount:
                return None, f"Maximum deposit amount is ₹{payment_method.max_amount}"
            
            transaction = Transaction(
                user_id=user_id,
                transaction_type=TransactionType.DEPOSIT,
                amount=deposit_data.amount,
                status=TransactionStatus.PENDING,
                payment_method_id=deposit_data.payment_method_id,
                transaction_details=deposit_data.transaction_details,
                description=f"Deposit via {payment_method.name}",
                balance_before=user.wallet_balance,
                balance_after=user.wallet_balance  # Will be updated when approved
            )
            
            self.db.add(transaction)
            self.db.commit()
            self.db.refresh(transaction)
            
            return TransactionResponse.from_orm(transaction), "Deposit request submitted successfully"
            
        except Exception as e:
            self.db.rollback()
            return None, f"Error requesting deposit: {str(e)}"
    
    def request_withdrawal(self, user_id: int, withdrawal_data: WithdrawalRequest) -> Tuple[Optional[TransactionResponse], str]:
        """Request a withdrawal (requires admin approval)"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return None, "User not found"
            
            if user.wallet_balance < withdrawal_data.amount:
                return None, "Insufficient balance"
            
            # Validate payment method
            payment_method = self.db.query(PaymentMethod).filter(
                PaymentMethod.id == withdrawal_data.payment_method_id,
                PaymentMethod.supports_withdrawal == True
            ).first()
            
            if not payment_method:
                return None, "Invalid payment method for withdrawals"
            
            # Check amount limits
            if withdrawal_data.amount < payment_method.min_amount:
                return None, f"Minimum withdrawal amount is ₹{payment_method.min_amount}"
            
            if withdrawal_data.amount > payment_method.max_amount:
                return None, f"Maximum withdrawal amount is ₹{payment_method.max_amount}"
            
            transaction = Transaction(
                user_id=user_id,
                transaction_type=TransactionType.WITHDRAWAL,
                amount=withdrawal_data.amount,
                status=TransactionStatus.PENDING,
                payment_method_id=withdrawal_data.payment_method_id,
                transaction_details=withdrawal_data.transaction_details,
                description=f"Withdrawal via {payment_method.name}",
                balance_before=user.wallet_balance,
                balance_after=user.wallet_balance - withdrawal_data.amount  # Will be final after approval
            )
            
            self.db.add(transaction)
            self.db.commit()
            self.db.refresh(transaction)
            
            return TransactionResponse.from_orm(transaction), "Withdrawal request submitted successfully"
            
        except Exception as e:
            self.db.rollback()
            return None, f"Error requesting withdrawal: {str(e)}"
    
    def get_wallet_info(self, user_id: int, limit: int = 20) -> Optional[WalletResponse]:
        """Get user wallet info with recent transactions"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        recent_transactions = self.db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).order_by(Transaction.created_at.desc()).limit(limit).all()
        
        return WalletResponse(
            user_id=user_id,
            balance=user.wallet_balance,
            recent_transactions=[TransactionResponse.from_orm(t) for t in recent_transactions]
        )
    
    def get_user_transactions(self, user_id: int, transaction_type: Optional[TransactionType] = None, limit: int = 50) -> List[TransactionResponse]:
        """Get user transactions with optional filtering"""
        query = self.db.query(Transaction).filter(Transaction.user_id == user_id)
        
        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)
        
        transactions = query.order_by(Transaction.created_at.desc()).limit(limit).all()
        return [TransactionResponse.from_orm(t) for t in transactions]
    
    def approve_deposit(self, transaction_id: int, admin_id: int, admin_notes: Optional[str] = None) -> Tuple[bool, str]:
        """Approve a deposit request"""
        try:
            transaction = self.db.query(Transaction).filter(
                Transaction.id == transaction_id,
                Transaction.transaction_type == TransactionType.DEPOSIT,
                Transaction.status == TransactionStatus.PENDING
            ).first()
            
            if not transaction:
                return False, "Transaction not found or already processed"
            
            user = self.db.query(User).filter(User.id == transaction.user_id).first()
            if not user:
                return False, "User not found"
            
            # Update user balance
            user.wallet_balance += transaction.amount
            
            # Update transaction
            transaction.status = TransactionStatus.APPROVED
            transaction.processed_by = admin_id
            transaction.processed_at = datetime.utcnow()
            transaction.admin_notes = admin_notes
            transaction.balance_after = user.wallet_balance
            
            self.db.commit()
            return True, "Deposit approved successfully"
            
        except Exception as e:
            self.db.rollback()
            return False, f"Error approving deposit: {str(e)}"
    
    def approve_withdrawal(self, transaction_id: int, admin_id: int, admin_notes: Optional[str] = None) -> Tuple[bool, str]:
        """Approve a withdrawal request"""
        try:
            transaction = self.db.query(Transaction).filter(
                Transaction.id == transaction_id,
                Transaction.transaction_type == TransactionType.WITHDRAWAL,
                Transaction.status == TransactionStatus.PENDING
            ).first()
            
            if not transaction:
                return False, "Transaction not found or already processed"
            
            user = self.db.query(User).filter(User.id == transaction.user_id).first()
            if not user:
                return False, "User not found"
            
            # Check if user still has sufficient balance
            if user.wallet_balance < transaction.amount:
                return False, "User has insufficient balance"
            
            # Update user balance
            user.wallet_balance -= transaction.amount
            
            # Update transaction
            transaction.status = TransactionStatus.APPROVED
            transaction.processed_by = admin_id
            transaction.processed_at = datetime.utcnow()
            transaction.admin_notes = admin_notes
            transaction.balance_after = user.wallet_balance
            
            self.db.commit()
            return True, "Withdrawal approved successfully"
            
        except Exception as e:
            self.db.rollback()
            return False, f"Error approving withdrawal: {str(e)}"
    
    def reject_transaction(self, transaction_id: int, admin_id: int, admin_notes: str) -> Tuple[bool, str]:
        """Reject a deposit or withdrawal request"""
        try:
            transaction = self.db.query(Transaction).filter(
                Transaction.id == transaction_id,
                Transaction.status == TransactionStatus.PENDING
            ).first()
            
            if not transaction:
                return False, "Transaction not found or already processed"
            
            transaction.status = TransactionStatus.REJECTED
            transaction.processed_by = admin_id
            transaction.processed_at = datetime.utcnow()
            transaction.admin_notes = admin_notes
            
            self.db.commit()
            return True, "Transaction rejected successfully"
            
        except Exception as e:
            self.db.rollback()
            return False, f"Error rejecting transaction: {str(e)}"
    
    def get_pending_transactions(self, transaction_type: Optional[TransactionType] = None) -> List[TransactionResponse]:
        """Get all pending transactions for admin review"""
        query = self.db.query(Transaction).filter(Transaction.status == TransactionStatus.PENDING)
        
        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)
        
        transactions = query.order_by(Transaction.created_at.asc()).all()
        return [TransactionResponse.from_orm(t) for t in transactions]
    
    def add_balance(self, user_id: int, amount: float, description: str) -> Tuple[bool, str]:
        """Add balance to user's wallet (for refunds, bonuses, etc.)"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return False, "User not found"
            
            # Store balance before
            balance_before = user.wallet_balance
            
            # Add balance
            user.wallet_balance += amount
            
            # Create transaction record
            transaction = Transaction(
                user_id=user_id,
                transaction_type=TransactionType.DEPOSIT,  # Using DEPOSIT for credits
                amount=amount,
                status=TransactionStatus.APPROVED,
                description=description,
                balance_before=balance_before,
                balance_after=user.wallet_balance,
                processed_at=datetime.utcnow()
            )
            
            self.db.add(transaction)
            self.db.commit()
            return True, "Balance added successfully"
            
        except Exception as e:
            self.db.rollback()
            return False, f"Error adding balance: {str(e)}"