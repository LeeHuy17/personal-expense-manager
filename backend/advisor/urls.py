from django.urls import path
from .views import (
    AdvisorChatAPIView,
    AdvisorStreamAPIView,
    DailySuggestionAPIView,
    ChatHistoryAPIView,
    AdvisorPageView,
)

urlpatterns = [
    path('chat/', AdvisorChatAPIView.as_view(), name='advisor_chat'),
    path('stream/', AdvisorStreamAPIView.as_view(), name='advisor_stream'),
    path('daily-suggestion/', DailySuggestionAPIView.as_view(), name='advisor_daily_suggestion'),
    path('history/', ChatHistoryAPIView.as_view(), name='advisor_history'),
    path('ui/', AdvisorPageView.as_view(), name='advisor_ui'),
]
