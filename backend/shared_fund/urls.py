from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.fund_views import SharedFundViewSet
from .views.expense_views import ExpenseViewSet
from .views.settlement_views import SettlementViewSet
from .views.invitation_views import FundInvitationViewSet

router = DefaultRouter()
router.register(r'funds', SharedFundViewSet, basename='fund')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'settlements', SettlementViewSet, basename='settlement')
router.register(r'invitations', FundInvitationViewSet, basename='invitation')

urlpatterns = [
    path('', include(router.urls)),
]
