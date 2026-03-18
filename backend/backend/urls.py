from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls), # Quản lý user/loai trên giao diện web
    path('api/', include('expenses.urls')), # Nhúng toàn bộ API từ app expenses
]