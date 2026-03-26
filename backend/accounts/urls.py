from django.urls import path
from .views import RegisterView, LoginView # <--- THÊM LoginView VÀO ĐÂY

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='login'),
]