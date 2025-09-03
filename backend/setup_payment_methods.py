#!/usr/bin/env python3
"""
Script to setup default payment methods for the betting app
"""
import sys
import os
sys.path.append('/app')

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.payment_method import PaymentMethod, PaymentMethodType, PaymentMethodStatus

def setup_payment_methods():
    """Setup default payment methods for deposits and withdrawals"""
    db = SessionLocal()
    try:
        print("Setting up payment methods...")
        
        # Check existing payment methods
        existing = db.query(PaymentMethod).all()
        print(f"Found {len(existing)} existing payment methods")
        
        for method in existing:
            print(f"  - {method.name} ({method.type}, supports_withdrawal: {method.supports_withdrawal})")
        
        # Create UPI payment method for both deposits and withdrawals
        upi_method = db.query(PaymentMethod).filter(
            PaymentMethod.name == "UPI Payment",
            PaymentMethod.type == PaymentMethodType.UPI
        ).first()
        
        if not upi_method:
            upi_method = PaymentMethod(
                name="UPI Payment",
                type=PaymentMethodType.UPI,
                status=PaymentMethodStatus.ACTIVE,
                details={
                    "upi_id": "admin@paytm",
                    "description": "Pay using UPI",
                    "instructions": "Scan QR code or use UPI ID to pay"
                },
                instructions="Use any UPI app to make payment",
                supports_deposit=True,
                supports_withdrawal=True,
                min_amount=10,
                max_amount=50000,
                admin_contact="admin@teercentral.com",
                display_order=1
            )
            db.add(upi_method)
            print("Created UPI payment method")
        else:
            # Update to support withdrawals
            upi_method.supports_withdrawal = True
            print("Updated UPI method to support withdrawals")
        
        # Create Bank Transfer method
        bank_method = db.query(PaymentMethod).filter(
            PaymentMethod.name == "Bank Transfer",
            PaymentMethod.type == PaymentMethodType.BANK_ACCOUNT
        ).first()
        
        if not bank_method:
            bank_method = PaymentMethod(
                name="Bank Transfer",
                type=PaymentMethodType.BANK_ACCOUNT,
                status=PaymentMethodStatus.ACTIVE,
                details={
                    "account_number": "1234567890",
                    "ifsc_code": "SBIN0001234",
                    "account_holder": "Teer Central",
                    "bank_name": "State Bank of India"
                },
                instructions="Transfer to the given bank account",
                supports_deposit=True,
                supports_withdrawal=True,
                min_amount=100,
                max_amount=100000,
                admin_contact="admin@teercentral.com",
                display_order=2
            )
            db.add(bank_method)
            print("Created Bank Transfer payment method")
        else:
            # Update to support withdrawals
            bank_method.supports_withdrawal = True
            print("Updated Bank Transfer method to support withdrawals")
        
        # Create Manual Processing method
        manual_method = db.query(PaymentMethod).filter(
            PaymentMethod.name == "Manual Processing"
        ).first()
        
        if not manual_method:
            manual_method = PaymentMethod(
                name="Manual Processing",
                type=PaymentMethodType.OTHER,
                status=PaymentMethodStatus.ACTIVE,
                details={
                    "description": "Admin will process manually",
                    "note": "For custom payment methods"
                },
                instructions="Admin will contact you for payment details",
                supports_deposit=True,
                supports_withdrawal=True,
                min_amount=10,
                max_amount=50000,
                admin_contact="admin@teercentral.com",
                display_order=3
            )
            db.add(manual_method)
            print("Created Manual Processing payment method")
        else:
            # Update to support withdrawals
            manual_method.supports_withdrawal = True
            print("Updated Manual Processing method to support withdrawals")
        
        db.commit()
        
        # Verify created methods
        all_methods = db.query(PaymentMethod).all()
        print(f"\nTotal payment methods after setup: {len(all_methods)}")
        
        withdrawal_methods = db.query(PaymentMethod).filter(
            PaymentMethod.supports_withdrawal == True,
            PaymentMethod.status == PaymentMethodStatus.ACTIVE
        ).all()
        
        print(f"Available withdrawal methods: {len(withdrawal_methods)}")
        for method in withdrawal_methods:
            print(f"  - {method.name} (ID: {method.id})")
        
        return True
        
    except Exception as e:
        print(f"Error setting up payment methods: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = setup_payment_methods()
    if success:
        print("SUCCESS: Payment methods setup completed")
    else:
        print("FAILED: Could not setup payment methods")
        sys.exit(1)
