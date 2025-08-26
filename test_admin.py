#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8001"

def test_admin_endpoints():
    print("Testing admin endpoints...")
    
    # Test 1: Try to access admin endpoints without authentication
    print("\n1. Testing unauthorized access to admin endpoints:")
    
    endpoints = [
        "/api/v1/admin/users",
        "/api/v1/admin/users/create",
        "/api/v1/admin/tasks"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            print(f"  {endpoint}: {response.status_code}")
            if response.status_code != 200:
                error_detail = response.json()
                print(f"    Error: {error_detail.get('detail', 'Unknown error')}")
        except Exception as e:
            print(f"  {endpoint}: Error - {e}")
    
    # Test 2: Check admin task models in OpenAPI spec
    print("\n2. Checking OpenAPI specification:")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/openapi.json")
        if response.status_code == 200:
            openapi_spec = response.json()
            paths = openapi_spec.get('paths', {})
            admin_paths = [path for path in paths.keys() if 'admin' in path]
            print(f"  Found {len(admin_paths)} admin endpoints:")
            for path in admin_paths:
                print(f"    {path}")
            
            # Check if admin task schemas exist
            schemas = openapi_spec.get('components', {}).get('schemas', {})
            admin_schemas = [schema for schema in schemas.keys() if 'admin' in schema.lower() or 'task' in schema.lower()]
            print(f"  Found {len(admin_schemas)} admin-related schemas:")
            for schema in admin_schemas:
                print(f"    {schema}")
        else:
            print(f"  Failed to get OpenAPI spec: {response.status_code}")
    except Exception as e:
        print(f"  Error getting OpenAPI spec: {e}")

if __name__ == "__main__":
    test_admin_endpoints()
