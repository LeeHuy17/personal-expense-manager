from django.urls import path
from .views import TransactionSearchView, RecentSearchView

urlpatterns = [
    path('transactions/', TransactionSearchView.as_view(), name='transaction-search'),
    path('recent-searches/', RecentSearchView.as_view(), name='recent-searches'),
]