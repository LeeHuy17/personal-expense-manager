from django.contrib import admin
from .models import SavingsGoal

@admin.register(SavingsGoal)
class SavingsGoalAdmin(admin.ModelAdmin):
    # Các cột sẽ hiển thị ở danh sách ngoài Admin
    list_display = ('title', 'user', 'target_amount', 'current_amount', 'deadline', 'created_at')
    
    # Cho phép tìm kiếm theo tên mục tiêu hoặc tên user
    search_fields = ('title', 'user__username')
    
    # Bộ lọc ở cột bên phải
    list_filter = ('deadline', 'user')