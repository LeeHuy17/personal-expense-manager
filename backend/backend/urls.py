from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('', RedirectView.as_view(url='http://192.168.6.112:3000/', permanent=False)),
    path('admin/', admin.site.urls),
    # Kết nối các URL của app accounts vào hệ thống
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/accounts/', include('accounts.urls')),
    path('api/ai/', include('ai.urls')),
    path('api/advisor/', include('advisor.urls')),
    path('api/shared-fund/', include('shared_fund.urls')),
    path('api/search/', include('search_filter.urls')),
    path('api/', include('expenses.urls')),
    path('shared-fund/', include('shared_fund.ui_urls')),
    path('api/savings/', include('savings.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)