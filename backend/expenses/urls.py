from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChiPhiViewSet, ThuNhapViewSet, LoaiViewSet

# Sử dụng Router để tự động tạo các hành động CRUD
router = DefaultRouter()

# Đường dẫn cho Chi phí
router.register(r'expenses', ChiPhiViewSet, basename='chiphi')

# Đường dẫn cho Thu nhập - Đảm bảo ViewSet này đã dùng ThuNhapSerializer mới
router.register(r'incomes', ThuNhapViewSet, basename='thunhap')

# Đường dẫn cho Danh mục (Lương, Thưởng, Ăn uống...)
router.register(r'categories', LoaiViewSet, basename='loai')

urlpatterns = [
    path('', include(router.urls)),
]