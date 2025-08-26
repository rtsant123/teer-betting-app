#!/usr/bin/env python3
"""
Test script to authenticate as Rio1 and get tickets
"""

import requests
import json

def test_full_flow():
    """Test login and tickets API with Rio1 user"""
    
    base_url = "http://localhost:8001"
    
    # Step 1: Try to login as Rio1 with different passwords
    passwords_to_try = ["123456", "password", "rio123", "Rio123", "1212121212"]
    
    for password in passwords_to_try:
        login_data = {
            "username": "Rio1",
            "password": password
        }
        
        try:
            print(f"Attempting to login as Rio1 with password: {password}...")
            login_response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
            print(f"Login status: {login_response.status_code}")
            
            if login_response.status_code == 200:
                login_result = login_response.json()
                token = login_result.get('access_token')
                print(f"Login successful! Token: {token[:20]}...")
                
                # Step 2: Get tickets with the token
                headers = {"Authorization": f"Bearer {token}"}
                tickets_response = requests.get(f"{base_url}/api/v1/bet/my-tickets", headers=headers)
                print(f"Tickets status: {tickets_response.status_code}")
                
                if tickets_response.status_code == 200:
                    tickets_data = tickets_response.json()
                    print(f"Number of tickets: {len(tickets_data)}")
                    
                    if tickets_data:
                        print("\n=== First 3 tickets ===")
                        for i, ticket in enumerate(tickets_data[:3]):
                            print(f"\nTicket {i+1}:")
                            print(f"  ID: {ticket.get('ticket_id')}")
                            print(f"  Total amount: {ticket.get('total_amount')}")
                            print(f"  Total potential payout: {ticket.get('total_potential_payout')}")
                            print(f"  Bets summary: {json.dumps(ticket.get('bets_summary'), indent=4) if ticket.get('bets_summary') else 'None'}")
                        
                        return True
                else:
                    print(f"Tickets error: {tickets_response.text}")
            else:
                print(f"Login failed with {password}: {login_response.text}")
                
        except Exception as e:
            print(f"Error with password {password}: {e}")
    
    print("All password attempts failed")
    return False
    
    return False

if __name__ == "__main__":
    test_full_flow()
