from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    ForgotPasswordView,
    ResetPasswordView,
    CheckResetStatusView,
    MarkResetReadyView,
    UserListView,
    UserDetailView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='login'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:user_id>/', UserDetailView.as_view(), name='user_detail'),
    
    # 🔄 Real-time Sync endpoints
    path('check-reset-status/', CheckResetStatusView.as_view(), name='check_reset_status'),
    path('mark-reset-ready/<str:uid>/<str:token>/', MarkResetReadyView.as_view(), name='mark_reset_ready'),
]