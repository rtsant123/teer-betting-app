#!/usr/bin/env python3
"""
Script to manually add payment methods to the Teer betting platform.
Usage: docker-compose exec backend python scripts/add_payment_method.py
"""

from app.database import SessionLocal
from app.models.payment_method import PaymentMethod, PaymentMethodType, PaymentMethodStatus

def add_payment_method(
    name: str,
    method_type: str,
    details: dict,
    instructions: str = "",
    supports_deposit: bool = True,
    supports_withdrawal: bool = True,
    min_amount: int = 10,
    max_amount: int = 100000,
    display_order: int = 0
):
    """Add a new payment method to the database"""
    db = SessionLocal()
    try:
        # Convert string type to enum
        type_map = {
            "UPI": PaymentMethodType.UPI,
            "BANK_ACCOUNT": PaymentMethodType.BANK_ACCOUNT,
            "QR_CODE": PaymentMethodType.QR_CODE,
            "WALLET": PaymentMethodType.WALLET,
            "CRYPTO": PaymentMethodType.CRYPTO
        }
        
        if method_type not in type_map:
            print(f"Invalid payment method type: {method_type}")
            print(f"Valid types: {list(type_map.keys())}")
            return False
        
        method = PaymentMethod(
            name=name,
            type=type_map[method_type],
            status=PaymentMethodStatus.ACTIVE,
            supports_deposit=supports_deposit,
            supports_withdrawal=supports_withdrawal,
            min_amount=min_amount,
            max_amount=max_amount,
            instructions=instructions,
            display_order=display_order,
            details=details
        )
        
        db.add(method)
        db.commit()
        db.refresh(method)
        
        print(f"✅ Successfully added payment method: {name} (ID: {method.id})")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error adding payment method: {str(e)}")
        return False
    finally:
        db.close()

def list_payment_methods():
    """List all existing payment methods"""
    db = SessionLocal()
    try:
        methods = db.query(PaymentMethod).order_by(PaymentMethod.display_order, PaymentMethod.name).all()
        
        print("\n📋 Existing Payment Methods:")
        print("-" * 80)
        for method in methods:
            status_emoji = "✅" if method.status == PaymentMethodStatus.ACTIVE else "❌"
            deposit_emoji = "📥" if method.supports_deposit else "⚪"
            withdrawal_emoji = "📤" if method.supports_withdrawal else "⚪"
            
            print(f"{status_emoji} ID: {method.id:2d} | {method.name:20s} | {method.type.value:12s} | {deposit_emoji}{withdrawal_emoji} | ₹{method.min_amount}-{method.max_amount}")
        
    except Exception as e:
        print(f"❌ Error listing payment methods: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    
    print("🏦 Teer Platform - Payment Method Manager")
    print("=" * 50)
    
    if len(sys.argv) > 1 and sys.argv[1] == "list":
        list_payment_methods()
    else:
        # Example usage - you can modify these to add your own payment methods
        examples = [
            {
                "name": "HDFC Bank",
                "method_type": "BANK_ACCOUNT",
                "details": {
                    "account_number": "50100123456789",
                    "ifsc": "HDFC0001234",
                    "account_holder": "Teer Platform Pvt Ltd",
                    "bank_name": "HDFC Bank"
                },
                "instructions": "Transfer to HDFC bank account and send screenshot",
                "min_amount": 100,
                "max_amount": 50000,
                "display_order": 5
            },
            {
                "name": "Amazon Pay UPI",
                "method_type": "UPI",
                "details": {
                    "upi_id": "teer@apl"
                },
                "instructions": "Send money to Amazon Pay UPI ID",
                "min_amount": 10,
                "max_amount": 25000,
                "display_order": 6
            }
        ]
        
        print("Adding example payment methods...")
        for example in examples:
            add_payment_method(**example)
        
        print("\n")
        list_payment_methods()
