from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChiPhiViewSet, ThuNhapViewSet, LoaiViewSet
from .views import ai_advice

# Sử dụng Router để tự động tạo 5 hành động CRUD (GET, POST, PUT, DELETE)
router = DefaultRouter()
router.register(r'expenses', ChiPhiViewSet, basename='chiphi') # Khớp với BM01
router.register(r'incomes', ThuNhapViewSet, basename='thunhap')
router.register(r'categories', LoaiViewSet, basename='loai')

urlpatterns = [
    path('', include(router.urls)),
    path('ai-advice/', ai_advice),
]
