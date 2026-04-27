from django.urls import path
from .views.page_views import SharedFundListView, SharedFundDetailView

urlpatterns = [
    path('', SharedFundListView.as_view(), name='shared_fund_list_ui'),
    path('<int:fund_id>/', SharedFundDetailView.as_view(), name='shared_fund_detail_ui'),
]
