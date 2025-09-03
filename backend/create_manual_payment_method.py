#!/usr/bin/env python3
"""
Script to add a manual processing payment method for simplified withdrawals
"""
import sys
import os
sys.path.append('/app')

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.payment_method import PaymentMethod, PaymentMethodType, PaymentMethodStatus

def create_manual_payment_method():
    """Create a manual processing payment method for withdrawals"""
    db = SessionLocal()
    try:
        # Check if manual payment method already exists
        existing = db.query(PaymentMethod).filter(
            PaymentMethod.name == "Manual Processing"
        ).first()
        
        if existing:
            print("Manual processing payment method already exists")
            return existing.id
        
        # Create manual processing payment method
        manual_method = PaymentMethod(
            name="Manual Processing",
            type=PaymentMethodType.OTHER,
            status=PaymentMethodStatus.ACTIVE,
            details={
                "description": "Manual processing by admin",
                "note": "Used for simplified withdrawal requests"
            },
            instructions="Admin will process withdrawal manually based on user provided details",
            supports_deposit=False,
            supports_withdrawal=True,
            min_amount=100,
            max_amount=50000,
            admin_contact="admin@teercentral.com",
            display_order=999  # Show last in lists
        )
        
        db.add(manual_method)
        db.commit()
        db.refresh(manual_method)
        
        print(f"Created manual processing payment method with ID: {manual_method.id}")
        return manual_method.id
        
    except Exception as e:
        print(f"Error creating manual payment method: {str(e)}")
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    payment_method_id = create_manual_payment_method()
    if payment_method_id:
        print(f"SUCCESS: Manual payment method ID is {payment_method_id}")
        # Write to a file that the frontend can reference
        with open('/tmp/manual_payment_method_id.txt', 'w') as f:
            f.write(str(payment_method_id))
    else:
        print("FAILED: Could not create manual payment method")
        sys.exit(1)
