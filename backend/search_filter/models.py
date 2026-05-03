from django.db import models
from django.conf import settings  # Cách import chuẩn

class RecentSearch(models.Model):
    # Sử dụng settings trực tiếp giúp dòng code ngắn gọn hơn
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name="recent_searches" # Thêm related_name để dễ truy vấn ngược
    )
    keyword = models.CharField(max_length=100)
    searched_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-searched_at']
        # Đảm bảo một user không bị trùng lặp cùng một từ khóa tìm kiếm
        unique_together = ('user', 'keyword')

    def __str__(self):
        return f"{self.user.username}: {self.keyword}"