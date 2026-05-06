from django.urls import path
from .views import dashboard

urlpatterns = [
    path('', dashboard, name='backend_ui_dashboard'),
    path('<str:section>/', dashboard, name='backend_ui_section'),
]
