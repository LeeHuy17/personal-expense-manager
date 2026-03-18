from django.test import TestCase
from .models import User, Loai, ChiPhi

class ExpenseTest(TestCase):
    def setUp(self):
        # Tạo dữ liệu mẫu theo Schema [cite: 6, 18]
        self.user = User.objects.create(username="test", email="t@gmail.com")
        self.loai = Loai.objects.create(tenLoai="Ăn uống", type="expense")

    def test_create_expense_valid(self):
        """Test 1: Tạo chi phí hợp lệ"""
        cp = ChiPhi.objects.create(amount=50000, user=self.user, loai=self.loai, date="2026-03-10")
        self.assertEqual(cp.amount, 50000)

    def test_expense_str_representation(self):
        """Test 2: Kiểm tra hiển thị __str__ của model"""
        cp = ChiPhi.objects.create(amount=100, user=self.user, loai=self.loai, date="2026-03-10")
        self.assertIn("100", str(cp))

    def test_delete_expense(self):
        """Test 3: Xóa chi phí"""
        cp = ChiPhi.objects.create(amount=100, user=self.user, loai=self.loai, date="2026-03-10")
        cp_id = cp.maChiPhi
        cp.delete()
        self.assertFalse(ChiPhi.objects.filter(maChiPhi=cp_id).exists())

    def test_update_expense(self):
        """Test 4: Cập nhật số tiền chi"""
        cp = ChiPhi.objects.create(amount=100, user=self.user, loai=self.loai, date="2026-03-10")
        cp.amount = 200
        cp.save()
        self.assertEqual(ChiPhi.objects.get(maChiPhi=cp.maChiPhi).amount, 200)

    def test_create_income_valid(self):
        """Test 5: Tạo khoản thu nhập hợp lệ"""
        from .models import ThuNhap
        tn = ThuNhap.objects.create(soLuong=1000, user=self.user, date="2026-03-10")
        self.assertEqual(tn.soLuong, 1000)