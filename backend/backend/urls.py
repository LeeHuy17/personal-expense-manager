from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Kết nối các URL của app accounts vào hệ thống
    path('api/accounts/', include('accounts.urls')),
    path('api/ai/', include('ai.urls')),
    path('api/', include('expenses.urls')),
]