from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

class PasswordResetRequest(models.Model):
    """
    Model để track yêu cầu reset password
    Hỗ trợ real-time sync: frontend polling để detect khi user click email link
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='reset_request')
    email = models.EmailField(unique=True)
    token = models.CharField(max_length=255, unique=True)
    uid = models.CharField(max_length=255)
    
    # Flag để detect khi user click email link
    is_ready_to_reset = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    def is_expired(self):
        """Check nếu token đã hết hạn (24 giờ)"""
        return timezone.now() > self.expires_at
    
    def mark_as_ready(self):
        """Mark request là ready khi user click email link"""
        self.is_ready_to_reset = True
        self.save()
    # Override save method để tự động set expires_at khi tạo mới
    class Meta:
        verbose_name = "Password Reset Request"
        verbose_name_plural = "Password Reset Requests"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Reset Request for {self.email} - Ready: {self.is_ready_to_reset}"
