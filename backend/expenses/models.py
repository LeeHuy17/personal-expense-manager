from django.db import models

# ===================== USERS =====================
class User(models.Model):
    userId = models.AutoField(primary_key=True)
    username = models.CharField(max_length=100)
    password = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    thoiGianTao = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.username


# ===================== LOAI =====================
class Loai(models.Model):
    loaiId = models.AutoField(primary_key=True)
    tenLoai = models.CharField(max_length=100)
    type = models.CharField(max_length=50)  # Ví dụ: income / expense

    def __str__(self):
        return self.tenLoai


# ===================== THU NHAP =====================
class ThuNhap(models.Model):
    incomeId = models.AutoField(primary_key=True)
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='userId'
    )

    soLuong = models.FloatField()
    date = models.DateField()
    mota = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.soLuong} - {self.user.username}"


# ===================== CHI PHI =====================
class ChiPhi(models.Model):
    maChiPhi = models.AutoField(primary_key=True)

    user = models.ForeignKey(
        User,
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
        User,
        on_delete=models.CASCADE,
        db_column='userId'
    )

    fromDate = models.DateField()
    toDate = models.DateField()

    def __str__(self):
        return f"Báo cáo {self.user.username}"

