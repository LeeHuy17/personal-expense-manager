#!/usr/bin/env python
import os
import sys
import django
import requests

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.append('.')
django.setup()

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

# Get user lehuy2
try:
    user = User.objects.get(username='lehuy2')
    print(f"User found: {user.username} (ID: {user.id})")

    # Get or create token
    token, created = Token.objects.get_or_create(user=user)
    print(f"Token: {token.key} (Created: {created})")

    # Test creating expense
    headers = {
        'Authorization': f'Token {token.key}',
        'Content-Type': 'application/json'
    }

    data = {
        'amount': 50000.0,
        'moTa': 'Test expense',
        'date': '2026-04-02',
        'loai': None
    }

    response = requests.post('http://127.0.0.1:8000/api/expenses/', json=data, headers=headers)
    print(f"POST Expense Response Status: {response.status_code}")
    print(f"POST Expense Response: {response.text}")

    # Test getting expenses
    response = requests.get('http://127.0.0.1:8000/api/expenses/', headers=headers)
    print(f"GET Expenses Response Status: {response.status_code}")
    print(f"GET Expenses Response: {response.json()}")

except Exception as e:
    print(f"Error: {e}")