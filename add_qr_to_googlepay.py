#!/usr/bin/env python3
"""
Simple script to add QR code to existing Google Pay payment method
"""
import requests
import json

# API base URL
BASE_URL = "http://localhost:8001/api/v1"

def update_google_pay_with_qr():
    """Add QR code to existing Google Pay payment method"""
    
    # First login as admin (you need to create admin user first)
    login_data = {
        "username": "admin@admin.com", 
        "password": "admin123"
    }
    
    try:
        # Try to login
        response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
        
        if response.status_code != 200:
            print("❌ Admin login failed. Creating admin user first...")
            # Try to create admin user
            create_admin_data = {
                "email": "admin@admin.com",
                "username": "admin",
                "password": "admin123",
                "phone": "1234567890"
            }
            
            register_response = requests.post(f"{BASE_URL}/auth/register", json=create_admin_data)
            if register_response.status_code in [200, 201]:
                print("✅ Admin user created!")
                # Try login again
                response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
            else:
                print(f"❌ Failed to create admin user: {register_response.text}")
                return
        
        if response.status_code != 200:
            print(f"❌ Login failed: {response.text}")
            return
            
        token = response.json().get("access_token")
        if not token:
            print("❌ No token received")
            return
            
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Get existing payment methods
        methods_response = requests.get(f"{BASE_URL}/payment-methods")
        if methods_response.status_code != 200:
            print(f"❌ Failed to get payment methods: {methods_response.text}")
            return
            
        methods = methods_response.json()
        google_pay_method = None
        
        for method in methods:
            if method.get("name") == "Google Pay":
                google_pay_method = method
                break
        
        if not google_pay_method:
            print("❌ Google Pay payment method not found")
            return
            
        print(f"✅ Found Google Pay method with ID: {google_pay_method['id']}")
        
        # Update with QR code
        updated_details = google_pay_method.get("details", {})
        updated_details["qr_code_url"] = "https://via.placeholder.com/300x300/10B981/FFFFFF?text=Google+Pay+QR"
        updated_details["upi_id"] = updated_details.get("upi_id", "merchant@googlepay")
        
        update_data = {
            "name": google_pay_method["name"],
            "type": google_pay_method["type"], 
            "details": updated_details,
            "instructions": "Scan the QR code below to make payment using Google Pay. After payment, fill in the transaction details below.",
            "supports_deposit": True,
            "supports_withdrawal": False,
            "min_amount": google_pay_method.get("min_amount", 10),
            "max_amount": google_pay_method.get("max_amount", 50000),
            "status": "ACTIVE"
        }
        
        # Update the payment method
        update_response = requests.put(
            f"{BASE_URL}/admin/payment-methods/{google_pay_method['id']}",
            headers=headers,
            json=update_data
        )
        
        if update_response.status_code == 200:
            print("✅ Google Pay updated with QR code successfully!")
            print(json.dumps(update_response.json(), indent=2))
        else:
            print(f"❌ Failed to update payment method: {update_response.status_code}")
            print(update_response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🔄 Adding QR code to Google Pay payment method...")
    update_google_pay_with_qr()
