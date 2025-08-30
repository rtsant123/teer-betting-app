#!/usr/bin/env python3
"""
Test script to create a payment method with QR code for testing
"""
import requests
import json

# API base URL
BASE_URL = "http://localhost:8001/api/v1"

def create_payment_method_with_qr():
    """Create a payment method with QR code for testing"""
    
    # First, create an admin user or use existing admin credentials
    # You might need to adjust the login credentials
    login_data = {
        "username": "admin",  # Replace with actual admin username
        "password": "admin123"  # Replace with actual admin password
    }
    
    try:
        # Login to get admin token
        login_response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a payment method with QR code
        payment_method_data = {
            "name": "GPay QR Code",
            "type": "UPI",
            "details": {
                "upi_id": "merchant@gpay",
                "qr_code_url": "test_qr_code.png",  # This would be uploaded by admin
                "phone": "9876543210"
            },
            "instructions": "Scan the QR code below to make payment. After payment, fill in the transaction details.",
            "supports_deposit": True,
            "supports_withdrawal": False,
            "min_amount": 10,
            "max_amount": 50000,
            "admin_contact": "@support_telegram",
            "status": "ACTIVE"
        }
        
        # Create the payment method
        response = requests.post(
            f"{BASE_URL}/admin/payment-methods",
            headers=headers,
            json=payment_method_data
        )
        
        if response.status_code == 201:
            print("✅ Payment method with QR code created successfully!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Failed to create payment method: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"❌ Error: {e}")

def list_payment_methods():
    """List all payment methods to verify creation"""
    try:
        response = requests.get(f"{BASE_URL}/payment-methods")
        if response.status_code == 200:
            methods = response.json()
            print(f"\n📋 Found {len(methods)} payment methods:")
            for method in methods:
                print(f"  - {method['name']} ({method['type']}) - Supports Deposit: {method['supports_deposit']}")
                if 'qr_code_url' in method.get('details', {}):
                    print(f"    QR Code: {method['details']['qr_code_url']}")
        else:
            print(f"❌ Failed to fetch payment methods: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 Testing QR Code Payment Method Setup")
    print("=" * 50)
    
    # List existing payment methods
    list_payment_methods()
    
    # Uncomment to create new payment method
    # create_payment_method_with_qr()
    
    print("\n✅ Test completed!")
