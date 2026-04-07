from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),  # ✅ Thêm dòng này
    path('api/', include('expenses.urls')),  # API cho expenses app
]