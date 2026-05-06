from django.contrib import admin
from .models import Budget

@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    # Hiển thị các cột cần thiết trên giao diện danh sách
    list_display = ('user', 'category', 'amount', 'month', 'year')
    # Thêm bộ lọc bên phải để dễ tìm kiếm
    list_filter = ('month', 'year', 'user')
    # Cho phép tìm kiếm theo tên danh mục (nếu muốn)
    search_fields = ('category__tenLoai', 'user__username')