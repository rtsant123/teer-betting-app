"""
Script to add default payment methods to the database
"""
import asyncio
import sys
import os

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import PaymentMethod, PaymentMethodType, PaymentMethodStatus

def create_default_payment_methods():
    """Create default payment methods"""
    db = SessionLocal()
    try:
        # Check if payment methods already exist
        existing_methods = db.query(PaymentMethod).count()
        if existing_methods > 0:
            print(f"Payment methods already exist ({existing_methods} found). Skipping...")
            return

        # Default payment methods
        default_methods = [
            {
                "name": "PhonePe UPI",
                "type": PaymentMethodType.UPI,
                "status": PaymentMethodStatus.ACTIVE,
                "details": {
                    "upi_id": "admin@phonepe",
                    "qr_code_url": "https://via.placeholder.com/200x200?text=PhonePe+QR",
                    "phone": "9876543210"
                },
                "instructions": "Send money to admin@phonepe and share screenshot with transaction ID",
                "supports_deposit": True,
                "supports_withdrawal": True,
                "min_amount": 10,
                "max_amount": 50000,
                "admin_contact": "Telegram: @admin_support",
                "display_order": 1
            },
            {
                "name": "Paytm UPI",
                "type": PaymentMethodType.UPI,
                "status": PaymentMethodStatus.ACTIVE,
                "details": {
                    "upi_id": "admin@paytm",
                    "qr_code_url": "https://via.placeholder.com/200x200?text=Paytm+QR",
                    "phone": "9876543210"
                },
                "instructions": "Send money to admin@paytm and share screenshot with transaction ID",
                "supports_deposit": True,
                "supports_withdrawal": True,
                "min_amount": 10,
                "max_amount": 50000,
                "admin_contact": "WhatsApp: +91-9876543210",
                "display_order": 2
            },
            {
                "name": "State Bank of India",
                "type": PaymentMethodType.BANK_ACCOUNT,
                "status": PaymentMethodStatus.ACTIVE,
                "details": {
                    "bank_name": "State Bank of India",
                    "account_number": "1234567890",
                    "ifsc": "SBIN0001234",
                    "account_holder": "TEER BETTING ADMIN",
                    "branch": "Main Branch"
                },
                "instructions": "Transfer money to the provided bank account and share transaction reference number",
                "supports_deposit": True,
                "supports_withdrawal": True,
                "min_amount": 100,
                "max_amount": 100000,
                "admin_contact": "Email: admin@teerbetting.com",
                "display_order": 3
            },
            {
                "name": "GPay UPI",
                "type": PaymentMethodType.UPI,
                "status": PaymentMethodStatus.ACTIVE,
                "details": {
                    "upi_id": "admin@googleplay",
                    "qr_code_url": "https://via.placeholder.com/200x200?text=GPay+QR",
                    "phone": "9876543210"
                },
                "instructions": "Send money to admin@googleplay and share screenshot with transaction ID",
                "supports_deposit": True,
                "supports_withdrawal": True,
                "min_amount": 10,
                "max_amount": 25000,
                "admin_contact": "Telegram: @admin_support",
                "display_order": 4
            },
            {
                "name": "HDFC Bank",
                "type": PaymentMethodType.BANK_ACCOUNT,
                "status": PaymentMethodStatus.INACTIVE,  # Disabled by default
                "details": {
                    "bank_name": "HDFC Bank",
                    "account_number": "0987654321",
                    "ifsc": "HDFC0001234",
                    "account_holder": "TEER BETTING ADMIN",
                    "branch": "Commercial Branch"
                },
                "instructions": "Transfer money to the provided HDFC bank account and share transaction reference number",
                "supports_deposit": True,
                "supports_withdrawal": True,
                "min_amount": 500,
                "max_amount": 200000,
                "admin_contact": "Phone: +91-9876543210",
                "display_order": 5
            }
        ]

        # Create payment methods
        for method_data in default_methods:
            payment_method = PaymentMethod(**method_data)
            db.add(payment_method)

        db.commit()
        print(f"Successfully created {len(default_methods)} default payment methods!")

        # Display created methods
        methods = db.query(PaymentMethod).all()
        print("\nCreated Payment Methods:")
        for method in methods:
            print(f"- {method.name} ({method.type.value}) - {method.status.value}")

    except Exception as e:
        db.rollback()
        print(f"Error creating payment methods: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating default payment methods...")
    create_default_payment_methods()
    print("Done!")
