#!/usr/bin/env python3
"""
Script to add QR code to existing payment method for testing
"""
import os
import sys

# Add the backend app to Python path
sys.path.insert(0, '/workspaces/teer-betting-app/backend')

from sqlalchemy.orm import Session
from app.database import get_db
from app.models import PaymentMethod

def update_payment_method_with_qr():
    """Add QR code to existing Google Pay payment method"""
    
    # Get database session
    db = next(get_db())
    
    try:
        # Find the Google Pay payment method
        payment_method = db.query(PaymentMethod).filter(
            PaymentMethod.name == "Google Pay"
        ).first()
        
        if not payment_method:
            print("❌ Google Pay payment method not found")
            return
        
        print(f"✅ Found payment method: {payment_method.name}")
        print(f"📄 Current details: {payment_method.details}")
        
        # Update details to include QR code
        updated_details = {
            "wallet_id": "merchant@gpay",
            "provider": "Google Pay",
            "upi_id": "9876543210@paytm",
            "qr_code_url": "sample_qr_code.png",  # This would be a real QR code uploaded by admin
            "phone": "9876543210"
        }
        
        payment_method.details = updated_details
        payment_method.instructions = "Use Google Pay to send money using the QR code below or UPI ID. After payment, please enter your transaction details."
        
        db.commit()
        
        print("✅ Payment method updated successfully!")
        print(f"📄 New details: {payment_method.details}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating payment method: {e}")
    finally:
        db.close()

def create_sample_qr_image():
    """Create a sample QR code image for testing"""
    qr_dir = "/workspaces/teer-betting-app/backend/uploads/qr_codes"
    os.makedirs(qr_dir, exist_ok=True)
    
    # Create a simple placeholder file
    qr_path = os.path.join(qr_dir, "sample_qr_code.png")
    
    # You would normally generate a real QR code here
    # For now, create a simple text file as placeholder
    with open(qr_path, "w") as f:
        f.write("This is a placeholder for QR code image")
    
    print(f"✅ Sample QR code created at: {qr_path}")

if __name__ == "__main__":
    print("🚀 Adding QR code to payment method")
    print("=" * 50)
    
    # Create sample QR code file
    create_sample_qr_image()
    
    # Update payment method
    update_payment_method_with_qr()
    
    print("\n✅ QR code setup completed!")
