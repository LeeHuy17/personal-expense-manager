#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User

# Test user 14 (caolehuy)
try:
    user = User.objects.get(id=14)
    print(f'Testing user: {user.username} (email: {user.email})')
    print(f'Password field (hashed): {user.password[:50]}...')
    print("=" * 60)
    
    # Test checking password
    test_password = 'caolehuy'
    is_correct = user.check_password(test_password)
    print(f'Does password "{test_password}" match? {is_correct}')

    # Thử lại với tất cả các biến thể có thể
    passwords_to_try = ['caolehuy', '123456', 'password', 'caolehuy123', 'caolehuy@123', '']
    print('\nTrying different passwords:')
    for pwd in passwords_to_try:
        result = user.check_password(pwd)
        print(f'  - "{pwd}": {result}')
        
except User.DoesNotExist:
    print("User with ID 14 not found")
