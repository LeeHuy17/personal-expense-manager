from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User as AuthUser


@receiver(post_save, sender=AuthUser)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        from .models import User as MyUser 
        # Dùng update_or_create để nếu lỡ có rồi thì cập nhật, chưa có thì tạo mới
        MyUser.objects.update_or_create(
            username=instance.username,
            defaults={
                'email': instance.email,
                'password': instance.password,
            }
        )

# --- CHIỀU 1: Xóa ở bảng User (tự chế) -> Xóa AuthUser (Người sử dụng) ---
@receiver(post_delete, sender='expenses.User') 
def delete_auth_user_when_profile_deleted(sender, instance, **kwargs):
    try:
        # Tìm bên bảng hệ thống AuthUser
        user_to_delete = AuthUser.objects.get(username=instance.username)
        user_to_delete.delete()
        print(f"--- Đã xóa AuthUser tương ứng với: {instance.username} ---")
    except AuthUser.DoesNotExist:
        pass

# --- CHIỀU 2: Xóa ở Người sử dụng (AuthUser) -> Xóa bảng User (tự chế) ---
@receiver(post_delete, sender=AuthUser)
def delete_profile_when_auth_user_deleted(sender, instance, **kwargs):
    try:
        from .models import User as MyUser
        # Tìm bên bảng tự chế MyUser
        profile_to_delete = MyUser.objects.get(username=instance.username)
        profile_to_delete.delete()
        print(f"--- Đã xóa Profile User tương ứng với: {instance.username} ---")
    except MyUser.DoesNotExist:
        pass

# ===================== USERS =====================
class User(models.Model):
    userId = models.AutoField(primary_key=True)
    username = models.CharField(max_length=100)
    password = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    thoiGianTao = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.username

# ===================== LOAI (Categories) =====================
class Loai(models.Model):
    loaiId = models.AutoField(primary_key=True)
    tenLoai = models.CharField(max_length=100)
    # Dùng choices để tránh nhập sai (income/expense)
    TYPE_CHOICES = [
        ('income', 'Thu nhập'),
        ('expense', 'Chi phí'),
    ]
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)

    def __str__(self):
        return f"{self.tenLoai} ({self.get_type_display()})"

# ===================== THU NHAP (Income) =====================
class ThuNhap(models.Model):
    user = models.ForeignKey(AuthUser, on_delete=models.CASCADE, related_name='thu_nhaps')
    
    incomeId = models.AutoField(primary_key=True)
    
    user = models.ForeignKey(
        AuthUser, 
        on_delete=models.CASCADE,
        db_column='userId'
    )

    # 1. Thêm khóa ngoại tới Loai (Rất quan trọng để biết thu nhập từ đâu: Lương/Thưởng)
    loai = models.ForeignKey(
        Loai,
        on_delete=models.CASCADE,
        db_column='loaiId',
        null=True, # Cho phép null tạm thời để tránh lỗi migrate dữ liệu cũ
        blank=True
    )

    # 2. Đổi soLuong -> amount để đồng nhất với ChiPhi
    amount = models.FloatField(verbose_name="Số tiền")
    date = models.DateField()
    moTa = models.CharField(max_length=255, blank=True, null=True) # Đổi mota -> moTa cho đồng bộ

    def __str__(self):
        return f"{self.amount} - {self.user.username}"

# ===================== CHI PHI (Expense) =====================
class ChiPhi(models.Model):
    maChiPhi = models.AutoField(primary_key=True)

    user = models.ForeignKey(
        AuthUser, 
        on_delete=models.CASCADE,
        db_column='userId'
    )

    loai = models.ForeignKey(
        Loai,
        on_delete=models.CASCADE,
        db_column='loaiId'
    )

    amount = models.FloatField()
    date = models.DateField()
    moTa = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.amount} - {self.user.username}"

# ===================== BAO CAO =====================
class BaoCao(models.Model):
    baoCaoId = models.AutoField(primary_key=True)

    user = models.ForeignKey(
        AuthUser, 
        on_delete=models.CASCADE,
        db_column='userId'
    )

    fromDate = models.DateField()
    toDate = models.DateField()

    def __str__(self):
        return f"Báo cáo {self.user.username}"
