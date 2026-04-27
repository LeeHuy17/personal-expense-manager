from django.db import models
from django.contrib.auth.models import User


class ChatSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='advisor_sessions')
    name = models.CharField(max_length=120, blank=True, default='Tư vấn thu chi')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-updated_at', '-created_at']

    def __str__(self):
        return f'{self.user.username} - {self.name}'


class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'Người dùng'),
        ('assistant', 'AI'),
        ('system', 'Hệ thống'),
    ]

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.session.user.username} - {self.role} - {self.created_at:%Y-%m-%d %H:%M}'


class SpendingHabit(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='spending_habits')
    category = models.CharField(max_length=120)
    average_amount = models.FloatField(default=0)
    frequency = models.CharField(max_length=120, blank=True)
    note = models.TextField(blank=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['user', 'category']]
        ordering = ['-average_amount', 'category']

    def __str__(self):
        return f'{self.user.username} - {self.category}'
