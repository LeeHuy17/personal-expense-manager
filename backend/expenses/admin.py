from django.contrib import admin
from .models import User, Loai, ThuNhap, ChiPhi, BaoCao

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    # Lưu ý: 'userId' phải khớp chính xác với tên field trong models.py
    list_display = ('userId', 'username', 'email', 'thoiGianTao')
    search_fields = ('username', 'email')

@admin.register(Loai)
class LoaiAdmin(admin.ModelAdmin):
    list_display = ('loaiId', 'tenLoai', 'type')
    list_filter = ('type',) # Dấu phẩy ở cuối rất quan trọng với Tuple

@admin.register(ThuNhap)
class ThuNhapAdmin(admin.ModelAdmin):
    list_display = ('incomeId', 'user', 'soLuong', 'date')
    list_filter = ('date', 'user')
    # search_fields = ('user__username',) # Tìm kiếm theo tên user

@admin.register(ChiPhi)
class ChiPhiAdmin(admin.ModelAdmin):
    list_display = ('maChiPhi', 'user', 'loai', 'amount', 'date')
    list_filter = ('date', 'loai', 'user')
    # date_hierarchy = 'date' # Thêm thanh điều hướng thời gian rất chuyên nghiệp

@admin.register(BaoCao)
class BaoCaoAdmin(admin.ModelAdmin):
    list_display = ('baoCaoId', 'user', 'fromDate', 'toDate')
    list_filter = ('user',)