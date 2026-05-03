"""
Test invitation flow
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from shared_fund.models import SharedFund, FundInvitation, FundMember
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

# Create test users
print("Creating test users...")
user1, _ = User.objects.get_or_create(email='user1@test.com', defaults={'username': 'user1'})
user2, _ = User.objects.get_or_create(email='user2@test.com', defaults={'username': 'user2'})
user1.set_password('test123')
user2.set_password('test123')
user1.save()
user2.save()

print(f"User 1: {user1.email} (ID: {user1.id})")
print(f"User 2: {user2.email} (ID: {user2.id})")

# Create a fund
print("\nCreating a fund...")
fund = SharedFund.objects.create(name='Test Fund', description='Test', owner=user1)
FundMember.objects.create(fund=fund, user=user1, role=FundMember.ROLE_OWNER)

print(f"Fund: {fund.name} (ID: {fund.id})")
print(f"Fund members: {FundMember.objects.filter(fund=fund).values_list('user__email', flat=True)}")

# Test API
client = APIClient()

# Login as user1
print("\n--- Testing as User 1 (Owner) ---")
response = client.post('http://127.0.0.1:8000/api/accounts/login/', {
    'email': 'user1@test.com',
    'password': 'test123'
})
print(f"Login response: {response.status_code}")
if response.status_code == 200:
    token = response.json().get('access')
    print(f"Token: {token[:20]}..." if token else "No token")
    
    if token:
        client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        
        # Send invite to user2
        print(f"\nInviting user2 to fund...")
        invite_response = client.post(
            f'http://127.0.0.1:8000/api/shared-fund/funds/{fund.id}/invite/',
            {'user': user2.id, 'role': 'member'}
        )
        print(f"Invite response: {invite_response.status_code}")
        print(f"Response: {invite_response.json()}")
        
        # Check invitations in DB
        invitations = FundInvitation.objects.filter(fund=fund)
        print(f"\nInvitations in DB: {invitations.count()}")
        for inv in invitations:
            print(f"  - {inv.invitee.email} ({inv.status})")

# Login as user2
print("\n--- Testing as User 2 (Invitee) ---")
response = client.post('http://127.0.0.1:8000/api/accounts/login/', {
    'email': 'user2@test.com',
    'password': 'test123'
})
print(f"Login response: {response.status_code}")
if response.status_code == 200:
    token = response.json().get('access')
    print(f"Token: {token[:20]}..." if token else "No token")
    
    if token:
        client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        
        # Get pending invitations
        print(f"\nFetching pending invitations...")
        response = client.get('http://127.0.0.1:8000/api/shared-fund/invitations/')
        print(f"Response status: {response.status_code}")
        print(f"Response: {response.json()}")

print("\nTest completed!")
