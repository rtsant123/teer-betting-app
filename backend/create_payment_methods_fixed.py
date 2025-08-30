#!/usr/bin/env python3
"""
Script to create payment methods for deposits and withdrawals
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models.payment_method import PaymentMethod, PaymentMethodType, PaymentMethodStatus

def create_payment_methods():
    """Create payment methods for the app"""
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check existing payment methods
        existing_methods = db.query(PaymentMethod).all()
        print(f"Found {len(existing_methods)} existing payment methods")
        
        # If we already have payment methods, skip creation
        if len(existing_methods) >= 3:
            print("✅ Payment methods already exist!")
            for method in existing_methods:
                print(f"  - {method.name} ({method.type.value})")
                print(f"    Deposit: {method.supports_deposit}, Withdrawal: {method.supports_withdrawal}")
            return
        
        # Create UPI payment method
        upi_method = PaymentMethod(
            name="UPI Payment",
            type=PaymentMethodType.UPI,
            status=PaymentMethodStatus.ACTIVE,
            supports_deposit=True,
            supports_withdrawal=True,
            min_amount=10,
            max_amount=100000,
            instructions="Send money to the UPI ID provided and upload screenshot with transaction ID",
            display_order=1,
            details={
                "upi_id": "merchant@paytm",
                "merchant_name": "Teer Betting",
                "qr_code_url": "/api/qr-codes/upi.png"
            }
        )
        
        # Create Google Pay payment method
        gpay_method = PaymentMethod(
            name="Google Pay",
            type=PaymentMethodType.UPI,
            status=PaymentMethodStatus.ACTIVE,
            supports_deposit=True,
            supports_withdrawal=True,
            min_amount=10,
            max_amount=50000,
            instructions="Send payment via Google Pay and upload screenshot",
            display_order=2,
            details={
                "upi_id": "merchant@gpay",
                "merchant_name": "Teer Betting GPay",
                "app_name": "Google Pay"
            }
        )
        
        # Create PhonePe payment method
        phonepe_method = PaymentMethod(
            name="PhonePe",
            type=PaymentMethodType.UPI,
            status=PaymentMethodStatus.ACTIVE,
            supports_deposit=True,
            supports_withdrawal=True,
            min_amount=10,
            max_amount=50000,
            instructions="Send payment via PhonePe and upload screenshot",
            display_order=3,
            details={
                "upi_id": "merchant@ybl",
                "merchant_name": "Teer Betting PhonePe",
                "app_name": "PhonePe"
            }
        )
        
        # Create Bank Transfer payment method
        bank_method = PaymentMethod(
            name="Bank Transfer",
            type=PaymentMethodType.BANK_ACCOUNT,
            status=PaymentMethodStatus.ACTIVE,
            supports_deposit=True,
            supports_withdrawal=True,
            min_amount=100,
            max_amount=200000,
            instructions="Transfer to bank account and upload screenshot with transaction reference",
            display_order=4,
            details={
                "account_number": "1234567890123456",
                "ifsc_code": "SBIN0001234",
                "account_holder": "Teer Betting Pvt Ltd",
                "bank_name": "State Bank of India",
                "branch": "Main Branch"
            }
        )
        
        # Create Paytm Wallet method
        paytm_method = PaymentMethod(
            name="Paytm Wallet",
            type=PaymentMethodType.WALLET,
            status=PaymentMethodStatus.ACTIVE,
            supports_deposit=True,
            supports_withdrawal=True,
            min_amount=10,
            max_amount=25000,
            instructions="Send money via Paytm wallet and upload screenshot",
            display_order=5,
            details={
                "mobile_number": "+91-9876543210",
                "wallet_name": "Paytm",
                "merchant_name": "Teer Betting"
            }
        )
        
        # Add all methods to database
        methods = [upi_method, gpay_method, phonepe_method, bank_method, paytm_method]
        for method in methods:
            db.add(method)
        
        db.commit()
        
        print("✅ Payment methods created successfully!")
        print(f"Created {len(methods)} payment methods:")
        for method in methods:
            print(f"  - {method.name} ({method.type.value})")
            print(f"    Deposit: {method.supports_deposit}, Withdrawal: {method.supports_withdrawal}")
            print(f"    Amount: ₹{method.min_amount} - ₹{method.max_amount}")
        
    except Exception as e:
        print(f"❌ Error creating payment methods: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_payment_methods()
