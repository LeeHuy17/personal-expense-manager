#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User

print("\n" + "="*80)
print("LATEST USERS IN DATABASE")
print("="*80)
users = User.objects.all().order_by('-date_joined')[:5]
for u in users:
    print(f"ID: {u.id:3} | Username: {u.username:20} | Email: {u.email:35} | Created: {u.date_joined}")

print(f"\nTotal users in database: {User.objects.count()}")
print("="*80 + "\n")
