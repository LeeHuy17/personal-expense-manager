#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.append('.')
django.setup()

from expenses.models import ThuNhap, ChiPhi

print("=== ThuNhap (Income) Records ===")
thu_nhap_count = ThuNhap.objects.count()
print(f"Count: {thu_nhap_count}")

for t in ThuNhap.objects.all():
    print(f"  ID: {t.incomeId}, Amount: {t.amount}, User: {t.user.username}, Date: {t.date}, Description: {t.moTa}")

print("\n=== ChiPhi (Expense) Records ===")
chi_phi_count = ChiPhi.objects.count()
print(f"Count: {chi_phi_count}")

for c in ChiPhi.objects.all():
    print(f"  ID: {c.chiPhiId}, Amount: {c.amount}, User: {c.user.username}, Date: {c.date}, Description: {c.moTa}")

print(f"\nTotal records: {thu_nhap_count + chi_phi_count}")