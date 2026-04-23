#!/usr/bin/env python
import requests

# Test script to debug the 500 error on POST /api/expenses/
base_url = 'http://127.0.0.1:8000'

# Step 1: Login
print("=== Step 1: Login ===")
login_data = {
    'email': 'user1@example.com',  # Adjust based on your test users
    'password': 'user1'
}

try:
    response = requests.post(f'{base_url}/api/accounts/login/', json=login_data)
    print(f"Login status: {response.status_code}")
    if response.status_code == 200:
        token = response.json().get('access')
        print(f"Token: {token[:20]}...")

        headers = {
            'Authorization': f'Token {token}',
            'Content-Type': 'application/json'
        }

        # Step 2: Try to create expense
        print("\n=== Step 2: Try POST /api/expenses/ ===")
        expense_data = {
            'amount': 50000.0,
            'moTa': 'Test expense from debug script',
            'loai': None,  # No category
            'date': '2026-04-23'
        }
        print(f"Sending data: {expense_data}")
        response = requests.post(f'{base_url}/api/expenses/', json=expense_data, headers=headers)
        print(f"POST status: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code == 201:
            print("✅ Expense created successfully!")
        else:
            print("❌ Failed to create expense")

    else:
        print(f"Login failed: {response.text}")

except requests.exceptions.ConnectionError:
    print("❌ Cannot connect to backend. Is Django server running?")
except Exception as e:
    print(f"❌ Error: {e}")