import requests

# Test login
login_url = 'http://127.0.0.1:8000/api/accounts/login/'
login_data = {
    'email': 'test@example.com',
    'password': 'testpass123'
}

response = requests.post(login_url, json=login_data)
print(f"Login status: {response.status_code}")
print(f"Login response: {response.text}")
if response.status_code == 200:
    token = response.json().get('access')
    print(f"Token: {token}")

    # Test search
    search_url = 'http://127.0.0.1:8000/api/search/transactions/'
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }
    params = {'keyword': 'test'}

    search_response = requests.get(search_url, headers=headers, params=params)
    print(f"Search status: {search_response.status_code}")
    print(f"Search response: {search_response.json()}")

    # Test recent searches
    recent_url = 'http://127.0.0.1:8000/api/search/recent/'
    recent_response = requests.get(recent_url, headers=headers)
    print(f"Recent status: {recent_response.status_code}")
    print(f"Recent response: {recent_response.json()}")
else:
    print(f"Login failed: {response.status_code} - {response.text}")