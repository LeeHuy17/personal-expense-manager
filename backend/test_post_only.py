#!/usr/bin/env python
import requests

# Test POST expense
headers = {
    'Authorization': 'Token cc59c3b31ca9af8e699f97788d8e026ea58235e1',
    'Content-Type': 'application/json'
}

data = {
    'amount': 50000.0,
    'moTa': 'Test expense',
    'date': '2026-04-02',
    'loai': None
}

try:
    response = requests.post('http://127.0.0.1:8000/api/expenses/', json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")