from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.expense_views import ExpenseViewSet
from .views.fund_views import SharedFundViewSet, AdminSharedFundListView, AdminSharedFundDetailView
from .views.settlement_views import SettlementViewSet
from .views.invitation_views import FundInvitationViewSet

router = DefaultRouter()
router.register(r'funds', SharedFundViewSet, basename='fund')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'settlements', SettlementViewSet, basename='settlement')
router.register(r'invitations', FundInvitationViewSet, basename='invitation')

urlpatterns = [
    path('admin/funds/', AdminSharedFundListView.as_view(), name='admin_sharedfund_list'),
    path('admin/funds/<int:fund_id>/', AdminSharedFundDetailView.as_view(), name='admin_sharedfund_detail'),
    path('', include(router.urls)),
]
