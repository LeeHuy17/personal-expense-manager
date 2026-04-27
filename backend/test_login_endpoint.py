#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

import json
from django.test import Client
from django.contrib.auth.models import User

# Khởi tạo Django test client
client = Client()

print("=" * 60)
print("TESTING LOGIN ENDPOINT")
print("=" * 60)

# Test 1: Login với email đúng
print("\n[TEST 1] Login với email đúng")
print("-" * 60)
response = client.post(
    '/api/accounts/login/',
    data=json.dumps({
        'email': 'test@example.com',
        'password': 'test123456'
    }),
    content_type='application/json'
)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

# Test 2: Login với email sai
print("\n[TEST 2] Login với email sai")
print("-" * 60)
response = client.post(
    '/api/accounts/login/',
    data=json.dumps({
        'email': 'wrong@example.com',
        'password': 'test123456'
    }),
    content_type='application/json'
)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

# Test 3: Login với password sai
print("\n[TEST 3] Login với password sai")
print("-" * 60)
response = client.post(
    '/api/accounts/login/',
    data=json.dumps({
        'email': 'test@example.com',
        'password': 'wrongpassword'
    }),
    content_type='application/json'
)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

print("\n" + "=" * 60)
print("✅ Tests completed!")
print("=" * 60)
