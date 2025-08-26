#!/usr/bin/env python3
"""
Simple script to test the backend ticket API directly
"""

import requests
import json

def test_backend_tickets():
    """Test the backend tickets API"""
    
    # First, let's check the health endpoint
    try:
        health_response = requests.get('http://localhost:8001/health')
        print(f"Health check: {health_response.status_code}")
        print(f"Health response: {health_response.text}")
    except Exception as e:
        print(f"Health check failed: {e}")
        return
    
    # Now test the tickets endpoint without authentication to see what we get
    try:
        tickets_response = requests.get('http://localhost:8001/api/v1/bet/my-tickets')
        print(f"Tickets status: {tickets_response.status_code}")
        print(f"Tickets headers: {dict(tickets_response.headers)}")
        
        if tickets_response.status_code == 401:
            print("Expected 401 - authentication required")
            return
            
        if tickets_response.status_code == 200:
            data = tickets_response.json()
            print(f"Tickets data type: {type(data)}")
            print(f"Tickets data: {json.dumps(data, indent=2, default=str)}")
            
    except Exception as e:
        print(f"Tickets API test failed: {e}")

if __name__ == "__main__":
    test_backend_tickets()
