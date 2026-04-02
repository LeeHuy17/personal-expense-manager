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

    # Test API call
    headers = {
        'Authorization': f'Token {token.key}',
        'Content-Type': 'application/json'
    }

    response = requests.get('http://127.0.0.1:8000/api/incomes/', headers=headers)
    print(f"API Response Status: {response.status_code}")
    print(f"API Response: {response.json()}")

except User.DoesNotExist:
    print("User lehuy2 not found")
except Exception as e:
    print(f"Error: {e}")