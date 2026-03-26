#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User

# Xóa tất cả users hiện tại
print("=" * 60)
print("DELETING OLD USERS...")
print("=" * 60)

users_to_delete = User.objects.all()
count = users_to_delete.count()

for user in users_to_delete:
    print(f"Deleting: {user.username} (email: {user.email})")
    user.delete()

print(f"✅ Deleted {count} user(s)")

# Tạo user test mới
print("\n" + "=" * 60)
print("CREATING NEW TEST USER...")
print("=" * 60)

test_user = User.objects.create_user(
    username="testuser",
    email="test@example.com",
    password="test123456"
)

print(f"✅ Created test user:")
print(f"   Username: {test_user.username}")
print(f"   Email: {test_user.email}")
print(f"   Password (hashed): {test_user.password}")

# Verify password
is_correct = test_user.check_password("test123456")
print(f"\n✅ Password verification: {is_correct}")
