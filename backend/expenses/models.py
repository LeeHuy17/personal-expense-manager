from django.conf import settings
from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

AuthUser = get_user_model()


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

# ===================== PROFILE =====================
class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Profile of {self.user.username}"

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
    icon = models.CharField(max_length=50, default='plus')  # Biểu tượng từ Lucide icons
    color = models.CharField(max_length=7, default='#64748b')  # Màu sắc hex
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='categories',
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.tenLoai} ({self.get_type_display()})"

# ===================== THU NHAP (Income) =====================
class ThuNhap(models.Model):
    incomeId = models.AutoField(primary_key=True)
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='userId',
        related_name='thu_nhaps'
    )

    # 1. Thêm khóa ngoại tới Loai (Rất quan trọng để biết thu nhập từ đâu: Lương/Thưởng)
    loai = models.ForeignKey(
        Loai,
        on_delete=models.PROTECT,
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

    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['loai']),
            models.Index(fields=['amount']),
        ]

    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['loai']),
            models.Index(fields=['amount']),
        ]

# ===================== CHI PHI (Expense) =====================
class ChiPhi(models.Model):
    chiPhiId = models.AutoField(primary_key=True) # Đặt tên đồng bộ với incomeId

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='userId',
        related_name='chi_phis' # Thêm related_name để dễ truy vấn ngược
    )

    loai = models.ForeignKey(
        Loai,
        on_delete=models.PROTECT,
        db_column='loaiId',
        null=True, # Cho phép null để linh hoạt giống ThuNhap
        blank=True
    )

    amount = models.FloatField(verbose_name="Số tiền chi")
    date = models.DateField()
    moTa = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Chi: {self.amount} - {self.user.username}"

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
