from django.db import models
from django.contrib.auth.models import User
# Lưu ý: Hãy chắc chắn import đúng đường dẫn đến model Category của bạn
from expenses.models import Loai 

class Budget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Loai, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Số tiền ngân sách")
    month = models.IntegerField(verbose_name="Tháng")
    year = models.IntegerField(verbose_name="Năm")

    class Meta:
        # Đảm bảo mỗi người dùng chỉ có 1 ngân sách cho 1 danh mục trong 1 tháng
        unique_together = ('user', 'category', 'month', 'year')

    def __str__(self):
        category_label = getattr(self.category, 'tenLoai', None) or str(self.category)
        return f"{self.user.username} - {category_label} - {self.month}/{self.year}"